import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Observable, forkJoin, from, map, mergeMap, of, shareReplay, switchMap, take } from 'rxjs';

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
import { combinarFechaHora, soloFecha, sumarDias } from '../dominio/fechas';
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

/** Días de grilla que se generan hacia adelante a partir de hoy. */
const DIAS_DE_GRILLA = 7;

interface PeliculaSemilla extends Omit<Pelicula, 'fechaEstreno'> {
  diasHastaEstreno: number;
}

interface PlantillaFuncion {
  idPelicula: string;
  idSala: string;
  horario: string;
  modalidad: Modalidad;
  idioma: Idioma;
  precio: number;
  desdeDia: number;
}

interface ResenaSemilla extends Omit<Resena, 'fecha'> {
  diasAtras: number;
}

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
  private readonly http = inject(HttpClient);
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
    /*
     * TODO Supabase: nada de esto existe contra el backend real. El cliente se
     * crea una vez con `createClient(environment.supabaseUrl, anonKey)` y cada
     * método consulta su tabla. Se conserva la forma de los datos para que las
     * interfaces de `compartido/interfaces/` sigan valiendo tal cual.
     */
    return forkJoin({
      generos: this.http.get<Genero[]>('mock/generos.json'),
      peliculas: this.http.get<PeliculaSemilla[]>('mock/peliculas.json'),
      salas: this.http.get<Omit<Sala, 'butacas'>[]>('mock/salas.json'),
      funciones: this.http.get<{ plantillas: PlantillaFuncion[] }>('mock/funciones.json'),
      configuracion: this.http.get<{
        configuracion: Configuracion;
        cupones: Cupon[];
        recompensas: Recompensa[];
      }>('mock/configuracion.json'),
      resenas: this.http.get<ResenaSemilla[]>('mock/resenas.json'),
    }).pipe(
      mergeMap((semilla) =>
        this.cargarCandyYUsuariosRemotos().pipe(
          map((extra) =>
            this.construirBase({
              ...semilla,
              candy: extra.candy,
              usuarios: extra.usuarios,
            }),
          ),
        ),
      ),
    );
  }

  private cargarCandyYUsuariosRemotos(): Observable<{
    candy: { categorias: CategoriaCandy[]; productos: Producto[]; combos: Combo[] };
    usuarios: { usuarios: UsuarioMock[] };
  }> {
    const cliente = this.clienteSupabase;
    if (!cliente) {
      return of({
        candy: { categorias: [], productos: [], combos: [] },
        usuarios: { usuarios: [] },
      });
    }

    return from(
      Promise.all([
        cliente.from('categorias_candy').select('*'),
        cliente.from('productos_candy').select('*'),
        cliente.from('combos_candy').select('*'),
        cliente.from('combo_productos_candy').select('*'),
        cliente.from('usuarios_cine').select('*'),
      ]),
    ).pipe(
      mergeMap(([categoriasR, productosR, combosR, comboProductosR, usuariosR]) => {
        const error =
          categoriasR.error ??
          productosR.error ??
          combosR.error ??
          comboProductosR.error ??
          usuariosR.error;

        if (error) throw new Error(error.message);

        const categorias = (categoriasR.data ?? []).map((fila) => ({
          id: String((fila as Record<string, unknown>)['id'] ?? ''),
          nombre: String((fila as Record<string, unknown>)['nombre'] ?? ''),
          activa: Boolean((fila as Record<string, unknown>)['activa'] ?? true),
        }));

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
          candy: { categorias, productos, combos },
          usuarios: { usuarios },
        });
      }),
    );
  }

  private construirBase(semilla: {
    generos: Genero[];
    peliculas: PeliculaSemilla[];
    salas: Omit<Sala, 'butacas'>[];
    funciones: { plantillas: PlantillaFuncion[] };
    candy: { categorias: CategoriaCandy[]; productos: Producto[]; combos: Combo[] };
    configuracion: { configuracion: Configuracion; cupones: Cupon[]; recompensas: Recompensa[] };
    resenas: ResenaSemilla[];
    usuarios: { usuarios: UsuarioMock[] };
  }): BaseDatos {
    const hoy = new Date();

    /*
     * Las fechas de la semilla son desplazamientos en días, no fechas absolutas.
     * Con fechas fijas, a los pocos días todas las funciones quedarían en el
     * pasado y el flujo de compra dejaría de ser probable.
     */
    const peliculas: Pelicula[] = semilla.peliculas.map(({ diasHastaEstreno, ...resto }) => ({
      ...resto,
      fechaEstreno: soloFecha(sumarDias(hoy, diasHastaEstreno)),
    }));

    const salas: Sala[] = semilla.salas.map((sala) => ({
      ...sala,
      butacas: generarButacas(sala.id),
    }));

    const duracionPorPelicula = new Map(peliculas.map((p) => [p.id, p.duracionMinutos]));
    const funciones = this.expandirGrilla(semilla.funciones.plantillas, duracionPorPelicula, hoy);

    const resenas: Resena[] = semilla.resenas.map(({ diasAtras, ...resto }) => ({
      ...resto,
      fecha: sumarDias(hoy, -diasAtras).toISOString(),
    }));

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
      resenas,
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

  /** Expande la grilla semanal a funciones concretas sobre los próximos días. */
  private expandirGrilla(
    plantillas: PlantillaFuncion[],
    duracionPorPelicula: Map<string, number>,
    hoy: Date,
  ): Funcion[] {
    const funciones: Funcion[] = [];

    for (const plantilla of plantillas) {
      const duracion = duracionPorPelicula.get(plantilla.idPelicula);
      if (duracion === undefined) continue;

      for (let dia = plantilla.desdeDia; dia < plantilla.desdeDia + DIAS_DE_GRILLA; dia++) {
        const inicio = combinarFechaHora(sumarDias(hoy, dia), plantilla.horario);
        // Una función que ya empezó no se ofrece.
        if (inicio.getTime() <= hoy.getTime()) continue;

        const fin = new Date(inicio.getTime() + duracion * 60_000);
        funciones.push({
          id: `f-${plantilla.idPelicula}-${plantilla.idSala}-${soloFecha(inicio)}-${plantilla.horario}`,
          idPelicula: plantilla.idPelicula,
          idSala: plantilla.idSala,
          inicio: inicio.toISOString(),
          fin: fin.toISOString(),
          modalidad: plantilla.modalidad,
          idioma: plantilla.idioma,
          precio: plantilla.precio,
        });
      }
    }

    return funciones.sort((a, b) => a.inicio.localeCompare(b.inicio));
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
    return createClient(url, key);
  }
}
