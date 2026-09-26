import { Component, ChangeDetectionStrategy, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

/** §12: «Ingresar código manualmente si falla el lector». */
@Component({
  selector: 'app-ingreso-manual',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="manual" [formGroup]="FormularioCodigo" (ngSubmit)="enviar()">
      <div class="campo">
        <label for="codigo-manual">Código de la compra</label>
        <input
          id="codigo-manual"
          type="text"
          formControlName="codigo"
          placeholder="QR-XXXXXX-XXXXX"
          autocomplete="off"
          spellcheck="false"
          [disabled]="procesando()"
        />
        <p class="pista">Usalo cuando el lector no llegue a leer el código del cliente.</p>
      </div>

      <button
        type="submit"
        class="boton boton--primario boton--bloque"
        [disabled]="FormularioCodigo.invalid || procesando()"
      >
        Validar código
      </button>
    </form>
  `,
  styles: `
    .manual input {
      font-family: var(--mono);
      text-transform: uppercase;
      font-size: 16px;
      letter-spacing: 0.04em;
    }
  `,
})
export class IngresoManualComponente {
  readonly procesando = input<boolean>(false);
  readonly codigoIngresado = output<string>();

  private readonly fb = inject(FormBuilder);

  protected readonly FormularioCodigo = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected enviar(): void {
    if (this.FormularioCodigo.invalid) return;
    this.codigoIngresado.emit(this.FormularioCodigo.controls.codigo.value.trim().toUpperCase());
    this.FormularioCodigo.reset();
  }
}
