import { Service, inject } from '@angular/core';
import { Observable, from, mergeMap, throwError } from 'rxjs';

import { Configuracion } from '../interfaces/cupon.interfaz';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/**
 * Parámetros que el administrador configura (§9, §15, §16).
 *
 * TODO Supabase: tabla `configuracion` de una sola fila.
 * RLS: SELECT público, UPDATE solo para el rol administrador. Es crítico que
 * esta tabla no sea escribible desde el cliente sin ese chequeo: quien pueda
 * tocar `porcentajePrimeraCompra` puede regalarse el 100%.
 */
@Service()
export class ConfiguracionServicio {
  private readonly supabase = inject(SupabaseServicio);

  obtener(): Observable<Configuracion> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.consultar((base) => ({ ...base.configuracion }));
    }

    return from(cliente.from('configuracion').select('*').limit(1).maybeSingle()).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));
        return this.supabase.inmediato(this.mapearConfiguracion(data));
      }),
    );
  }

  actualizar(cambios: Partial<Configuracion>): Observable<Configuracion> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        Object.assign(base.configuracion, cambios);
        return { ...base.configuracion };
      });
    }

    const fila: Record<string, unknown> = {};
    if (cambios.porcentajePrimeraCompra !== undefined) {
      fila['porcentaje_primera_compra'] = cambios.porcentajePrimeraCompra;
    }
    if (cambios.porcentajeMayores50 !== undefined) {
      fila['porcentaje_mayores_50'] = cambios.porcentajeMayores50;
    }
    if (cambios.multiplicadorVip !== undefined) fila['multiplicador_vip'] = cambios.multiplicadorVip;
    if (cambios.puntosPorEntrada !== undefined) fila['puntos_por_entrada'] = cambios.puntosPorEntrada;
    if (cambios.puntosPorProductoCandy !== undefined) {
      fila['puntos_por_producto_candy'] = cambios.puntosPorProductoCandy;
    }
    if (cambios.diasAnticipacionPreventa !== undefined) {
      fila['dias_anticipacion_preventa'] = cambios.diasAnticipacionPreventa;
    }

    return from(cliente.from('configuracion').update(fila).select('*').limit(1).maybeSingle()).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));

        const configuracion = this.mapearConfiguracion(data);
        return this.supabase.transaccion((base) => {
          base.configuracion = { ...configuracion };
          return { ...base.configuracion };
        });
      }),
    );
  }

  private mapearConfiguracion(fila: Record<string, unknown> | null | undefined): Configuracion {
    const registro = fila ?? {};
    return {
      porcentajePrimeraCompra: Number(
        registro['porcentajePrimeraCompra'] ?? registro['porcentaje_primera_compra'] ?? 20,
      ),
      porcentajeMayores50: Number(
        registro['porcentajeMayores50'] ?? registro['porcentaje_mayores_50'] ?? 15,
      ),
      multiplicadorVip: Number(registro['multiplicadorVip'] ?? registro['multiplicador_vip'] ?? 1.2),
      puntosPorEntrada: Number(registro['puntosPorEntrada'] ?? registro['puntos_por_entrada'] ?? 10),
      puntosPorProductoCandy: Number(
        registro['puntosPorProductoCandy'] ?? registro['puntos_por_producto_candy'] ?? 2,
      ),
      diasAnticipacionPreventa: Number(
        registro['diasAnticipacionPreventa'] ?? registro['dias_anticipacion_preventa'] ?? 3,
      ),
    };
  }
}
