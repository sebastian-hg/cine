import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import { Resena, ResumenResenas } from '../../../../compartido/interfaces/resena.interfaz';
import { PipeEstrellas } from '../../../../compartido/pipes/estrellas.pipe';

 
@Component({
  selector: 'app-listado-resenas',
  imports: [DatePipe, PipeEstrellas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resumen(); as r) {
      @if (r.cantidad > 0) {
        <p class="promedio">
          <span class="promedio__valor">{{ r.promedio.toFixed(1) }}</span>
          <span class="promedio__estrellas" aria-hidden="true">
            {{ r.promedio | pipeEstrellas: false }}
          </span>
          <span class="promedio__cuenta">
            {{ r.cantidad }} {{ r.cantidad === 1 ? 'reseña' : 'reseñas' }}
          </span>
        </p>
      }
    }

    @if (resenas().length) {
      <ul class="resenas">
        @for (resena of resenas(); track resena.id) {
          <li class="resena">
            <div class="resena__cabecera">
              <span class="resena__autor">{{ resena.nombreUsuario }}</span>
              <span class="resena__estrellas" [attr.aria-label]="resena.estrellas + ' de 5 estrellas'">
                {{ resena.estrellas | pipeEstrellas: false }}
              </span>
              <span class="resena__fecha">{{ resena.fecha | date: 'd MMM y' }}</span>
            </div>
            <p class="resena__texto">{{ resena.comentario }}</p>
          </li>
        }
      </ul>
    } @else {
      <p class="vacio">Todavía nadie dejó una reseña de esta película.</p>
    }
  `,
  styles: `
    .promedio {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin: 0 0 18px;
    }

    .promedio__valor {
      font-family: var(--serif);
      font-size: 34px;
      font-weight: 700;
      line-height: 1;
    }

    .promedio__estrellas {
      color: var(--ambar);
      letter-spacing: 2px;
      font-size: 17px;
    }

    .promedio__cuenta {
      color: var(--texto-tenue);
      font-size: 13.5px;
    }

    .resenas {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 12px;
    }

    .resena {
      padding: 13px 15px;
      border-radius: var(--radio);
      background: var(--superficie);
      border: 1px solid var(--borde);
    }

    .resena__cabecera {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 5px;
    }

    .resena__autor {
      font-weight: 600;
      font-size: 14px;
    }

    .resena__estrellas {
      color: var(--ambar);
      letter-spacing: 1px;
      font-size: 13px;
    }

    .resena__fecha {
      margin-left: auto;
      color: var(--texto-tenue);
      font-size: 12.5px;
    }

    .resena__texto {
      margin: 0;
      color: var(--texto-suave);
      font-size: 14px;
    }
  `,
})
export class ListadoResenasComponente {
  readonly resenas = input<Resena[]>([]);
  readonly resumen = input<ResumenResenas | null>(null);
}
