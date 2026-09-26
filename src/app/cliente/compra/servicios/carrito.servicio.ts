import { Service } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

import { ButacaFuncion } from '../../../compartido/interfaces/butaca.interfaz';
import { Carrito, ItemCarrito } from '../../../compartido/interfaces/carrito.interfaz';
import { Combo } from '../../../compartido/interfaces/combo.interfaz';
import { Producto } from '../../../compartido/interfaces/producto.interfaz';
import { etiquetaButaca } from '../../../nucleo/dominio/generador-butacas';

const CLAVE_CARRITO = 'cine.carrito';
const VACIO: Carrito = { items: [], idFuncion: null };

/**
 * Carrito de compra (§10: entradas y candy se compran juntos).
 *
 * Se persiste en `localStorage` para que un refresco no pierda la selección,
 * pero es una conveniencia: la verdad sobre las butacas la tiene el backend, y
 * al confirmar se vuelven a validar contra `TiempoRealServicio`.
 */
@Service()
export class CarritoServicio {
  private readonly carrito = new BehaviorSubject<Carrito>(this.leerGuardado());

  readonly carrito$: Observable<Carrito> = this.carrito.asObservable();
  readonly items$: Observable<ItemCarrito[]> = this.carrito$.pipe(map((c) => c.items));
  readonly cantidad$: Observable<number> = this.items$.pipe(
    map((items) => items.reduce((total, item) => total + item.cantidad, 0)),
  );
  readonly tieneItems$: Observable<boolean> = this.cantidad$.pipe(map((c) => c > 0));

  get actual(): Carrito {
    return this.carrito.value;
  }

  get idFuncion(): string | null {
    return this.carrito.value.idFuncion;
  }

  /**
   * Fija las entradas de una función, reemplazando las anteriores.
   *
   * Es un reemplazo y no un agregado porque el mapa de butacas ya muestra la
   * selección completa: sumar iría contra lo que el usuario ve.
   */
  fijarEntradas(idFuncion: string, butacas: ButacaFuncion[]): void {
    const sinEntradas = this.carrito.value.items.filter((item) => item.tipo !== 'entrada');
    const entradas: ItemCarrito[] = butacas.map((butaca) => ({
      tipo: 'entrada',
      idFuncion,
      idButaca: butaca.id,
      etiquetaButaca: etiquetaButaca(butaca),
      esVip: butaca.tipo === 'vip',
      precioUnitario: butaca.precio,
      cantidad: 1,
    }));

    this.establecer({
      idFuncion: entradas.length > 0 ? idFuncion : null,
      items: [...entradas, ...sinEntradas],
    });
  }

  agregarProducto(producto: Producto, cantidad = 1): void {
    const items = [...this.carrito.value.items];
    const existente = items.find(
      (item): item is Extract<ItemCarrito, { tipo: 'producto' }> =>
        item.tipo === 'producto' && item.idProducto === producto.id,
    );

    if (existente) {
      // No se puede pedir más de lo que hay en stock.
      existente.cantidad = Math.min(existente.cantidad + cantidad, producto.stock);
    } else {
      items.push({
        tipo: 'producto',
        idProducto: producto.id,
        nombre: producto.nombre,
        precioUnitario: producto.precio,
        cantidad: Math.min(cantidad, producto.stock),
      });
    }

    this.establecer({ ...this.carrito.value, items });
  }

  agregarCombo(combo: Combo, cantidad = 1): void {
    const items = [...this.carrito.value.items];
    const existente = items.find(
      (item): item is Extract<ItemCarrito, { tipo: 'combo' }> =>
        item.tipo === 'combo' && item.idCombo === combo.id,
    );

    if (existente) {
      existente.cantidad += cantidad;
    } else {
      items.push({
        tipo: 'combo',
        idCombo: combo.id,
        nombre: combo.nombre,
        precioUnitario: combo.precioFijo,
        cantidad,
      });
    }

    this.establecer({ ...this.carrito.value, items });
  }

  cambiarCantidad(item: ItemCarrito, cantidad: number): void {
    if (cantidad <= 0) {
      this.quitar(item);
      return;
    }

    const items = this.carrito.value.items.map((actual) =>
      this.esElMismo(actual, item) && actual.tipo !== 'entrada' ? { ...actual, cantidad } : actual,
    );
    this.establecer({ ...this.carrito.value, items });
  }

  quitar(item: ItemCarrito): void {
    const items = this.carrito.value.items.filter((actual) => !this.esElMismo(actual, item));
    const quedanEntradas = items.some((i) => i.tipo === 'entrada');
    this.establecer({ items, idFuncion: quedanEntradas ? this.carrito.value.idFuncion : null });
  }

  vaciar(): void {
    this.establecer(VACIO);
  }

  /** Ids de las butacas seleccionadas, para revalidarlas al confirmar. */
  idsButacas(): string[] {
    return this.carrito.value.items
      .filter((item) => item.tipo === 'entrada')
      .map((item) => item.idButaca);
  }

  private esElMismo(a: ItemCarrito, b: ItemCarrito): boolean {
    if (a.tipo !== b.tipo) return false;
    if (a.tipo === 'entrada' && b.tipo === 'entrada') return a.idButaca === b.idButaca;
    if (a.tipo === 'producto' && b.tipo === 'producto') return a.idProducto === b.idProducto;
    if (a.tipo === 'combo' && b.tipo === 'combo') return a.idCombo === b.idCombo;
    return false;
  }

  private establecer(carrito: Carrito): void {
    this.carrito.next(carrito);
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch {
      // Sin almacenamiento el carrito vive solo en memoria; no es un error.
    }
  }

  private leerGuardado(): Carrito {
    try {
      const crudo = localStorage.getItem(CLAVE_CARRITO);
      return crudo ? (JSON.parse(crudo) as Carrito) : VACIO;
    } catch {
      return VACIO;
    }
  }
}
