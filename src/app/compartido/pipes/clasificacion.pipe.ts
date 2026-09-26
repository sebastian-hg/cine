import { Pipe, PipeTransform } from '@angular/core';

import { ClasificacionEdad } from '../interfaces/pelicula.interfaz';

const TEXTO: Record<ClasificacionEdad, string> = {
  ATP: 'Apta para todo público',
  '+13': 'Apta mayores de 13 años',
  '+18': 'Solo mayores de 18 años',
};

/** `'+13'` → `Apta mayores de 13 años`. */
@Pipe({ name: 'pipeClasificacion' })
export class PipeClasificacion implements PipeTransform {
  transform(clasificacion: ClasificacionEdad | null | undefined): string {
    return clasificacion ? TEXTO[clasificacion] : '';
  }
}
