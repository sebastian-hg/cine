export type ClasificacionEdad = 'ATP' | '+13' | '+18';

/** Los 11 campos que §2 exige por película. */
export interface Pelicula {
  id: string;
  nombre: string;
  poster: string;
  sinopsis: string;
  duracionMinutos: number;
  /** Ids de género. Una película puede tener varios (§3). */
  generos: string[];
  clasificacion: ClasificacionEdad;
  /** ISO `YYYY-MM-DD`. */
  fechaEstreno: string;
  disponible: boolean;
  preventaActivada: boolean;
  precioPreventa: number;
  precioNormal: number;
  /**
   * Entradas vendidas antes de que arrancara la sesión.
   *
   * Sin esto el ranking de «3 más vendidas» (§3) arrancaría con todas las
   * películas en cero y el orden sería arbitrario.
   */
  ventasPrevias: number;
}

/** Película con los datos derivados que necesita la cartelera. */
export interface PeliculaConMetricas extends Pelicula {
  puntuacionPromedio: number;
  cantidadResenas: number;
  entradasVendidas: number;
}
