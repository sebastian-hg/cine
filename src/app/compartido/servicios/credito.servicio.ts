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

  /** Acredita crédito real del usuario en la tabla `usuarios_cine`. */
  acreditarSinTransaccion(idUsuario: number | string, monto: number, idCompraOrigen: string): void {
    const cliente = this.supabase.cliente;
    if (!cliente || monto <= 0) return;

    void this.actualizarCreditoEnBase(cliente, idUsuario, monto, idCompraOrigen);
  }

  private calcularSaldo(base: BaseDatos, idUsuario: number | string): number {
    return base.movimientosCredito
      .filter((m) => String(m.idUsuario) === String(idUsuario))
      .reduce((total, m) => total + m.monto, 0);
  }

  private async actualizarCreditoEnBase(
    cliente: NonNullable<SupabaseServicio['cliente']>,
    idUsuario: number | string,
    monto: number,
    idCompraOrigen: string,
  ): Promise<void> {
    const id = Number(idUsuario);
    const usuarioR = await cliente.from('usuarios_cine').select('*').eq('id', id).maybeSingle();
    if (usuarioR.error) throw new Error(usuarioR.error.message);

    const fila = (usuarioR.data ?? {}) as Record<string, unknown>;
    const saldoActual = Number(fila['credito'] ?? fila['saldo_credito'] ?? 0);
    const saldoResultante = saldoActual + monto;

    const actualizarUsuario = async (payload: Record<string, unknown>) =>
      cliente.from('usuarios_cine').update(payload).eq('id', id).select('id').maybeSingle();

    let res = await actualizarUsuario({ credito: saldoResultante });
    if (res.error?.code === 'PGRST204') {
      res = await actualizarUsuario({ saldo_credito: saldoResultante });
    }
    if (res.error) throw new Error(res.error.message);

    const fecha = new Date().toISOString();
    const insertarMovimiento = async (payload: Record<string, unknown>) =>
      cliente.from('movimientos_credito').insert(payload).select('id').maybeSingle();

    let mvR = await insertarMovimiento({
      id_usuario: id,
      tipo: 'alta-por-cancelacion',
      monto,
      saldo_resultante: saldoResultante,
      fecha,
      id_compra_origen: idCompraOrigen,
    });

    if (mvR.error?.code === 'PGRST204') {
      mvR = await insertarMovimiento({
        idUsuario: id,
        tipo: 'alta-por-cancelacion',
        monto,
        saldoResultante,
        fecha,
        idCompraOrigen,
      });
    }

    if (mvR.error) throw new Error(mvR.error.message);
  }
}
