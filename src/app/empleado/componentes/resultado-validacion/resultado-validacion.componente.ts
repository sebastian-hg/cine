import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { ResultadoValidacion } from '../../../compartido/interfaces/qr.interfaz';

/**
 * Resultado de una validación.
 *
 * Verde o rojo a pantalla completa: el empleado lo mira de reojo con una fila
 * de gente esperando, así que el veredicto tiene que leerse de un vistazo.
 */
@Component({
  selector: 'app-resultado-validacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resultado(); as r) {
      <div class="resultado" [class.resultado--ok]="r.valido" [class.resultado--mal]="!r.valido" role="alert">
        <span class="resultado__marca" aria-hidden="true">{{ r.valido ? '✓' : '✕' }}</span>

        <div class="resultado__cuerpo">
          @if (r.valido) {
            <p class="resultado__titulo">
              {{ r.concepto === 'entrada' ? 'Entrada válida' : 'Retiro habilitado' }}
            </p>
            <p class="resultado__detalle">{{ r.detalle }}</p>
          } @else {
            <p class="resultado__titulo">Rechazado</p>
            <p class="resultado__detalle">{{ r.motivo }}</p>
          }
        </div>

        <button type="button" class="boton boton--fantasma boton--chico" (click)="continuar.emit()">
          Siguiente
        </button>
      </div>
    }
  `,
  styles: `
    .resultado {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 20px;
      border-radius: var(--radio);
      border: 2px solid;
    }

    .resultado--ok {
      background: var(--ok-tenue);
      border-color: var(--ok);
    }

    .resultado--mal {
      background: var(--error-tenue);
      border-color: var(--error);
    }

    .resultado__marca {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      color: #fff;
      font-size: 28px;
      font-weight: 700;
    }

    .resultado--ok .resultado__marca {
      background: var(--ok);
    }

    .resultado--mal .resultado__marca {
      background: var(--error);
    }

    .resultado__cuerpo {
      flex: 1;
      min-width: 0;
    }

    .resultado__titulo {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
    }

    .resultado__detalle {
      margin: 3px 0 0;
      font-size: 14px;
      color: var(--texto-suave);
    }
  `,
})
export class ResultadoValidacionComponente {
  readonly resultado = input<ResultadoValidacion | null>(null);
  readonly continuar = output<void>();
}
