import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { ItemCarrito } from '../../../../compartido/interfaces/carrito.interfaz';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { CarritoServicio } from '../../servicios/carrito.servicio';
import { PrecioServicio } from '../../servicios/precio.servicio';
import { ResumenTotalesComponente } from '../resumen-totales/resumen-totales.componente';
import { SelectorCantidadComponente } from '../selector-cantidad/selector-cantidad.componente';

/** Carrito con entradas, productos y combos juntos (§10). */
@Component({
  selector: 'app-carrito',
  imports: [RouterLink, ResumenTotalesComponente, SelectorCantidadComponente, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './carrito.componente.html',
  styleUrl: './carrito.componente.scss',
})
export class CarritoComponente {
  private readonly carrito = inject(CarritoServicio);
  private readonly precio = inject(PrecioServicio);
  private readonly router = inject(Router);

  protected readonly items = toSignal<ItemCarrito[], ItemCarrito[]>(this.carrito.items$, {
    initialValue: [],
  });
  protected readonly desglose = toSignal(this.precio.desglose$, {
    initialValue: null,
  });

  protected cambiarCantidad(item: ItemCarrito, cantidad: number): void {
    this.carrito.cambiarCantidad(item, cantidad);
  }

  protected quitar(item: ItemCarrito): void {
    this.carrito.quitar(item);
  }

  protected vaciar(): void {
    this.carrito.vaciar();
    this.precio.reiniciar();
    void this.router.navigate(['/']);
  }

  protected irAPagar(): void {
    void this.router.navigate(['/compra/checkout']);
  }

  /** Clave estable para `track`: el tipo más su identificador propio. */
  protected clave(item: ItemCarrito): string {
    switch (item.tipo) {
      case 'entrada':
        return `e-${item.idButaca}`;
      case 'producto':
        return `p-${item.idProducto}`;
      case 'combo':
        return `c-${item.idCombo}`;
    }
  }
}
