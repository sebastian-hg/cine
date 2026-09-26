import { Funcion } from '../../compartido/interfaces/funcion.interfaz';
import { Sala } from '../../compartido/interfaces/sala.interfaz';
import { asignarSala } from './programacion-salas';

/**
 * Verificación de la Fase 3 del plan.
 *
 * §4 de la consigna, con su propio ejemplo:
 *   Película A: 18:00 → 120 min → termina 20:00
 *   La siguiente función de esa sala no puede empezar antes de las 20:30
 */

const DIA = '2026-09-21';
const sala = (id: string, nombre: string): Sala => ({ id, numero: 1, nombre, butacas: [] });
const hora = (hhmm: string) => new Date(`${DIA}T${hhmm}:00`);

/** Función ya programada de 18:00 a 20:00 en la sala indicada. */
function funcionDe18(idSala: string): Funcion {
  return {
    id: 'existente',
    idPelicula: 'pA',
    idSala,
    inicio: hora('18:00').toISOString(),
    fin: hora('20:00').toISOString(),
    modalidad: '2D',
    idioma: 'castellano',
    precio: 9000,
  };
}

/** La película A dura 120 minutos. */
const duracion = () => 120;

describe('asignarSala', () => {
  describe('con una sola sala ocupada de 18:00 a 20:00', () => {
    const salas = [sala('s1', 'Sala 1')];
    const existentes = [funcionDe18('s1')];

    it('rechaza una función a las 20:15, que no deja los 30 minutos', () => {
      const resultado = asignarSala(
        { inicio: hora('20:15'), duracionMinutos: 120 },
        salas,
        existentes,
        duracion,
      );
      expect(resultado.asignada).toBe(false);
    });

    it('acepta una función a las 20:30', () => {
      const resultado = asignarSala(
        { inicio: hora('20:30'), duracionMinutos: 120 },
        salas,
        existentes,
        duracion,
      );
      expect(resultado.asignada).toBe(true);
    });

    it('rechaza 20:29 y acepta 20:30 — el borde exacto', () => {
      const antes = asignarSala(
        { inicio: hora('20:29'), duracionMinutos: 120 },
        salas,
        existentes,
        duracion,
      );
      const justo = asignarSala(
        { inicio: hora('20:30'), duracionMinutos: 120 },
        salas,
        existentes,
        duracion,
      );
      expect(antes.asignada).toBe(false);
      expect(justo.asignada).toBe(true);
    });

    it('también respeta la separación hacia atrás', () => {
      // Termina 17:35, quedan solo 25 minutos antes de las 18:00.
      const pegada = asignarSala(
        { inicio: hora('15:35'), duracionMinutos: 120 },
        salas,
        existentes,
        duracion,
      );
      // Termina 17:30, justo 30 minutos antes.
      const justa = asignarSala(
        { inicio: hora('15:30'), duracionMinutos: 120 },
        salas,
        existentes,
        duracion,
      );
      expect(pegada.asignada).toBe(false);
      expect(justa.asignada).toBe(true);
    });

    it('explica el motivo cuando no hay lugar', () => {
      const resultado = asignarSala(
        { inicio: hora('20:15'), duracionMinutos: 120 },
        salas,
        existentes,
        duracion,
      );
      expect(resultado.asignada).toBe(false);
      if (!resultado.asignada) {
        expect(resultado.motivo).toContain('No hay salas disponibles');
      }
    });
  });

  describe('con dos salas', () => {
    const salas = [sala('s1', 'Sala 1'), sala('s2', 'Sala 2')];

    it('manda la función de las 20:15 a la segunda sala en vez de fallar', () => {
      const resultado = asignarSala(
        { inicio: hora('20:15'), duracionMinutos: 120 },
        salas,
        [funcionDe18('s1')],
        duracion,
      );
      expect(resultado.asignada).toBe(true);
      if (resultado.asignada) {
        expect(resultado.sala.id).toBe('s2');
      }
    });

    it('falla recién cuando las dos salas están ocupadas', () => {
      const resultado = asignarSala(
        { inicio: hora('20:15'), duracionMinutos: 120 },
        salas,
        [funcionDe18('s1'), funcionDe18('s2')],
        duracion,
      );
      expect(resultado.asignada).toBe(false);
    });

    it('prefiere la primera sala libre', () => {
      const resultado = asignarSala(
        { inicio: hora('20:30'), duracionMinutos: 120 },
        salas,
        [funcionDe18('s1')],
        duracion,
      );
      expect(resultado.asignada).toBe(true);
      if (resultado.asignada) {
        expect(resultado.sala.id).toBe('s1');
      }
    });
  });

  it('avisa cuando no hay ninguna sala configurada', () => {
    const resultado = asignarSala({ inicio: hora('18:00'), duracionMinutos: 120 }, [], [], duracion);
    expect(resultado.asignada).toBe(false);
    if (!resultado.asignada) {
      expect(resultado.motivo).toContain('No hay salas configuradas');
    }
  });

  it('ignora las funciones de otras salas al evaluar una sala', () => {
    const resultado = asignarSala(
      { inicio: hora('18:00'), duracionMinutos: 120 },
      [sala('s1', 'Sala 1')],
      [funcionDe18('s9')],
      duracion,
    );
    expect(resultado.asignada).toBe(true);
  });

  it('contempla la duración real de cada película, no una fija', () => {
    // Una película de 200 minutos a las 20:30 empieza bien, pero si la
    // existente durara más, el solape aparecería. Se comprueba que la duración
    // que informa el callback es la que se usa.
    const resultado = asignarSala(
      { inicio: hora('21:00'), duracionMinutos: 60 },
      [sala('s1', 'Sala 1')],
      [funcionDe18('s1')],
      () => 200, // la existente empieza 18:00 y ahora dura hasta 21:20
    );
    expect(resultado.asignada).toBe(false);
  });
});
