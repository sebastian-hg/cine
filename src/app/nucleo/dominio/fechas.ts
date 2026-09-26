/** Utilidades de fecha. Funciones puras, sin dependencias de Angular. */

export const MINUTO_MS = 60_000;
export const HORA_MS = 60 * MINUTO_MS;
export const DIA_MS = 24 * HORA_MS;

/** Fecha ISO `YYYY-MM-DD` del día indicado, sin componente horario. */
export function soloFecha(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Suma días a una fecha, devolviendo una instancia nueva. */
export function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

export function sumarMinutos(fecha: Date, minutos: number): Date {
  return new Date(fecha.getTime() + minutos * MINUTO_MS);
}

/** Combina un día con un horario `HH:mm` en un `Date` local. */
export function combinarFechaHora(dia: Date, horario: string): Date {
  const [hora, minuto] = horario.split(':').map(Number);
  const resultado = new Date(dia);
  resultado.setHours(hora, minuto, 0, 0);
  return resultado;
}

/**
 * Edad cumplida a día de hoy.
 *
 * Resta un año si todavía no pasó el cumpleaños de este año, que es la parte
 * que se suele resolver mal restando años sin más.
 */
export function calcularEdad(fechaNacimientoIso: string, ahora = new Date()): number {
  const nacimiento = new Date(`${fechaNacimientoIso}T00:00:00`);
  let edad = ahora.getFullYear() - nacimiento.getFullYear();
  const mes = ahora.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && ahora.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }
  return edad;
}

/** Diferencia en días naturales entre dos fechas ISO (`b - a`). */
export function diferenciaDias(desdeIso: string, hastaIso: string): number {
  const a = new Date(`${desdeIso}T00:00:00`).getTime();
  const b = new Date(`${hastaIso}T00:00:00`).getTime();
  return Math.round((b - a) / DIA_MS);
}
