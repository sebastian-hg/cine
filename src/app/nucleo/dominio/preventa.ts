import { Pelicula } from '../../compartido/interfaces/pelicula.interfaz';
import { diferenciaDias, soloFecha } from './fechas';

/**
 * Preventa (§16 de la consigna).
 *
 * Se habilita película por película y arranca N días antes del estreno
 * (7 por configuración). Al llegar la fecha de estreno el precio vuelve solo al
 * normal: no hay proceso que lo cambie, es una función del momento actual.
 */

export interface EstadoPreventa {
  activa: boolean;
  /** Días que faltan para el estreno; negativo si ya se estrenó. */
  diasParaEstreno: number;
  /** `true` si la película todavía no se estrenó, esté o no en preventa. */
  proximamente: boolean;
}

export function estadoPreventa(
  pelicula: Pelicula,
  diasAnticipacion: number,
  ahora = new Date(),
): EstadoPreventa {
  const diasParaEstreno = diferenciaDias(soloFecha(ahora), pelicula.fechaEstreno);
  const proximamente = diasParaEstreno > 0;
  const activa =
    pelicula.preventaActivada && proximamente && diasParaEstreno <= diasAnticipacion;

  return { activa, diasParaEstreno, proximamente };
}

/** Precio base de una entrada de esta película, antes del recargo por butaca. */
export function precioBasePelicula(
  pelicula: Pelicula,
  precioFuncion: number,
  diasAnticipacion: number,
  ahora = new Date(),
): number {
  return estadoPreventa(pelicula, diasAnticipacion, ahora).activa
    ? pelicula.precioPreventa
    : precioFuncion;
}
