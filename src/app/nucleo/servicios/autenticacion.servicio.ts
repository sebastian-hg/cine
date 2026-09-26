import { Service, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, map, mergeMap, throwError } from 'rxjs';

import { Credenciales, RolUsuario, Usuario } from '../../compartido/interfaces/usuario.interfaz';
import { SupabaseServicio, UsuarioMock } from './supabase.servicio';

/** Clave del almacenamiento local donde se recuerda la sesión. */
const CLAVE_SESION = 'cine.sesion';

/**
 * Autenticación (§1 y §8 de la consigna) — MOCKEADA.
 *
 * TODO Supabase: reemplazar por `supabase.auth`.
 *   · registrar  → `auth.signUp({ email, password, options: { data: perfil } })`
 *   · ingresar   → `auth.signInWithPassword({ email, password })`
 *   · salir      → `auth.signOut()`
 *   · sesión     → `auth.onAuthStateChange(...)` alimenta `usuarioActual$`
 *
 * El rol NO debe venir del cliente: vive en la tabla `perfiles` con una policy
 * que solo permite al propio usuario leer su fila, y se resuelve en el servidor.
 */
@Service()
export class AutenticacionServicio {
  private readonly supabase = inject(SupabaseServicio);

  private readonly usuario = new BehaviorSubject<Usuario | null>(this.leerSesionGuardada());

  /** Usuario de la sesión, o `null` si es un visitante anónimo. */
  readonly usuarioActual$: Observable<Usuario | null> = this.usuario.asObservable();

  readonly estaAutenticado$: Observable<boolean> = this.usuario.pipe(map((u) => u !== null));

  readonly rol$: Observable<RolUsuario> = this.usuario.pipe(map((u) => u?.rol ?? 'anonimo'));

  /** Lectura sincrónica, para guards e interceptores. */
  get usuarioActual(): Usuario | null {
    return this.usuario.value;
  }

  get rol(): RolUsuario {
    return this.usuario.value?.rol ?? 'anonimo';
  }

  /** Token simulado; el interceptor de auth lo adjunta a cada petición. */
  get token(): string | null {
    const actual = this.usuario.value;
    return actual ? `mock-jwt-${actual.id}` : null;
  }

