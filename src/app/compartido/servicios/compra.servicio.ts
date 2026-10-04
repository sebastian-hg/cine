import { Service, inject } from '@angular/core';
import { Observable, combineLatest, firstValueFrom, from, map, mergeMap, switchMap, throwError } from 'rxjs';

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

const CLAVE_COMPRAS = 'cine.compras';

/** Compra junto con lo que hace falta para mostrarla en el historial. */
export interface CompraDetallada extends Compra {
  nombrePelicula: string | null;
  inicioFuncion: string | null;
  nombreSala: string | null;
  butacas: string[];
  butacasDisponiblesFuncion: number | null;
  butacasOcupadasFuncion: number | null;
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
  puntos_ganados: number | null;
  id_qr: string | number | null;
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
      switchMap(() => this.persistir(solicitud)),
    );
  }

  /** Historial de un usuario, más reciente primero. */
  deUsuario(idUsuario: number | string): Observable<CompraDetallada[]> {
    const cliente = this.supabase.cliente;
    const idUsuarioBd = this.aNumeroBaseDatos(idUsuario);
    if (cliente && idUsuarioBd !== null) {
      return from(
        cliente
          .from('ventas_cine')
          .select('*')
          .eq('id_usuario', idUsuarioBd)
          .order('fecha_compra', { ascending: false }),
      ).pipe(
        mergeMap(({ data, error }) => {
          if (error) return throwError(() => new Error(error.message));
          const comprasLocales = new Map(this.comprasGuardadas().map((compra) => [compra.id, compra]));
          return this.supabase.consultar((base) =>
            (data ?? []).map((fila) => {
              const compraCabecera = this.mapearVentaACcompra(fila as VentaCineFila);
              const compra = this.completarDesdeCompraLocal(compraCabecera, comprasLocales);
              return this.detallar(compra, base);
            }),
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
    const idVenta = this.aNumeroBaseDatos(id);
    if (cliente && idVenta !== null) {
      return from(cliente.from('ventas_cine').select('*').eq('id_venta', idVenta).maybeSingle()).pipe(
        mergeMap(({ data, error }) => {
          if (error) return throwError(() => new Error(error.message));
          return this.supabase.consultar((base) => {
            if (!data) {
              const local = this.comprasGuardadas().find((c) => c.id === id);
              return local ? this.detallar(local, base) : null;
            }
            const compraCabecera = this.mapearVentaACcompra(data as VentaCineFila);
            const compra = this.completarDesdeCompraLocal(compraCabecera);
            return this.detallar(compra, base);
          });
        }),
      );
    }

    return this.supabase.consultar((base) => {
      const compra = base.compras.find((c) => c.id === id) ?? this.comprasGuardadas().find((c) => c.id === id);
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
    if (cliente && this.aNumeroBaseDatos(idCompra) !== null) {
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
    return combineLatest([this.todas(), this.supabase.consultar((base) => base.funciones)]).pipe(
      map(([compras, funciones]) =>
        compras
          .filter(
            (compra: Compra) =>
              String(compra.idUsuario ?? '') === String(idUsuario) &&
              compra.estado !== 'cancelada' &&
              compra.idFuncion,
          )
          .flatMap((compra: Compra) => {
            const funcion = funciones.find((funcion) => funcion.id === compra.idFuncion);
            if (!funcion || funcion.inicio > ahora) return [];
            return [
              { idPelicula: funcion.idPelicula, inicioFuncion: funcion.inicio, idCompra: compra.id },
            ];
          })
          .sort((a, b) => b.inicioFuncion.localeCompare(a.inicioFuncion)),
      ),
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

  private persistir(solicitud: SolicitudCompra): Observable<Compra> {
    const cliente = this.supabase.cliente;
    const usuario = this.auth.usuarioActual;
    const fechaCompra = new Date().toISOString();
    const codigoQrVenta = this.generarCodigoQrVenta();

    if (cliente) {
      const filaSnake = {
        id_usuario: this.aNumeroBaseDatos(usuario?.id ?? null),
        fecha_compra: fechaCompra,
        estado: 'pagada' as const,
        subtotal_entradas: solicitud.desglose.subtotalEntradas,
        subtotal_candy: solicitud.desglose.subtotalCandy,
        subtotal: solicitud.desglose.subtotal,
        descuento: solicitud.desglose.descuento,
        motivo_descuento: solicitud.desglose.motivoDescuento,
        credito_aplicado: solicitud.desglose.creditoAplicado,
        a_pagar: solicitud.desglose.aPagar,
        puntos_ganados: usuario ? solicitud.desglose.puntosGanados : 0,
        id_qr: codigoQrVenta,
        id_funcion: this.aNumeroBaseDatos(solicitud.idFuncion),
      };

      return from(this.insertarVenta(cliente, filaSnake)).pipe(
        mergeMap(({ data, error }) => {
          if (error) {
            if (this.escrituraBloqueadaPorRls(error.code, error.message)) {
              return this.persistirEnMemoria(solicitud, usuario, fechaCompra);
            }
            return throwError(() => new Error(error.message));
          }

          const fila = (data ?? {}) as Partial<VentaCineFila>;
          const idCompra = String(fila.id_venta ?? '');
          if (!idCompra) {
            return throwError(() => new Error('La venta se guardó sin devolver un identificador.'));
          }

          return this.qr.generar(idCompra, solicitud.items, codigoQrVenta).pipe(
            mergeMap((codigo) => {
              const compra: Compra = {
                id: idCompra,
                idUsuario: usuario?.id ?? null,
                fechaCompra,
                items: solicitud.items,
                desglose: solicitud.desglose,
                estado: 'pagada',
                idQr: codigo.id,
                idFuncion: solicitud.idFuncion,
              };

              this.guardarCompraPersistida(compra);
              this.candy.descontarStock(this.unidadesPorProducto(solicitud.items)).subscribe();
              const persistirButacas$ = this.persistirButacasFuncion(cliente, compra);

              const sincronizarPuntos$ = usuario
                ? this.puntos.acumularEnBase(usuario.id, solicitud.desglose.puntosGanados, idCompra)
                : this.supabase.inmediato(undefined);
              const marcarPrimeraCompra$ =
                usuario?.flagPrimeraCompra
                  ? this.auth.marcarPrimeraCompraUsada(usuario.id)
                  : this.supabase.inmediato(undefined);

              return persistirButacas$.pipe(
                mergeMap(() => sincronizarPuntos$),
                mergeMap(() => marcarPrimeraCompra$),
                mergeMap(() => {
                  if (usuario) {
                    if (solicitud.desglose.creditoAplicado > 0) {
                      this.credito.acreditarSinTransaccion(usuario.id, solicitud.desglose.creditoAplicado, idCompra);
                    }
                    if (solicitud.codigoCupon) {
                      this.cupones.registrarUso(solicitud.codigoCupon, usuario.id).subscribe();
                    }
                  }

                  this.registro.registrar('crear', `confirmó la compra ${compra.id}`).subscribe();
                  return this.supabase.inmediato(compra);
                }),
              );
            }),
          );
        }),
      );
    }

    return this.persistirEnMemoria(solicitud, usuario, fechaCompra);
  }

  private persistirEnMemoria(
    solicitud: SolicitudCompra,
    usuario: AutenticacionServicio['usuarioActual'],
    fechaCompra: string,
  ): Observable<Compra> {
    const codigoQrVenta = this.generarCodigoQrVenta();
    const codigo: CodigoQr = {
      id: codigoQrVenta,
      idCompra: this.idProvisional(),
      permisos: {},
    };

    if (solicitud.items.some((i) => i.tipo === 'entrada')) {
      codigo.permisos.entrada = { usado: false, validadoPor: null, validadoEn: null };
    }
    if (solicitud.items.some((i) => i.tipo !== 'entrada')) {
      codigo.permisos.candy = { usado: false, validadoPor: null, validadoEn: null };
    }

    const compra: Compra = {
      id: codigo.idCompra,
      idUsuario: usuario?.id ?? null,
      fechaCompra,
      items: solicitud.items,
      desglose: solicitud.desglose,
      estado: 'pagada',
      idQr: codigo.id,
      idFuncion: solicitud.idFuncion,
    };

    return this.supabase.transaccion((base) => {
      base.codigosQr.push(codigo);
      base.compras.push(compra);
      this.guardarCompraPersistida(compra);

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

  private aNumeroBaseDatos(valor: number | string | null | undefined): number | null {
    if (valor === null || valor === undefined) return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }

  private escrituraBloqueadaPorRls(codigo?: string, mensaje?: string): boolean {
    if (codigo === '42501') return true;

    const texto = mensaje?.toLowerCase() ?? '';
    return texto.includes('row-level security') && (texto.includes('violates') || texto.includes('policy'));
  }

  private persistirButacasFuncion(
    cliente: NonNullable<SupabaseServicio['cliente']>,
    compra: Compra,
  ): Observable<void> {
    const idFuncion = this.aNumeroBaseDatos(compra.idFuncion);
    const idVenta = this.aNumeroBaseDatos(compra.id);
    const idUsuario = this.aNumeroBaseDatos(compra.idUsuario);
    const entradas = compra.items.filter((item) => item.tipo === 'entrada');

    if (idFuncion === null || idVenta === null || entradas.length === 0) {
      return this.supabase.inmediato(undefined);
    }

    const filas = entradas.map((item) => ({
      id_funcion: idFuncion,
      id_butaca: item.idButaca,
      id_usuario: idUsuario,
      id_venta: idVenta,
      estado: 'ocupada' as const,
      reservado_en: compra.fechaCompra,
      actualizado_en: compra.fechaCompra,
    }));

    return from(cliente.from('butacas_funcion').insert(filas)).pipe(
      mergeMap(({ error }) => {
        if (!error) return this.supabase.inmediato(undefined);
        if (this.escrituraBloqueadaPorRls(error.code, error.message)) {
          return this.supabase.inmediato(undefined);
        }
        return throwError(() => new Error(error.message));
      }),
    );
  }

  private async liberarButacasFuncion(
    cliente: NonNullable<SupabaseServicio['cliente']>,
    idCompra: string,
  ): Promise<void> {
    const idVenta = this.aNumeroBaseDatos(idCompra);
    if (idVenta === null) return;

    const { error } = await cliente.from('butacas_funcion').delete().eq('id_venta', idVenta);
    if (error && !this.escrituraBloqueadaPorRls(error.code, error.message)) {
      throw new Error(error.message);
    }
  }

  private async insertarVenta(
    cliente: NonNullable<SupabaseServicio['cliente']>,
    filaSnake: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { code?: string; message: string } | null }> {
    return cliente.from('ventas_cine').insert(filaSnake).select('*').single();
  }

  private generarCodigoQrVenta(): string {
    const bloque = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    return `QR-${bloque()}-${bloque()}`;
  }

  private guardarCompraPersistida(compra: Compra): void {
    try {
      const compras = this.comprasGuardadas();
      const actualizadas = [...compras.filter((c) => c.id !== compra.id), compra];
      localStorage.setItem(CLAVE_COMPRAS, JSON.stringify(actualizadas));
    } catch {
      // La persistencia del navegador puede estar bloqueada; la compra sigue en memoria.
    }
  }

  private comprasGuardadas(): Compra[] {
    try {
      const raw = localStorage.getItem(CLAVE_COMPRAS);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Compra[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
    const butacasSala = sala?.butacas ?? [];
    const ocupacionFuncion = compra.idFuncion ? base.ocupacion.get(compra.idFuncion) : undefined;
    const butacasOcupadasFuncion = ocupacionFuncion ? ocupacionFuncion.size : null;
    const butacasDisponiblesFuncion =
      funcion && butacasOcupadasFuncion !== null
        ? Math.max(0, butacasSala.length - butacasOcupadasFuncion)
        : null;

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
      butacasDisponiblesFuncion,
      butacasOcupadasFuncion,
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

  private completarDesdeCompraLocal(
    compra: Compra,
    comprasLocales?: ReadonlyMap<string, Compra>,
  ): Compra {
    const local = comprasLocales?.get(compra.id) ?? this.comprasGuardadas().find((c) => c.id === compra.id);
    if (!local) return compra;

    return {
      ...compra,
      items: local.items,
      idFuncion: compra.idFuncion ?? local.idFuncion,
      idQr: local.idQr || compra.idQr,
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

    const eliminarVenta = () =>
      cliente
        .from('ventas_cine')
        .delete()
        .eq('id_venta', idVenta)
        .eq('estado', venta.estado)
        .select('id_venta')
        .maybeSingle();

    let eliminarR = await eliminarVenta();
    if (eliminarR.error?.code === '23503') {
      await this.liberarButacasFuncion(cliente, String(idVenta));
      eliminarR = await eliminarVenta();
    }
    if (eliminarR.error) throw new Error(eliminarR.error.message);
    if (!eliminarR.data) {
      const ventaRestante = await cliente
        .from('ventas_cine')
        .select('estado')
        .eq('id_venta', idVenta)
        .maybeSingle();
      if (ventaRestante.error) throw new Error(ventaRestante.error.message);
      if (ventaRestante.data) {
        throw new Error(
          'Supabase no eliminó la venta. La compra sigue en la base; revisá la policy DELETE de ventas_cine.',
        );
      }
    }

    await this.liberarButacasFuncion(cliente, String(idVenta));

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

    await firstValueFrom(
      this.supabase.transaccion((base) => {
        this.credito.acreditar(base, idUsuario, creditoAcreditado, String(idVenta));
      }),
    );

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

    if (mvR.error?.code === 'PGRST205' || mvR.error?.code === '42P01') return;
    if (mvR.error) throw new Error(mvR.error.message);
  }
}
