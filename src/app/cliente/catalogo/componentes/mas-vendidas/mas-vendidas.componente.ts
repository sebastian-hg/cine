import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { PeliculaConMetricas } from '../../../../compartido/interfaces/pelicula.interfaz';
import { TarjetaPeliculaComponente } from '../tarjeta-pelicula/tarjeta-pelicula.componente';

/** §3: las 3 más vendidas, destacadas arriba de todo en la página principal. */
@Component({
  selector: 'app-mas-vendidas',
  imports: [TarjetaPeliculaComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="podio">
      @for (pelicula of peliculas(); track pelicula.id; let i = $index) {
        <app-tarjeta-pelicula
          [pelicula]="pelicula"
          [generos]="nombresDeGenero(pelicula)"
          [posicion]="i + 1"
          (verDetalle)="peliculaElegida.emit($event)"
        />
      }
    </div>
  `,
  styles: `
    .podio {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }

    @media (max-width: 720px) {
      .podio {
        grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
        gap: 12px;
      }
    }
  `,
})
export class MasVendidasComponente {
  readonly peliculas = input<PeliculaConMetricas[]>([]);
  readonly nombresGenero = input<Map<string, string>>(new Map());

  readonly peliculaElegida = output<string>();

  protected nombresDeGenero(pelicula: PeliculaConMetricas): string[] {
    const mapa = this.nombresGenero();
    return pelicula.generos.map((id) => mapa.get(id) ?? id);
  }
}
