import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';

/**
 * Calificación de 1 a 5 estrellas (§14).
 *
 * Interactivo y accesible: cada estrella es un botón con `aria-label`, y el
 * grupo se recorre con tabulador. La versión de solo lectura usa el pipe.
 */
@Component({
  selector: 'app-calificacion-estrellas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="estrellas"
      [class.estrellas--lectura]="soloLectura()"
      role="group"
      [attr.aria-label]="soloLectura() ? 'Calificación: ' + valor() + ' de 5' : 'Elegí una calificación'"
    >
      @for (punto of puntos(); track punto) {
        <button
          type="button"
          class="estrella"
          [class.estrella--llena]="punto <= valor()"
          [disabled]="soloLectura()"
          [attr.aria-label]="punto + ' ' + (punto === 1 ? 'estrella' : 'estrellas')"
          [attr.aria-pressed]="punto === valor()"
          (click)="calificado.emit(punto)"
        >
          {{ punto <= valor() ? '★' : '☆' }}
        </button>
      }
    </div>
  `,
  styles: `
    .estrellas {
      display: inline-flex;
      gap: 2px;
    }

    .estrella {
      width: auto;
      padding: 2px 3px;
      background: none;
      border: 0;
      border-radius: var(--radio-s);
      font-size: 26px;
      line-height: 1;
      color: var(--texto-tenue);
      cursor: pointer;
      transition: color 0.12s, transform 0.08s;

      &:hover:not(:disabled) {
        color: var(--ambar-fuerte);
        transform: scale(1.12);
      }
      &:disabled {
        cursor: default;
        opacity: 1;
      }
    }

    .estrella--llena {
      color: var(--ambar);
    }

    .estrellas--lectura .estrella {
      font-size: 17px;
      padding: 0 1px;
    }
  `,
})
export class CalificacionEstrellasComponente {
  readonly valor = input<number>(0);
  readonly soloLectura = input<boolean>(false);

  readonly calificado = output<number>();

  protected readonly puntos = signal([1, 2, 3, 4, 5]);
}
