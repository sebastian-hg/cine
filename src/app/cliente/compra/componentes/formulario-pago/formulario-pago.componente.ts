import { Component, ChangeDetectionStrategy, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { DirectivaSoloNumeros } from '../../../../compartido/directivas/solo-numeros.directiva';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { DatosPago } from '../../servicios/pago.servicio';

/**
 * Datos de pago (§26: proteger las operaciones de pago) — MOCKEADO.
 *
 * Contra un proveedor real este formulario lo reemplaza el SDK del proveedor:
 * el número de tarjeta nunca debería pasar por nuestro código.
 */
@Component({
  selector: 'app-formulario-pago',
  imports: [ReactiveFormsModule, DirectivaSoloNumeros, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario-pago.componente.html',
  styleUrl: './formulario-pago.componente.scss',
})
export class FormularioPagoComponente {
  readonly aPagar = input<number>(0);
  readonly procesando = input<boolean>(false);

  readonly pagoConfirmado = output<DatosPago>();

  private readonly fb = inject(FormBuilder);

  protected readonly FormularioPago = this.fb.nonNullable.group({
    titular: ['', [Validators.required, Validators.minLength(3)]],
    numero: ['', [Validators.required, Validators.minLength(16), Validators.maxLength(16)]],
    vencimiento: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    codigoSeguridad: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]],
  });

  protected invalido(campo: keyof typeof this.FormularioPago.controls): boolean {
    const control = this.FormularioPago.controls[campo];
    return control.invalid && control.touched;
  }

  protected enviar(): void {
    if (this.FormularioPago.invalid) {
      this.FormularioPago.markAllAsTouched();
      return;
    }
    this.pagoConfirmado.emit(this.FormularioPago.getRawValue());
  }
}
