import { Service } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Aviso {
  id: string;
  texto: string;
  tono: 'exito' | 'info' | 'error';
}

/**
 * Avisos al usuario y notificaciones de estreno (§17, §25) — MOCKEADO.
 *
 * TODO Web Push: `swPush.requestSubscription({ serverPublicKey: VAPID })` y
 * enviar la suscripción al backend. El disparo real lo hace una función de
 * Supabase cuando `preventaActivada` pasa a `true`, no el cliente.
 */
@Service()
export class NotificacionServicio {
  private readonly avisos = new BehaviorSubject<Aviso[]>([]);

  readonly avisos$: Observable<Aviso[]> = this.avisos.asObservable();

  mostrar(texto: string, tono: Aviso['tono'] = 'info'): void {
    const aviso: Aviso = { id: `${Date.now()}-${Math.random()}`, texto, tono };
    this.avisos.next([...this.avisos.value, aviso]);
    setTimeout(() => this.descartar(aviso.id), 4500);
  }

  descartar(id: string): void {
    this.avisos.next(this.avisos.value.filter((a) => a.id !== id));
  }

  /**
   * Registra el interés en un estreno.
   *
   * TODO: acá iría el alta de la suscripción push. Hoy solo se guarda la alerta
   * en la base (ver `AlertaServicio`) y se confirma al usuario.
   */
  solicitarPermiso(): Observable<boolean> {
    return new Observable((observador) => {
      observador.next(true);
      observador.complete();
    });
  }
}
