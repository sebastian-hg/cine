import { Service, inject } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';

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
  deUsuario(idUsuario: string): Observable<CompraDetallada[]> {
    return this.supabase.consultar((base) =>
      base.compras
        .filter((c) => c.idUsuario === idUsuario)
        .sort((a, b) => b.fechaCompra.localeCompare(a.fechaCompra))
        .map((c) => this.detallar(c, base)),
    );
  }

  obtener(id: string): Observable<CompraDetallada | null> {
    return this.supabase.consultar((base) => {
      const compra = base.compras.find((c) => c.id === id);
      return compra ? this.detallar(compra, base) : null;
    });
  }

  todas(): Observable<Compra[]> {
    return this.supabase.consultar((base) => [...base.compras]);
  }

  /**
   * Cancelación (§19): hasta 2 horas antes de la función.
   *
   * No hay devolución de dinero. Se genera crédito, se liberan las butacas, se
   * repone el stock y se revierten los puntos otorgados (supuesto 3).
   */
  cancelar(idCompra: string): Observable<number> {
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
        this.credito.acreditar(base, compra.idUsuario, aDevolver, compra.id);
        this.puntos.revertir(base, compra.idUsuario, compra.id);
      }

      return this.supabase.inmediato(aDevolver);
    });
  }

  /** §18: películas que el usuario ya vio, para la galería «Mis películas». */
  peliculasVistas(
    idUsuario: string,
  ): Observable<{ idPelicula: string; inicioFuncion: string; idCompra: string }[]> {
    const ahora = new Date().toISOString();
    return this.supabase.consultar((base) =>
      base.compras
        .filter((c) => c.idUsuario === idUsuario && c.estado !== 'cancelada' && c.idFuncion)
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
  compraQueHabilitaResena(idUsuario: string, idPelicula: string): Observable<string | null> {
    return this.peliculasVistas(idUsuario).pipe(
      map((vistas) => vistas.find((v) => v.idPelicula === idPelicula)?.idCompra ?? null),
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
        this.puntos.acumular(base, usuario.id, solicitud.desglose.puntosGanados, compra.id);

        if (solicitud.desglose.creditoAplicado > 0) {
          this.credito.debitar(base, usuario.id, solicitud.desglose.creditoAplicado, compra.id);
        }

        if (solicitud.codigoCupon) {
          this.cupones.registrarUso(solicitud.codigoCupon, usuario.id).subscribe();
        }

        // §9: el descuento de bienvenida se consume con la primera compra.
        if (!usuario.primeraCompraUsada) {
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
}
