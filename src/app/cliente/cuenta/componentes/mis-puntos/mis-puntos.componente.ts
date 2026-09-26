import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, of, switchMap, take } from 'rxjs';

import { Recompensa } from '../../../../compartido/interfaces/puntos.interfaz';
import { FidelizacionServicio } from '../../../../compartido/servicios/fidelizacion.servicio';
import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { DialogoConfirmacionComponente } from '../../../../compartido/componentes/dialogo-confirmacion/dialogo-confirmacion.componente';
import { CatalogoRecompensasComponente } from '../catalogo-recompensas/catalogo-recompensas.componente';
import { HistorialCanjesComponente } from '../historial-canjes/historial-canjes.componente';

/** Puntos, recompensas y canjes (§15). */
@Component({
  selector: 'app-mis-puntos',
  imports: [
    AsyncPipe,
    DatePipe,
    RouterLink,
    CatalogoRecompensasComponente,
    HistorialCanjesComponente,
    DialogoConfirmacionComponente,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-puntos.componente.html',
  styleUrl: './mis-puntos.componente.scss',
})
export class MisPuntosComponente {
  private readonly fidelizacion = inject(FidelizacionServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly recargar = new BehaviorSubject<void>(undefined);
  private readonly usuario$ = this.recargar.pipe(switchMap(() => this.auth.usuarioActual$));

  protected readonly saldo$ = this.usuario$.pipe(
    switchMap((usuario) => (usuario ? this.fidelizacion.saldo(usuario.id) : of(0))),
  );

  protected readonly movimientos$ = this.usuario$.pipe(
    switchMap((usuario) => (usuario ? this.fidelizacion.movimientos(usuario.id) : of([]))),
  );

  protected readonly canjes$ = this.usuario$.pipe(
    switchMap((usuario) => (usuario ? this.fidelizacion.canjes(usuario.id) : of([]))),
  );

  protected readonly recompensas$ = this.fidelizacion.recompensas();

  protected readonly porCanjear = signal<Recompensa | null>(null);

  protected pedirConfirmacion(recompensa: Recompensa): void {
    this.porCanjear.set(recompensa);
  }

  protected confirmarCanje(): void {
    const recompensa = this.porCanjear();
    const usuario = this.auth.usuarioActual;
    if (!recompensa || !usuario) return;

    this.fidelizacion
      .canjear(usuario.id, recompensa.id)
      .pipe(take(1))
      .subscribe({
        next: (canje) => {
          this.porCanjear.set(null);
          this.avisos.mostrar(`Canjeaste ${canje.nombreRecompensa}.`, 'exito');
          this.recargar.next();
        },
        error: (error: Error) => {
          this.porCanjear.set(null);
          this.avisos.mostrar(error.message, 'error');
        },
      });
  }

  protected cerrarDialogo(): void {
    this.porCanjear.set(null);
  }
}
