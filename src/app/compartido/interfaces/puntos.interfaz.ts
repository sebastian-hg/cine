export type TipoMovimientoPuntos = 'acumulacion' | 'canje' | 'reversion';
export type TipoRecompensa = 'entrada' | 'producto-candy';

/** §15: los puntos son personales y no transferibles. */
export interface MovimientoPuntos {
  id: string;
  idUsuario: number | string;
  tipo: TipoMovimientoPuntos;
  /** Positivo en acumulación, negativo en canje y en reversión. */
  cantidad: number;
  saldoResultante: number;
  fecha: string;
  detalle: string;
  idCompraOrigen: number | string | null;
}

/** Configurable por el administrador (§15). */
export interface Recompensa {
  id: string;
  tipo: TipoRecompensa;
  nombre: string;
  puntosRequeridos: number;
  activa: boolean;
}

export interface Canje {
  id: string;
  idUsuario: number | string;
  idRecompensa: string;
  nombreRecompensa: string;
  puntosGastados: number;
  fecha: string;
}
