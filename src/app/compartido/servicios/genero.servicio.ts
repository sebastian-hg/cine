import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Genero } from '../interfaces/genero.interfaz';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/**
 * Catálogo de géneros (§3: una película puede tener varios).
 *
 * TODO Supabase: `from('generos').select('*').order('nombre')`.
 * RLS: SELECT público; INSERT/UPDATE/DELETE solo administrador.
 */
@Service()
export class GeneroServicio {
  private readonly supabase = inject(SupabaseServicio);

  listar(): Observable<Genero[]> {
    return this.supabase.consultar((base) => [...base.generos]);
  }

  activos(): Observable<Genero[]> {
    return this.listar().pipe(map((generos) => generos.filter((g) => g.activo)));
  }

  /** Mapa `id → nombre`, para no resolver géneros de a uno en las plantillas. */
  nombresPorId(): Observable<Map<string, string>> {
    return this.listar().pipe(map((generos) => new Map(generos.map((g) => [g.id, g.nombre]))));
  }

  crear(nombre: string): Observable<Genero> {
    return this.supabase.transaccion((base) => {
      const genero: Genero = { id: this.supabase.nuevoId('g'), nombre, activo: true };
      base.generos.push(genero);
      return genero;
    });
  }

  actualizar(id: string, cambios: Partial<Omit<Genero, 'id'>>): Observable<void> {
    return this.supabase.transaccion((base) => {
      const genero = base.generos.find((g) => g.id === id);
      if (genero) Object.assign(genero, cambios);
    });
  }
}
