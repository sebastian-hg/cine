import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { soloFecha } from '../../../../nucleo/dominio/fechas';
import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';

/**
 * Registro de usuario (§8 de la consigna).
 *
 * El formulario coincide con los campos reales de la tabla `usuarios_cine`.
 * No se envían datos extra que la DB no tiene.
 */
@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registro.componente.html',
  styleUrl: './registro.componente.scss',
})
export class RegistroComponente {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AutenticacionServicio);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionServicio);

  protected readonly maximaFecha = soloFecha(new Date());

  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected readonly FormularioRegistro = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    fechaNacimiento: ['', [Validators.required]],
  });

  protected invalido(campo: keyof typeof this.FormularioRegistro.controls): boolean {
    const control = this.FormularioRegistro.controls[campo];
    return control.invalid && control.touched;
  }

  protected enviar(): void {
    if (this.FormularioRegistro.invalid) {
      this.FormularioRegistro.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    this.auth.registrar(this.FormularioRegistro.getRawValue()).subscribe({
      next: (usuario) => {
        this.enviando.set(false);
        this.avisos.mostrar(
          `¡Bienvenida/o, ${usuario.nombre}! Tenés 20% de descuento en tu primera compra.`,
          'exito',
        );
        void this.router.navigate(['/']);
      },
      error: (error: Error) => {
        this.enviando.set(false);
        this.error.set(error.message);
      },
    });
  }
}
