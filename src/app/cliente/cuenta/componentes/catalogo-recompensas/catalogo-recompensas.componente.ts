import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { Recompensa } from '../../../../compartido/interfaces/puntos.interfaz';

 
@Component({
  selector: 'app-catalogo-recompensas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="recompensas">
      @for (recompensa of recompensas(); track recompensa.id) {
        <article class="recompensa" [class.recompensa--alcanzable]="saldo() >= recompensa.puntosRequeridos">
          <span class="recompensa__icono" aria-hidden="true">
            {{ recompensa.tipo === 'entrada' ? '🎟️' : '🍿' }}
          </span>
          <div class="recompensa__cuerpo">
            <h3>{{ recompensa.nombre }}</h3>
            <p class="recompensa__puntos">{{ recompensa.puntosRequeridos }} puntos</p>
          </div>
          <button
            type="button"
            class="boton boton--chico"
            [class.boton--primario]="saldo() >= recompensa.puntosRequeridos"
            [disabled]="saldo() < recompensa.puntosRequeridos"
            (click)="canjeSolicitado.emit(recompensa)"
          >
            @if (saldo() >= recompensa.puntosRequeridos) {
              Canjear
            } @else {
              Faltan {{ recompensa.puntosRequeridos - saldo() }}
            }
          </button>
        </article>
      }
    </div>
  `,
  styles: `
    .recompensas {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }

    .recompensa {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 14px;
      background: var(--superficie);
      border: 1px solid var(--borde);
      border-radius: var(--radio);

      &--alcanzable {
        border-color: color-mix(in srgb, var(--ambar) 45%, transparent);
      }

      &__icono {
        font-size: 24px;
      }

      &__cuerpo {
        flex: 1;
        min-width: 0;

        h3 {
          font-size: 15px;
        }
      }

      &__puntos {
        margin: 2px 0 0;
        font-size: 12.5px;
        color: var(--texto-tenue);
      }
    }
  `,
})
export class CatalogoRecompensasComponente {
  readonly recompensas = input<Recompensa[]>([]);
  readonly saldo = input<number>(0);

  readonly canjeSolicitado = output<Recompensa>();
}
