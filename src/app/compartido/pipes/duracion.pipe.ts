import { Pipe, PipeTransform } from '@angular/core';

/** `142` → `2h 22m`. El prefijo `Pipe` lo pide la consigna. */
@Pipe({ name: 'pipeDuracion' })
export class PipeDuracion implements PipeTransform {
  transform(minutos: number | null | undefined): string {
    if (minutos === null || minutos === undefined || minutos < 0) return '';

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    if (horas === 0) return `${resto}m`;
    return `${horas}h ${String(resto).padStart(2, '0')}m`;
  }
}
