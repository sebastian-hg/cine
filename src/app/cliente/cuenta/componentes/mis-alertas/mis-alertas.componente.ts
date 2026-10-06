import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, combineLatest, map, switchMap } from 'rxjs';

import { PeliculaServicio } from '../../../../compartido/servicios/pelicula.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { AlertaServicio } from '../../servicios/alerta.servicio';

 
@Component({
  selector: 'app-mis-alertas',
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor seccion">
      <header class="seccion-cabecera">
        <div>
          <p class="etiqueta-seccion">Próximos estrenos</p>
          <h1>Mis alertas</h1>
        </div>
        <a routerLink="/cuenta/perfil" class="boton boton--fantasma boton--chico">
          ← Volver al perfil
        </a>
      </header>

      @if (alertas(); as alertas) {
        @if (alertas.length) {
          <p class="nota">Te avisamos en cuanto se habilite la venta de estas películas.</p>
          <div class="lista">
            @for (alerta of alertas; track alerta.id) {
              <article class="alerta">
                <img [src]="alerta.poster" [alt]="'Póster de ' + alerta.nombre" loading="lazy" />
                <div class="alerta__cuerpo">
                  <h3>
                    <a [routerLink]="['/pelicula', alerta.idPelicula]">{{ alerta.nombre }}</a>
                  </h3>
                  <p class="alerta__estreno">
                    Estreno el {{ alerta.fechaEstreno | date: 'd MMMM' }}
                  </p>
                </div>
                <button
                  type="button"
                  class="boton boton--fantasma boton--chico"
                  (click)="quitar(alerta.idPelicula)"
                >
                  Quitar aviso
                </button>
              </article>
            }
          </div>
        } @else {
          <div class="vacio">
            <p>No tenés alertas activas.</p>
            <a routerLink="/proximamente" class="boton boton--primario">Ver próximos estrenos</a>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .alerta {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      background: var(--superficie);
      border: 1px solid var(--borde);
      border-radius: var(--radio);

      img {
        width: 48px;
        aspect-ratio: 2 / 3;
        object-fit: cover;
        border-radius: var(--radio-s);
        flex-shrink: 0;
      }

      &__cuerpo {
        flex: 1;
        min-width: 0;

        h3 {
          font-size: 15.5px;
        }

        a {
          color: inherit;
        }
      }

      &__estreno {
        margin: 2px 0 0;
        font-size: 12.5px;
        color: var(--ambar-fuerte);
      }
    }
  `,
})
export class MisAlertasComponente {
  private readonly alertasServicio = inject(AlertaServicio);
  private readonly peliculas = inject(PeliculaServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly recargar = new BehaviorSubject<void>(undefined);

   
  protected readonly alertas = toSignal(
    this.recargar.pipe(
      switchMap(() => combineLatest([this.alertasServicio.propias(), this.peliculas.listar()])),
      map(([alertas, peliculas]) =>
        alertas.flatMap((alerta) => {
          const pelicula = peliculas.find((p) => p.id === alerta.idPelicula);
          if (!pelicula) return [];
          return [
            {
              id: alerta.id,
              idPelicula: pelicula.id,
              nombre: pelicula.nombre,
              poster: pelicula.poster,
              fechaEstreno: pelicula.fechaEstreno,
            },
          ];
        }),
      ),
    ),
    { initialValue: [] },
  );

  protected quitar(idPelicula: string): void {
    this.alertasServicio.alternar(idPelicula).subscribe(() => {
      this.avisos.mostrar('Dejamos de avisarte sobre ese estreno.', 'info');
      this.recargar.next();
    });
  }
}
