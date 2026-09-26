/** Producto del Candy Bar (§10). */
export interface Producto {
  id: string;
  idCategoria: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  precio: number;
  /** §10 lo deja opcional; se implementa. Ver supuesto 8 del plan. */
  stock: number;
  activo: boolean;
}
