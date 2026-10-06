import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { Combo } from '../../../../compartido/interfaces/combo.interfaz';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';

 
@Component({
  selector: 'app-combos-destacados',
  imports: [PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="combos">
      @for (combo of combos(); track combo.id) {
        <article class="combo">
          <img class="combo__imagen" [src]="combo.imagen" [alt]="combo.nombre" loading="lazy" />
          <div class="combo__cuerpo">
            <h3 class="combo__nombre">{{ combo.nombre }}</h3>
            <p class="combo__descripcion">{{ combo.descripcion }}</p>
            @if (combo.incluyeEntrada) {
              <span class="insignia insignia--ambar">Incluye entrada</span>
            }
          </div>
          <div class="combo__pie">
            <span class="combo__precio">{{ combo.precioFijo | pipeMonedaArs }}</span>
            <button
              type="button"
              class="boton boton--primario boton--chico"
              (click)="comboElegido.emit(combo)"
            >
              Agregar
            </button>
          </div>
        </article>
      }
    </div>
  `,
  styles: `
    .combos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 16px;
    }

    .combo {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      background: var(--superficie);
      border: 1px solid var(--borde);
      border-radius: var(--radio);

      &__imagen {
        width: 64px;
        height: 64px;
        border-radius: var(--radio-s);
      }

      &__cuerpo {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: flex-start;
      }

      &__nombre {
        font-size: 16px;
      }

      &__descripcion {
        margin: 0;
        font-size: 13px;
        color: var(--texto-suave);
      }

      &__pie {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      &__precio {
        font-size: 17px;
        font-weight: 700;
        color: var(--ambar-fuerte);
      }
    }
  `,
})
export class CombosDestacadosComponente {
  readonly combos = input<Combo[]>([]);
  readonly comboElegido = output<Combo>();
}
