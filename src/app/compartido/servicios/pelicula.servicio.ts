import { Service, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

import { Pelicula, PeliculaConMetricas } from '../interfaces/pelicula.interfaz';
import { estadoPreventa } from '../../nucleo/dominio/preventa';
import { SupabaseServicio, BaseDatos } from '../../nucleo/servicios/supabase.servicio';

/** Cuántas películas destacadas muestra la página principal (§3). */
export const CANTIDAD_MAS_VENDIDAS = 3;

/**
 * Catálogo de películas (§2, §3, §16, §17).
 *
 * El filtrado por texto y por géneros vive acá y no en un pipe: un pipe impuro
 * se reevalúa en cada ciclo de detección de cambios y sería el cuello de botella
 * de la página principal.
 */
@Service()
export class PeliculaServicio {
  private readonly supabase = inject(SupabaseServicio);

  private readonly texto = new BehaviorSubject<string>('');
  private readonly generos = new BehaviorSubject<string[]>([]);

  /** Criterios de búsqueda vigentes, para que el buscador refleje el estado. */
  readonly texto$ = this.texto.asObservable();
  readonly generosSeleccionados$ = this.generos.asObservable();

  buscar(texto: string): void {
    this.texto.next(texto);
  }

  filtrarPorGeneros(ids: string[]): void {
    this.generos.next(ids);
  }

  limpiarFiltros(): void {
    this.texto.next('');
    this.generos.next([]);
  }

  /**
   * TODO Supabase:
   *   from('peliculas')
   *     .select('*, peliculas_generos(id_genero), resenas(estrellas)')
   *     .eq('disponible', true)
   *
   * RLS: SELECT público sobre `peliculas` donde `disponible = true`.
   * Storage: `poster` guarda la ruta dentro del bucket público `posters`.
   */
  listar(): Observable<PeliculaConMetricas[]> {
    return this.supabase.consultar((base) =>
      base.peliculas.map((pelicula) => this.conMetricas(pelicula, base)),
    );
  }

  obtener(id: string): Observable<PeliculaConMetricas | null> {
    return this.supabase.consultar((base) => {
      const pelicula = base.peliculas.find((p) => p.id === id);
      return pelicula ? this.conMetricas(pelicula, base) : null;
    });
  }

  /** Películas ya estrenadas y disponibles: lo que va en la cartelera. */
  enCartelera(): Observable<PeliculaConMetricas[]> {
    return this.supabase.consultar((base) =>
      base.peliculas
        .filter((p) => p.disponible)
        .filter((p) => !estadoPreventa(p, base.configuracion.diasAnticipacionPreventa).proximamente)
        .map((p) => this.conMetricas(p, base)),
    );
  }

  /** §17: películas que todavía no se estrenaron. */
  proximamente(): Observable<PeliculaConMetricas[]> {
    return this.supabase.consultar((base) =>
      base.peliculas
        .filter((p) => p.disponible)
        .filter((p) => estadoPreventa(p, base.configuracion.diasAnticipacionPreventa).proximamente)
        .sort((a, b) => a.fechaEstreno.localeCompare(b.fechaEstreno))
        .map((p) => this.conMetricas(p, base)),
    );
  }

  /** §3: las 3 más vendidas se muestran primero en la página principal. */
  masVendidas(cantidad = CANTIDAD_MAS_VENDIDAS): Observable<PeliculaConMetricas[]> {
    return this.enCartelera().pipe(
      map((peliculas) =>
        [...peliculas].sort((a, b) => b.entradasVendidas - a.entradasVendidas).slice(0, cantidad),
      ),
    );
  }

  /**
   * Cartelera ya filtrada por el buscador y por los géneros elegidos.
   *
   * Se recalcula solo cuando cambia alguno de los tres flujos, no en cada
   * ciclo de detección de cambios.
   */
  carteleraFiltrada(): Observable<PeliculaConMetricas[]> {
    return combineLatest([this.enCartelera(), this.texto$, this.generosSeleccionados$]).pipe(
      map(([peliculas, texto, generos]) => {
        const aguja = texto.trim().toLowerCase();

        return peliculas.filter((pelicula) => {
          const coincideTexto =
            !aguja ||
            pelicula.nombre.toLowerCase().includes(aguja) ||
            pelicula.sinopsis.toLowerCase().includes(aguja);

          // Varios géneros seleccionados: alcanza con que la película tenga uno.
          const coincideGenero =
            generos.length === 0 || generos.some((id) => pelicula.generos.includes(id));

          return coincideTexto && coincideGenero;
        });
      }),
    );
  }

  crear(datos: Omit<Pelicula, 'id'>): Observable<Pelicula> {
    return this.supabase.transaccion((base) => {
      const pelicula: Pelicula = { ...datos, id: this.supabase.nuevoId('p') };
      base.peliculas.push(pelicula);
      return pelicula;
    });
  }

  actualizar(id: string, cambios: Partial<Omit<Pelicula, 'id'>>): Observable<void> {
    return this.supabase.transaccion((base) => {
      const pelicula = base.peliculas.find((p) => p.id === id);
      if (pelicula) Object.assign(pelicula, cambios);
    });
  }

  /** Cruza la película con lo que hace falta mostrar en la cartelera. */
  private conMetricas(pelicula: Pelicula, base: BaseDatos): PeliculaConMetricas {
    const resenas = base.resenas.filter((r) => r.idPelicula === pelicula.id);
    const suma = resenas.reduce((total, r) => total + r.estrellas, 0);

    const funcionesDeLaPelicula = new Set(
      base.funciones.filter((f) => f.idPelicula === pelicula.id).map((f) => f.id),
    );
    const vendidasEnSesion = base.compras
      .filter((c) => c.estado !== 'cancelada')
      .flatMap((c) => c.items)
      .filter((i) => i.tipo === 'entrada' && funcionesDeLaPelicula.has(i.idFuncion)).length;

    return {
      ...pelicula,
      puntuacionPromedio: resenas.length ? suma / resenas.length : 0,
      cantidadResenas: resenas.length,
      entradasVendidas: pelicula.ventasPrevias + vendidasEnSesion,
    };
  }
}
