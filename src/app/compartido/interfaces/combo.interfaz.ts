export interface ItemCombo {
  idProducto: string;
  cantidad: number;
}

/** Combo del Candy Bar (§11). Precio fijo, no la suma de sus partes. */
export interface Combo {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  productos: ItemCombo[];
  /** Si incluye entrada, al comprarlo se descuenta una entrada del total. */
  incluyeEntrada: boolean;
  precioFijo: number;
  activo: boolean;
  /** Aparece en la página principal y destacado durante la compra. */
  destacado: boolean;
}
