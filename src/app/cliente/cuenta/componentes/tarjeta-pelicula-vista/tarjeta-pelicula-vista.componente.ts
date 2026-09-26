import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PeliculaVista } from '../../servicios/perfil.servicio';
import { CalificacionEstrellasComponente } from '../../../../compartido/componentes/calificacion-estrellas/calificacion-estrellas.componente';

/** §18: una película vista, con póster, fecha y calificación propia. */
@Component({
  selector: 'app-tarjeta-pelicula-vista',
  imports: [DatePipe, RouterLink, CalificacionEstrellasComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="vista">
      <a [routerLink]="['/pelicula', peliculaVista().idPelicula]" class="vista__poster">
        <img
          [src]="peliculaVista().poster"
          [alt]="'Póster de ' + peliculaVista().nombre"
          loading="lazy"
        />
      </a>

      <div class="vista__cuerpo">
        <h3>
          <a [routerLink]="['/pelicula', peliculaVista().idPelicula]">{{ peliculaVista().nombre }}</a>
        </h3>
        <p class="vista__fecha">
          La viste el {{ peliculaVista().inicioFuncion | date: 'd MMM y' }}
        </p>

        @if (peliculaVista().calificacionPropia; as estrellas) {
          <app-calificacion-estrellas [valor]="estrellas" [soloLectura]="true" />
        } @else {
          <a
            [routerLink]="['/pelicula', peliculaVista().idPelicula]"
            class="vista__calificar"
            (click)="calificar.emit(peliculaVista().idPelicula)"
          >
            Calificala →
          </a>
        }
      </div>
    </article>
  `,
  styles: `
    .vista {
      display: flex;
      flex-direction: column;
      background: var(--superficie);
      border: 1px solid var(--borde);
      border-radius: var(--radio);
      overflow: hidden;
      height: 100%;

      &__poster {
        aspect-ratio: 2 / 3;
        background: var(--superficie-2);

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      &__cuerpo {
        padding: 12px 13px 14px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        flex: 1;

        h3 {
          font-size: 15px;
          line-height: 1.25;
        }

        a {
          color: inherit;
        }
      }

      &__fecha {
        margin: 0;
        font-size: 12px;
        color: var(--texto-tenue);
      }

      &__calificar {
        margin-top: auto;
        font-size: 13px;
        color: var(--ambar-fuerte);
      }
    }
  `,
})
export class TarjetaPeliculaVistaComponente {
  readonly peliculaVista = input.required<PeliculaVista>();

  readonly verDetalle = output<string>();
  readonly calificar = output<string>();
}
