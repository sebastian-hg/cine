import { Service, inject } from '@angular/core';
import { Observable, firstValueFrom, from, map, mergeMap, switchMap, throwError } from 'rxjs';

import { ItemCarrito } from '../interfaces/carrito.interfaz';
import { Compra, Desglose } from '../interfaces/compra.interfaz';
import { CodigoQr } from '../interfaces/qr.interfaz';
import { evaluarCancelacion } from '../../nucleo/dominio/cancelacion';
import { AutenticacionServicio } from '../../nucleo/servicios/autenticacion.servicio';
import { RegistroActividadServicio } from '../../nucleo/servicios/registro-actividad.servicio';
import { BaseDatos, SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';
import { CandyServicio } from './candy.servicio';
import { CreditoServicio } from './credito.servicio';
import { CuponServicio } from './cupon.servicio';
import { FidelizacionServicio } from './fidelizacion.servicio';
import { QrServicio } from './qr.servicio';
import { TiempoRealServicio } from './tiempo-real.servicio';

/** Compra junto con lo que hace falta para mostrarla en el historial. */
export interface CompraDetallada extends Compra {
  nombrePelicula: string | null;
  inicioFuncion: string | null;
  nombreSala: string | null;
  butacas: string[];
  puedeCancelar: boolean;
  motivoBloqueoCancelacion: string | null;
}

export interface SolicitudCompra {
  items: ItemCarrito[];
  desglose: Desglose;
  idFuncion: string | null;
  codigoCupon: string | null;
}

interface VentaCineFila {
  id_venta: number;
  id_usuario: number | null;
  fecha_compra: string;
  estado: 'pagada' | 'cancelada' | 'usada';
  subtotal_entradas: number;
  subtotal_candy: number;
  subtotal: number;
  descuento: number;
  motivo_descuento: string | null;
  credito_aplicado: number;
  a_pagar: number;
  puntos_ganados: number;
  id_qr: number | null;
  id_funcion: number | null;
}

/**
 * Confirmación, historial y cancelación de compras (§12, §15, §19).
 *
 * Es el único lugar donde una compra pasa de existir a no existir, y por eso
 * concentra todos los efectos: reservar butacas, descontar stock, otorgar
 * puntos, consumir crédito, marcar el cupón y generar el QR.
 *
 * TODO Supabase: todo esto tiene que ser UNA transacción del lado del servidor.
 * Hoy son varios pasos en memoria; contra Postgres, si falla el descuento de
 * stock después de cobrar, la compra queda inconsistente. La RPC
 * `confirmar_compra(payload)` debe hacer el conjunto o nada.
 */
@Service()
export class CompraServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly qr = inject(QrServicio);
  private readonly tiempoReal = inject(TiempoRealServicio);
  private readonly candy = inject(CandyServicio);
  private readonly puntos = inject(FidelizacionServicio);
  private readonly credito = inject(CreditoServicio);
  private readonly cupones = inject(CuponServicio);
  private readonly registro = inject(RegistroActividadServicio);

  /**
   * Confirma la compra.
   *
   * Primero reserva las butacas, porque es el paso que puede fallar por
   * concurrencia: si otro usuario se adelantó, no hay que haber cobrado nada.
   */
  confirmar(solicitud: SolicitudCompra): Observable<Compra> {
    const idsButacas = solicitud.items
      .filter((i) => i.tipo === 'entrada')
      .map((i) => i.idButaca);

    const reserva$ =
      solicitud.idFuncion && idsButacas.length > 0
        ? this.tiempoReal.reservar(solicitud.idFuncion, idsButacas)
        : this.supabase.inmediato([]);

    return reserva$.pipe(
      switchMap(() => this.qr.generar(this.idProvisional(), solicitud.items)),
      switchMap((codigo) => this.persistir(solicitud, codigo)),
    );
  }

  /** Historial de un usuario, más reciente primero. */
  deUsuario(idUsuario: number | string): Observable<CompraDetallada[]> {
    const cliente = this.supabase.cliente;
    if (cliente) {
      return from(
        cliente
          .from('ventas_cine')
          .select('*')
          .eq('id_usuario', Number(idUsuario))
          .order('fecha_compra', { ascending: false }),
      ).pipe(
        mergeMap(({ data, error }) => {
          if (error) return throwError(() => new Error(error.message));
          return this.supabase.consultar((base) =>
            (data ?? []).map((fila) => this.detallar(this.mapearVentaACcompra(fila as VentaCineFila), base)),
          );
        }),
      );
    }

    return this.supabase.consultar((base) =>
      base.compras
        .filter((c) => String(c.idUsuario ?? '') === String(idUsuario))
        .sort((a, b) => b.fechaCompra.localeCompare(a.fechaCompra))
        .map((c) => this.detallar(c, base)),
    );
  }

  obtener(id: string): Observable<CompraDetallada | null> {
    const cliente = this.supabase.cliente;
    if (cliente) {
      return from(cliente.from('ventas_cine').select('*').eq('id_venta', Number(id)).maybeSingle()).pipe(
        mergeMap(({ data, error }) => {
          if (error) return throwError(() => new Error(error.message));
          return this.supabase.consultar((base) => {
            if (!data) return null;
            return this.detallar(this.mapearVentaACcompra(data as VentaCineFila), base);
          });
        }),
      );
    }

    return this.supabase.consultar((base) => {
      const compra = base.compras.find((c) => c.id === id);
      return compra ? this.detallar(compra, base) : null;
    });
  }

  todas(): Observable<Compra[]> {
    const cliente = this.supabase.cliente;
    if (cliente) {
      return from(cliente.from('ventas_cine').select('*').order('fecha_compra', { ascending: false })).pipe(
        mergeMap(({ data, error }) => {
          if (error) return throwError(() => new Error(error.message));
          return this.supabase.inmediato(
            (data ?? []).map((fila) => this.mapearVentaACcompra(fila as VentaCineFila)),
          );
        }),
      );
    }

    return this.supabase.consultar((base) => [...base.compras]);
  }

  /**
   * Cancelación (§19): hasta 2 horas antes de la función.
   *
   * No hay devolución de dinero. Se genera crédito, se liberan las butacas, se
   * repone el stock y se revierten los puntos otorgados (supuesto 3).
   */
  cancelar(idCompra: string): Observable<number> {
    const cliente = this.supabase.cliente;
    if (cliente) {
      return from(this.cancelarEnSupabase(cliente, idCompra));
    }

    return this.supabase.transaccionAsync((base) => {
      const compra = base.compras.find((c) => c.id === idCompra);

      if (!compra) {
        return throwError(() => new Error('No encontramos esa compra.'));
      }
      if (compra.estado === 'cancelada') {
        return throwError(() => new Error('Esta compra ya estaba cancelada.'));
      }
      if (compra.estado === 'usada') {
        return throwError(() => new Error('Esta compra ya fue utilizada.'));
      }

      if (compra.idFuncion) {
        const funcion = base.funciones.find((f) => f.id === compra.idFuncion);
        if (funcion) {
          const evaluacion = evaluarCancelacion(funcion.inicio);
          if (!evaluacion.puede) {
            return throwError(() => new Error(evaluacion.motivo));
          }
        }
      }

      compra.estado = 'cancelada';

      const idsButacas = compra.items.filter((i) => i.tipo === 'entrada').map((i) => i.idButaca);
      if (compra.idFuncion && idsButacas.length > 0) {
        this.tiempoReal.liberar(compra.idFuncion, idsButacas).subscribe();
      }

      this.candy.reponerStock(this.unidadesPorProducto(compra.items)).subscribe();

      // El crédito devuelve lo efectivamente pagado, no el subtotal: el
      // descuento y el crédito ya usado no salieron del bolsillo del cliente.
      const aDevolver = compra.desglose.aPagar + compra.desglose.creditoAplicado;
      if (compra.idUsuario) {
        this.credito.acreditar(base, String(compra.idUsuario), aDevolver, String(compra.id));
        this.puntos.revertir(base, String(compra.idUsuario), String(compra.id));
      }

      return this.supabase.inmediato(aDevolver);
    });
  }

  /** §18: películas que el usuario ya vio, para la galería «Mis películas». */
  peliculasVistas(
    idUsuario: number | string,
  ): Observable<{ idPelicula: string; inicioFuncion: string; idCompra: string | number }[]> {
    const ahora = new Date().toISOString();
    return this.supabase.consultar((base) =>
      base.compras
        .filter(
          (c) => String(c.idUsuario ?? '') === String(idUsuario) && c.estado !== 'cancelada' && c.idFuncion,
        )
        .flatMap((compra) => {
          const funcion = base.funciones.find((f) => f.id === compra.idFuncion);
          if (!funcion || funcion.inicio > ahora) return [];
          return [
            { idPelicula: funcion.idPelicula, inicioFuncion: funcion.inicio, idCompra: compra.id },
          ];
        })
        .sort((a, b) => b.inicioFuncion.localeCompare(a.inicioFuncion)),
    );
  }

  /** §14: ¿el usuario vio esta película y puede reseñarla? */
  compraQueHabilitaResena(idUsuario: number | string, idPelicula: string): Observable<string | null> {
    return this.peliculasVistas(idUsuario).pipe(
      map((vistas) => {
        const compra = vistas.find((v) => v.idPelicula === idPelicula)?.idCompra;
        return compra === null || compra === undefined ? null : String(compra);
      }),
    );
  }

  private persistir(solicitud: SolicitudCompra, codigo: CodigoQr): Observable<Compra> {
    return this.supabase.transaccion((base) => {
      const usuario = this.auth.usuarioActual;

      const compra: Compra = {
        id: codigo.idCompra,
        idUsuario: usuario?.id ?? null,
        fechaCompra: new Date().toISOString(),
        items: solicitud.items,
        desglose: solicitud.desglose,
        estado: 'pagada',
        idQr: codigo.id,
        idFuncion: solicitud.idFuncion,
      };
      base.compras.push(compra);

      this.candy.descontarStock(this.unidadesPorProducto(solicitud.items)).subscribe();

      if (usuario) {
        this.puntos.acumular(base, usuario.id, solicitud.desglose.puntosGanados, String(compra.id));

        if (solicitud.desglose.creditoAplicado > 0) {
          this.credito.debitar(base, usuario.id, solicitud.desglose.creditoAplicado, String(compra.id));
        }

        if (solicitud.codigoCupon) {
          this.cupones.registrarUso(solicitud.codigoCupon, usuario.id).subscribe();
        }

        // §9: el descuento de bienvenida se consume con la primera compra.
        if (usuario.flagPrimeraCompra) {
          this.auth.marcarPrimeraCompraUsada(usuario.id).subscribe();
        }
      }

      this.registro.registrar('crear', `confirmó la compra ${compra.id}`).subscribe();

      return compra;
    });
  }

  /** El QR se genera con el id que después lleva la compra. */
  private idProvisional(): string {
    return this.supabase.nuevoId('CMP');
  }

  private unidadesPorProducto(items: readonly ItemCarrito[]): Map<string, number> {
    const unidades = new Map<string, number>();
    for (const item of items) {
      if (item.tipo !== 'producto') continue;
      unidades.set(item.idProducto, (unidades.get(item.idProducto) ?? 0) + item.cantidad);
    }
    return unidades;
  }

  private detallar(compra: Compra, base: BaseDatos): CompraDetallada {
    const funcion = compra.idFuncion
      ? base.funciones.find((f) => f.id === compra.idFuncion)
      : undefined;
    const pelicula = funcion
      ? base.peliculas.find((p) => p.id === funcion.idPelicula)
      : undefined;
    const sala = funcion ? base.salas.find((s) => s.id === funcion.idSala) : undefined;

    let puedeCancelar = compra.estado === 'pagada';
    let motivoBloqueo: string | null =
      compra.estado === 'cancelada'
        ? 'Esta compra fue cancelada.'
        : compra.estado === 'usada'
          ? 'Esta compra ya fue utilizada.'
          : null;

    if (puedeCancelar && funcion) {
      const evaluacion = evaluarCancelacion(funcion.inicio);
      puedeCancelar = evaluacion.puede;
      motivoBloqueo = evaluacion.puede ? null : evaluacion.motivo;
    }

    return {
      ...compra,
      nombrePelicula: pelicula?.nombre ?? null,
      inicioFuncion: funcion?.inicio ?? null,
      nombreSala: sala?.nombre ?? null,
      butacas: compra.items.filter((i) => i.tipo === 'entrada').map((i) => i.etiquetaButaca),
      puedeCancelar,
      motivoBloqueoCancelacion: motivoBloqueo,
    };
  }

  private mapearVentaACcompra(fila: VentaCineFila): Compra {
    return {
      id: String(fila.id_venta),
      idUsuario: fila.id_usuario === null ? null : String(fila.id_usuario),
      fechaCompra: fila.fecha_compra,
      // ventas_cine es cabecera; el detalle de items queda para la futura tabla detalle.
      items: [],
      desglose: {
        subtotalEntradas: Number(fila.subtotal_entradas ?? 0),
        subtotalCandy: Number(fila.subtotal_candy ?? 0),
        subtotal: Number(fila.subtotal ?? 0),
        descuento: Number(fila.descuento ?? 0),
        motivoDescuento: fila.motivo_descuento ?? null,
        creditoAplicado: Number(fila.credito_aplicado ?? 0),
        aPagar: Number(fila.a_pagar ?? 0),
        puntosGanados: Number(fila.puntos_ganados ?? 0),
      },
      estado: fila.estado,
      idQr: fila.id_qr === null ? String(fila.id_venta) : String(fila.id_qr),
      idFuncion: fila.id_funcion === null ? null : String(fila.id_funcion),
    };
  }

  private async cancelarEnSupabase(
    cliente: NonNullable<SupabaseServicio['cliente']>,
    idCompra: string,
  ): Promise<number> {
    const idVenta = Number(idCompra);
    if (!Number.isFinite(idVenta)) {
      throw new Error('El identificador de compra no es valido.');
    }

    const ventaR = await cliente
      .from('ventas_cine')
      .select('*')
      .eq('id_venta', idVenta)
      .maybeSingle();

    if (ventaR.error) throw new Error(ventaR.error.message);
    const venta = ventaR.data as VentaCineFila | null;
    if (!venta) throw new Error('No encontramos esa compra.');
    if (venta.estado === 'cancelada') throw new Error('Esta compra ya estaba cancelada.');
    if (venta.estado === 'usada') throw new Error('Esta compra ya fue utilizada.');

    if (venta.id_funcion !== null) {
      const base = await firstValueFrom(this.supabase.consultar((b) => b));
      const funcion = base?.funciones.find((f) => f.id === String(venta.id_funcion));
      if (funcion) {
        const evaluacion = evaluarCancelacion(funcion.inicio);
        if (!evaluacion.puede) throw new Error(evaluacion.motivo);
      }
    }

    const cancelarR = await cliente
      .from('ventas_cine')
      .update({ estado: 'cancelada' })
      .eq('id_venta', idVenta)
      .select('id_venta')
      .maybeSingle();
    if (cancelarR.error) throw new Error(cancelarR.error.message);

    const aDevolver = Number(venta.a_pagar ?? 0) + Number(venta.credito_aplicado ?? 0);
    if (venta.id_usuario !== null && aDevolver > 0) {
      await this.actualizarCreditoUsuarioYRegistro(cliente, venta.id_usuario, aDevolver, idVenta);
    }

    return aDevolver;
  }

  private async actualizarCreditoUsuarioYRegistro(
    cliente: NonNullable<SupabaseServicio['cliente']>,
    idUsuario: number,
    creditoAcreditado: number,
    idVenta: number,
  ): Promise<void> {
    const usuarioR = await cliente
      .from('usuarios_cine')
      .select('*')
      .eq('id', idUsuario)
      .maybeSingle();
    if (usuarioR.error) throw new Error(usuarioR.error.message);

    const filaUsuario = (usuarioR.data ?? {}) as Record<string, unknown>;
    const creditoActual = Number(
      filaUsuario['credito'] ?? filaUsuario['saldo_credito'] ?? filaUsuario['saldoCredito'] ?? 0,
    );
    const nuevoCredito = creditoActual + creditoAcreditado;

    const updateCredito = async (payload: Record<string, unknown>) =>
      cliente.from('usuarios_cine').update(payload).eq('id', idUsuario).select('id').maybeSingle();

    let upR = await updateCredito({ credito: nuevoCredito });
    if (upR.error?.code === 'PGRST204') {
      upR = await updateCredito({ saldo_credito: nuevoCredito });
    }
    if (upR.error) throw new Error(upR.error.message);

    const fecha = new Date().toISOString();
    const insertarMovimiento = async (payload: Record<string, unknown>) =>
      cliente.from('movimientos_credito').insert(payload).select('id').maybeSingle();

    let mvR = await insertarMovimiento({
      id_usuario: idUsuario,
      tipo: 'alta-por-cancelacion',
      monto: creditoAcreditado,
      saldo_resultante: nuevoCredito,
      fecha,
      id_compra_origen: idVenta,
    });

    if (mvR.error?.code === 'PGRST204') {
      mvR = await insertarMovimiento({
        idUsuario: idUsuario,
        tipo: 'alta-por-cancelacion',
        monto: creditoAcreditado,
        saldoResultante: nuevoCredito,
        fecha,
        idCompraOrigen: idVenta,
      });
    }

    if (mvR.error) throw new Error(mvR.error.message);
  }
}
