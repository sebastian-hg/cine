import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { PeliculaConMetricas } from '../../../../compartido/interfaces/pelicula.interfaz';
import { TarjetaPeliculaComponente } from '../tarjeta-pelicula/tarjeta-pelicula.componente';

 
@Component({
  selector: 'app-cartelera',
  imports: [TarjetaPeliculaComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (peliculas().length) {
      <div class="rejilla">
        @for (pelicula of peliculas(); track pelicula.id) {
          <app-tarjeta-pelicula
            [pelicula]="pelicula"
            [generos]="nombresDeGenero(pelicula)"
            (verDetalle)="peliculaElegida.emit($event)"
          />
        }
      </div>
    } @else {
      <p class="vacio">{{ mensajeVacio() }}</p>
    }
  `,
  styles: `
    .rejilla {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 18px;
    }

    @media (max-width: 480px) {
      .rejilla {
        grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
        gap: 12px;
      }
    }
  `,
})
export class CarteleraComponente {
  readonly peliculas = input<PeliculaConMetricas[]>([]);
  readonly nombresGenero = input<Map<string, string>>(new Map());
  readonly mensajeVacio = input<string>('No encontramos películas con esos criterios.');

  readonly peliculaElegida = output<string>();

  protected nombresDeGenero(pelicula: PeliculaConMetricas): string[] {
    const mapa = this.nombresGenero();
    return pelicula.generos.map((id) => mapa.get(id) ?? id);
  }
}
