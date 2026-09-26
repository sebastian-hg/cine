import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { calcularEdad, soloFecha } from '../../../../nucleo/dominio/fechas';
import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { PerfilServicio } from '../../servicios/perfil.servicio';

const TIPOS_SANGRE = ['0-', '0+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const COLORES_OJOS = ['Marrón', 'Negro', 'Verde', 'Celeste', 'Gris', 'Miel'];

/** Perfil del usuario (§8): datos editables y resumen de la cuenta. */
@Component({
  selector: 'app-perfil',
  imports: [AsyncPipe, ReactiveFormsModule, RouterLink, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './perfil.componente.html',
  styleUrl: './perfil.componente.scss',
})
export class PerfilComponente {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AutenticacionServicio);
  private readonly perfil = inject(PerfilServicio);
  private readonly avisos = inject(NotificacionServicio);

  protected readonly tiposSangre = TIPOS_SANGRE;
  protected readonly coloresOjos = COLORES_OJOS;
  protected readonly maximaFecha = soloFecha(new Date());

  protected readonly usuario$ = this.auth.usuarioActual$;
  protected readonly resumen$ = this.perfil.resumen();
  protected readonly guardando = signal(false);

  private readonly actual = this.auth.usuarioActual;

  protected readonly FormularioPerfil = this.fb.nonNullable.group({
    nombre: [this.actual?.nombre ?? '', [Validators.required, Validators.minLength(2)]],
    apellido: [this.actual?.apellido ?? '', [Validators.required, Validators.minLength(2)]],
    fechaNacimiento: [this.actual?.fechaNacimiento ?? '', [Validators.required]],
    tipoSangre: [this.actual?.tipoSangre ?? '0+', [Validators.required]],
    colorOjos: [this.actual?.colorOjos ?? 'Marrón', [Validators.required]],
    diasVacaciones: [
      this.actual?.diasVacaciones ?? 0,
      [Validators.required, Validators.min(0), Validators.max(365)],
    ],
  });

  protected edad(fechaNacimiento: string): number {
    return calcularEdad(fechaNacimiento);
  }

  protected invalido(campo: keyof typeof this.FormularioPerfil.controls): boolean {
    const control = this.FormularioPerfil.controls[campo];
    return control.invalid && control.touched;
  }

  protected guardar(): void {
    if (this.FormularioPerfil.invalid) {
      this.FormularioPerfil.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.perfil
      .actualizar(this.FormularioPerfil.getRawValue())
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.avisos.mostrar('Guardamos tus datos.', 'exito');
        },
        error: (error: Error) => {
          this.guardando.set(false);
          this.avisos.mostrar(error.message, 'error');
        },
      });
  }
}
