export type Modalidad = '2D' | '3D' | '4D' | '5D';
export type Idioma = 'castellano' | 'subtitulada';

/**
 * Una proyección concreta (§4).
 *
 * `idSala` identifica la sala elegida al programar la función.
 */
export interface Funcion {
  id: string;
  idPelicula: string;
  idSala: string;
  /** ISO 8601 con hora. */
  inicio: string;
  /**
   * ISO 8601. Derivable de `inicio + duracionMinutos`, pero se persiste para que
   * la detección de solapes sea una comparación directa y no un join por función.
   */
  fin: string;
  modalidad: Modalidad;
  idioma: Idioma;
  precio: number;
}

/** Datos que el administrador carga para programar una o más funciones. */
export interface SolicitudFuncion {
  idPelicula: string;
  idSala: string;
  /** Fechas ISO `YYYY-MM-DD`, una por cada día de la semana elegido. */
  fechas: string[];
  /** `HH:mm` */
  horario: string;
  modalidad: Modalidad;
  idioma: Idioma;
  precio: number;
}

/** Resultado de intentar programar una función. */
export type ResultadoProgramacion =
  | { asignada: true; funcion: Funcion; nombreSala: string }
  | { asignada: false; motivo: string };
