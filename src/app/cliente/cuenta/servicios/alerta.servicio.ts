import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AlertaEstreno } from '../../../compartido/interfaces/alerta.interfaz';
import { AutenticacionServicio } from '../../../nucleo/servicios/autenticacion.servicio';
import { SupabaseServicio } from '../../../nucleo/servicios/supabase.servicio';

/**
 * Alertas de estreno (§17: botón «Avisarme»).
 *
 * TODO Supabase: tabla `alertas_estreno` con RLS `auth.uid() = id_usuario`.
 * El aviso lo dispara un trigger cuando `preventaActivada` pasa a true, no el
 * cliente: si dependiera del navegador, solo se enteraría quien tuviera la
 * pestaña abierta.
 */
@Service()
export class AlertaServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly auth = inject(AutenticacionServicio);

  /** Alertas del usuario en sesión. */
  propias(): Observable<AlertaEstreno[]> {
    const usuario = this.auth.usuarioActual;
    if (!usuario) return this.supabase.inmediato([]);

    return this.supabase.consultar((base) =>
      base.alertas.filter((a) => a.idUsuario === usuario.id),
    );
  }

  /** Ids de película a las que el usuario ya se suscribió. */
  idsSuscritos(): Observable<Set<string>> {
    return this.propias().pipe(map((alertas) => new Set(alertas.map((a) => a.idPelicula))));
  }

  alternar(idPelicula: string): Observable<boolean> {
    const usuario = this.auth.usuarioActual;
    if (!usuario) return this.supabase.inmediato(false);

    return this.supabase.transaccion((base) => {
      const indice = base.alertas.findIndex(
        (a) => a.idUsuario === usuario.id && a.idPelicula === idPelicula,
      );

      if (indice >= 0) {
        base.alertas.splice(indice, 1);
        return false;
      }

      base.alertas.push({
        id: this.supabase.nuevoId('al'),
        idUsuario: usuario.id,
        idPelicula,
        fechaSuscripcion: new Date().toISOString(),
        notificada: false,
      });
      return true;
    });
  }
}
