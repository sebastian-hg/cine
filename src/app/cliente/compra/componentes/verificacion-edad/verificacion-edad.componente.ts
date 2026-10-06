import { Component, ChangeDetectionStrategy, ElementRef, inject, input, output, viewChild, AfterViewInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ClasificacionEdad } from '../../../../compartido/interfaces/pelicula.interfaz';
import { EDAD_MINIMA } from '../../../../nucleo/dominio/restriccion-edad';
import { soloFecha } from '../../../../nucleo/dominio/fechas';








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

   
  protected readonly maximo = soloFecha(new Date());

  protected readonly FormularioEdad = signal(
    this.fb.nonNullable.group({
      fechaNacimiento: ['', [Validators.required]],
    }),
  );

  ngAfterViewInit(): void {
     
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
