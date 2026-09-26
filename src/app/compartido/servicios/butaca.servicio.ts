import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ButacaFuncion } from '../interfaces/butaca.interfaz';
import { precioButaca } from '../../nucleo/dominio/calculo-precio';
import { precioBasePelicula } from '../../nucleo/dominio/preventa';
import { BaseDatos, SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/** Butacas que otro usuario tomó mientras esta compra estaba en curso. */
export class ButacaNoDisponibleError extends Error {
  constructor(readonly etiquetas: string[]) {
    super(
      etiquetas.length === 1
        ? `La butaca ${etiquetas[0]} acaba de ser ocupada por otro usuario.`
        : `Las butacas ${etiquetas.join(', ')} acaban de ser ocupadas por otros usuarios.`,
    );
    this.name = 'ButacaNoDisponibleError';
  }
}

/**
 * Estado de las butacas de una función (§6 de la consigna).
 *
 * El precio de cada butaca se resuelve acá y no en la plantilla: contempla la
 * preventa de §16 y el recargo VIP de §5, y tiene que coincidir exactamente con
 * lo que después cobra `PrecioServicio`.
 */
@Service()
export class ButacaServicio {
  private readonly supabase = inject(SupabaseServicio);

  /** Mapa completo de una función, con estado y precio por butaca. */
  deFuncion(idFuncion: string): Observable<ButacaFuncion[]> {
    return this.supabase.consultar((base) => this.componer(base, idFuncion));
  }

  /** Igual que `deFuncion`, pero sobre una base ya abierta en una transacción. */
  componer(base: BaseDatos, idFuncion: string): ButacaFuncion[] {
    const funcion = base.funciones.find((f) => f.id === idFuncion);
    if (!funcion) return [];

    const pelicula = base.peliculas.find((p) => p.id === funcion.idPelicula);
    if (!pelicula) return [];

    const ocupacion = this.supabase.ocupacionDe(base, idFuncion);
    const precioBase = precioBasePelicula(
      pelicula,
      funcion.precio,
      base.configuracion.diasAnticipacionPreventa,
    );

    return this.supabase.butacasDeSala(base, funcion.idSala).map((butaca) => ({
      ...butaca,
      estado: ocupacion.get(butaca.id) ?? 'libre',
      precio: precioButaca(precioBase, butaca.tipo, base.configuracion),
    }));
  }

  /** Cuántas butacas quedan libres, para mostrarlo junto a cada función. */
  disponiblesEn(idFuncion: string): Observable<number> {
    return this.deFuncion(idFuncion).pipe(
      map((butacas) => butacas.filter((b) => b.estado === 'libre').length),
    );
  }
}
