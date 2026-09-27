import { Service, inject } from '@angular/core';
import { Observable, from, mergeMap, throwError } from 'rxjs';

import { Canje, MovimientoPuntos, Recompensa } from '../interfaces/puntos.interfaz';
import { CodigoQr } from '../interfaces/qr.interfaz';
import { BaseDatos, SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';
import { AutenticacionServicio } from '../../nucleo/servicios/autenticacion.servicio';

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
  private readonly auth = inject(AutenticacionServicio);

  saldo(idUsuario: number | string): Observable<number> {
    return this.supabase.consultar((base) => this.obtenerSaldoActual(base, idUsuario));
  }

  movimientos(idUsuario: number | string): Observable<MovimientoPuntos[]> {
    return this.supabase.consultar((base) =>
      base.movimientosPuntos
        .filter((m) => String(m.idUsuario) === String(idUsuario))
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    );
  }

  canjes(idUsuario: number | string): Observable<Canje[]> {
    return this.supabase.consultar((base) =>
      base.canjes
        .filter((c) => String(c.idUsuario) === String(idUsuario))
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    );
  }

  recompensas(): Observable<Recompensa[]> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.consultar((base) => base.recompensas.filter((r) => r.activa));
    }

    return this.supabase.consultar((base) => base.recompensas.filter((r) => r.activa));
  }

  todasLasRecompensas(): Observable<Recompensa[]> {
    const cliente = this.supabase.cliente;
    if (!cliente) return this.supabase.consultar((base) => [...base.recompensas]);

    return this.supabase.consultar((base) => [...base.recompensas]);
  }

  /** Acumulación al confirmar una compra. */
  acumular(base: BaseDatos, idUsuario: number | string, puntos: number, idCompraOrigen: string): void {
    if (puntos <= 0) return;

    const saldoAnterior = this.obtenerSaldoActual(base, idUsuario);

    const usuario = base.usuarios.find((u) => String(u.id) === String(idUsuario));
    if (usuario) {
      usuario.puntos = saldoAnterior + puntos;
    }

    base.movimientosPuntos.push({
      id: this.supabase.nuevoId('mp'),
      idUsuario,
      tipo: 'acumulacion',
      cantidad: puntos,
      saldoResultante: saldoAnterior + puntos,
      fecha: new Date().toISOString(),
      detalle: 'Compra confirmada',
      idCompraOrigen,
    });
  }

  /** Actualiza el saldo real de puntos del usuario en la tabla `usuarios_cine`. */
  acumularEnBase(idUsuario: number | string, puntos: number, idCompraOrigen: string): Observable<void> {
    const cliente = this.supabase.cliente;
    if (!cliente || puntos <= 0) return this.supabase.inmediato(undefined);

    return from(this.actualizarPuntosEnBase(cliente, idUsuario, puntos, idCompraOrigen));
  }

  /**
   * Reversión al cancelar una compra (supuesto 3 del plan).
   *
   * Se descuentan los puntos que esa compra había otorgado. El saldo puede
   * quedar por debajo de lo acumulado si el usuario ya los canjeó; se permite
   * que quede en negativo antes que perder la trazabilidad del movimiento.
   */
  revertir(base: BaseDatos, idUsuario: number | string, idCompraOrigen: string): void {
    const otorgados = base.movimientosPuntos
      .filter(
        (m) =>
          String(m.idUsuario) === String(idUsuario) &&
          m.idCompraOrigen === idCompraOrigen &&
          m.tipo === 'acumulacion',
      )
      .reduce((total, m) => total + m.cantidad, 0);

    if (otorgados <= 0) return;

    const saldoAnterior = this.obtenerSaldoActual(base, idUsuario);

    const usuario = base.usuarios.find((u) => String(u.id) === String(idUsuario));
    if (usuario) {
      usuario.puntos = saldoAnterior - otorgados;
    }

    base.movimientosPuntos.push({
      id: this.supabase.nuevoId('mp'),
      idUsuario,
      tipo: 'reversion',
      cantidad: -otorgados,
      saldoResultante: saldoAnterior - otorgados,
      fecha: new Date().toISOString(),
      detalle: 'Compra cancelada',
      idCompraOrigen,
    });
  }

  /** §15: el usuario canjea puntos por una recompensa. */
  canjear(idUsuario: number | string, idRecompensa: string): Observable<Canje> {
    return this.supabase.transaccionAsync((base) => {
      const recompensa = base.recompensas.find((r) => r.id === idRecompensa);
      if (!recompensa || !recompensa.activa) {
        return throwError(() => new Error('Esa recompensa ya no está disponible.'));
      }

      const saldo = this.obtenerSaldoActual(base, idUsuario);
      if (saldo < recompensa.puntosRequeridos) {
        return throwError(
          () =>
            new Error(
              `Te faltan ${recompensa.puntosRequeridos - saldo} puntos para canjear «${recompensa.nombre}».`,
            ),
        );
      }

      const usuario = base.usuarios.find((u) => String(u.id) === String(idUsuario));
      if (usuario) {
        usuario.puntos = saldo - recompensa.puntosRequeridos;
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
        tipoRecompensa: recompensa.tipo,
        fecha: new Date().toISOString(),
        idQr: this.supabase.nuevoId('QR'),
      };

      const codigo: CodigoQr = {
        id: canje.idQr,
        idCompra: `canje:${canje.id}`,
        permisos: {
          [recompensa.tipo === 'entrada' ? 'entrada' : 'candy']: {
            usado: false,
            validadoPor: null,
            validadoEn: null,
          },
        },
      };

      base.canjes.push(canje);
      base.codigosQr.push(codigo);

      const cliente = this.supabase.cliente;
      if (!cliente) return this.supabase.inmediato(canje);

      return from(this.actualizarPuntosEnBase(cliente, idUsuario, -recompensa.puntosRequeridos, `canje:${canje.id}`)).pipe(
        mergeMap(() => this.supabase.inmediato(canje)),
      );
    });
  }

  crearRecompensa(datos: Omit<Recompensa, 'id'>): Observable<Recompensa> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        const recompensa: Recompensa = { ...datos, id: this.supabase.nuevoId('rp') };
        base.recompensas.push(recompensa);
        return recompensa;
      });
    }

    const fila = {
      tipo: datos.tipo,
      nombre: datos.nombre,
      puntos_requeridos: datos.puntosRequeridos,
      activa: datos.activa,
    };

    return from(cliente.from('recompensas').insert(fila).select('*').single()).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));

        const recompensa = this.mapearRecompensa(data as Record<string, unknown>);
        return this.supabase.transaccion((base) => {
          base.recompensas.push(recompensa);
          return recompensa;
        });
      }),
    );
  }

  actualizarRecompensa(id: string, cambios: Partial<Omit<Recompensa, 'id'>>): Observable<void> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        const recompensa = base.recompensas.find((r) => r.id === id);
        if (recompensa) Object.assign(recompensa, cambios);
      });
    }

    const fila: Record<string, unknown> = {};
    if (cambios.tipo !== undefined) fila['tipo'] = cambios.tipo;
    if (cambios.nombre !== undefined) fila['nombre'] = cambios.nombre;
    if (cambios.puntosRequeridos !== undefined) fila['puntos_requeridos'] = cambios.puntosRequeridos;
    if (cambios.activa !== undefined) fila['activa'] = cambios.activa;

    return from(cliente.from('recompensas').update(fila).eq('id', id)).pipe(
      mergeMap(({ error }) => {
        if (error) return throwError(() => new Error(error.message));

        return this.supabase.transaccion((base) => {
          const recompensa = base.recompensas.find((r) => r.id === id);
          if (recompensa) Object.assign(recompensa, cambios);
        });
      }),
    );
  }

  private mapearRecompensa(fila: Record<string, unknown>): Recompensa {
    const tipo = String(fila['tipo'] ?? 'entrada');
    return {
      id: String(fila['id'] ?? ''),
      tipo: tipo === 'producto-candy' ? 'producto-candy' : 'entrada',
      nombre: String(fila['nombre'] ?? ''),
      puntosRequeridos: Number(fila['puntosRequeridos'] ?? fila['puntos_requeridos'] ?? 0),
      activa: Boolean(fila['activa'] ?? true),
    };
  }

  private calcularSaldo(base: BaseDatos, idUsuario: number | string): number {
    return base.movimientosPuntos
      .filter((m) => String(m.idUsuario) === String(idUsuario))
      .reduce((total, m) => total + m.cantidad, 0);
  }

  private obtenerSaldoActual(base: BaseDatos, idUsuario: number | string): number {
    const usuario = base.usuarios.find((u) => String(u.id) === String(idUsuario));
    if (usuario) return usuario.puntos;
    return this.calcularSaldo(base, idUsuario);
  }

  private async actualizarPuntosEnBase(
    cliente: NonNullable<SupabaseServicio['cliente']>,
    idUsuario: number | string,
    puntos: number,
    _idCompraOrigen: string,
  ): Promise<void> {
    const id = Number(idUsuario);
    const usuarioR = await cliente.from('usuarios_cine').select('*').eq('id', id).maybeSingle();
    if (usuarioR.error) throw new Error(usuarioR.error.message);

    const fila = (usuarioR.data ?? {}) as Record<string, unknown>;
    const saldoActual = Number(fila['puntos'] ?? fila['puntos_acumulados'] ?? 0);
    const saldoResultante = saldoActual + puntos;

    const actualizarUsuario = async (payload: Record<string, unknown>) =>
      cliente.from('usuarios_cine').update(payload).eq('id', id).select('id').maybeSingle();

    let res = await actualizarUsuario({ puntos: saldoResultante });
    if (res.error?.code === 'PGRST204') {
      res = await actualizarUsuario({ puntos_acumulados: saldoResultante });
    }
    if (res.error) throw new Error(res.error.message);

    const usuarioActual = this.auth.usuarioActual;
    if (usuarioActual && String(usuarioActual.id) === String(idUsuario)) {
      this.auth.refrescar({
        ...usuarioActual,
        puntos: saldoResultante,
      });
    }
  }
}
