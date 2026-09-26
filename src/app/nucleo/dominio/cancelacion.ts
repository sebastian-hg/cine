import { HORA_MS } from './fechas';

/**
 * Ventana de cancelación (§19 de la consigna).
 *
 * Se puede cancelar hasta 2 horas antes de la función. No hay devolución de
 * dinero: se genera crédito en la cuenta, que puede combinarse con otros medios
 * de pago en compras futuras.
 */

export const HORAS_LIMITE_CANCELACION = 2;

export type EvaluacionCancelacion =
  | { puede: true; horasRestantes: number }
  | { puede: false; motivo: string };

export function evaluarCancelacion(
  inicioFuncionIso: string,
  ahora = new Date(),
): EvaluacionCancelacion {
  const inicio = new Date(inicioFuncionIso).getTime();
  const limite = inicio - HORAS_LIMITE_CANCELACION * HORA_MS;
  const restante = inicio - ahora.getTime();

  if (ahora.getTime() <= limite) {
    return { puede: true, horasRestantes: restante / HORA_MS };
  }

  if (restante <= 0) {
    return { puede: false, motivo: 'La función ya comenzó.' };
  }

  return {
    puede: false,
    motivo: `Solo se puede cancelar hasta ${HORAS_LIMITE_CANCELACION} horas antes de la función.`,
  };
}
