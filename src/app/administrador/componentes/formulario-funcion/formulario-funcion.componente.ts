import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Pelicula } from '../../../compartido/interfaces/pelicula.interfaz';
import { SolicitudFuncion } from '../../../compartido/interfaces/funcion.interfaz';
import { soloFecha, sumarDias } from '../../../nucleo/dominio/fechas';

const DIAS_SEMANA = [
  { indice: 1, nombre: 'Lunes' },
  { indice: 2, nombre: 'Martes' },
  { indice: 3, nombre: 'Miércoles' },
  { indice: 4, nombre: 'Jueves' },
  { indice: 5, nombre: 'Viernes' },
  { indice: 6, nombre: 'Sábado' },
  { indice: 0, nombre: 'Domingo' },
];

/**
 * Alta de funciones (§4).
 *
 * **No tiene campo de sala**: el administrador define película, días, horario,
 * modalidad, idioma y precio, y el sistema resuelve la sala. Es el requisito
 * central de §4 y se refleja en la interfaz, no solo en el servicio.
 */
@Component({
  selector: 'app-formulario-funcion',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario-funcion.componente.html',
  styleUrl: './formulario-funcion.componente.scss',
})
export class FormularioFuncionComponente {
  readonly peliculas = input<Pelicula[]>([]);
  readonly procesando = input<boolean>(false);

  readonly funcionSolicitada = output<SolicitudFuncion>();

  private readonly fb = inject(FormBuilder);

  protected readonly diasSemana = signal(DIAS_SEMANA);
  protected readonly diasElegidos = signal<Set<number>>(new Set());
  /** Cuántas semanas hacia adelante se programa la grilla. */
  protected readonly semanas = signal(2);

  protected readonly FormularioFuncion = signal(
    this.fb.nonNullable.group({
      idPelicula: ['', [Validators.required]],
      horario: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
      modalidad: ['2D' as const, [Validators.required]],
      idioma: ['castellano' as const, [Validators.required]],
      precio: [9500, [Validators.required, Validators.min(1)]],
    }),
  );

  protected alternarDia(indice: number): void {
    const actuales = new Set(this.diasElegidos());
    if (actuales.has(indice)) actuales.delete(indice);
    else actuales.add(indice);
    this.diasElegidos.set(actuales);
  }

  protected estaElegido(indice: number): boolean {
    return this.diasElegidos().has(indice);
  }

  protected invalido(campo: 'idPelicula' | 'horario' | 'modalidad' | 'idioma' | 'precio'): boolean {
    const control = this.FormularioFuncion().controls[campo];
    return control.invalid && control.touched;
  }

  protected enviar(): void {
    if (this.FormularioFuncion().invalid || this.diasElegidos().size === 0) {
      this.FormularioFuncion().markAllAsTouched();
      return;
    }

    this.funcionSolicitada.emit({
      ...this.FormularioFuncion().getRawValue(),
      fechas: this.proximasFechas(),
    });
  }

  /** Convierte los días de la semana elegidos en fechas concretas. */
  private proximasFechas(): string[] {
    const elegidos = this.diasElegidos();
    const fechas: string[] = [];
    const hoy = new Date();

    for (let dia = 1; dia <= this.semanas() * 7; dia++) {
      const fecha = sumarDias(hoy, dia);
      if (elegidos.has(fecha.getDay())) {
        fechas.push(soloFecha(fecha));
      }
    }

    return fechas;
  }
}
