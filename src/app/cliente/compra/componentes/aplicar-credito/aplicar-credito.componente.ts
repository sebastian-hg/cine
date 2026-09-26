import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';

/**
 * Uso del crédito de cancelaciones (§19).
 *
 * El crédito puede combinarse con otros medios de pago, así que es un
 * interruptor y no un pago excluyente.
 */
@Component({
  selector: 'app-aplicar-credito',
  imports: [PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (disponible() > 0) {
      <div class="credito">
        <div class="credito__texto">
          <p class="credito__titulo">Usar mi crédito</p>
          <p class="credito__saldo">
            Tenés {{ disponible() | pipeMonedaArs }} disponibles.
            @if (aplicado() > 0) {
              Se descuentan {{ aplicado() | pipeMonedaArs }}.
            }
          </p>
        </div>

        <label class="interruptor">
          <input
            type="checkbox"
            [checked]="aplicado() > 0"
            (change)="alternar($event)"
          />
          <span class="solo-lectores">Aplicar crédito a esta compra</span>
          <span class="interruptor__pista" aria-hidden="true"></span>
        </label>
      </div>
    }
  `,
  styles: `
    .credito {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 12px 14px;
      border-radius: var(--radio);
      background: var(--superficie-2);
      border: 1px solid var(--borde);

      &__titulo {
        margin: 0;
        font-weight: 600;
        font-size: 14px;
      }

      &__saldo {
        margin: 2px 0 0;
        font-size: 12.5px;
        color: var(--texto-suave);
      }
    }

    .interruptor {
      position: relative;
      flex-shrink: 0;
      cursor: pointer;

      input {
        position: absolute;
        opacity: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        cursor: pointer;
      }

      &__pista {
        display: block;
        width: 42px;
        height: 24px;
        border-radius: 999px;
        background: var(--borde-fuerte);
        transition: background 0.15s;

        &::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--texto);
          transition: transform 0.15s;
        }
      }

      input:checked + .solo-lectores + &__pista,
      input:checked ~ .interruptor__pista {
        background: var(--ambar);

        &::after {
          transform: translateX(18px);
          background: #17120c;
        }
      }

      input:focus-visible ~ .interruptor__pista {
        outline: 2px solid var(--ambar-fuerte);
        outline-offset: 2px;
      }
    }
  `,
})
export class AplicarCreditoComponente {
  readonly disponible = input<number>(0);
  readonly aplicado = input<number>(0);
  readonly maximoAplicable = input<number>(0);

  readonly creditoAplicado = output<number>();

  protected alternar(evento: Event): void {
    const activo = (evento.target as HTMLInputElement).checked;
    this.creditoAplicado.emit(activo ? this.disponible() : 0);
  }
}
