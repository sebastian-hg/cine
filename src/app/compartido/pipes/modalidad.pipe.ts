import { Pipe, PipeTransform } from '@angular/core';

import { Idioma, Modalidad } from '../interfaces/funcion.interfaz';

/** `{modalidad:'3D', idioma:'subtitulada'}` → `3D · Subtitulada`. */
@Pipe({ name: 'pipeModalidad' })
export class PipeModalidad implements PipeTransform {
  transform(funcion: { modalidad: Modalidad; idioma: Idioma } | null | undefined): string {
    if (!funcion) return '';
    const idioma = funcion.idioma === 'castellano' ? 'Castellano' : 'Subtitulada';
    return `${funcion.modalidad} · ${idioma}`;
  }
}
