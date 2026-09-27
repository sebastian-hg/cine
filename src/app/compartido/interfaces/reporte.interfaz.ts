/** §20: reporte diario de facturación. */
export interface ReporteDiario {
  /** ISO `YYYY-MM-DD`. */
  fecha: string;
  facturacion: number;
  entradasVendidas: number;
  productosVendidos: number;
}

/** Punto de una serie para los gráficos de §20. */
export interface PuntoGrafico {
  etiqueta: string;
  valor: number;
}

/** Resumen por estado para el panel admin. */
export interface ResumenEstadosVenta {
  total: number;
  pagadas: number;
  usadas: number;
  canceladas: number;
  /** Ventas efectivamente vendidas (pagadas + usadas). */
  vendidas: number;
}

/** Acumulado por usuario para mostrar qué se vendió por cliente. */
export interface VentaPorUsuario {
  idUsuario: number | string | null;
  usuario: string;
  ventas: number;
  pagadas: number;
  usadas: number;
  canceladas: number;
  /** Importe vendido (sin contar canceladas). */
  totalVendido: number;
}

export type FormatoExportacion = 'pdf' | 'excel';
