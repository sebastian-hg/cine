import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, map, switchMap } from 'rxjs';

import { ConfiguracionServicio } from '../../../../compartido/servicios/configuracion.servicio';
import { PeliculaServicio } from '../../../../compartido/servicios/pelicula.servicio';
import { estadoPreventa } from '../../../../nucleo/dominio/preventa';
import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { AlertaServicio } from '../../../cuenta/servicios/alerta.servicio';
import { CargandoComponente } from '../../../../compartido/componentes/cargando/cargando.componente';
import { TarjetaProximamenteComponente } from '../tarjeta-proximamente/tarjeta-proximamente.componente';

/**
 * Sección Próximamente (§17 de la consigna).
 *
 * Lista las películas que todavía no se estrenaron con su estado de preventa, y
 * permite suscribirse al aviso de habilitación de venta.
 */
@Component({
  selector: 'app-proximamente',
  imports: [CargandoComponente, TarjetaProximamenteComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './proximamente.componente.html',
  styleUrl: './proximamente.componente.scss',
})
export class ProximamenteComponente {
  private readonly peliculas = inject(PeliculaServicio);
  private readonly configuracion = inject(ConfiguracionServicio);
  private readonly alertas = inject(AlertaServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly avisos = inject(NotificacionServicio);

  /** Se empuja tras cada alta o baja para releer las suscripciones. */
  private readonly recargar = new BehaviorSubject<void>(undefined);

  protected readonly autenticado = toSignal(this.auth.estaAutenticado$, {
    initialValue: false,
  });

  protected readonly proximas = toSignal(
    combineLatest([
    this.peliculas.proximamente(),
    this.configuracion.obtener(),
    ]).pipe(
      map(([peliculas, config]) =>
        peliculas.map((pelicula) => ({
          pelicula,
          estado: estadoPreventa(pelicula, config.diasAnticipacionPreventa),
        })),
      ),
    ),
    { initialValue: [] },
  );

  protected readonly suscritos = toSignal(
    this.recargar.pipe(switchMap(() => this.alertas.idsSuscritos())),
    { initialValue: new Set<string>() },
  );

  protected readonly sinSuscripciones = new Set<string>();

  protected alternarAlerta(idPelicula: string): void {
    this.alertas.alternar(idPelicula).subscribe((suscrito) => {
      this.avisos.mostrar(
        suscrito
          ? 'Listo. Te avisamos cuando se habilite la venta.'
          : 'Dejamos de avisarte sobre este estreno.',
        suscrito ? 'exito' : 'info',
      );
      this.recargar.next();
    });
  }
}
