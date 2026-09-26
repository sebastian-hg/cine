export type TipoButaca = 'normal' | 'accesible' | 'vip';
export type EstadoButaca = 'libre' | 'reservada' | 'ocupada';
export type SectorButaca = 'izquierda' | 'centro' | 'derecha';

/**
 * Una butaca física de una sala (§5).
 *
 * El estado NO vive acá: una butaca está libre u ocupada *para una función dada*,
 * no en absoluto. Ver `ButacaFuncion`.
 */
export interface Butaca {
  id: string;
  idSala: string;
  /** `A`..`T` */
  fila: string;
  numero: number;
  sector: SectorButaca;
  tipo: TipoButaca;
}

/** Estado de una butaca en el contexto de una función concreta (§6). */
export interface ButacaFuncion extends Butaca {
  estado: EstadoButaca;
  /** Precio ya resuelto para esta función: contempla preventa y recargo VIP. */
  precio: number;
}
