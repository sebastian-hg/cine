import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

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
    return this.supabase.consultar((base) => ({ ...base.configuracion }));
  }

  actualizar(cambios: Partial<Configuracion>): Observable<Configuracion> {
    return this.supabase.transaccion((base) => {
      Object.assign(base.configuracion, cambios);
      return { ...base.configuracion };
    });
  }
}
