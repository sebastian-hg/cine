/**
 * §12 deja abierto si una compra genera uno o varios QR.
 *
 * Decisión: **un único QR por compra**, con permisos independientes en el payload.
 * Validar la entrada no consume el retiro del Candy Bar, y viceversa.
 */
export type ConceptoQr = 'entrada' | 'candy';

export interface PermisoQr {
  usado: boolean;
  /** Id del empleado que lo validó. */
  validadoPor: number | string | null;
  validadoEn: string | null;
}

export interface CodigoQr {
  id: string;
  idCompra: string;
  /** Un permiso solo existe si la compra incluye ese concepto. */
  permisos: Partial<Record<ConceptoQr, PermisoQr>>;
}

export type ResultadoValidacion =
  | { valido: true; concepto: ConceptoQr; detalle: string }
  | { valido: false; motivo: string };
