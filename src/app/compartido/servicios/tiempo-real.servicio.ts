import { Service, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, take, throwError } from 'rxjs';

import { ButacaFuncion } from '../interfaces/butaca.interfaz';
import { ButacaNoDisponibleError, ButacaServicio } from '../servicios/butaca.servicio';
import { etiquetaButaca } from '../../nucleo/dominio/generador-butacas';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

// El simulador fantasma quedó desactivado porque ocupaba butacas sin compras reales.

/**
 * Ocupación de butacas en tiempo real (§6) — MOCK DE SUPABASE REALTIME.
 *
 * El mock no se limita a parecerse al servicio real: `reservar()` relee el
 * estado antes de confirmar y falla de verdad si otro se adelantó. Un mock que
 * siempre toma el camino feliz escondería justo el problema de concurrencia que
 * §6 pide resolver.
 *
 * TODO Supabase:
 *   canal = supabase.channel(`butacas:${idFuncion}`)
 *     .on('postgres_changes',
 *         { event: 'UPDATE', schema: 'public', table: 'butacas_funcion',
 *           filter: `id_funcion=eq.${idFuncion}` },
 *         (payload) => emitir(payload.new))
 *     .subscribe();
 *
 * La reserva debe ser una RPC con `SELECT ... FOR UPDATE` sobre las filas
 * pedidas. §26 es explícito: la disponibilidad se valida en el backend, y este
 * chequeo del lado del cliente sirve solo para dar respuesta inmediata.
 */
@Service()
export class TiempoRealServicio implements OnDestroy {
  private readonly supabase = inject(SupabaseServicio);
  private readonly butacas = inject(ButacaServicio);

  /** Un flujo por función; se crea al primer suscriptor y se reutiliza. */
  private readonly flujos = new Map<string, BehaviorSubject<ButacaFuncion[]>>();

  /** Estado de la sala, actualizado cuando alguien reserva o cancela. */
  butacas$(idFuncion: string): Observable<ButacaFuncion[]> {
    return this.flujoDe(idFuncion).asObservable();
  }

  /**
   * Intenta reservar. Falla si alguna butaca dejó de estar libre.
   *
   * La relectura del estado es el punto importante: entre que el usuario
   * seleccionó y confirmó pudo pasar cualquier cosa.
   */
  reservar(idFuncion: string, idsButacas: string[]): Observable<ButacaFuncion[]> {
    return this.supabase.transaccionAsync((base) => {
      const ocupacion = this.supabase.ocupacionDe(base, idFuncion);
      const mapa = new Map(this.butacas.componer(base, idFuncion).map((b) => [b.id, b]));

      const perdidas = idsButacas.filter((id) => (ocupacion.get(id) ?? 'libre') !== 'libre');
      if (perdidas.length > 0) {
        const etiquetas = perdidas.map((id) => {
          const butaca = mapa.get(id);
          return butaca ? etiquetaButaca(butaca) : id;
        });
        this.refrescar(base, idFuncion);
        return throwError(() => new ButacaNoDisponibleError(etiquetas));
      }

      for (const id of idsButacas) {
        ocupacion.set(id, 'ocupada');
      }
      this.refrescar(base, idFuncion);

      return this.supabase.inmediato(
        idsButacas.map((id) => mapa.get(id)).filter((b): b is ButacaFuncion => b !== undefined),
      );
    });
  }

  /** §19: cancelar una compra devuelve las butacas al mapa. */
  liberar(idFuncion: string, idsButacas: string[]): Observable<void> {
    return this.supabase.transaccion((base) => {
      const ocupacion = this.supabase.ocupacionDe(base, idFuncion);
      for (const id of idsButacas) {
        ocupacion.delete(id);
      }
      this.refrescar(base, idFuncion);
    });
  }

  ngOnDestroy(): void {
    // Sin simulador persistente, no hay suscripciones que limpiar acá.
  }

  private flujoDe(idFuncion: string): BehaviorSubject<ButacaFuncion[]> {
    let flujo = this.flujos.get(idFuncion);
    if (flujo) return flujo;

    flujo = new BehaviorSubject<ButacaFuncion[]>([]);
    this.flujos.set(idFuncion, flujo);

    this.butacas
      .deFuncion(idFuncion)
      .pipe(take(1))
      .subscribe((inicial) => flujo!.next(inicial));
    return flujo;
  }

  private refrescar(base: Parameters<typeof this.butacas.componer>[0], idFuncion: string): void {
    this.flujos.get(idFuncion)?.next(this.butacas.componer(base, idFuncion));
  }

  // El simulador fantasma quedó removido.
}
