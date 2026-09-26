import { Directive, ElementRef, inject, input, effect } from '@angular/core';

import { TipoButaca } from '../interfaces/butaca.interfaz';

/**
 * Marca visualmente una butaca VIP y le da una etiqueta accesible propia.
 *
 * §22 pide buena accesibilidad: el tipo de butaca no puede distinguirse solo
 * por color, así que la directiva agrega también un atributo de datos que el
 * CSS usa para cambiar la forma.
 */
@Directive({ selector: '[appResaltarVip]' })
export class DirectivaResaltarVip {
  readonly appResaltarVip = input.required<TipoButaca>();

  private readonly elemento = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      const tipo = this.appResaltarVip();
      const nodo = this.elemento.nativeElement as HTMLElement;
      nodo.dataset['tipoButaca'] = tipo;
      nodo.classList.toggle('es-vip', tipo === 'vip');
      nodo.classList.toggle('es-accesible', tipo === 'accesible');
    });
  }
}
