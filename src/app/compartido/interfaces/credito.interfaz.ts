export type TipoMovimientoCredito = 'alta-por-cancelacion' | 'uso-en-compra';

/**
 * §19: cancelar no devuelve dinero, genera crédito en la cuenta.
 * El crédito puede combinarse con otros medios de pago.
 */
export interface MovimientoCredito {
  id: string;
  idUsuario: number | string;
  tipo: TipoMovimientoCredito;
  /** Positivo al generarse, negativo al usarse. */
  monto: number;
  saldoResultante: number;
  fecha: string;
  idCompraOrigen: number | string;
}
