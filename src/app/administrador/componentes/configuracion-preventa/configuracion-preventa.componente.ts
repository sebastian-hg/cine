import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { BehaviorSubject, combineLatest, map, switchMap } from 'rxjs';

import { Pelicula } from '../../../compartido/interfaces/pelicula.interfaz';
import { ConfiguracionServicio } from '../../../compartido/servicios/configuracion.servicio';
import { PeliculaServicio } from '../../../compartido/servicios/pelicula.servicio';
import { estadoPreventa } from '../../../nucleo/dominio/preventa';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';
import { PipeMonedaArs } from '../../../compartido/pipes/moneda-ars.pipe';

/** Preventa película por película (§16). */
@Component({
  selector: 'app-configuracion-preventa',
  imports: [AsyncPipe, DatePipe, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion-preventa.componente.html',
})
export class ConfiguracionPreventaComponente {
  private readonly peliculas = inject(PeliculaServicio);
  private readonly configuracion = inject(ConfiguracionServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly recargar = new BehaviorSubject<void>(undefined);

  protected readonly filas$ = this.recargar.pipe(
    switchMap(() => combineLatest([this.peliculas.listar(), this.configuracion.obtener()])),
    map(([peliculas, config]) =>
      peliculas.map((pelicula) => ({
        pelicula,
        estado: estadoPreventa(pelicula, config.diasAnticipacionPreventa),
      })),
    ),
  );

  protected alternar(pelicula: Pelicula): void {
    this.peliculas
      .actualizar(pelicula.id, { preventaActivada: !pelicula.preventaActivada })
      .subscribe(() => {
        this.registro
          .registrar(
            'cambio-configuracion',
            `${pelicula.preventaActivada ? 'desactivó' : 'activó'} la preventa de "${pelicula.nombre}"`,
          )
          .subscribe();
        this.recargar.next();
      });
  }

  protected cambiarPrecio(pelicula: Pelicula, evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    if (!Number.isFinite(valor) || valor < 1) return;

    this.peliculas.actualizar(pelicula.id, { precioPreventa: valor }).subscribe(() => {
      this.registro
        .registrar('cambiar-precio', `puso el precio de preventa de "${pelicula.nombre}" en ${valor}`)
        .subscribe();
      this.avisos.mostrar('Precio de preventa actualizado.', 'exito');
      this.recargar.next();
    });
  }
}
