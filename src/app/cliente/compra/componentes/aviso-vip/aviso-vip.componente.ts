import { Component, ChangeDetectionStrategy, input } from '@angular/core';

import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';

/**
 * §5: «Informar claramente al usuario que está comprando una butaca VIP».
 *
 * No es decorativo: es un requisito explícito de la consigna, así que el aviso
 * dice cuántas VIP hay y cuánto suman de más.
 */
@Component({
  selector: 'app-aviso-vip',
  imports: [PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cantidad() > 0) {
      <div class="aviso-vip" role="note">
        <span class="aviso-vip__icono" aria-hidden="true">★</span>
        <p>
          Estás eligiendo
          <strong>{{ cantidad() }} {{ cantidad() === 1 ? 'butaca VIP' : 'butacas VIP' }}</strong
          >. Las filas R, S y T tienen precio superior:
          <strong>{{ recargo() | pipeMonedaArs }}</strong> más que una butaca normal en total.
        </p>
      </div>
    }
  `,
  styles: `
    .aviso-vip {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 12px 14px;
      border-radius: var(--radio);
      background: var(--rojo-tenue);
      border: 1px solid color-mix(in srgb, var(--rojo) 40%, transparent);

      p {
        margin: 0;
        font-size: 13.5px;
        color: var(--texto-suave);
      }
    }

    .aviso-vip__icono {
      color: var(--ambar);
      font-size: 17px;
      line-height: 1.2;
    }
  `,
})
export class AvisoVipComponente {
  readonly cantidad = input<number>(0);
  readonly recargo = input<number>(0);
}
