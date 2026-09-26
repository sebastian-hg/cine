import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PerfilServicio } from '../../servicios/perfil.servicio';
import { TarjetaPeliculaVistaComponente } from '../tarjeta-pelicula-vista/tarjeta-pelicula-vista.componente';

/**
 * Mis películas (§18).
 *
 * «Debe ser un historial visual, no solamente una tabla»: es una galería de
 * pósters con la fecha de la función y la calificación propia.
 */
@Component({
  selector: 'app-mis-peliculas',
  imports: [AsyncPipe, RouterLink, TarjetaPeliculaVistaComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor seccion">
      <header class="seccion-cabecera">
        <div>
          <p class="etiqueta-seccion">Tu historial</p>
          <h1>Mis películas</h1>
        </div>
        <a routerLink="/cuenta/perfil" class="boton boton--fantasma boton--chico">
          ← Volver al perfil
        </a>
      </header>

      @if (peliculas$ | async; as peliculas) {
        @if (peliculas.length) {
          <p class="nota">
            Estas son las funciones a las que ya fuiste. Podés calificar cualquiera de ellas.
          </p>
          <div class="galeria">
            @for (vista of peliculas; track vista.idPelicula) {
              <app-tarjeta-pelicula-vista [peliculaVista]="vista" />
            }
          </div>
        } @else {
          <div class="vacio">
            <p>Todavía no fuiste a ninguna función.</p>
            <a routerLink="/" class="boton boton--primario">Ver la cartelera</a>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .galeria {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
      gap: 16px;
    }

    @media (max-width: 480px) {
      .galeria {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
      }
    }
  `,
})
export class MisPeliculasComponente {
  private readonly perfil = inject(PerfilServicio);

  protected readonly peliculas$ = this.perfil.misPeliculas();
}
