import { Component, ChangeDetectionStrategy, ElementRef, inject, input, output, viewChild, AfterViewInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ClasificacionEdad } from '../../../../compartido/interfaces/pelicula.interfaz';
import { EDAD_MINIMA } from '../../../../nucleo/dominio/restriccion-edad';
import { soloFecha } from '../../../../nucleo/dominio/fechas';

/**
 * Verificación de edad para visitantes anónimos (§7).
 *
 * No hay identidad que consultar, así que es una declaración jurada. Es la
 * única estrategia honesta sin registro; la entrada en PDF lleva impresa la
 * advertencia de que puede pedirse documento en la puerta.
 */
@Component({
  selector: 'app-verificacion-edad',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verificacion-edad.componente.html',
  styleUrl: './verificacion-edad.componente.scss',
})
export class VerificacionEdadComponente implements AfterViewInit {
  readonly clasificacion = input.required<ClasificacionEdad>();

  readonly fechaNacimientoDeclarada = output<string>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly campoFecha = viewChild<ElementRef<HTMLInputElement>>('campoFecha');

  /** No se puede declarar una fecha futura. */
  protected readonly maximo = soloFecha(new Date());

  protected readonly FormularioEdad = signal(
    this.fb.nonNullable.group({
      fechaNacimiento: ['', [Validators.required]],
    }),
  );

  ngAfterViewInit(): void {
    // El modal atrapa el foco: al abrirse, el primer campo lo recibe.
    this.campoFecha()?.nativeElement.focus();
  }

  protected edadMinima(): number {
    return EDAD_MINIMA[this.clasificacion()];
  }

  protected confirmar(): void {
    if (this.FormularioEdad().invalid) {
      this.FormularioEdad().markAllAsTouched();
      return;
    }
    this.fechaNacimientoDeclarada.emit(this.FormularioEdad().controls.fechaNacimiento.value);
  }
}
