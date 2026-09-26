export type TipoCupon = 'primera-compra' | 'mayores-50' | 'generico';

export interface Cupon {
  id: string;
  codigo: string;
  tipo: TipoCupon;
  porcentaje: number;
  activo: boolean;
  descripcion: string;
  /** `0` = sin límite. Evita la reutilización indebida de §9. */
  usosPorUsuario: number;
}

/** Parámetros que el administrador configura (§9, §15, §16). */
export interface Configuracion {
  /** §9: valor inicial 20. */
  porcentajePrimeraCompra: number;
  /** §9: descuento para mayores de 50 años. */
  porcentajeMayores50: number;
  /** §5: recargo de las filas VIP. */
  multiplicadorVip: number;
  /** §15: cuántos puntos cuesta cada recompensa. */
  puntosPorEntrada: number;
  puntosPorProductoCandy: number;
  /** §16: días de anticipación de la preventa. */
  diasAnticipacionPreventa: number;
}
