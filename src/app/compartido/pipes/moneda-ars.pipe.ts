import { Pipe, PipeTransform } from '@angular/core';

const FORMATO = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

/** `8500` → `$ 8.500`. */
@Pipe({ name: 'pipeMonedaArs' })
export class PipeMonedaArs implements PipeTransform {
  transform(monto: number | null | undefined): string {
    if (monto === null || monto === undefined) return '';
    return FORMATO.format(monto);
  }
}
