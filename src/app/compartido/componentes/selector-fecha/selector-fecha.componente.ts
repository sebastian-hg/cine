import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';

/**
 * Selector de fecha (§22: «selector de fecha fácil de utilizar»).
 *
 * Una fila de días reales en vez de un `<input type="date">`: cuando las fechas
 * disponibles son pocas y conocidas —los días con función—, mostrarlas es más
 * rápido que hacer abrir un calendario y adivinar cuáles tienen algo.
 */
@Component({
  selector: 'app-selector-fecha',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dias" role="tablist" [attr.aria-label]="etiqueta()">
      @for (dia of fechasHabilitadas(); track dia) {
        <button
          type="button"
          role="tab"
          class="dia"
          [class.dia--activo]="dia === seleccionada()"
          [attr.aria-selected]="dia === seleccionada()"
          (click)="fechaElegida.emit(dia)"
        >
          <span class="dia__semana">{{ aFecha(dia) | date: 'EEE' }}</span>
          <span class="dia__numero">{{ aFecha(dia) | date: 'd' }}</span>
          <span class="dia__mes">{{ aFecha(dia) | date: 'MMM' }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .dias {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 6px;
      scrollbar-width: thin;
    }

    .dia {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      flex-shrink: 0;
      width: 58px;
      padding: 9px 6px;
      border-radius: var(--radio-s);
      border: 1px solid var(--borde-fuerte);
      background: transparent;
      color: var(--texto-suave);
      font: inherit;
      cursor: pointer;

      &:hover {
        background: var(--superficie-2);
      }

      &__semana,
      &__mes {
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      &__numero {
        font-size: 19px;
        font-weight: 700;
        line-height: 1.1;
        color: var(--texto);
      }

      &--activo {
        background: var(--ambar);
        border-color: var(--ambar);
        color: var(--texto-en-acento);

        .dia__numero {
          color: var(--texto-en-acento);
        }
        &:hover {
          background: var(--ambar-fuerte);
        }
      }
    }
  `,
})
export class SelectorFechaComponente {
  /** Fechas ISO `YYYY-MM-DD` que tienen algo disponible. */
  readonly fechasHabilitadas = input<string[]>([]);
  readonly seleccionada = input<string | null>(null);
  readonly etiqueta = input<string>('Elegí el día');

  readonly fechaElegida = output<string>();

  /** `2026-09-21` → `Date` local, para que el pipe lo formatee. */
  protected aFecha(dia: string): Date {
    return new Date(`${dia}T00:00:00`);
  }
}
