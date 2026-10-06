import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import {
  FormularioRegistroComponente,
  DatosFormularioRegistro,
} from './formulario-registro.componente';

/**
 * Registro de usuario (§8 de la consigna).
 *
 * El formulario coincide con los campos reales de la tabla `usuarios_cine`.
 * No se envían datos extra que la DB no tiene.
 */
@Component({
  selector: 'app-registro',
  imports: [FormularioRegistroComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registro.componente.html',
})
export class RegistroComponente {
  private readonly auth = inject(AutenticacionServicio);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionServicio);

  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected readonly maximaFecha = new Date().toISOString().slice(0, 10);

  public enviar(datos: DatosFormularioRegistro): void {
    this.enviando.set(true);
    this.error.set(null);

    this.auth.registrar(datos).subscribe({
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
