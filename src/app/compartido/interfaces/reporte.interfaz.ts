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

export type FormatoExportacion = 'pdf' | 'excel';
