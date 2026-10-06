import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CategoriaCandy } from '../../../compartido/interfaces/categoria.interfaz';
import { Producto } from '../../../compartido/interfaces/producto.interfaz';

const IMAGENES = [
  'productos/pochoclo-chico.svg',
  'productos/pochoclo-grande.svg',
  'productos/pochoclo-caramelo.svg',
  'productos/gaseosa-500.svg',
  'productos/gaseosa-1l.svg',
  'productos/agua.svg',
  'productos/bombones.svg',
  'productos/gomitas.svg',
  'productos/chocolate.svg',
  'productos/nachos.svg',
  'productos/papas.svg',
];

 
@Component({
  selector: 'app-formulario-producto',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="FormularioProducto()" (ngSubmit)="enviar()" novalidate>
      <div class="campo">
        <label for="prod-nombre">Nombre</label>
        <input id="prod-nombre" type="text" formControlName="nombre" />
      </div>

      <div class="campo">
        <label for="prod-descripcion">Descripción</label>
        <input id="prod-descripcion" type="text" formControlName="descripcion" />
      </div>

      <div class="rejilla-campos">
        <div class="campo">
          <label for="prod-categoria">Categoría</label>
          <select id="prod-categoria" formControlName="idCategoria">
            <option value="">Elegí una…</option>
            @for (categoria of categorias(); track categoria.id) {
              <option [value]="categoria.id">{{ categoria.nombre }}</option>
            }
          </select>
        </div>

        <div class="campo">
          <label for="prod-precio">Precio</label>
          <input id="prod-precio" type="number" formControlName="precio" min="1" step="100" />
        </div>

        <div class="campo">
          <label for="prod-stock">Stock</label>
          <input id="prod-stock" type="number" formControlName="stock" min="0" />
        </div>

        <div class="campo">
          <label for="prod-imagen">Imagen</label>
          <select id="prod-imagen" formControlName="imagen">
            @for (imagen of imagenes; track imagen) {
              <option [value]="imagen">{{ imagen.split('/')[1] }}</option>
            }
          </select>
        </div>
      </div>

      <button type="submit" class="boton boton--primario" [disabled]="FormularioProducto().invalid">
        Crear producto
      </button>
    </form>
  `,
})
export class FormularioProductoComponente {
  readonly categorias = input<CategoriaCandy[]>([]);

  readonly productoGuardado = output<Omit<Producto, 'id'>>();

  private readonly fb = inject(FormBuilder);

  protected readonly imagenes = IMAGENES;

  protected readonly FormularioProducto = signal(
    this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(5)]],
      idCategoria: ['', [Validators.required]],
      precio: [3000, [Validators.required, Validators.min(1)]],
      stock: [50, [Validators.required, Validators.min(0)]],
      imagen: [IMAGENES[0], [Validators.required]],
    }),
  );

  protected enviar(): void {
    if (this.FormularioProducto().invalid) {
      this.FormularioProducto().markAllAsTouched();
      return;
    }

    this.productoGuardado.emit({ ...this.FormularioProducto().getRawValue(), activo: true });
    this.FormularioProducto().reset({
      nombre: '',
      descripcion: '',
      idCategoria: '',
      precio: 3000,
      stock: 50,
      imagen: IMAGENES[0],
    });
  }
}
