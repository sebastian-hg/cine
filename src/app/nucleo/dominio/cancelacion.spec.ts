import { evaluarCancelacion } from './cancelacion';
import { HORA_MS } from './fechas';

/** Verificación de la Fase 7 del plan. §19 de la consigna. */

const AHORA = new Date('2026-09-20T18:00:00');
const enHoras = (h: number) => new Date(AHORA.getTime() + h * HORA_MS).toISOString();

describe('evaluarCancelacion', () => {
  it('permite cancelar con 3 horas de anticipación', () => {
    const r = evaluarCancelacion(enHoras(3), AHORA);
    expect(r.puede).toBe(true);
  });

  it('rechaza cancelar con 1 hora de anticipación', () => {
    const r = evaluarCancelacion(enHoras(1), AHORA);
    expect(r.puede).toBe(false);
    if (!r.puede) expect(r.motivo).toContain('2 horas antes');
  });

  it('permite cancelar justo en el límite de 2 horas', () => {
    expect(evaluarCancelacion(enHoras(2), AHORA).puede).toBe(true);
  });

  it('rechaza un minuto después del límite', () => {
    const r = evaluarCancelacion(new Date(AHORA.getTime() + 119 * 60_000).toISOString(), AHORA);
    expect(r.puede).toBe(false);
  });

  it('distingue una función ya empezada de una fuera de plazo', () => {
    const empezada = evaluarCancelacion(enHoras(-1), AHORA);
    expect(empezada.puede).toBe(false);
    if (!empezada.puede) expect(empezada.motivo).toContain('ya comenzó');
  });

  it('informa cuántas horas faltan cuando se puede cancelar', () => {
    const r = evaluarCancelacion(enHoras(5), AHORA);
    expect(r.puede).toBe(true);
    if (r.puede) expect(r.horasRestantes).toBeCloseTo(5, 5);
  });
});
