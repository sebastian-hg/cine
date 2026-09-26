import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { Producto } from '../../../../compartido/interfaces/producto.interfaz';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { SelectorCantidadComponente } from '../selector-cantidad/selector-cantidad.componente';

/** Producto del Candy Bar (§10). Sin stock, no se puede agregar. */
@Component({
  selector: 'app-tarjeta-producto',
  imports: [PipeMonedaArs, SelectorCantidadComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="producto" [class.producto--agotado]="producto().stock === 0">
      <img class="producto__imagen" [src]="producto().imagen" [alt]="producto().nombre" loading="lazy" />

      <div class="producto__cuerpo">
        <h3 class="producto__nombre">{{ producto().nombre }}</h3>
        <p class="producto__descripcion">{{ producto().descripcion }}</p>

        @if (producto().stock === 0) {
          <span class="insignia insignia--rojo">Sin stock</span>
        } @else if (producto().stock <= 10) {
          <span class="insignia">Quedan {{ producto().stock }}</span>
        }
      </div>

      <div class="producto__pie">
        <span class="producto__precio">{{ producto().precio | pipeMonedaArs }}</span>

        @if (producto().stock === 0) {
          <button type="button" class="boton boton--chico" disabled>Agotado</button>
        } @else if (enCarrito() > 0) {
          <app-selector-cantidad
            [cantidad]="enCarrito()"
            [maximo]="producto().stock"
            [etiqueta]="'Cantidad de ' + producto().nombre"
            (cantidadCambiada)="cantidadCambiada.emit($event)"
          />
        } @else {
          <button
            type="button"
            class="boton boton--primario boton--chico"
            (click)="agregado.emit(producto())"
          >
            Agregar
          </button>
        }
      </div>
    </article>
  `,
  styleUrl: './tarjeta-producto.componente.scss',
})
export class TarjetaProductoComponente {
  readonly producto = input.required<Producto>();
  readonly enCarrito = input<number>(0);

  readonly agregado = output<Producto>();
  readonly cantidadCambiada = output<number>();
}
