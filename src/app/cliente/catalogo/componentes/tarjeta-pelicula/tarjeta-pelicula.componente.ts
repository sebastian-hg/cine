import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PeliculaConMetricas } from '../../../../compartido/interfaces/pelicula.interfaz';
import { InsigniaClasificacionComponente } from '../../../../compartido/componentes/insignia-clasificacion/insignia-clasificacion.componente';
import { PipeDuracion } from '../../../../compartido/pipes/duracion.pipe';
import { PipeEstrellas } from '../../../../compartido/pipes/estrellas.pipe';

/** Tarjeta de cartelera. Recibe la película y emite la navegación al detalle. */
@Component({
  selector: 'app-tarjeta-pelicula',
  imports: [RouterLink, InsigniaClasificacionComponente, PipeDuracion, PipeEstrellas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tarjeta-pelicula.componente.html',
  styleUrl: './tarjeta-pelicula.componente.scss',
})
export class TarjetaPeliculaComponente {
  readonly pelicula = input.required<PeliculaConMetricas>();
  readonly generos = input<string[]>([]);
  readonly posicion = input<number | null>(null);

  readonly verDetalle = output<string>();
}
