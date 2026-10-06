import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Cupon } from '../../../../compartido/interfaces/cupon.interfaz';

 
@Component({
  selector: 'app-formulario-cupon',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (aplicado(); as cupon) {
      <div class="aplicado">
        <div>
          <p class="aplicado__codigo">{{ cupon.codigo }}</p>
          <p class="aplicado__detalle">{{ cupon.descripcion }}</p>
        </div>
        <button type="button" class="boton boton--fantasma boton--chico" (click)="cuponQuitado.emit()">
          Quitar
        </button>
      </div>
    } @else {
      <form class="formulario" [formGroup]="FormularioCupon()" (ngSubmit)="enviar()">
        <div class="campo" [class.campo--invalido]="!!error()">
          <label for="codigo-cupon">¿Tenés un cupón?</label>
          <div class="fila">
            <input
              id="codigo-cupon"
              type="text"
              formControlName="codigo"
              placeholder="Ej. MARTES2X1"
              autocomplete="off"
              spellcheck="false"
            />
            <button type="submit" class="boton" [disabled]="FormularioCupon().invalid">Aplicar</button>
          </div>
          @if (error()) {
            <p class="mensaje-campo">{{ error() }}</p>
          }
        </div>
      </form>
    }
  `,
  styles: `
    .fila {
      display: flex;
      gap: 8px;

      input {
        text-transform: uppercase;
      }
      .boton {
        flex-shrink: 0;
      }
    }

    .aplicado {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 11px 14px;
      border-radius: var(--radio);
      background: var(--ok-tenue);
      border: 1px solid color-mix(in srgb, var(--ok) 40%, transparent);

      &__codigo {
        margin: 0;
        font-weight: 700;
        font-size: 14px;
      }

      &__detalle {
        margin: 0;
        font-size: 12.5px;
        color: var(--texto-suave);
      }
    }
  `,
})
export class FormularioCuponComponente {
  readonly aplicado = input<Cupon | null>(null);
  readonly error = input<string | null>(null);

  readonly cuponAplicado = output<string>();
  readonly cuponQuitado = output<void>();

  private readonly fb = inject(FormBuilder);

  protected readonly FormularioCupon = signal(
    this.fb.nonNullable.group({
      codigo: ['', [Validators.required, Validators.minLength(3)]],
    }),
  );

  protected enviar(): void {
    if (this.FormularioCupon().invalid) return;
    this.cuponAplicado.emit(this.FormularioCupon().controls.codigo.value.trim().toUpperCase());
  }
}
