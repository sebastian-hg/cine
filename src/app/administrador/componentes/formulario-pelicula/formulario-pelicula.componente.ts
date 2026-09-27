import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Genero } from '../../../compartido/interfaces/genero.interfaz';
import { Pelicula } from '../../../compartido/interfaces/pelicula.interfaz';
import { soloFecha } from '../../../nucleo/dominio/fechas';

/** Alta de película con los 11 campos de §2. */
@Component({
  selector: 'app-formulario-pelicula',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario-pelicula.componente.html',
})
export class FormularioPeliculaComponente {
  readonly generos = input<Genero[]>([]);

  readonly peliculaGuardada = output<Omit<Pelicula, 'id'>>();

  private readonly fb = inject(FormBuilder);

  protected readonly hoy = signal(soloFecha(new Date()));

  protected readonly FormularioPelicula = signal(
    this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      sinopsis: ['', [Validators.required, Validators.minLength(20)]],
      duracionMinutos: [100, [Validators.required, Validators.min(1), Validators.max(400)]],
      clasificacion: ['ATP' as Pelicula['clasificacion'], [Validators.required]],
      fechaEstreno: [this.hoy(), [Validators.required]],
      precioNormal: [9500, [Validators.required, Validators.min(1)]],
      precioPreventa: [7500, [Validators.required, Validators.min(1)]],
      preventaActivada: [false],
      poster: ['posters/p1.svg', [Validators.required]],
    }),
  );

  /** Géneros elegidos; al menos uno (§3 admite varios). */
  protected readonly elegidos = signal<Set<string>>(new Set());

  protected alternarGenero(id: string): void {
    const actuales = new Set(this.elegidos());
    if (actuales.has(id)) actuales.delete(id);
    else actuales.add(id);
    this.elegidos.set(actuales);
  }

  protected estaElegido(id: string): boolean {
    return this.elegidos().has(id);
  }

  protected invalido(
    campo:
      | 'nombre'
      | 'sinopsis'
      | 'duracionMinutos'
      | 'clasificacion'
      | 'fechaEstreno'
      | 'precioNormal'
      | 'precioPreventa'
      | 'preventaActivada'
      | 'poster',
  ): boolean {
    const control = this.FormularioPelicula().controls[campo];
    return control.invalid && control.touched;
  }

  protected enviar(): void {
    if (this.FormularioPelicula().invalid || this.elegidos().size === 0) {
      this.FormularioPelicula().markAllAsTouched();
      return;
    }

    this.peliculaGuardada.emit({
      ...this.FormularioPelicula().getRawValue(),
      generos: [...this.elegidos()],
      disponible: true,
      ventasPrevias: 0,
    });

    this.FormularioPelicula().reset({
      nombre: '',
      sinopsis: '',
      duracionMinutos: 100,
      clasificacion: 'ATP',
      fechaEstreno: this.hoy(),
      precioNormal: 9500,
      precioPreventa: 7500,
      preventaActivada: false,
      poster: 'posters/p1.svg',
    });
    this.elegidos.set(new Set());
  }
}
