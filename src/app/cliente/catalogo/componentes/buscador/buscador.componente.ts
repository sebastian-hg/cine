import { Component, ChangeDetectionStrategy, OnInit, inject, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

 
const ESPERA_MS = 300;

 
@Component({
  selector: 'app-buscador',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="buscador">
      <label class="solo-lectores" for="buscador-cartelera">Buscar películas</label>
      <span class="buscador__icono" aria-hidden="true">⌕</span>
      <input
        id="buscador-cartelera"
        type="search"
        [formControl]="control"
        placeholder="Buscar por nombre o sinopsis…"
        autocomplete="off"
      />
      @if (control.value) {
        <button type="button" class="buscador__limpiar" aria-label="Limpiar búsqueda" (click)="limpiar()">
          ×
        </button>
      }
    </div>
  `,
  styles: `
    .buscador {
      position: relative;
      display: flex;
      align-items: center;

      input {
        padding-left: 36px;
        padding-right: 36px;
      }
    }

    .buscador__icono {
      position: absolute;
      left: 12px;
      font-size: 17px;
      color: var(--texto-tenue);
      pointer-events: none;
    }

    .buscador__limpiar {
      position: absolute;
      right: 8px;
      width: auto;
      padding: 0 6px;
      background: none;
      border: 0;
      color: var(--texto-tenue);
      font-size: 20px;
      line-height: 1;
      cursor: pointer;

      &:hover {
        color: var(--texto);
      }
    }
  `,
})
export class BuscadorComponente implements OnInit {
  readonly textoInicial = input<string>('');
  readonly textoBuscado = output<string>();

  protected readonly control = new FormControl('', { nonNullable: true });
  private readonly destruir = inject(DestroyRef);

  ngOnInit(): void {
    this.control.setValue(this.textoInicial(), { emitEvent: false });

    this.control.valueChanges
      .pipe(debounceTime(ESPERA_MS), distinctUntilChanged(), takeUntilDestroyed(this.destruir))
      .subscribe((texto) => this.textoBuscado.emit(texto));
  }

  protected limpiar(): void {
    this.control.setValue('');
  }
}
