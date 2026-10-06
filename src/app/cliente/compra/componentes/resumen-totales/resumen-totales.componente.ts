import { Component, ChangeDetectionStrategy, input } from '@angular/core';

import { Desglose } from '../../../../compartido/interfaces/compra.interfaz';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';







@Component({
  selector: 'app-resumen-totales',
  imports: [PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (desglose(); as d) {
      <dl class="totales">
        @if (d.subtotalEntradas > 0) {
          <div class="linea">
            <dt>Entradas</dt>
            <dd>{{ d.subtotalEntradas | pipeMonedaArs }}</dd>
          </div>
        }
        @if (d.subtotalCandy > 0) {
          <div class="linea">
            <dt>Candy Bar</dt>
            <dd>{{ d.subtotalCandy | pipeMonedaArs }}</dd>
          </div>
        }

        <div class="linea linea--subtotal">
          <dt>Subtotal</dt>
          <dd>{{ d.subtotal | pipeMonedaArs }}</dd>
        </div>

        @if (d.descuento > 0) {
          <div class="linea linea--descuento">
            <dt>{{ d.motivoDescuento }}</dt>
            <dd>−{{ d.descuento | pipeMonedaArs }}</dd>
          </div>
        }

        @if (d.creditoAplicado > 0) {
          <div class="linea linea--descuento">
            <dt>Crédito aplicado</dt>
            <dd>−{{ d.creditoAplicado | pipeMonedaArs }}</dd>
          </div>
        }

        <div class="linea linea--total">
          <dt>Total a pagar</dt>
          <dd>{{ d.aPagar | pipeMonedaArs }}</dd>
        </div>

        @if (d.puntosGanados > 0) {
          <p class="puntos">Sumás {{ d.puntosGanados }} puntos con esta compra.</p>
        }
      </dl>
    }
  `,
  styles: `
    .totales {
      margin: 0;
      display: grid;
      gap: 7px;
    }

    .linea {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 14px;
      font-size: 14px;

      dt {
        color: var(--texto-suave);
      }

      dd {
        margin: 0;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
    }

    .linea--subtotal {
      padding-top: 7px;
      border-top: 1px solid var(--borde);
    }

    .linea--descuento dd {
      color: var(--ok);
    }

    .linea--total {
      padding-top: 9px;
      border-top: 1px solid var(--borde);

      dt {
        color: var(--texto);
        font-weight: 600;
      }

      dd {
        font-size: 22px;
        font-weight: 700;
      }
    }

    .puntos {
      margin: 6px 0 0;
      font-size: 12.5px;
      color: var(--ambar-fuerte);
    }
  `,
})
export class ResumenTotalesComponente {
  readonly desglose = input<Desglose | null>(null);
}
