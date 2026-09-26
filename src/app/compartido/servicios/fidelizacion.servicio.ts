import { Service, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { Canje, MovimientoPuntos, Recompensa } from '../interfaces/puntos.interfaz';
import { BaseDatos, SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/**
 * Fidelización por puntos (§15 de la consigna).
 *
 * Solo los usuarios registrados acumulan. 1 peso gastado = 1 punto. Los puntos
 * son personales y no se transfieren: no hay ningún método que los mueva entre
 * usuarios, y eso es deliberado.
 *
 * TODO Supabase: tabla `movimientos_puntos` con RLS `auth.uid() = id_usuario`
 * para SELECT y sin INSERT desde el cliente — los puntos los otorga la misma
 * RPC que confirma la compra, o cualquiera se regala saldo.
 */
@Service()
export class FidelizacionServicio {
  private readonly supabase = inject(SupabaseServicio);

  saldo(idUsuario: string): Observable<number> {
    return this.supabase.consultar((base) => this.calcularSaldo(base, idUsuario));
  }

  movimientos(idUsuario: string): Observable<MovimientoPuntos[]> {
    return this.supabase.consultar((base) =>
      base.movimientosPuntos
        .filter((m) => m.idUsuario === idUsuario)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    );
  }

  canjes(idUsuario: string): Observable<Canje[]> {
    return this.supabase.consultar((base) =>
      base.canjes.filter((c) => c.idUsuario === idUsuario).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    );
  }

  recompensas(): Observable<Recompensa[]> {
    return this.supabase.consultar((base) => base.recompensas.filter((r) => r.activa));
  }

  todasLasRecompensas(): Observable<Recompensa[]> {
    return this.supabase.consultar((base) => [...base.recompensas]);
  }

  /** Acumulación al confirmar una compra. */
  acumular(base: BaseDatos, idUsuario: string, puntos: number, idCompraOrigen: string): void {
    if (puntos <= 0) return;

    base.movimientosPuntos.push({
      id: this.supabase.nuevoId('mp'),
      idUsuario,
      tipo: 'acumulacion',
      cantidad: puntos,
      saldoResultante: this.calcularSaldo(base, idUsuario) + puntos,
      fecha: new Date().toISOString(),
      detalle: 'Compra confirmada',
      idCompraOrigen,
    });
  }

  /**
   * Reversión al cancelar una compra (supuesto 3 del plan).
   *
   * Se descuentan los puntos que esa compra había otorgado. El saldo puede
   * quedar por debajo de lo acumulado si el usuario ya los canjeó; se permite
   * que quede en negativo antes que perder la trazabilidad del movimiento.
   */
  revertir(base: BaseDatos, idUsuario: string, idCompraOrigen: string): void {
    const otorgados = base.movimientosPuntos
      .filter(
        (m) =>
          m.idUsuario === idUsuario && m.idCompraOrigen === idCompraOrigen && m.tipo === 'acumulacion',
      )
      .reduce((total, m) => total + m.cantidad, 0);

    if (otorgados <= 0) return;

    base.movimientosPuntos.push({
      id: this.supabase.nuevoId('mp'),
      idUsuario,
      tipo: 'reversion',
      cantidad: -otorgados,
      saldoResultante: this.calcularSaldo(base, idUsuario) - otorgados,
      fecha: new Date().toISOString(),
      detalle: 'Compra cancelada',
      idCompraOrigen,
    });
  }

  /** §15: el usuario canjea puntos por una recompensa. */
  canjear(idUsuario: string, idRecompensa: string): Observable<Canje> {
    return this.supabase.transaccionAsync((base) => {
      const recompensa = base.recompensas.find((r) => r.id === idRecompensa);
      if (!recompensa || !recompensa.activa) {
        return throwError(() => new Error('Esa recompensa ya no está disponible.'));
      }

      const saldo = this.calcularSaldo(base, idUsuario);
      if (saldo < recompensa.puntosRequeridos) {
        return throwError(
          () =>
            new Error(
              `Te faltan ${recompensa.puntosRequeridos - saldo} puntos para canjear «${recompensa.nombre}».`,
            ),
        );
      }

      base.movimientosPuntos.push({
        id: this.supabase.nuevoId('mp'),
        idUsuario,
        tipo: 'canje',
        cantidad: -recompensa.puntosRequeridos,
        saldoResultante: saldo - recompensa.puntosRequeridos,
        fecha: new Date().toISOString(),
        detalle: `Canje: ${recompensa.nombre}`,
        idCompraOrigen: null,
      });

      const canje: Canje = {
        id: this.supabase.nuevoId('cj'),
        idUsuario,
        idRecompensa,
        nombreRecompensa: recompensa.nombre,
        puntosGastados: recompensa.puntosRequeridos,
        fecha: new Date().toISOString(),
      };
      base.canjes.push(canje);

      return this.supabase.inmediato(canje);
    });
  }

  actualizarRecompensa(id: string, cambios: Partial<Omit<Recompensa, 'id'>>): Observable<void> {
    return this.supabase.transaccion((base) => {
      const recompensa = base.recompensas.find((r) => r.id === id);
      if (recompensa) Object.assign(recompensa, cambios);
    });
  }

  private calcularSaldo(base: BaseDatos, idUsuario: string): number {
    return base.movimientosPuntos
      .filter((m) => m.idUsuario === idUsuario)
      .reduce((total, m) => total + m.cantidad, 0);
  }
}
