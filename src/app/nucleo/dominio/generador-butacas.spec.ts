import {
  FILAS,
  FILAS_ACCESIBLES,
  FILAS_VIP,
  etiquetaButaca,
  generarButacas,
} from './generador-butacas';

/**
 * Verificación de la Fase 3 del plan.
 *
 * §5 de la consigna: 20 filas A→T en sectores 4|20|4, salvo J y K que pasan a
 * accesibles con 2|10|2, y R, S, T que son VIP.
 *
 *   15 filas normales × 28  = 420
 *    2 filas accesibles × 14 =  28
 *    3 filas VIP × 28        =  84
 *                            ─────
 *                              532
 */
describe('generarButacas', () => {
  const butacas = generarButacas('s1');

  it('genera 532 butacas por sala', () => {
    expect(butacas).toHaveLength(532);
  });

  it('cubre las 20 filas de la A a la T', () => {
    expect(FILAS).toHaveLength(20);
    const filas = new Set(butacas.map((b) => b.fila));
    expect(filas.size).toBe(20);
    expect([...filas].sort().join('')).toBe('ABCDEFGHIJKLMNOPQRST');
  });

  it('pone 28 butacas accesibles, todas en las filas J y K', () => {
    const accesibles = butacas.filter((b) => b.tipo === 'accesible');
    expect(accesibles).toHaveLength(28);
    expect(new Set(accesibles.map((b) => b.fila))).toEqual(new Set(FILAS_ACCESIBLES));
  });

  it('no deja ninguna butaca normal en las filas accesibles', () => {
    const enFilasAccesibles = butacas.filter((b) => FILAS_ACCESIBLES.includes(b.fila));
    expect(enFilasAccesibles).toHaveLength(28);
    expect(enFilasAccesibles.every((b) => b.tipo === 'accesible')).toBe(true);
  });

  it('reparte las accesibles en sectores de 2 | 10 | 2', () => {
    const filaJ = butacas.filter((b) => b.fila === 'J');
    expect(filaJ.filter((b) => b.sector === 'izquierda')).toHaveLength(2);
    expect(filaJ.filter((b) => b.sector === 'centro')).toHaveLength(10);
    expect(filaJ.filter((b) => b.sector === 'derecha')).toHaveLength(2);
  });

  it('pone 84 butacas VIP en las filas R, S y T', () => {
    const vip = butacas.filter((b) => b.tipo === 'vip');
    expect(vip).toHaveLength(84);
    expect(new Set(vip.map((b) => b.fila))).toEqual(new Set(FILAS_VIP));
  });

  it('reparte las filas normales en sectores de 4 | 20 | 4', () => {
    const filaA = butacas.filter((b) => b.fila === 'A');
    expect(filaA).toHaveLength(28);
    expect(filaA.filter((b) => b.sector === 'izquierda')).toHaveLength(4);
    expect(filaA.filter((b) => b.sector === 'centro')).toHaveLength(20);
    expect(filaA.filter((b) => b.sector === 'derecha')).toHaveLength(4);
  });

  it('numera de 1 a N de izquierda a derecha, atravesando los sectores', () => {
    const filaA = butacas.filter((b) => b.fila === 'A');
    expect(filaA.map((b) => b.numero)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    // La butaca 5 es la primera del sector central en una fila normal.
    expect(filaA.find((b) => b.numero === 4)?.sector).toBe('izquierda');
    expect(filaA.find((b) => b.numero === 5)?.sector).toBe('centro');
  });

  it('asigna identificadores únicos', () => {
    expect(new Set(butacas.map((b) => b.id)).size).toBe(butacas.length);
  });

  it('arma la etiqueta corta que ve el usuario', () => {
    expect(etiquetaButaca({ fila: 'F', numero: 12 })).toBe('F12');
  });
});
