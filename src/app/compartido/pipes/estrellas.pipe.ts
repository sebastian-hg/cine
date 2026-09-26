import { Pipe, PipeTransform } from '@angular/core';

/**
 * `4.3` → `★★★★☆ 4,3`.
 *
 * Devuelve texto y no marcado: la versión interactiva es el componente
 * `calificacion-estrellas`, que además es accesible con teclado.
 */
@Pipe({ name: 'pipeEstrellas' })
export class PipeEstrellas implements PipeTransform {
  transform(promedio: number | null | undefined, conNumero = true): string {
    if (!promedio) return 'Sin calificaciones';

    const llenas = Math.round(promedio);
    const estrellas = '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
    if (!conNumero) return estrellas;

    return `${estrellas} ${promedio.toFixed(1).replace('.', ',')}`;
  }
}
