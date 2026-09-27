import { Butaca, SectorButaca, TipoButaca } from '../../compartido/interfaces/butaca.interfaz';

/**
 * Generación del mapa de butacas de una sala (§5 de la consigna).
 *
 * Configuración original: 20 filas (A→T) en 3 sectores de 4 + 20 + 4.
 * Modificaciones posteriores que esta implementación ya contempla:
 *   · Filas J y K  → butacas accesibles, grilla reducida 2 + 10 + 2.
 *   · Filas R, S, T → butacas VIP, grilla normal con precio superior.
 */

export const FILAS = 'ABCDEFGHIJKLMNOPQRST'.split('');
export const FILAS_ACCESIBLES = ['J', 'K'];
export const FILAS_VIP = ['R', 'S', 'T'];

/** Butacas por sector en una fila normal o VIP. */
export const GRILLA_NORMAL = { izquierda: 4, centro: 20, derecha: 4 } as const;
/** Butacas por sector en una fila accesible. */
export const GRILLA_ACCESIBLE = { izquierda: 2, centro: 10, derecha: 2 } as const;

export function tipoDeFila(fila: string): TipoButaca {
  if (FILAS_ACCESIBLES.includes(fila)) return 'accesible';
  if (FILAS_VIP.includes(fila)) return 'vip';
  return 'normal';
}

/** Butacas por fila según su tipo. */
export function grillaDeFila(fila: string): { izquierda: number; centro: number; derecha: number } {
  return tipoDeFila(fila) === 'accesible' ? GRILLA_ACCESIBLE : GRILLA_NORMAL;
}

/**
 * Genera las butacas de una sala.
 *
 * Los números corren de 1 a N de izquierda a derecha, atravesando los tres
 * sectores: en una fila normal la butaca 5 es la primera del sector central.
 * El identificador visible queda como `a-1`, `a-2`, `b-1`, etc.
 */
export function generarButacas(idSala: string): Butaca[] {
  const butacas: Butaca[] = [];

  for (const fila of FILAS) {
    const tipo = tipoDeFila(fila);
    const grilla = grillaDeFila(fila);
    const sectores: ReadonlyArray<[SectorButaca, number]> = [
      ['izquierda', grilla.izquierda],
      ['centro', grilla.centro],
      ['derecha', grilla.derecha],
    ];

    let numero = 1;
    for (const [sector, cantidad] of sectores) {
      for (let i = 0; i < cantidad; i++) {
        butacas.push({
          id: `${fila.toLowerCase()}-${numero}`,
          idSala,
          fila,
          numero,
          sector,
          tipo,
        });
        numero++;
      }
    }
  }

  return butacas;
}

/** `F12` — etiqueta corta para mostrar al usuario. */
export function etiquetaButaca(butaca: Pick<Butaca, 'fila' | 'numero'>): string {
  return `${butaca.fila}${butaca.numero}`;
}
