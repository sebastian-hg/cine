import { Funcion } from '../../compartido/interfaces/funcion.interfaz';
import { Sala } from '../../compartido/interfaces/sala.interfaz';
import { MINUTO_MS, sumarMinutos } from './fechas';

/**
 * Asignación automática de salas (§4 de la consigna).
 *
 * El administrador define película, día, horario, modalidad, idioma y precio;
 * nunca la sala. El sistema busca una sala libre contemplando la duración de la
 * película y dejando 30 minutos de separación entre funciones.
 *
 *     Película A: 18:00 → dura 120 min → termina 20:00
 *     La siguiente función de esa sala no puede empezar antes de las 20:30
 */

/** Minutos que deben quedar libres entre dos funciones de una misma sala. */
export const SEPARACION_MINUTOS = 30;

interface Intervalo {
  inicio: number;
  fin: number;
}

function aIntervalo(inicio: Date, duracionMinutos: number): Intervalo {
  return { inicio: inicio.getTime(), fin: sumarMinutos(inicio, duracionMinutos).getTime() };
}

/**
 * ¿Pueden convivir dos funciones en la misma sala?
 *
 * Hay lugar si la nueva empieza al menos 30 minutos después de que termina la
 * existente, o si termina al menos 30 minutos antes de que la existente empieza.
 */
export function haySeparacionSuficiente(
  nueva: Intervalo,
  existente: Intervalo,
  separacionMinutos = SEPARACION_MINUTOS,
): boolean {
  const separacion = separacionMinutos * MINUTO_MS;
  return nueva.inicio >= existente.fin + separacion || nueva.fin + separacion <= existente.inicio;
}

export interface SolicitudAsignacion {
  inicio: Date;
  duracionMinutos: number;
}

export type ResultadoAsignacion =
  | { asignada: true; sala: Sala }
  | { asignada: false; motivo: string };

/**
 * Devuelve la primera sala que puede alojar la función pedida.
 *
 * `funcionesExistentes` son todas las funciones ya programadas: se filtran por
 * sala acá adentro para que quien llama no tenga que agruparlas.
 */
export function asignarSala(
  solicitud: SolicitudAsignacion,
  salas: readonly Sala[],
  funcionesExistentes: readonly Funcion[],
  duracionPorFuncion: (funcion: Funcion) => number,
): ResultadoAsignacion {
  if (salas.length === 0) {
    return { asignada: false, motivo: 'No hay salas configuradas.' };
  }

  const nueva = aIntervalo(solicitud.inicio, solicitud.duracionMinutos);

  for (const sala of salas) {
    const ocupacion = funcionesExistentes
      .filter((f) => f.idSala === sala.id)
      .map((f) => aIntervalo(new Date(f.inicio), duracionPorFuncion(f)));

    const libre = ocupacion.every((existente) => haySeparacionSuficiente(nueva, existente));
    if (libre) {
      return { asignada: true, sala };
    }
  }

  return {
    asignada: false,
    motivo: `No hay salas disponibles en ese horario. Se necesitan ${SEPARACION_MINUTOS} minutos libres antes y después de cada función.`,
  };
}