  ingresar(credenciales: Credenciales): Observable<Usuario> {
    const cliente = this.supabase.cliente;
    if (!cliente) return this.ingresarMock(credenciales);

    const email = credenciales.email.trim().toLowerCase();
    return from(cliente.from('usuarios_cine').select('*').eq('email', email).limit(1).maybeSingle()).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));

        const encontrado = data ? this.filaAUsuarioMock(data as Record<string, unknown>) : null;
        if (!encontrado || encontrado.password !== credenciales.password) {
          return throwError(() => new Error('El email o la contraseña no son correctos.'));
        }

        const usuario = this.sinPassword(encontrado);
        this.establecerSesion(usuario);
        return this.supabase.inmediato(usuario);
      }),
    );
  }

  /** §8: alta de usuario con los siete campos del formulario de registro. */
  registrar(datos: Omit<UsuarioMock, 'id' | 'rol' | 'primeraCompraUsada'>): Observable<Usuario> {
    const cliente = this.supabase.cliente;
    if (!cliente) return this.registrarMock(datos);

    const filaCamel = {
      email: datos.email.trim().toLowerCase(),
      password: datos.password,
      nombre: datos.nombre,
      apellido: datos.apellido,
      fechaNacimiento: datos.fechaNacimiento,
      tipoSangre: datos.tipoSangre,
      colorOjos: datos.colorOjos,
      diasVacaciones: datos.diasVacaciones,
      rol: 'cliente',
      primeraCompraUsada: false,
    };

    const filaSnake = {
      email: datos.email.trim().toLowerCase(),
      password: datos.password,
      nombre: datos.nombre,
      apellido: datos.apellido,
      fecha_nacimiento: datos.fechaNacimiento,
      tipo_sangre: datos.tipoSangre,
      color_ojos: datos.colorOjos,
      dias_vacaciones: datos.diasVacaciones,
      rol: 'cliente',
      primera_compra_usada: false,
    };

    return from(this.insertarUsuarioConFallback(cliente, filaCamel, filaSnake)).pipe(
      mergeMap(({ data, error }) => {
        if (error) {
          if (error.code === '23505') {
            return throwError(() => new Error('Ya hay una cuenta registrada con ese email.'));
          }
          if (error.code === '42501') {
            return throwError(
              () => new Error('La policy RLS de usuarios_cine bloquea INSERT para la clave pública.'),
            );
          }
          return throwError(() => new Error(error.message));
        }

        const nuevo = this.filaAUsuarioMock(data as Record<string, unknown>);
        if (!nuevo) return throwError(() => new Error('No se pudo registrar el usuario.'));

        const usuario = this.sinPassword(nuevo);
        this.establecerSesion(usuario);
        return this.supabase.inmediato(usuario);
      }),
    );
  }

  salir(): void {
    this.usuario.next(null);
    this.borrarSesionGuardada();
  }

  /** Refresca la copia en sesión tras un cambio de perfil o una compra. */
  refrescar(usuario: Usuario): void {
    this.establecerSesion(usuario);
  }

  /** Marca la primera compra como usada; la llama `CompraServicio` al confirmar. */
  marcarPrimeraCompraUsada(idUsuario: string): Observable<void> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        const encontrado = base.usuarios.find((u) => u.id === idUsuario);
        if (encontrado) {
          encontrado.primeraCompraUsada = true;
          if (this.usuario.value?.id === idUsuario) {
            this.establecerSesion(this.sinPassword(encontrado));
          }
        }
      });
    }

    return from(this.actualizarPrimeraCompraConFallback(cliente, idUsuario)).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));

        const actualizado = data ? this.filaAUsuarioMock(data as Record<string, unknown>) : null;
        if (actualizado && this.usuario.value?.id === idUsuario) {
          this.establecerSesion(this.sinPassword(actualizado));
        }
        return this.supabase.inmediato(undefined);
      }),
    );
  }

  private ingresarMock(credenciales: Credenciales): Observable<Usuario> {
    return this.supabase.transaccionAsync((base) => {
      const encontrado = base.usuarios.find(
        (u) => u.email.toLowerCase() === credenciales.email.trim().toLowerCase(),
      );

      if (!encontrado || encontrado.password !== credenciales.password) {
        return throwError(() => new Error('El email o la contraseña no son correctos.'));
      }

      const usuario = this.sinPassword(encontrado);
      this.establecerSesion(usuario);
      return this.supabase.inmediato(usuario);
    });
  }

  private registrarMock(datos: Omit<UsuarioMock, 'id' | 'rol' | 'primeraCompraUsada'>): Observable<Usuario> {
    return this.supabase.transaccionAsync((base) => {
      const yaExiste = base.usuarios.some(
        (u) => u.email.toLowerCase() === datos.email.trim().toLowerCase(),
      );
      if (yaExiste) {
        return throwError(() => new Error('Ya hay una cuenta registrada con ese email.'));
      }

      const nuevo: UsuarioMock = {
        ...datos,
        email: datos.email.trim().toLowerCase(),
        id: this.supabase.nuevoId('u'),
        rol: 'cliente',
        primeraCompraUsada: false,
      };
      base.usuarios.push(nuevo);

      const usuario = this.sinPassword(nuevo);
      this.establecerSesion(usuario);
      return this.supabase.inmediato(usuario);
    });
  }

  private filaAUsuarioMock(fila: Record<string, unknown>): UsuarioMock | null {
    const id = String(fila['id'] ?? '');
    const email = String(fila['email'] ?? '');
    const password = String(fila['password'] ?? '');
    if (!id || !email || !password) return null;

    const rol = this.normalizarRol(fila['rol']);
    return {
      id,
      email,
      password,
      nombre: String(fila['nombre'] ?? ''),
      apellido: String(fila['apellido'] ?? ''),
      fechaNacimiento: String(fila['fechaNacimiento'] ?? fila['fecha_nacimiento'] ?? ''),
      tipoSangre: String(fila['tipoSangre'] ?? fila['tipo_sangre'] ?? ''),
      colorOjos: String(fila['colorOjos'] ?? fila['color_ojos'] ?? ''),
      diasVacaciones: Number(fila['diasVacaciones'] ?? fila['dias_vacaciones'] ?? 0),
      rol,
      primeraCompraUsada: Boolean(
        fila['primeraCompraUsada'] ?? fila['primera_compra_usada'] ?? false,
      ),
    };
  }

  private normalizarRol(valor: unknown): Usuario['rol'] {
    return valor === 'cliente' || valor === 'empleado' || valor === 'administrador'
      ? valor
      : 'cliente';
  }

  private async insertarUsuarioConFallback(
    cliente: NonNullable<SupabaseServicio['cliente']>,
    filaCamel: Record<string, unknown>,
    filaSnake: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { code?: string; message: string } | null }> {
    const primerIntento = await cliente.from('usuarios_cine').insert(filaCamel).select('*').single();
    if (!primerIntento.error) return primerIntento;

    if (primerIntento.error.code !== 'PGRST204') {
      return primerIntento;
    }

    return cliente.from('usuarios_cine').insert(filaSnake).select('*').single();
  }

  private async actualizarPrimeraCompraConFallback(
    cliente: NonNullable<SupabaseServicio['cliente']>,
    idUsuario: string,
  ): Promise<{ data: unknown; error: { code?: string; message: string } | null }> {
    const primerIntento = await cliente
      .from('usuarios_cine')
      .update({ primeraCompraUsada: true })
      .eq('id', idUsuario)
      .select('*')
      .maybeSingle();

    if (!primerIntento.error) return primerIntento;
    if (primerIntento.error.code !== 'PGRST204') return primerIntento;

    return cliente
      .from('usuarios_cine')
      .update({ primera_compra_usada: true })
      .eq('id', idUsuario)
      .select('*')
      .maybeSingle();
  }

  private sinPassword(usuario: UsuarioMock): Usuario {
    const { password, ...resto } = usuario;
    return resto;
  }

  private establecerSesion(usuario: Usuario): void {
    this.usuario.next(usuario);
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
    } catch {
      // Modo privado o almacenamiento bloqueado: la sesión vive solo en memoria.
    }
  }

  private leerSesionGuardada(): Usuario | null {
    try {
      const crudo = localStorage.getItem(CLAVE_SESION);
      return crudo ? (JSON.parse(crudo) as Usuario) : null;
    } catch {
      return null;
    }
  }

  private borrarSesionGuardada(): void {
    try {
      localStorage.removeItem(CLAVE_SESION);
    } catch {
      // Nada que limpiar si el almacenamiento no está disponible.
    }
  }
}
