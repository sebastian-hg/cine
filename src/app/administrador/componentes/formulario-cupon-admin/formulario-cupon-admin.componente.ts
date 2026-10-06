import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Cupon } from '../../../compartido/interfaces/cupon.interfaz';

 
@Component({
  selector: 'app-formulario-cupon-admin',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="FormularioCuponAdmin()" (ngSubmit)="enviar()" novalidate>
      <div class="rejilla-campos">
        <div class="campo">
          <label for="cupon-codigo">Código</label>
          <input id="cupon-codigo" type="text" formControlName="codigo" placeholder="Ej. FERIADO" />
        </div>

        <div class="campo">
          <label for="cupon-porcentaje">Porcentaje</label>
          <input
            id="cupon-porcentaje"
            type="number"
            formControlName="porcentaje"
            min="1"
            max="100"
          />
        </div>

        <div class="campo">
          <label for="cupon-tipo">Condición</label>
          <select id="cupon-tipo" formControlName="tipo">
            <option value="generico">Sin condición</option>
            <option value="mayores-50">Mayores de 50 años</option>
            <option value="primera-compra">Solo primera compra</option>
          </select>
        </div>

        <div class="campo">
          <label for="cupon-usos">Usos por usuario</label>
          <input id="cupon-usos" type="number" formControlName="usosPorUsuario" min="0" />
          <p class="pista">0 = sin límite.</p>
        </div>
      </div>

      <div class="campo">
        <label for="cupon-descripcion">Descripción</label>
        <input
          id="cupon-descripcion"
          type="text"
          formControlName="descripcion"
          placeholder="Lo que ve el cliente al aplicarlo"
        />
      </div>

      <button type="submit" class="boton boton--primario" [disabled]="FormularioCuponAdmin().invalid">
        Crear cupón
      </button>
    </form>
  `,
})
export class FormularioCuponAdminComponente {
  readonly cuponGuardado = output<Omit<Cupon, 'id'>>();

  private readonly fb = inject(FormBuilder);

  protected readonly FormularioCuponAdmin = signal(
    this.fb.nonNullable.group({
      codigo: ['', [Validators.required, Validators.minLength(3)]],
      porcentaje: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      tipo: ['generico' as Cupon['tipo'], [Validators.required]],
      usosPorUsuario: [1, [Validators.required, Validators.min(0)]],
      descripcion: ['', [Validators.required, Validators.minLength(5)]],
    }),
  );

  protected enviar(): void {
    if (this.FormularioCuponAdmin().invalid) {
      this.FormularioCuponAdmin().markAllAsTouched();
      return;
    }

    const valores = this.FormularioCuponAdmin().getRawValue();
    this.cuponGuardado.emit({
      ...valores,
      codigo: valores.codigo.trim().toUpperCase(),
      activo: true,
    });
    this.FormularioCuponAdmin().reset({
      codigo: '',
      porcentaje: 10,
      tipo: 'generico',
      usosPorUsuario: 1,
      descripcion: '',
    });
  }
}
