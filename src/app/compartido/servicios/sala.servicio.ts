import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Butaca } from '../interfaces/butaca.interfaz';
import { Sala } from '../interfaces/sala.interfaz';
import { generarButacas } from '../../nucleo/dominio/generador-butacas';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/**
 * Salas y su mapa de butacas (§5 de la consigna).
 *
 * El algoritmo vive en `nucleo/dominio/generador-butacas.ts` como función pura:
 * `SupabaseServicio` también lo necesita para sembrar, y tenerlo acá crearía un
 * ciclo de inyección entre los dos servicios.
 *
 * TODO Supabase: `from('salas').select('*, butacas(*)')`. Las butacas se
 * insertan una sola vez al crear la sala, con la misma función corriendo en una
 * edge function para que el mapa sea idéntico del lado del servidor.
 */
@Service()
export class SalaServicio {
  private readonly supabase = inject(SupabaseServicio);

  listar(): Observable<Sala[]> {
    return this.supabase.consultar((base) => [...base.salas]);
  }

  obtener(id: string): Observable<Sala | null> {
    return this.supabase.consultar((base) => base.salas.find((s) => s.id === id) ?? null);
  }

  /** Genera el mapa completo de una sala. Ver §5 para la grilla. */
  generarButacas(idSala: string): Butaca[] {
    return generarButacas(idSala);
  }

  crear(nombre: string): Observable<Sala> {
    return this.supabase.transaccion((base) => {
      const id = this.supabase.nuevoId('s');
      const sala: Sala = {
        id,
        numero: base.salas.length + 1,
        nombre,
        butacas: generarButacas(id),
      };
      base.salas.push(sala);
      return sala;
    });
  }

  /** Conteo por tipo, para la pantalla de gestión de butacas. */
  resumenButacas(idSala: string): Observable<Record<Butaca['tipo'], number> | null> {
    return this.supabase.consultar((base) => {
      const sala = base.salas.find((s) => s.id === idSala);
      if (!sala) return null;

      return sala.butacas.reduce(
        (conteo, butaca) => {
          conteo[butaca.tipo]++;
          return conteo;
        },
        { normal: 0, accesible: 0, vip: 0 } as Record<Butaca['tipo'], number>,
      );
    });
  }
}
