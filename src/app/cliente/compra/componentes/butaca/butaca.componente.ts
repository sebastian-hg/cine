import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';

import { ButacaFuncion } from '../../../../compartido/interfaces/butaca.interfaz';
import { DirectivaResaltarVip } from '../../../../compartido/directivas/resaltar-vip.directiva';
import { etiquetaButaca } from '../../../../nucleo/dominio/generador-butacas';

const NOMBRE_TIPO: Record<ButacaFuncion['tipo'], string> = {
  normal: 'normal',
  accesible: 'accesible',
  vip: 'VIP',
};

/**
 * Una butaca del mapa (§6).
 *
 * Es un `button` de verdad para que el mapa se recorra con teclado, con
 * `aria-label` completo y `aria-pressed` para la selección. El tipo se
 * distingue por forma e icono además de por color: §22 pide buena
 * accesibilidad, y el color solo dejaría afuera a quien no lo distingue.
 */
@Component({
  selector: 'app-butaca',
  imports: [DirectivaResaltarVip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="butaca"
      [appResaltarVip]="butaca().tipo"
      [class.butaca--elegida]="seleccionada()"
      [class.butaca--ocupada]="ocupada()"
      [disabled]="ocupada()"
      [attr.aria-pressed]="seleccionada()"
      [attr.aria-label]="descripcion()"
      (click)="alternar.emit(butaca())"
    >
      <span class="butaca__numero" aria-hidden="true">{{ butaca().numero }}</span>
      @if (butaca().tipo === 'accesible') {
        <span class="butaca__icono" aria-hidden="true">♿</span>
      }
      @if (butaca().tipo === 'vip') {
        <span class="butaca__icono" aria-hidden="true">★</span>
      }
    </button>
  `,
  styleUrl: './butaca.componente.scss',
})
export class ButacaComponente {
  readonly butaca = input.required<ButacaFuncion>();
  readonly seleccionada = input<boolean>(false);

  readonly alternar = output<ButacaFuncion>();

  protected readonly ocupada = computed(() => this.butaca().estado !== 'libre');

  /** Etiqueta hablada: fila, número, tipo, estado y precio. */
  protected readonly descripcion = computed(() => {
    const b = this.butaca();
    const estado = this.ocupada() ? 'ocupada' : this.seleccionada() ? 'seleccionada' : 'libre';
    const precio = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(b.precio);
    return `Fila ${b.fila}, butaca ${b.numero}, ${NOMBRE_TIPO[b.tipo]}, ${estado}, ${precio}`;
  });

  protected readonly etiqueta = computed(() => etiquetaButaca(this.butaca()));
}
