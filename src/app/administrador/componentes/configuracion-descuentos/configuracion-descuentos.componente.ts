import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs';

import { ConfiguracionServicio } from '../../../compartido/servicios/configuracion.servicio';
import { Configuracion } from '../../../compartido/interfaces/cupon.interfaz';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';







@Component({
  selector: 'app-configuracion-descuentos',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion-descuentos.componente.html',
})
export class ConfiguracionDescuentosComponente {
  private readonly configuracion = inject(ConfiguracionServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);
  private readonly fb = inject(FormBuilder);

  protected readonly configuracion$ = this.configuracion.obtener();
  protected readonly configuracionActual = toSignal<Configuracion | null>(this.configuracion$, {
    initialValue: null,
  });
  protected readonly guardando = signal(false);

  protected readonly FormularioDescuentos = signal(
    this.fb.nonNullable.group({
      porcentajePrimeraCompra: [20, [Validators.required, Validators.min(0), Validators.max(100)]],
      porcentajeMayores50: [15, [Validators.required, Validators.min(0), Validators.max(100)]],
      multiplicadorVip: [1.6, [Validators.required, Validators.min(1), Validators.max(5)]],
    }),
  );

  constructor() {
    this.configuracion$.pipe(take(1)).subscribe((config) => {
      this.FormularioDescuentos().patchValue({
        porcentajePrimeraCompra: config.porcentajePrimeraCompra,
        porcentajeMayores50: config.porcentajeMayores50,
        multiplicadorVip: config.multiplicadorVip,
      });
    });
  }

  protected guardar(): void {
    if (this.FormularioDescuentos().invalid) {
      this.FormularioDescuentos().markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const valores = this.FormularioDescuentos().getRawValue();

    this.configuracion
      .actualizar(valores)
      .pipe(take(1))
      .subscribe(() => {
        this.guardando.set(false);
        this.registro
          .registrar(
            'cambio-configuracion',
            `cambió el descuento de primera compra a ${valores.porcentajePrimeraCompra}% y el de mayores de 50 a ${valores.porcentajeMayores50}%`,
          )
          .subscribe();
        this.avisos.mostrar('Guardamos la configuración de descuentos.', 'exito');
      });
  }
}
