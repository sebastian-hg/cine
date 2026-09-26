import { evaluarEdad, evaluarFechaNacimiento, requiereVerificacion } from './restriccion-edad';
import { calcularEdad } from './fechas';

/** Verificación de la Fase 6 del plan. §7 de la consigna, supuesto 4. */

const AHORA = new Date('2026-09-20T12:00:00');

describe('calcularEdad', () => {
  it('cuenta años cumplidos', () => {
    expect(calcularEdad('1995-03-12', AHORA)).toBe(31);
  });

  it('resta un año si todavía no pasó el cumpleaños', () => {
    expect(calcularEdad('1995-09-21', AHORA)).toBe(30);
  });

  it('cuenta el año el mismo día del cumpleaños', () => {
    expect(calcularEdad('1995-09-20', AHORA)).toBe(31);
  });
});

describe('evaluarEdad', () => {
  describe('ATP', () => {
    it('deja pasar a cualquier edad', () => {
      expect(evaluarEdad(4, 'ATP').permitido).toBe(true);
      expect(evaluarEdad(80, 'ATP').permitido).toBe(true);
    });
  });

  describe('+13', () => {
    it('deja pasar a los 13', () => {
      const r = evaluarEdad(13, '+13');
      expect(r.permitido).toBe(true);
      if (r.permitido) expect(r.requiereAdulto).toBe(false);
    });

    it('deja pasar a un menor de 13 pero exige adulto acompañante', () => {
      const r = evaluarEdad(11, '+13');
      expect(r.permitido).toBe(true);
      if (r.permitido) {
        expect(r.requiereAdulto).toBe(true);
        expect(r.aviso).toContain('adulto responsable');
      }
    });
  });

  describe('+18', () => {
    it('deja pasar a los 18', () => {
      expect(evaluarEdad(18, '+18').permitido).toBe(true);
    });

    it('bloquea a los 17 sin excepción de acompañante', () => {
      const r = evaluarEdad(17, '+18');
      expect(r.permitido).toBe(false);
      if (!r.permitido) {
        expect(r.motivo).toContain('+18');
        expect(r.motivo).toContain('17');
      }
    });
  });
});

describe('evaluarFechaNacimiento', () => {
  it('bloquea al usuario de 12 años en +18', () => {
    // Tomás, 2014-06-04 → 12 años.
    const r = evaluarFechaNacimiento('2014-06-04', '+18', AHORA);
    expect(r.permitido).toBe(false);
  });

  it('bloquea al usuario de 12 años en +13, pero lo deja con adulto', () => {
    const r = evaluarFechaNacimiento('2014-06-04', '+13', AHORA);
    expect(r.permitido).toBe(true);
    if (r.permitido) expect(r.requiereAdulto).toBe(true);
  });

  it('deja pasar al de 15 años en +13 sin acompañante', () => {
    // Renata, 2011-03-15 → 15 años.
    const r = evaluarFechaNacimiento('2011-03-15', '+13', AHORA);
    expect(r.permitido).toBe(true);
    if (r.permitido) expect(r.requiereAdulto).toBe(false);
  });

  it('bloquea al de 15 años en +18', () => {
    expect(evaluarFechaNacimiento('2011-03-15', '+18', AHORA).permitido).toBe(false);
  });
});

describe('requiereVerificacion', () => {
  it('no pregunta la edad en una función ATP', () => {
    expect(requiereVerificacion('ATP')).toBe(false);
  });

  it('pregunta la edad en +13 y en +18', () => {
    expect(requiereVerificacion('+13')).toBe(true);
    expect(requiereVerificacion('+18')).toBe(true);
  });
});
