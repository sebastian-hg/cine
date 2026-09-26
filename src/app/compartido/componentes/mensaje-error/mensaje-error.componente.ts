import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

/** Estado de error (§22: mensajes claros y accionables). */
@Component({
  selector: 'app-mensaje-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error" role="alert">
      <span class="error__icono" aria-hidden="true">!</span>
      <div class="error__cuerpo">
        <p class="error__texto">{{ mensaje() }}</p>
        @if (detalle()) {
          <p class="error__detalle">{{ detalle() }}</p>
        }
      </div>
      @if (reintentable()) {
        <button type="button" class="boton boton--fantasma boton--chico" (click)="reintentar.emit()">
          Reintentar
        </button>
      }
    </div>
  `,
  styles: `
    .error {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-radius: var(--radio);
      background: var(--error-tenue);
      border: 1px solid color-mix(in srgb, var(--error) 35%, transparent);
    }

    .error__icono {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--error);
      color: #fff;
      font-weight: 700;
      font-size: 14px;
    }

    .error__cuerpo {
      flex: 1;
      min-width: 0;
    }

    .error__texto {
      margin: 0;
      font-weight: 500;
    }

    .error__detalle {
      margin: 4px 0 0;
      font-size: 12.5px;
      color: var(--texto-tenue);
      font-family: var(--mono);
      word-break: break-word;
    }
  `,
})
export class MensajeErrorComponente {
  readonly mensaje = input.required<string>();
  readonly detalle = input<string | undefined>(undefined);
  readonly reintentable = input<boolean>(false);

  readonly reintentar = output<void>();
}
