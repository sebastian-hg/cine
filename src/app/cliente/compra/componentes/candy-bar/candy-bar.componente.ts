import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Combo } from '../../../../compartido/interfaces/combo.interfaz';
import { ItemCarrito } from '../../../../compartido/interfaces/carrito.interfaz';
import { Producto } from '../../../../compartido/interfaces/producto.interfaz';
import { CandyServicio } from '../../../../compartido/servicios/candy.servicio';
import { ComboServicio } from '../../../../compartido/servicios/combo.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { CargandoComponente } from '../../../../compartido/componentes/cargando/cargando.componente';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { CarritoServicio } from '../../servicios/carrito.servicio';
import { TarjetaProductoComponente } from '../tarjeta-producto/tarjeta-producto.componente';

/**
 * Candy Bar (§10 y §11).
 *
 * Es una ruta pública: se puede comprar candy sin entradas. Cuando se llega
 * desde la selección de butacas, el botón de continuar lleva al checkout con
 * las entradas ya cargadas.
 */
@Component({
  selector: 'app-candy-bar',
  imports: [RouterLink, CargandoComponente, TarjetaProductoComponente, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './candy-bar.componente.html',
  styleUrl: './candy-bar.componente.scss',
})
export class CandyBarComponente {
  private readonly candy = inject(CandyServicio);
  private readonly combos = inject(ComboServicio);
  private readonly carrito = inject(CarritoServicio);
  private readonly avisos = inject(NotificacionServicio);
  private readonly router = inject(Router);

  private readonly items$ = this.carrito.items$;

  protected readonly catalogo = toSignal(this.candy.catalogo(), {
    initialValue: [],
  });
  protected readonly combosActivos = toSignal(this.combos.activos(), {
    initialValue: [],
  });
  protected readonly items = toSignal<ItemCarrito[], ItemCarrito[]>(this.items$, {
    initialValue: [],
  });

  /** Cuántas unidades de cada producto hay ya en el carrito. */
  protected readonly cantidades = toSignal(
    this.items$.pipe(
      map((items) => {
        const mapa = new Map<string, number>();
        for (const item of items) {
          if (item.tipo === 'producto') mapa.set(item.idProducto, item.cantidad);
          if (item.tipo === 'combo') mapa.set(item.idCombo, item.cantidad);
        }
        return mapa;
      }),
    ),
    { initialValue: new Map<string, number>() },
  );

  protected readonly totalParcial = toSignal(
    this.items$.pipe(
      map((items) => items.reduce((suma, item) => suma + item.precioUnitario * item.cantidad, 0)),
    ),
    { initialValue: 0 },
  );

  protected readonly tieneEntradas = toSignal(
    this.items$.pipe(map((items) => items.some((item) => item.tipo === 'entrada'))),
    { initialValue: false },
  );

  protected readonly sinCantidades = signal(new Map<string, number>());

  protected agregarProducto(producto: Producto): void {
    this.carrito.agregarProducto(producto);
    this.avisos.mostrar(`${producto.nombre} agregado.`, 'exito');
  }

  protected cambiarCantidadProducto(producto: Producto, cantidad: number): void {
    const item = this.itemDeProducto(producto.id);
    if (item) this.carrito.cambiarCantidad(item, cantidad);
  }

  protected agregarCombo(combo: Combo): void {
    this.carrito.agregarCombo(combo);
    this.avisos.mostrar(`${combo.nombre} agregado.`, 'exito');
  }

  protected continuar(): void {
    void this.router.navigate(['/compra/checkout']);
  }

  protected seguirSinCandy(): void {
    void this.router.navigate(['/compra/checkout']);
  }

  private itemDeProducto(idProducto: string): ItemCarrito | undefined {
    return this.carrito.actual.items.find(
      (item) => item.tipo === 'producto' && item.idProducto === idProducto,
    );
  }
}
