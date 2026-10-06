import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PeliculaConMetricas } from '../../../../compartido/interfaces/pelicula.interfaz';
import { InsigniaClasificacionComponente } from '../../../../compartido/componentes/insignia-clasificacion/insignia-clasificacion.componente';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';

 
@Component({
  selector: 'app-tarjeta-proximamente',
  imports: [RouterLink, DatePipe, InsigniaClasificacionComponente, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tarjeta-proximamente.componente.html',
  styleUrl: './tarjeta-proximamente.componente.scss',
})
export class TarjetaProximamenteComponente {
  readonly pelicula = input.required<PeliculaConMetricas>();
  readonly preventaActiva = input<boolean>(false);
  readonly diasParaEstreno = input<number>(0);
  readonly suscrito = input<boolean>(false);
  readonly puedeSuscribirse = input<boolean>(true);

  readonly avisarme = output<string>();
}
