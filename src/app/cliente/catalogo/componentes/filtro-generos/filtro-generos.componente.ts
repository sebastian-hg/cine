import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { Genero } from '../../../../compartido/interfaces/genero.interfaz';

/**
 * Filtro por géneros (§3: una película puede tener varios).
 *
 * Multiselección: alcanza con que la película tenga uno de los elegidos.
 * Se usa `aria-pressed` en vez de checkboxes escondidos para que los botones
 * comuniquen su estado a los lectores de pantalla.
 */
@Component({
  selector: 'app-filtro-generos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filtro" role="group" aria-label="Filtrar por género">
      <button
        type="button"
        class="ficha"
        [class.ficha--activa]="seleccionados().length === 0"
        [attr.aria-pressed]="seleccionados().length === 0"
        (click)="generosSeleccionados.emit([])"
      >
        Todos
      </button>

      @for (genero of generos(); track genero.id) {
        <button
          type="button"
          class="ficha"
          [class.ficha--activa]="estaElegido(genero.id)"
          [attr.aria-pressed]="estaElegido(genero.id)"
          (click)="alternar(genero.id)"
        >
          {{ genero.nombre }}
        </button>
      }
    </div>
  `,
  styles: `
    .filtro {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }

    .ficha {
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 13px;
      border-radius: 999px;
      border: 1px solid var(--borde-fuerte);
      background: transparent;
      color: var(--texto-suave);
      cursor: pointer;
      white-space: nowrap;
      width: auto;
      transition:
        background 0.14s,
        color 0.14s,
        border-color 0.14s;

      &:hover {
        background: var(--superficie-2);
        color: var(--texto);
      }
    }

    .ficha--activa {
      background: var(--ambar);
      border-color: var(--ambar);
      color: #17120c;

      &:hover {
        background: var(--ambar-fuerte);
        color: #17120c;
      }
    }
  `,
})
export class FiltroGenerosComponente {
  readonly generos = input<Genero[]>([]);
  readonly seleccionados = input<string[]>([]);

  readonly generosSeleccionados = output<string[]>();

  protected estaElegido(id: string): boolean {
    return this.seleccionados().includes(id);
  }

  protected alternar(id: string): void {
    const actuales = this.seleccionados();
    this.generosSeleccionados.emit(
      actuales.includes(id) ? actuales.filter((g) => g !== id) : [...actuales, id],
    );
  }
}
