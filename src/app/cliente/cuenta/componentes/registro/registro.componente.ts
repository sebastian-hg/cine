import { Component, ChangeDetectionStrategy, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import {
  FormularioRegistroComponente,
  DatosFormularioRegistro,
} from './formulario-registro.componente';







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
  private readonly formulario = viewChild(FormularioRegistroComponente);
  private registroCompletado = false;

  puedeAbandonar(): boolean {
    if (this.registroCompletado || !this.formulario()?.tieneCambiosSinGuardar()) return true;
    return window.confirm('Hay datos sin guardar. ¿Querés salir del registro?');
  }

  public enviar(datos: DatosFormularioRegistro): void {
    this.enviando.set(true);
    this.error.set(null);

    this.auth.registrar(datos).subscribe({
      next: (usuario) => {
        this.enviando.set(false);
        this.registroCompletado = true;
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
