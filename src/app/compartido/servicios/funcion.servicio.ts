import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Funcion } from '../interfaces/funcion.interfaz';
import { soloFecha } from '../../nucleo/dominio/fechas';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/** Función junto con los datos que la cartelera necesita mostrar. */
export interface FuncionDetallada extends Funcion {
  nombreSala: string;
  nombrePelicula: string;
  duracionMinutos: number;
}

/**
 * Funciones (§4 de la consigna).
 *
 * TODO Supabase: `from('funciones').select('*, salas(nombre), peliculas(nombre, duracion)')`
 * con `.gte('inicio', now())`. RLS: SELECT público, escritura solo administrador.
 */
@Service()
export class FuncionServicio {
  private readonly supabase = inject(SupabaseServicio);

  listar(): Observable<FuncionDetallada[]> {
    return this.supabase.consultar((base) =>
      base.funciones.map((funcion) => this.detallar(funcion, base)),
    );
  }

  obtener(id: string): Observable<FuncionDetallada | null> {
    return this.supabase.consultar((base) => {
      const funcion = base.funciones.find((f) => f.id === id);
      return funcion ? this.detallar(funcion, base) : null;
    });
  }

  /** Funciones futuras de una película, ordenadas por horario. */
  dePelicula(idPelicula: string): Observable<FuncionDetallada[]> {
    const ahora = Date.now();
    return this.listar().pipe(
      map((funciones) =>
        funciones
          .filter((f) => f.idPelicula === idPelicula && this.aMilisegundos(f.inicio) > ahora)
          .sort((a, b) => this.aMilisegundos(a.inicio) - this.aMilisegundos(b.inicio)),
      ),
    );
  }

  /** Agrupa las funciones de una película por día, para el selector de fecha. */
  dePeliculaPorDia(idPelicula: string): Observable<Map<string, FuncionDetallada[]>> {
    return this.dePelicula(idPelicula).pipe(
      map((funciones) => {
        const porDia = new Map<string, FuncionDetallada[]>();
        for (const funcion of funciones) {
          const marca = this.aMilisegundos(funcion.inicio);
          if (!Number.isFinite(marca)) continue;

          const dia = soloFecha(new Date(marca));
          const delDia = porDia.get(dia) ?? [];
          delDia.push(funcion);
          porDia.set(dia, delDia);
        }
        return porDia;
      }),
    );
  }

  private aMilisegundos(fechaIso: string): number {
    const ms = Date.parse(fechaIso);
    return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
  }

  private detallar(
    funcion: Funcion,
    base: { salas: { id: string; nombre: string }[]; peliculas: { id: string; nombre: string; duracionMinutos: number }[] },
  ): FuncionDetallada {
    const sala = base.salas.find((s) => s.id === funcion.idSala);
    const pelicula = base.peliculas.find((p) => p.id === funcion.idPelicula);

    return {
      ...funcion,
      nombreSala: sala?.nombre ?? 'Sala sin asignar',
      nombrePelicula: pelicula?.nombre ?? 'Película desconocida',
      duracionMinutos: pelicula?.duracionMinutos ?? 0,
    };
  }
}
