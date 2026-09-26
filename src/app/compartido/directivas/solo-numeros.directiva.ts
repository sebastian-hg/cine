import { Directive, HostListener, input } from '@angular/core';

/**
 * Restringe un input a dígitos.
 *
 * Se usa en el ingreso manual de códigos del empleado y en las cantidades del
 * Candy Bar. Filtra en `input` además de en `keydown` para cubrir el pegado.
 */
@Directive({ selector: '[appSoloNumeros]' })
export class DirectivaSoloNumeros {
  /** Largo máximo; 0 significa sin límite. */
  readonly appSoloNumeros = input<number>(0);

  @HostListener('input', ['$event'])
  alEscribir(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    let limpio = campo.value.replace(/\D/g, '');

    const maximo = this.appSoloNumeros();
    if (maximo > 0) limpio = limpio.slice(0, maximo);

    if (campo.value !== limpio) {
      campo.value = limpio;
      campo.dispatchEvent(new Event('input', { bubbles: false }));
    }
  }
}
