import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

import { ClasificacionEdad } from '../../interfaces/pelicula.interfaz';
import { PipeClasificacion } from '../../pipes/clasificacion.pipe';

/** Clasificación por edad. El texto completo va en `title` y para lectores. */
@Component({
  selector: 'app-insignia-clasificacion',
  imports: [PipeClasificacion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="insignia" [class]="clase()" [title]="clasificacion() | pipeClasificacion">
      {{ clasificacion() }}
      <span class="solo-lectores">. {{ clasificacion() | pipeClasificacion }}</span>
    </span>
  `,
  styles: `
    .insignia--atp {
      background: var(--ok-tenue);
      color: var(--ok);
      border-color: transparent;
    }
    .insignia--trece {
      background: var(--aviso-tenue);
      color: var(--aviso);
      border-color: transparent;
    }
    .insignia--dieciocho {
      background: var(--rojo-tenue);
      color: var(--rojo-fuerte);
      border-color: transparent;
    }
  `,
})
export class InsigniaClasificacionComponente {
  readonly clasificacion = input.required<ClasificacionEdad>();

  protected readonly clase = computed(() => {
    switch (this.clasificacion()) {
      case 'ATP':
        return 'insignia--atp';
      case '+13':
        return 'insignia--trece';
      case '+18':
        return 'insignia--dieciocho';
    }
  });
}
