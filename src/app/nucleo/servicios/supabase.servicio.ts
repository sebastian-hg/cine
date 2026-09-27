import { Service, inject } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Observable, from, map, mergeMap, of, shareReplay, switchMap, take } from 'rxjs';

import { AlertaEstreno } from '../../compartido/interfaces/alerta.interfaz';
import { Butaca, EstadoButaca } from '../../compartido/interfaces/butaca.interfaz';
import { CategoriaCandy } from '../../compartido/interfaces/categoria.interfaz';
import { Combo } from '../../compartido/interfaces/combo.interfaz';
import { Compra } from '../../compartido/interfaces/compra.interfaz';
import { Configuracion, Cupon } from '../../compartido/interfaces/cupon.interfaz';
import { Funcion, Idioma, Modalidad } from '../../compartido/interfaces/funcion.interfaz';
import { Genero } from '../../compartido/interfaces/genero.interfaz';
import { Pelicula } from '../../compartido/interfaces/pelicula.interfaz';
import { Producto } from '../../compartido/interfaces/producto.interfaz';
import { CodigoQr } from '../../compartido/interfaces/qr.interfaz';
import { Canje, MovimientoPuntos, Recompensa } from '../../compartido/interfaces/puntos.interfaz';
import { MovimientoCredito } from '../../compartido/interfaces/credito.interfaz';
import { RegistroActividad } from '../../compartido/interfaces/registro-actividad.interfaz';
import { Resena } from '../../compartido/interfaces/resena.interfaz';
import { Sala } from '../../compartido/interfaces/sala.interfaz';
import { Usuario } from '../../compartido/interfaces/usuario.interfaz';
import { generarButacas } from '../dominio/generador-butacas';
import { soloFecha, sumarDias } from '../dominio/fechas';
import { supabaseConfig } from '../config/supabase.config';

/** Usuario con la contraseña, que solo existe dentro del mock. */
export interface UsuarioMock extends Usuario {
  password: string;
}

/**
 * Todo el estado del backend simulado.
 *
 * Es mutable a propósito: representa las tablas de Postgres. Los servicios de
 * dominio leen y escriben acá a través de los métodos de `SupabaseServicio`.
 */
export interface BaseDatos {
  generos: Genero[];
  peliculas: Pelicula[];
  salas: Sala[];
  funciones: Funcion[];
  categorias: CategoriaCandy[];
  productos: Producto[];
  combos: Combo[];
  cupones: Cupon[];
  recompensas: Recompensa[];
  resenas: Resena[];
  usuarios: UsuarioMock[];
  configuracion: Configuracion;

  compras: Compra[];
  codigosQr: CodigoQr[];
  /** `idFuncion` → (`idButaca` → estado). Solo guarda lo que no está libre. */
  ocupacion: Map<string, Map<string, EstadoButaca>>;
  movimientosPuntos: MovimientoPuntos[];
  movimientosCredito: MovimientoCredito[];
  canjes: Canje[];
  alertas: AlertaEstreno[];
  registros: RegistroActividad[];
  /** Cupones ya usados por usuario: `idUsuario` → códigos. */
  cuponesUsados: Map<string, Set<string>>;
}

/** Latencia artificial para que los estados de carga tengan algo que mostrar. */
export const LATENCIA_SIMULADA_MS = 180;

/**
 * Fachada de Supabase — IMPLEMENTACIÓN MOCKEADA.
 *
 * Ningún otro servicio de la aplicación accede a datos crudos: todo pasa por
 * acá. Cada método lleva en un comentario la consulta real que lo reemplazará,
 * junto con la policy de RLS, el bucket de Storage o la función RPC que haga
 * falta. Migrar a Supabase debería ser cambiar cuerpos de método, no rediseñar
 * la aplicación.
 *
 * Las lecturas de semilla pasan por `HttpClient` a propósito, para que la cadena
 * de interceptores (auth, errores, carga) sea código que se ejercita de verdad.
 */
@Service()
export class SupabaseServicio {
  private readonly clienteSupabase: SupabaseClient | null = this.crearClienteSupabase();

