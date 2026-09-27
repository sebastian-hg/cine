import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MovimientoCredito } from '../interfaces/credito.interfaz';
import { BaseDatos, SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/**
 * Crédito en cuenta (§19 de la consigna).
 *
 * Cancelar una compra no devuelve dinero: genera crédito, que puede combinarse
 * con otros medios de pago en compras futuras.
 *
 * TODO Supabase: tabla `movimientos_credito` con RLS que restrinja SELECT a
 * `auth.uid() = id_usuario`. El saldo se calcula sumando movimientos y no se
 * guarda como columna: una columna de saldo se desincroniza del historial en
 * cuanto falla una escritura a la mitad.
 */
@Service()
export class CreditoServicio {
  private readonly supabase = inject(SupabaseServicio);

  saldo(idUsuario: number | string): Observable<number> {
    return this.supabase.consultar((base) => {
      const usuario = base.usuarios.find((u) => String(u.id) === String(idUsuario));
      if (usuario) return usuario.credito;
      return this.calcularSaldo(base, idUsuario);
    });
  }

  movimientos(idUsuario: number | string): Observable<MovimientoCredito[]> {
    return this.supabase.consultar((base) =>
      base.movimientosCredito
        .filter((m) => String(m.idUsuario) === String(idUsuario))
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    );
  }

  /** Alta de crédito por una cancelación. */
  acreditar(base: BaseDatos, idUsuario: number | string, monto: number, idCompraOrigen: string): void {
    if (monto <= 0) return;

    const usuario = base.usuarios.find((u) => String(u.id) === String(idUsuario));
    const saldoActual = usuario ? usuario.credito : this.calcularSaldo(base, idUsuario);
    const saldoResultante = saldoActual + monto;

    if (usuario) {
      usuario.credito = saldoResultante;
    }

    base.movimientosCredito.push({
      id: this.supabase.nuevoId('mc'),
      idUsuario,
      tipo: 'alta-por-cancelacion',
      monto,
      saldoResultante,
      fecha: new Date().toISOString(),
      idCompraOrigen,
    });
  }

  /** Consumo de crédito en una compra. */
  debitar(base: BaseDatos, idUsuario: number | string, monto: number, idCompraOrigen: string): void {
    if (monto <= 0) return;

    const usuario = base.usuarios.find((u) => String(u.id) === String(idUsuario));
    const saldoActual = usuario ? usuario.credito : this.calcularSaldo(base, idUsuario);
    const saldoResultante = saldoActual - monto;

    if (usuario) {
      usuario.credito = saldoResultante;
    }

    base.movimientosCredito.push({
      id: this.supabase.nuevoId('mc'),
      idUsuario,
      tipo: 'uso-en-compra',
      monto: -monto,
      saldoResultante,
      fecha: new Date().toISOString(),
      idCompraOrigen,
    });
  }

  private calcularSaldo(base: BaseDatos, idUsuario: number | string): number {
    return base.movimientosCredito
      .filter((m) => String(m.idUsuario) === String(idUsuario))
      .reduce((total, m) => total + m.monto, 0);
  }
}
