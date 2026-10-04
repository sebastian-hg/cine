import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, switchMap, take } from 'rxjs';

import { ResenaServicio } from '../../../../compartido/servicios/resena.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { FormularioResenaComponente, ResenaEnviada } from '../../../catalogo/componentes/formulario-resena/formulario-resena.componente';
import { PeliculaVista, PerfilServicio } from '../../servicios/perfil.servicio';
import { TarjetaPeliculaVistaComponente } from '../tarjeta-pelicula-vista/tarjeta-pelicula-vista.componente';

/**
 * Mis películas (§18).
 *
 * «Debe ser un historial visual, no solamente una tabla»: es una galería de
 * pósters con la fecha de la función y la calificación propia.
 */
@Component({
  selector: 'app-mis-peliculas',
  imports: [RouterLink, TarjetaPeliculaVistaComponente, FormularioResenaComponente],
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

      @if (peliculas(); as peliculas) {
        @if (peliculas.length) {
          <p class="nota">
            Estas son las películas de funciones a las que ya asististe. Podés dejar una reseña.
          </p>
          <div class="galeria">
            @for (vista of peliculas; track vista.idPelicula) {
              <app-tarjeta-pelicula-vista
                [peliculaVista]="vista"
                (calificar)="abrirResena($event)"
              />
            }
          </div>

          @if (peliculaParaResenar(); as pelicula) {
            <section class="resena-activa" aria-labelledby="titulo-resena-perfil">
              <h2 id="titulo-resena-perfil">Tu reseña de {{ pelicula.nombre }}</h2>
              <app-formulario-resena
                [puedeCalificar]="true"
                (resenaEnviada)="publicarResena($event)"
              />
              <button
                type="button"
                class="boton boton--fantasma boton--chico"
                (click)="peliculaParaResenar.set(null)"
              >
                Cancelar
              </button>
            </section>
          }
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

    .resena-activa {
      max-width: 620px;
      margin-top: 28px;
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
  private readonly resenas = inject(ResenaServicio);
  private readonly avisos = inject(NotificacionServicio);
  private readonly recargar = new BehaviorSubject<void>(undefined);

  protected readonly peliculas = toSignal(
    this.recargar.pipe(switchMap(() => this.perfil.misPeliculas())),
    {
      initialValue: [],
    },
  );
  protected readonly peliculaParaResenar = signal<PeliculaVista | null>(null);

  protected abrirResena(idPelicula: string): void {
    this.peliculaParaResenar.set(
      this.peliculas().find((pelicula) => pelicula.idPelicula === idPelicula) ?? null,
    );
  }

  protected publicarResena(resena: ResenaEnviada): void {
    const pelicula = this.peliculaParaResenar();
    if (!pelicula) return;

    this.resenas
      .publicar(pelicula.idPelicula, resena.estrellas, resena.comentario)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.avisos.mostrar('¡Gracias! Tu reseña ya está publicada.', 'exito');
          this.peliculaParaResenar.set(null);
          this.recargar.next();
        },
        error: (error: Error) => this.avisos.mostrar(error.message, 'error'),
      });
  }
}
