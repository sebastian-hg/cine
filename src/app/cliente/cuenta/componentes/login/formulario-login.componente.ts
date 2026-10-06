import { Component, ChangeDetectionStrategy, input, output, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Credenciales } from '../../../../compartido/interfaces/usuario.interfaz';

export interface CuentaDemo {
  email: string;
  rol: string;
}

type FormularioLogin = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
}>;

@Component({
  selector: 'app-formulario-login',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario-login.componente.html',
  styleUrl: './login.componente.scss',
})
export class FormularioLoginComponente {
  readonly cuentas = input.required<readonly CuentaDemo[]>();
  readonly error = input<string | null>(null);
  readonly enviando = input(false);

  readonly credencialesEnviadas = output<Credenciales>();

  private readonly fb = inject(FormBuilder);

  protected readonly formulario = signal<FormularioLogin>(
    this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    }),
  );

  protected invalido(campo: 'email' | 'password'): boolean {
    const control = this.formulario().controls[campo];
    return control.invalid && control.touched;
  }

  protected usarCuenta(email: string): void {
    this.formulario().patchValue({ email, password: 'cine1234' });
  }

  protected enviar(): void {
    if (this.formulario().invalid) {
      this.formulario().markAllAsTouched();
      return;
    }

    this.credencialesEnviadas.emit(this.formulario().getRawValue());
  }
}