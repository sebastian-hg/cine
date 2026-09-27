import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap } from 'rxjs';

import { Producto } from '../../../compartido/interfaces/producto.interfaz';
import { CandyServicio } from '../../../compartido/servicios/candy.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';
import { PipeMonedaArs } from '../../../compartido/pipes/moneda-ars.pipe';
import { FormularioProductoComponente } from '../formulario-producto/formulario-producto.componente';

/** CRUD de productos del Candy Bar (§10). */
@Component({
  selector: 'app-gestion-productos',
  imports: [FormularioProductoComponente, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="seccion-cabecera">
      <div>
        <p class="etiqueta-seccion">Candy Bar</p>
        <h1>Productos</h1>
      </div>
    </header>

    <div class="cuerpo">
      <section class="bloque">
        <h2>Nuevo producto</h2>
        <app-formulario-producto
          [categorias]="categorias()"
          (productoGuardado)="crear($event)"
        />
      </section>

      <section class="bloque">
        <h2>Catálogo</h2>
        @if (productos(); as productos) {
          <div class="tabla-scroll">
            <table>
              <caption class="solo-lectores">Productos del Candy Bar</caption>
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col" class="numerico">Precio</th>
                  <th scope="col" class="numerico">Stock</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (producto of productos; track producto.id) {
                  <tr>
                    <td>{{ producto.nombre }}</td>
                    <td class="numerico">{{ producto.precio | pipeMonedaArs }}</td>
                    <td class="numerico">
                      <label class="solo-lectores" [attr.for]="'stock-' + producto.id">
                        Stock de {{ producto.nombre }}
                      </label>
                      <input
                        [id]="'stock-' + producto.id"
                        class="puntos"
                        type="number"
                        min="0"
                        [value]="producto.stock"
                        (change)="cambiarStock(producto, $event)"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        class="boton boton--chico"
                        [class.boton--fantasma]="producto.activo"
                        (click)="alternar(producto)"
                      >
                        {{ producto.activo ? 'Activo' : 'Desactivado' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .cuerpo {
      display: grid;
      grid-template-columns: 380px minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 1100px) {
      .cuerpo {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class GestionProductosComponente {
  private readonly candy = inject(CandyServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly recargar = new BehaviorSubject<void>(undefined);

  protected readonly productos = toSignal<Producto[], Producto[]>(
    this.recargar.pipe(switchMap(() => this.candy.todosLosProductos())),
    { initialValue: [] },
  );
  protected readonly categorias = toSignal(this.candy.categorias(), {
    initialValue: [],
  });

  protected crear(datos: Omit<Producto, 'id'>): void {
    this.candy.crearProducto(datos).subscribe((producto) => {
      this.registro.registrar('crear', `creó el producto "${producto.nombre}"`).subscribe();
      this.avisos.mostrar(`"${producto.nombre}" agregado al Candy Bar.`, 'exito');
      this.recargar.next();
    });
  }

  protected cambiarStock(producto: Producto, evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    if (!Number.isFinite(valor) || valor < 0) return;

    this.candy.actualizarProducto(producto.id, { stock: valor }).subscribe(() => {
      this.registro
        .registrar('modificar', `puso el stock de "${producto.nombre}" en ${valor}`)
        .subscribe();
      this.recargar.next();
    });
  }

  protected alternar(producto: Producto): void {
    this.candy.actualizarProducto(producto.id, { activo: !producto.activo }).subscribe(() => {
      this.registro
        .registrar(
          'modificar',
          `${producto.activo ? 'desactivó' : 'activó'} el producto "${producto.nombre}"`,
        )
        .subscribe();
      this.recargar.next();
    });
  }
}
