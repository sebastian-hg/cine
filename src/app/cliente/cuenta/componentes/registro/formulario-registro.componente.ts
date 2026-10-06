import { Component, ChangeDetectionStrategy, input, output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

export interface DatosFormularioRegistro {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  fechaNacimiento: string;
}

@Component({
  selector: 'app-formulario-registro',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario-registro.componente.html',
  styleUrl: './registro.componente.scss',
})
export class FormularioRegistroComponente {
  readonly maximaFecha = input.required<string>();
  readonly error = input<string | null>(null);
  readonly enviando = input(false);

  readonly registroEnviado = output<DatosFormularioRegistro>();

  private readonly fb = inject(FormBuilder);

  protected readonly formulario = signal(
    this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      fechaNacimiento: ['', [Validators.required]],
    }),
  );

  protected invalido(
    campo: 'nombre' | 'apellido' | 'email' | 'password' | 'fechaNacimiento',
  ): boolean {
    const control = this.formulario().controls[campo];
    return control.invalid && control.touched;
  }

  protected enviar(): void {
    if (this.formulario().invalid) {
      this.formulario().markAllAsTouched();
      return;
    }

    this.registroEnviado.emit(this.formulario().getRawValue());
  }
}