import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
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
  private static readonly DATOS_PAGO_PRUEBA: DatosPago = {
    titular: 'Cliente Prueba',
    numero: '4242424242424242',
    vencimiento: '12/30',
    codigoSeguridad: '123',
  };

  readonly aPagar = input<number>(0);
  readonly procesando = input<boolean>(false);

  readonly pagoConfirmado = output<DatosPago>();

  private readonly fb = inject(FormBuilder);

  protected readonly FormularioPago = signal(
    this.fb.nonNullable.group({
      titular: ['', [Validators.required, Validators.minLength(3)]],
      numero: ['', [Validators.required, Validators.minLength(16), Validators.maxLength(16)]],
      vencimiento: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      codigoSeguridad: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]],
    }),
  );

  protected invalido(campo: 'titular' | 'numero' | 'vencimiento' | 'codigoSeguridad'): boolean {
    const control = this.FormularioPago().controls[campo];
    return control.invalid && control.touched;
  }

  protected autocompletarPrueba(): void {
    this.FormularioPago().patchValue(FormularioPagoComponente.DATOS_PAGO_PRUEBA);
    this.FormularioPago().markAsDirty();
    this.FormularioPago().markAsUntouched();
  }

  protected enviar(): void {
    if (this.FormularioPago().invalid) {
      this.FormularioPago().markAllAsTouched();
      return;
    }
    this.pagoConfirmado.emit(this.FormularioPago().getRawValue());
  }
}
