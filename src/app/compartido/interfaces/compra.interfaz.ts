import { ItemCarrito } from './carrito.interfaz';

export type EstadoCompra = 'pagada' | 'cancelada' | 'usada';

/**
 * Resultado de `PrecioServicio.calcularDesglose()`.
 *
 * Es la única fuente de verdad sobre dinero en toda la aplicación: ningún
 * componente suma precios por su cuenta.
 */
export interface Desglose {
  subtotalEntradas: number;
  subtotalCandy: number;
  subtotal: number;
  /** Descuento aplicado — el mayor de los aplicables, no la suma (supuesto 1). */
  descuento: number;
  /** Etiqueta legible del descuento aplicado, o `null` si no hubo. */
  motivoDescuento: string | null;
  creditoAplicado: number;
  aPagar: number;
  /** `floor(aPagar)` — 1 peso pagado = 1 punto (§15). */
  puntosGanados: number;
}

export interface Compra {
  id: string;
  /** `null` cuando la compra es de un cliente anónimo (§1). */
  idUsuario: string | null;
  fechaCompra: string;
  items: ItemCarrito[];
  desglose: Desglose;
  estado: EstadoCompra;
  idQr: string;
  /** Presente solo si la compra incluye entradas. */
  idFuncion: string | null;
}
