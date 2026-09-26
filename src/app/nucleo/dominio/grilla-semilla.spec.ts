import funcionesJson from '../../../../public/mock/funciones.json';
import peliculasJson from '../../../../public/mock/peliculas.json';

import { haySeparacionSuficiente, SEPARACION_MINUTOS } from './programacion-salas';

/**
 * La grilla semilla de `funciones.json` está escrita a mano y representa lo que
 * el administrador ya programó. Este test comprueba que respete la misma regla
 * de §4 que aplica el algoritmo: sin esto, la aplicación arrancaría con datos
 * que su propia lógica consideraría inválidos.
 */

interface Plantilla {
  idPelicula: string;
  idSala: string;
  horario: string;
  desdeDia: number;
}

const plantillas = funcionesJson.plantillas as Plantilla[];

const duraciones = new Map<string, number>(
  peliculasJson.map((p) => [p.id, p.duracionMinutos]),
);

/** Minutos desde medianoche. */
function enMinutos(horario: string): number {
  const [h, m] = horario.split(':').map(Number);
  return h * 60 + m;
}

function intervalo(plantilla: Plantilla) {
  const inicio = enMinutos(plantilla.horario) * 60_000;
  const duracion = duraciones.get(plantilla.idPelicula);
  if (duracion === undefined) throw new Error(`Sin duración para ${plantilla.idPelicula}`);
  return { inicio, fin: inicio + duracion * 60_000 };
}

describe('grilla semilla de funciones', () => {
  it('referencia películas que existen', () => {
    for (const plantilla of plantillas) {
      expect(duraciones.has(plantilla.idPelicula)).toBe(true);
    }
  });

  it(`deja ${SEPARACION_MINUTOS} minutos entre funciones de la misma sala`, () => {
    const porSala = new Map<string, Plantilla[]>();
    for (const plantilla of plantillas) {
      porSala.set(plantilla.idSala, [...(porSala.get(plantilla.idSala) ?? []), plantilla]);
    }

    for (const [idSala, delDia] of porSala) {
      for (let i = 0; i < delDia.length; i++) {
        for (let j = i + 1; j < delDia.length; j++) {
          // Solo se pisan si comparten al menos un día de la grilla.
          const a = delDia[i];
          const b = delDia[j];
          const compartenDia =
            Math.abs(a.desdeDia - b.desdeDia) < 7 || a.desdeDia === b.desdeDia;
          if (!compartenDia) continue;

          const ok = haySeparacionSuficiente(intervalo(a), intervalo(b));
          expect(
            ok,
            `${idSala}: ${a.idPelicula} ${a.horario} se pisa con ${b.idPelicula} ${b.horario}`,
          ).toBe(true);
        }
      }
    }
  });

  it('respeta el ejemplo de la consigna en la sala 1', () => {
    // p2 dura 142 min: 14:00 → 16:22, la siguiente no puede ser antes de 16:52.
    const sala1 = plantillas.filter((p) => p.idSala === 's1');
    const horarios = sala1.map((p) => p.horario).sort();
    expect(horarios).toEqual(['14:00', '17:00', '20:00']);
  });
});