  /**
   * La base se carga una sola vez y se comparte. `shareReplay` es lo que hace
   * que sea un singleton de datos y no una recarga por suscriptor.
   */
  private readonly base$: Observable<BaseDatos> = this.cargarSemilla().pipe(
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  /**
   * Acceso a la base ya cargada.
   *
   * TODO Supabase: desaparece. Cada método pasa a hacer su propia consulta
   * contra `this.cliente.from(...)` en lugar de operar sobre memoria.
   */
  consultar<T>(proyeccion: (base: BaseDatos) => T): Observable<T> {
    return this.base$.pipe(map(proyeccion));
  }

  /**
   * Igual que `consultar`, pero para operaciones que mutan estado.
   *
   * El `shareReplay` no es una optimización: sin él, `map` volvería a ejecutar
   * la mutación en cada suscripción, y una compra suscrita dos veces
   * descontaría el stock dos veces.
   */
  transaccion<T>(operacion: (base: BaseDatos) => T): Observable<T> {
    return this.base$.pipe(
      take(1),
      map(operacion),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  /** Encadena una operación que a su vez devuelve un observable. */
  transaccionAsync<T>(operacion: (base: BaseDatos) => Observable<T>): Observable<T> {
    return this.base$.pipe(
      take(1),
      switchMap(operacion),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  // ───────────────────────────── carga de semilla ─────────────────────────────

  private cargarSemilla(): Observable<BaseDatos> {
    return this.cargarDatosRemotos().pipe(map((semilla) => this.construirBase(semilla)));
  }

  private cargarDatosRemotos(): Observable<{
    generos: Genero[];
    peliculas: Pelicula[];
    salas: Omit<Sala, 'butacas'>[];
    funciones: Funcion[];
    candy: { categorias: CategoriaCandy[]; productos: Producto[]; combos: Combo[] };
    configuracion: { configuracion: Configuracion; cupones: Cupon[]; recompensas: Recompensa[] };
    resenas: Resena[];
    usuarios: { usuarios: UsuarioMock[] };
  }> {
    const cliente = this.clienteSupabase;
    if (!cliente) {
      return of({
        generos: [],
        peliculas: [],
        salas: [],
        funciones: [],
        candy: { categorias: [], productos: [], combos: [] },
        configuracion: {
          configuracion: this.configuracionPorDefecto(),
          cupones: [],
          recompensas: [],
        },
        resenas: [],
        usuarios: { usuarios: [] },
      });
    }

    return from(
      Promise.all([
        this.seleccionarGeneros(cliente),
        this.seleccionarPeliculas(cliente),
        this.seleccionarPeliculasGeneros(cliente),
      ]),
    ).pipe(
      mergeMap(([generosR, peliculasR, peliculasGenerosR]) =>
        from(
          Promise.all([
            this.seleccionarTablaOpcional(cliente, 'salas'),
            this.seleccionarTablaOpcional(cliente, 'funciones'),
            this.seleccionarTablaOpcional(cliente, 'categorias_candy'),
            this.seleccionarTablaOpcional(cliente, 'productos_candy'),
            this.seleccionarTablaOpcional(cliente, 'combos_candy'),
            this.seleccionarTablaOpcional(cliente, 'combo_productos_candy'),
            this.seleccionarTablaOpcional(cliente, 'configuracion'),
            this.seleccionarTablaOpcional(cliente, 'cupones'),
            this.seleccionarTablaOpcional(cliente, 'recompensas'),
            this.seleccionarComentarios(cliente),
            this.seleccionarTablaOpcional(cliente, 'usuarios_cine'),
          ]),
        ).pipe(
          mergeMap(
            ([
              salasR,
              funcionesR,
              categoriasR,
              productosR,
              combosR,
              comboProductosR,
              configuracionR,
              cuponesR,
              recompensasR,
              resenasR,
              usuariosR,
            ]) => {
        const error =
          generosR.error ??
          peliculasR.error ??
          peliculasGenerosR.error ??
          salasR.error ??
          funcionesR.error ??
          categoriasR.error ??
          productosR.error ??
          combosR.error ??
          comboProductosR.error ??
          configuracionR.error ??
          cuponesR.error ??
          recompensasR.error ??
          resenasR.error ??
          usuariosR.error;

        if (error) throw new Error(error.message);

        const generos = (generosR.data ?? []).map((fila) => ({
          id: String((fila as Record<string, unknown>)['id'] ?? ''),
          nombre: String((fila as Record<string, unknown>)['nombre'] ?? ''),
          activo: Boolean(
            (fila as Record<string, unknown>)['activo'] ??
              (fila as Record<string, unknown>)['activa'] ??
              true,
          ),
        }));

        const hoy = new Date();
        const generosPorPelicula = new Map<string, string[]>();

        for (const fila of peliculasGenerosR.data ?? []) {
          const filaRegistro = fila as Record<string, unknown>;
          const idPelicula = String(
            filaRegistro['idPelicula'] ?? filaRegistro['id_pelicula'] ?? '',
          );
          const idGenero = String(filaRegistro['idGenero'] ?? filaRegistro['id_genero'] ?? '');
          if (!idPelicula || !idGenero) continue;

          const ids = generosPorPelicula.get(idPelicula) ?? [];
          ids.push(idGenero);
          generosPorPelicula.set(idPelicula, ids);
        }

        const peliculas = (peliculasR.data ?? []).map((fila) => {
          const filaRegistro = fila as Record<string, unknown>;
          const id = String(filaRegistro['id'] ?? '');
          const diasHastaEstreno = Number(
            filaRegistro['diasHastaEstreno'] ?? filaRegistro['dias_hasta_estreno'] ?? NaN,
          );
          const fechaEstrenoPersistida = String(
            filaRegistro['fechaEstreno'] ?? filaRegistro['fecha_estreno'] ?? '',
          ).trim();

          return {
            id,
            nombre: String(filaRegistro['nombre'] ?? ''),
            poster: String(filaRegistro['poster'] ?? ''),
            sinopsis: String(filaRegistro['sinopsis'] ?? ''),
            duracionMinutos: Number(
              filaRegistro['duracionMinutos'] ?? filaRegistro['duracion_minutos'] ?? 0,
            ),
            generos: generosPorPelicula.get(id) ?? [],
            clasificacion: String(filaRegistro['clasificacion'] ?? 'ATP') as Pelicula['clasificacion'],
            fechaEstreno:
              fechaEstrenoPersistida.length > 0
                ? fechaEstrenoPersistida
                : Number.isFinite(diasHastaEstreno)
                  ? soloFecha(sumarDias(hoy, diasHastaEstreno))
                  : soloFecha(hoy),
            disponible: Boolean(filaRegistro['disponible'] ?? true),
            preventaActivada: Boolean(
              filaRegistro['preventaActivada'] ?? filaRegistro['preventa_activada'] ?? false,
            ),
            precioPreventa: Number(
              filaRegistro['precioPreventa'] ?? filaRegistro['precio_preventa'] ?? 0,
            ),
            precioNormal: Number(
              filaRegistro['precioNormal'] ?? filaRegistro['precio_normal'] ?? 0,
            ),
            ventasPrevias: Number(
              filaRegistro['ventasPrevias'] ?? filaRegistro['ventas_previas'] ?? 0,
            ),
          } as Pelicula;
        });

        const categorias = (categoriasR.data ?? []).map((fila) => ({
          id: String((fila as Record<string, unknown>)['id'] ?? ''),
          nombre: String((fila as Record<string, unknown>)['nombre'] ?? ''),
          activa: Boolean((fila as Record<string, unknown>)['activa'] ?? true),
        }));

        const salasBase = (salasR.data ?? []).map((fila) => ({
          id: String((fila as Record<string, unknown>)['id'] ?? ''),
          numero: Number((fila as Record<string, unknown>)['numero'] ?? 0),
          nombre: String((fila as Record<string, unknown>)['nombre'] ?? ''),
        }));

        const salasDerivadas = this.derivarSalasDesdeFunciones(funcionesR.data ?? [], salasBase);
        const salas = [...salasBase, ...salasDerivadas];

        const idsPeliculasDisponibles = new Set(peliculas.map((pelicula) => pelicula.id));
        const idsSalasDisponibles = new Set(salas.map((sala) => sala.id));
        const peliculasPorNombre = new Map(
          peliculas.map((pelicula) => [this.normalizarTexto(pelicula.nombre), pelicula.id]),
        );
        const salasPorNombre = new Map(
          salas.map((sala) => [this.normalizarTexto(sala.nombre), sala.id]),
        );
        const duracionPorPelicula = new Map(
          peliculas.map((pelicula) => [pelicula.id, pelicula.duracionMinutos]),
        );

        const funciones = (funcionesR.data ?? []).map((fila) => {
          const registro = fila as Record<string, unknown>;
          const nombrePelicula = String(
            registro['nombrePelicula'] ?? registro['nombre_pelicula'] ?? '',
          ).trim();
          const nombreSala = String(
            registro['nombreSala'] ?? registro['nombre_sala'] ?? '',
          ).trim();

          let idPelicula = this.normalizarRelacion(
            String(
              registro['idPelicula'] ??
                registro['id_pelicula'] ??
                registro['peliculaId'] ??
                registro['pelicula_id'] ??
                '',
            ),
            idsPeliculasDisponibles,
            'p',
          );

          if (!idPelicula) {
            idPelicula =
              peliculasPorNombre.get(this.normalizarTexto(nombrePelicula)) ??
              peliculasPorNombre.get(this.normalizarTexto(String(registro['pelicula'] ?? ''))) ??
              '';
          }

          let idSala = this.normalizarRelacion(
            String(
              registro['idSala'] ??
                registro['id_sala'] ??
                registro['salaId'] ??
                registro['sala_id'] ??
                '',
            ),
            idsSalasDisponibles,
            's',
          );

          if (!idSala) {
            idSala =
              salasPorNombre.get(this.normalizarTexto(nombreSala)) ??
              salasPorNombre.get(this.normalizarTexto(String(registro['sala'] ?? ''))) ??
              '';
          }

          const inicio = this.resolverInicioFuncion(registro);
          const fin = this.resolverFinFuncion(
            registro,
            inicio,
            duracionPorPelicula.get(idPelicula) ?? 0,
          );

          return {
            id: String(registro['id'] ?? ''),
            idPelicula,
            idSala,
            inicio,
            fin,
            modalidad: String(registro['modalidad'] ?? '2D') as Modalidad,
            idioma: String(registro['idioma'] ?? 'castellano') as Idioma,
            precio: Number(registro['precio'] ?? 0),
          } as Funcion;
        }).filter(
          (funcion) =>
            funcion.id.length > 0 &&
            funcion.idPelicula.length > 0 &&
            funcion.idSala.length > 0 &&
            funcion.inicio.length > 0 &&
            funcion.fin.length > 0 &&
            this.esFechaValida(funcion.inicio) &&
            this.esFechaValida(funcion.fin),
        );

        const productos = (productosR.data ?? []).map((fila) => ({
          id: String((fila as Record<string, unknown>)['id'] ?? ''),
          idCategoria: String(
            (fila as Record<string, unknown>)['idCategoria'] ??
              (fila as Record<string, unknown>)['id_categoria'] ??
              '',
          ),
          nombre: String((fila as Record<string, unknown>)['nombre'] ?? ''),
          descripcion: String((fila as Record<string, unknown>)['descripcion'] ?? ''),
          imagen: String((fila as Record<string, unknown>)['imagen'] ?? ''),
          precio: Number((fila as Record<string, unknown>)['precio'] ?? 0),
          stock: Number((fila as Record<string, unknown>)['stock'] ?? 0),
          activo: Boolean((fila as Record<string, unknown>)['activo'] ?? true),
        }));

        const itemsPorCombo = new Map<string, { idProducto: string; cantidad: number }[]>();
        for (const fila of comboProductosR.data ?? []) {
          const filaRegistro = fila as Record<string, unknown>;
          const idCombo = String(filaRegistro['idCombo'] ?? filaRegistro['id_combo'] ?? '');
          if (!idCombo) continue;

          const lista = itemsPorCombo.get(idCombo) ?? [];
          lista.push({
            idProducto: String(filaRegistro['idProducto'] ?? filaRegistro['id_producto'] ?? ''),
            cantidad: Number(filaRegistro['cantidad'] ?? 0),
          });
          itemsPorCombo.set(idCombo, lista);
        }

        const combos = (combosR.data ?? []).map((fila) => {
          const filaRegistro = fila as Record<string, unknown>;
          const id = String(filaRegistro['id'] ?? '');

          return {
            id,
            nombre: String(filaRegistro['nombre'] ?? ''),
            descripcion: String(filaRegistro['descripcion'] ?? ''),
            imagen: String(filaRegistro['imagen'] ?? ''),
            productos: itemsPorCombo.get(id) ?? [],
            incluyeEntrada: Boolean(
              filaRegistro['incluyeEntrada'] ?? filaRegistro['incluye_entrada'] ?? false,
            ),
            precioFijo: Number(filaRegistro['precioFijo'] ?? filaRegistro['precio_fijo'] ?? 0),
            activo: Boolean(filaRegistro['activo'] ?? true),
            destacado: Boolean(filaRegistro['destacado'] ?? false),
          };
        });

        const filaConfiguracion =
          ((configuracionR.data ?? [])[0] as Record<string, unknown> | undefined) ?? {};

        const configuracion: Configuracion = {
          porcentajePrimeraCompra: Number(
            filaConfiguracion['porcentajePrimeraCompra'] ??
              filaConfiguracion['porcentaje_primera_compra'] ??
              20,
          ),
          porcentajeMayores50: Number(
            filaConfiguracion['porcentajeMayores50'] ??
              filaConfiguracion['porcentaje_mayores_50'] ??
              15,
          ),
          multiplicadorVip: Number(
            filaConfiguracion['multiplicadorVip'] ?? filaConfiguracion['multiplicador_vip'] ?? 1.2,
          ),
          puntosPorEntrada: Number(
            filaConfiguracion['puntosPorEntrada'] ?? filaConfiguracion['puntos_por_entrada'] ?? 10,
          ),
          puntosPorProductoCandy: Number(
            filaConfiguracion['puntosPorProductoCandy'] ??
              filaConfiguracion['puntos_por_producto_candy'] ??
              2,
          ),
          diasAnticipacionPreventa: Number(
            filaConfiguracion['diasAnticipacionPreventa'] ??
              filaConfiguracion['dias_anticipacion_preventa'] ??
              3,
          ),
        };

        const cupones = (cuponesR.data ?? []).map((fila) => {
          const registro = fila as Record<string, unknown>;
          const tipo = String(registro['tipo'] ?? 'generico') as Cupon['tipo'];
          return {
            id: String(registro['id'] ?? ''),
            codigo: String(registro['codigo'] ?? ''),
            tipo:
              tipo === 'primera-compra' || tipo === 'mayores-50' || tipo === 'generico'
                ? tipo
                : 'generico',
            porcentaje: Number(registro['porcentaje'] ?? 0),
            activo: Boolean(registro['activo'] ?? true),
            descripcion: String(registro['descripcion'] ?? ''),
            usosPorUsuario: Number(registro['usosPorUsuario'] ?? registro['usos_por_usuario'] ?? 0),
          } as Cupon;
        });

        const recompensas = (recompensasR.data ?? []).map((fila) => {
          const registro = fila as Record<string, unknown>;
          const tipo = String(registro['tipo'] ?? 'entrada');
          return {
            id: String(registro['id'] ?? ''),
            tipo: tipo === 'producto-candy' ? 'producto-candy' : 'entrada',
            nombre: String(registro['nombre'] ?? ''),
            puntosRequeridos: Number(
              registro['puntosRequeridos'] ?? registro['puntos_requeridos'] ?? 0,
            ),
            activa: Boolean(registro['activa'] ?? true),
          } as Recompensa;
        });

        const resenas = (resenasR.data ?? []).map((fila) => {
          const registro = fila as Record<string, unknown>;
          return {
            id: String(registro['id'] ?? ''),
            idPelicula: String(registro['idPelicula'] ?? registro['id_pelicula'] ?? ''),
            idUsuario: String(registro['idUsuario'] ?? registro['id_usuario'] ?? ''),
            nombreUsuario: String(registro['nombreUsuario'] ?? registro['nombre_usuario'] ?? ''),
            estrellas: Number(registro['estrellas'] ?? 0),
            comentario: String(registro['comentario'] ?? ''),
            fecha: String(registro['fecha'] ?? registro['created_at'] ?? new Date().toISOString()),
            idCompraVerificada: String(
              registro['idCompraVerificada'] ?? registro['id_compra_verificada'] ?? '',
            ),
          } as Resena;
        });

        const usuarios = (usuariosR.data ?? []).map((fila) => {
          const filaRegistro = fila as Record<string, unknown>;
          return {
            id: String(filaRegistro['id'] ?? ''),
            email: String(filaRegistro['email'] ?? ''),
            password: String(filaRegistro['password'] ?? ''),
            nombre: String(filaRegistro['nombre'] ?? ''),
            apellido: String(filaRegistro['apellido'] ?? ''),
            fechaNacimiento: String(
              filaRegistro['fechaNacimiento'] ?? filaRegistro['fecha_nacimiento'] ?? '',
            ),
            tipoSangre: String(filaRegistro['tipoSangre'] ?? filaRegistro['tipo_sangre'] ?? ''),
            colorOjos: String(filaRegistro['colorOjos'] ?? filaRegistro['color_ojos'] ?? ''),
            diasVacaciones: Number(
              filaRegistro['diasVacaciones'] ?? filaRegistro['dias_vacaciones'] ?? 0,
            ),
            rol:
              filaRegistro['rol'] === 'empleado' || filaRegistro['rol'] === 'administrador'
                ? (filaRegistro['rol'] as Usuario['rol'])
                : 'cliente',
            primeraCompraUsada: Boolean(
              filaRegistro['primeraCompraUsada'] ?? filaRegistro['primera_compra_usada'] ?? false,
            ),
          } as UsuarioMock;
        });

        return of({
          generos,
          peliculas,
          salas,
          funciones,
          candy: { categorias, productos, combos },
          configuracion: { configuracion, cupones, recompensas },
          resenas,
          usuarios: { usuarios },
        });
            },
          ),
        ),
      ),
    );
  }

  private configuracionPorDefecto(): Configuracion {
    return {
      porcentajePrimeraCompra: 20,
      porcentajeMayores50: 15,
      multiplicadorVip: 1.2,
      puntosPorEntrada: 10,
      puntosPorProductoCandy: 2,
      diasAnticipacionPreventa: 3,
    };
  }

  private async seleccionarGeneros(
    cliente: SupabaseClient,
  ): Promise<{ data: unknown[] | null; error: { code?: string; message: string } | null }> {
    const respuesta = await cliente.from('generos_peliculas').select('*');
    if (this.esErrorTablaInexistente(respuesta.error?.code)) {
      return {
        data: [],
        error: null,
      };
    }

    return {
      data: (respuesta.data as unknown[] | null) ?? [],
      error: respuesta.error
        ? { code: respuesta.error.code, message: respuesta.error.message }
        : null,
    };
  }

  private async seleccionarPeliculas(
    cliente: SupabaseClient,
  ): Promise<{ data: unknown[] | null; error: { code?: string; message: string } | null }> {
    const principal = await cliente.from('peliculas').select('*');
    if (!principal.error) {
      return {
        data: (principal.data as unknown[] | null) ?? [],
        error: null,
      };
    }

    if (!this.esErrorTablaInexistente(principal.error.code)) {
      return {
        data: null,
        error: { code: principal.error.code, message: principal.error.message },
      };
    }

    const alternativo = await cliente.from('peliculas_cine').select('*');
    if (this.esErrorTablaInexistente(alternativo.error?.code)) {
      return {
        data: [],
        error: null,
      };
    }

    return {
      data: (alternativo.data as unknown[] | null) ?? [],
      error: alternativo.error
        ? { code: alternativo.error.code, message: alternativo.error.message }
        : null,
    };
  }

  private async seleccionarPeliculasGeneros(
    cliente: SupabaseClient,
  ): Promise<{ data: unknown[] | null; error: { code?: string; message: string } | null }> {
    const principal = await cliente.from('peliculas_generos').select('*');
    if (!principal.error) {
      return {
        data: (principal.data as unknown[] | null) ?? [],
        error: null,
      };
    }

    if (!this.esErrorTablaInexistente(principal.error.code)) {
      return {
        data: null,
        error: { code: principal.error.code, message: principal.error.message },
      };
    }

    const alternativo = await cliente.from('peliculas_generos_cine').select('*');
    if (this.esErrorTablaInexistente(alternativo.error?.code)) {
      return {
        data: [],
        error: null,
      };
    }

    return {
      data: (alternativo.data as unknown[] | null) ?? [],
      error: alternativo.error
        ? { code: alternativo.error.code, message: alternativo.error.message }
        : null,
    };
  }

  private async seleccionarTablaOpcional(
    cliente: SupabaseClient,
    tabla: string,
  ): Promise<{ data: unknown[] | null; error: { code?: string; message: string } | null }> {
    const respuesta = await cliente.from(tabla).select('*');
    if (this.esErrorTablaInexistente(respuesta.error?.code)) {
      return {
        data: [],
        error: null,
      };
    }

    return {
      data: (respuesta.data as unknown[] | null) ?? [],
      error: respuesta.error
        ? { code: respuesta.error.code, message: respuesta.error.message }
        : null,
    };
  }

  private async seleccionarComentarios(
    cliente: SupabaseClient,
  ): Promise<{ data: unknown[] | null; error: { code?: string; message: string } | null }> {
    const tablas = ['comentarios_peliculas', 'comentarios', 'resenas'];

    for (const tabla of tablas) {
      const respuesta = await this.seleccionarTablaOpcional(cliente, tabla);
      if (!respuesta.error) {
        return respuesta;
      }
    }

    return {
      data: [],
      error: null,
    };
  }

  private esErrorTablaInexistente(codigo?: string): boolean {
    return codigo === 'PGRST205' || codigo === '42P01';
  }

  private construirBase(semilla: {
    generos: Genero[];
    peliculas: Pelicula[];
    salas: Omit<Sala, 'butacas'>[];
    funciones: Funcion[];
    candy: { categorias: CategoriaCandy[]; productos: Producto[]; combos: Combo[] };
    configuracion: { configuracion: Configuracion; cupones: Cupon[]; recompensas: Recompensa[] };
    resenas: Resena[];
    usuarios: { usuarios: UsuarioMock[] };
  }): BaseDatos {
    const peliculas: Pelicula[] = [...semilla.peliculas];

    const salas: Sala[] = semilla.salas.map((sala) => ({
      ...sala,
      butacas: generarButacas(sala.id),
    }));

    const funciones = [...semilla.funciones].sort((a, b) => a.inicio.localeCompare(b.inicio));

    return {
      generos: semilla.generos,
      peliculas,
      salas,
      funciones,
      categorias: semilla.candy.categorias,
      productos: semilla.candy.productos,
      combos: semilla.candy.combos,
      cupones: semilla.configuracion.cupones,
      recompensas: semilla.configuracion.recompensas,
      resenas: semilla.resenas,
      usuarios: semilla.usuarios.usuarios,
      configuracion: semilla.configuracion.configuracion,

      compras: [],
      codigosQr: [],
      ocupacion: new Map(),
      movimientosPuntos: [],
      movimientosCredito: [],
      canjes: [],
      alertas: [],
      registros: [],
      cuponesUsados: new Map(),
    };
  }

  private normalizarRelacion(idOriginal: string, idsDisponibles: Set<string>, prefijo: string): string {
    if (idsDisponibles.has(idOriginal)) return idOriginal;

    const limpio = String(idOriginal).trim();
    if (!limpio) return idOriginal;

    const sinPrefijo = limpio.replace(new RegExp(`^${prefijo}`), '');
    const candidatoNumerico = String(Number(sinPrefijo));
    if (!Number.isNaN(Number(sinPrefijo)) && idsDisponibles.has(candidatoNumerico)) {
      return candidatoNumerico;
    }

    const candidatoConPrefijo = `${prefijo}${limpio}`;
    if (idsDisponibles.has(candidatoConPrefijo)) {
      return candidatoConPrefijo;
    }

    return idOriginal;
  }

  private derivarSalasDesdeFunciones(
    filasFunciones: unknown[],
    salasExistentes: { id: string; numero: number; nombre: string }[],
  ): { id: string; numero: number; nombre: string }[] {
    const idsUsados = new Set(salasExistentes.map((sala) => sala.id));
    const nombresUsados = new Set(
      salasExistentes.map((sala) => this.normalizarTexto(sala.nombre)).filter((nombre) => nombre),
    );
    const derivadas: { id: string; numero: number; nombre: string }[] = [];

    for (const fila of filasFunciones) {
      const registro = fila as Record<string, unknown>;
      const nombreSala = String(registro['nombreSala'] ?? registro['nombre_sala'] ?? '').trim();
      const nombreNormalizado = this.normalizarTexto(nombreSala);
      if (!nombreNormalizado || nombresUsados.has(nombreNormalizado)) continue;

      const idCrudo = String(
        registro['idSala'] ??
          registro['id_sala'] ??
          registro['salaId'] ??
          registro['sala_id'] ??
          '',
      ).trim();

      let id = idCrudo || `s-${derivadas.length + 1}`;
      if (idsUsados.has(id)) {
        id = `s-${id}-${derivadas.length + 1}`;
      }

      idsUsados.add(id);
      nombresUsados.add(nombreNormalizado);

      derivadas.push({
        id,
        numero: this.extraerNumeroSala(nombreSala) ?? salasExistentes.length + derivadas.length + 1,
        nombre: nombreSala,
      });
    }

    return derivadas;
  }

  private extraerNumeroSala(nombreSala: string): number | null {
    const coincidencia = nombreSala.match(/\d+/);
    if (!coincidencia) return null;
    const numero = Number(coincidencia[0]);
    return Number.isFinite(numero) ? numero : null;
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private resolverInicioFuncion(registro: Record<string, unknown>): string {
    const inicioDirecto = String(
      registro['inicio'] ?? registro['inicio_funcion'] ?? registro['fecha_hora_inicio'] ?? '',
    ).trim();
    if (this.esFechaValida(inicioDirecto)) {
      return new Date(inicioDirecto).toISOString();
    }

    const fecha = String(registro['fecha'] ?? registro['dia'] ?? '').trim();
    const horarioCrudo = String(registro['horario'] ?? '').trim();
    const horario = horarioCrudo.length >= 5 ? horarioCrudo.slice(0, 5) : horarioCrudo;

    const desdeDiaCrudo = Number(registro['desde_dia'] ?? registro['desdeDia'] ?? NaN);
    if (!fecha && Number.isFinite(desdeDiaCrudo) && horario) {
      const base = new Date();
      const fechaBase = soloFecha(sumarDias(base, desdeDiaCrudo));
      const inicioPorPlantilla = new Date(`${fechaBase}T${horario}:00`);
      return Number.isNaN(inicioPorPlantilla.getTime()) ? '' : inicioPorPlantilla.toISOString();
    }

    if (!fecha || !horario) return '';

    const inicioCompuesto = new Date(`${fecha}T${horario}:00`);
    return Number.isNaN(inicioCompuesto.getTime()) ? '' : inicioCompuesto.toISOString();
  }

  private resolverFinFuncion(
    registro: Record<string, unknown>,
    inicio: string,
    duracionMinutosPelicula: number,
  ): string {
    const finDirecto = String(
      registro['fin'] ?? registro['fin_funcion'] ?? registro['fecha_hora_fin'] ?? '',
    ).trim();
    if (this.esFechaValida(finDirecto)) {
      return new Date(finDirecto).toISOString();
    }

    if (!this.esFechaValida(inicio)) return '';

    const duracion = Number(
      registro['duracionMinutos'] ?? registro['duracion_minutos'] ?? duracionMinutosPelicula,
    );
    if (!Number.isFinite(duracion) || duracion <= 0) return '';

    const fin = new Date(new Date(inicio).getTime() + duracion * 60_000);
    return fin.toISOString();
  }

  private esFechaValida(valor: string): boolean {
    if (!valor.trim()) return false;
    return !Number.isNaN(new Date(valor).getTime());
  }

  // ───────────────────────────── utilidades ─────────────────────────────

  /**
   * Estado de ocupación de una función.
   *
   * TODO Supabase:
   *   this.cliente.from('butacas_funcion')
   *     .select('id_butaca, estado')
   *     .eq('id_funcion', idFuncion)
   *
   * RLS: lectura pública. La escritura pasa por la RPC `reservar_butacas`,
   * que hace `SELECT ... FOR UPDATE` para que dos compras simultáneas no
   * puedan quedarse con la misma butaca.
   */
  ocupacionDe(base: BaseDatos, idFuncion: string): Map<string, EstadoButaca> {
    let mapa = base.ocupacion.get(idFuncion);
    if (!mapa) {
      mapa = new Map();
      base.ocupacion.set(idFuncion, mapa);
    }
    return mapa;
  }

  butacasDeSala(base: BaseDatos, idSala: string): Butaca[] {
    return base.salas.find((s) => s.id === idSala)?.butacas ?? [];
  }

  /** Identificador legible y único dentro de la sesión. */
  nuevoId(prefijo: string): string {
    return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /** Observable ya resuelto, para los métodos que no necesitan la base. */
  inmediato<T>(valor: T): Observable<T> {
    return of(valor);
  }

  /** Cliente de Supabase para los servicios migrados. */
  get cliente(): SupabaseClient | null {
    return this.clienteSupabase;
  }

  private crearClienteSupabase(): SupabaseClient | null {
    const url = supabaseConfig.supabaseUrl?.trim();
    const key = supabaseConfig.supabaseKey?.trim();
    if (!url || !key) return null;

    const fetchConApiKey: typeof fetch = async (input, init) => {
      const objetivo =
        typeof input === 'string' || input instanceof URL
          ? new URL(String(input))
          : new URL(input.url);

      if (objetivo.origin === new URL(url).origin && !objetivo.searchParams.has('apikey')) {
        objetivo.searchParams.set('apikey', key);
      }

      return fetch(objetivo.toString(), init);
    };

    return createClient(url, key, {
      global: {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        fetch: fetchConApiKey,
      },
    });
  }
}
