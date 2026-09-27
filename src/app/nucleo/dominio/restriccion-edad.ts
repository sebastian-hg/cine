import { ClasificacionEdad } from '../../compartido/interfaces/pelicula.interfaz';
import { calcularEdad } from './fechas';

/**
 * Restricción por edad (§7 de la consigna).
 *
 * Reglas de compra por edad:
 *   ATP → sin restricción
 *   +13 → menor de 13 bloqueado
 *   +18 → menor de 18 bloqueado
 */

export const EDAD_MINIMA: Record<ClasificacionEdad, number> = {
  ATP: 0,
  '+13': 13,
  '+18': 18,
};

export type ResultadoEdad =
  | { permitido: true; requiereAdulto: boolean; aviso: string | null }
  | { permitido: false; motivo: string };

/** Evalúa una edad concreta contra la clasificación de la película. */
export function evaluarEdad(edad: number, clasificacion: ClasificacionEdad): ResultadoEdad {
  const minima = EDAD_MINIMA[clasificacion];

  if (edad >= minima) {
    return {
      permitido: true,
      requiereAdulto: clasificacion !== 'ATP',
      aviso:
        clasificacion === 'ATP'
          ? null
          : `Esta función es ${clasificacion}. Puede solicitarse documento en la puerta y los menores deben asistir acompañados por un adulto responsable.`,
    };
  }

  return {
    permitido: false,
    motivo: `Esta función es ${clasificacion} y tenés ${edad} años. No es posible comprar entradas para esta película.`,
  };
}

/** Igual que `evaluarEdad`, partiendo de la fecha de nacimiento. */
export function evaluarFechaNacimiento(
  fechaNacimientoIso: string,
  clasificacion: ClasificacionEdad,
  ahora = new Date(),
): ResultadoEdad {
  return evaluarEdad(calcularEdad(fechaNacimientoIso, ahora), clasificacion);
}

/** ¿Hace falta preguntarle la edad al visitante antes de dejarlo comprar? */
export function requiereVerificacion(clasificacion: ClasificacionEdad): boolean {
  return EDAD_MINIMA[clasificacion] > 0;
}
