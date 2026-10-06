import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

 
@Component({
  selector: 'app-selector-cantidad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="selector" role="group" [attr.aria-label]="etiqueta()">
      <button
        type="button"
        [disabled]="cantidad() <= minimo()"
        aria-label="Quitar uno"
        (click)="cantidadCambiada.emit(cantidad() - 1)"
      >
        −
      </button>
      <span class="selector__valor" aria-live="polite">{{ cantidad() }}</span>
      <button
        type="button"
        [disabled]="cantidad() >= maximo()"
        aria-label="Agregar uno"
        (click)="cantidadCambiada.emit(cantidad() + 1)"
      >
        +
      </button>
    </div>
  `,
  styles: `
    .selector {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--borde-fuerte);
      border-radius: var(--radio-s);
      overflow: hidden;

      button {
        width: 30px;
        height: 30px;
        padding: 0;
        border: 0;
        background: var(--superficie-2);
        color: var(--texto);
        font-size: 16px;
        line-height: 1;
        cursor: pointer;

        &:hover:not(:disabled) {
          background: var(--superficie-3);
        }
        &:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      }
    }

    .selector__valor {
      min-width: 34px;
      text-align: center;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      font-size: 14px;
    }
  `,
})
export class SelectorCantidadComponente {
  readonly cantidad = input<number>(0);
  readonly minimo = input<number>(0);
  readonly maximo = input<number>(99);
  readonly etiqueta = input<string>('Cantidad');

  readonly cantidadCambiada = output<number>();
}
