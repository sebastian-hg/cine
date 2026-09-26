/** Unión discriminada: el carrito mezcla entradas, productos y combos (§10). */
export type ItemCarrito = ItemEntrada | ItemProducto | ItemCombo;

export interface ItemEntrada {
  tipo: 'entrada';
  idFuncion: string;
  idButaca: string;
  /** `F12` — para mostrar sin resolver la butaca completa. */
  etiquetaButaca: string;
  esVip: boolean;
  precioUnitario: number;
  cantidad: 1;
}

export interface ItemProducto {
  tipo: 'producto';
  idProducto: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

export interface ItemCombo {
  tipo: 'combo';
  idCombo: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

export interface Carrito {
  items: ItemCarrito[];
  /** Función a la que pertenecen las entradas del carrito; `null` si solo hay candy. */
  idFuncion: string | null;
}
