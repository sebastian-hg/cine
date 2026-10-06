import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Combo } from '../../../compartido/interfaces/combo.interfaz';
import { Producto } from '../../../compartido/interfaces/producto.interfaz';

const IMAGENES = ['combos/clasico.svg', 'combos/pareja.svg', 'combos/dulce.svg', 'combos/salado.svg'];

 
@Component({
  selector: 'app-formulario-combo',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="FormularioCombo()" (ngSubmit)="enviar()" novalidate>
      <div class="campo">
        <label for="combo-nombre">Nombre</label>
        <input id="combo-nombre" type="text" formControlName="nombre" />
      </div>

      <div class="campo">
        <label for="combo-descripcion">Descripción</label>
        <input id="combo-descripcion" type="text" formControlName="descripcion" />
      </div>

      <div class="campo">
        <label id="etiqueta-productos">Productos incluidos</label>
        <div class="fichas" role="group" aria-labelledby="etiqueta-productos">
          @for (producto of productos(); track producto.id) {
            <button
              type="button"
              class="ficha"
              [class.ficha--activa]="estaElegido(producto.id)"
              [attr.aria-pressed]="estaElegido(producto.id)"
              (click)="alternarProducto(producto.id)"
            >
              {{ producto.nombre }}
            </button>
          }
        </div>
        @if (elegidos().size === 0 && FormularioCombo().touched) {
          <p class="mensaje-campo">Elegí al menos un producto.</p>
        }
      </div>

      <div class="rejilla-campos">
        <div class="campo">
          <label for="combo-precio">Precio fijo</label>
          <input id="combo-precio" type="number" formControlName="precioFijo" min="1" step="100" />
        </div>

        <div class="campo">
          <label for="combo-imagen">Imagen</label>
          <select id="combo-imagen" formControlName="imagen">
            @for (imagen of imagenes(); track imagen) {
              <option [value]="imagen">{{ imagen.split('/')[1] }}</option>
            }
          </select>
        </div>
      </div>

      <div class="campo">
        <label class="inline">
          <input type="checkbox" formControlName="incluyeEntrada" class="casilla" />
          Incluye entrada
        </label>
      </div>

      <div class="campo">
        <label class="inline">
          <input type="checkbox" formControlName="destacado" class="casilla" />
          Destacar en la página principal
        </label>
      </div>

      <button type="submit" class="boton boton--primario">Crear combo</button>
    </form>
  `,
})
export class FormularioComboComponente {
  readonly productos = input<Producto[]>([]);

  readonly comboGuardado = output<Omit<Combo, 'id'>>();

  private readonly fb = inject(FormBuilder);

  protected readonly imagenes = signal(IMAGENES);
  protected readonly elegidos = signal<Set<string>>(new Set());

  protected readonly FormularioCombo = signal(
    this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(5)]],
      precioFijo: [9900, [Validators.required, Validators.min(1)]],
      imagen: [IMAGENES[0], [Validators.required]],
      incluyeEntrada: [false],
      destacado: [false],
    }),
  );

  protected alternarProducto(id: string): void {
    const actuales = new Set(this.elegidos());
    if (actuales.has(id)) actuales.delete(id);
    else actuales.add(id);
    this.elegidos.set(actuales);
  }

  protected estaElegido(id: string): boolean {
    return this.elegidos().has(id);
  }

  protected enviar(): void {
    if (this.FormularioCombo().invalid || this.elegidos().size === 0) {
      this.FormularioCombo().markAllAsTouched();
      return;
    }

    this.comboGuardado.emit({
      ...this.FormularioCombo().getRawValue(),
      productos: [...this.elegidos()].map((idProducto) => ({ idProducto, cantidad: 1 })),
      activo: true,
    });

    this.FormularioCombo().reset({
      nombre: '',
      descripcion: '',
      precioFijo: 9900,
      imagen: IMAGENES[0],
      incluyeEntrada: false,
      destacado: false,
    });
    this.elegidos.set(new Set());
  }
}
