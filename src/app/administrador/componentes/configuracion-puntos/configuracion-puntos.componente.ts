import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap } from 'rxjs';

import { Recompensa } from '../../../compartido/interfaces/puntos.interfaz';
import { FidelizacionServicio } from '../../../compartido/servicios/fidelizacion.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';

/** Configuración de recompensas (§15). */
@Component({
  selector: 'app-configuracion-puntos',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion-puntos.componente.html',
})
export class ConfiguracionPuntosComponente {
  private readonly fidelizacion = inject(FidelizacionServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly recargar = new BehaviorSubject<void>(undefined);

  protected readonly recompensas = toSignal<Recompensa[], Recompensa[]>(
    this.recargar.pipe(switchMap(() => this.fidelizacion.todasLasRecompensas())),
    { initialValue: [] },
  );

  protected cambiarPuntos(recompensa: Recompensa, evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    if (!Number.isFinite(valor) || valor < 1) return;

    this.fidelizacion.actualizarRecompensa(recompensa.id, { puntosRequeridos: valor }).subscribe(() => {
      this.registro
        .registrar('cambio-configuracion', `puso «${recompensa.nombre}» en ${valor} puntos`)
        .subscribe();
      this.avisos.mostrar(`«${recompensa.nombre}» ahora cuesta ${valor} puntos.`, 'exito');
      this.recargar.next();
    });
  }

  protected alternarActiva(recompensa: Recompensa): void {
    this.fidelizacion
      .actualizarRecompensa(recompensa.id, { activa: !recompensa.activa })
      .subscribe(() => {
        this.registro
          .registrar(
            'cambio-configuracion',
            `${recompensa.activa ? 'desactivó' : 'activó'} la recompensa «${recompensa.nombre}»`,
          )
          .subscribe();
        this.recargar.next();
      });
  }
}
