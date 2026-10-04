import { Service, inject } from '@angular/core';
import { Observable, from, map, switchMap, throwError } from 'rxjs';

import { Resena, ResumenResenas } from '../interfaces/resena.interfaz';
import { AutenticacionServicio } from '../../nucleo/servicios/autenticacion.servicio';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';
import { CompraServicio } from './compra.servicio';

/**
 * Reseñas y puntuación (§14 de la consigna).
 *
 * La calificación se vincula a una compra de una función ya pasada: sin eso,
 * cualquiera podría puntuar películas que no vio.
 *
 * TODO Supabase: la verificación tiene que ser una policy, no un `if`. La tabla
 * `resenas` debe tener un CHECK contra `compras` y un UNIQUE
 * `(id_usuario, id_pelicula)` para que nadie reseñe dos veces.
 */
@Service()
export class ResenaServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly compras = inject(CompraServicio);

  dePelicula(idPelicula: string): Observable<Resena[]> {
    return this.supabase.consultar((base) =>
      base.resenas
        .filter((r) => r.idPelicula === idPelicula)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    );
  }

  resumen(idPelicula: string): Observable<ResumenResenas> {
    return this.dePelicula(idPelicula).pipe(
      map((resenas) => ({
        cantidad: resenas.length,
        promedio: resenas.length
          ? resenas.reduce((total, r) => total + r.estrellas, 0) / resenas.length
          : 0,
      })),
    );
  }

  /** Reseña propia del usuario sobre una película, si ya la dejó. */
  propia(idPelicula: string): Observable<Resena | null> {
    const usuario = this.auth.usuarioActual;
    if (!usuario) return this.supabase.inmediato(null);

    return this.supabase.consultar(
      (base) =>
        base.resenas.find((r) => r.idPelicula === idPelicula && r.idUsuario === usuario.id) ?? null,
    );
  }

  /** §14: solo habilitada si el usuario compró una función ya pasada. */
  puedeResenar(idPelicula: string): Observable<boolean> {
    return this.auth.usuarioActual$.pipe(
      switchMap((usuario) =>
        usuario
          ? this.compras.compraQueHabilitaResena(usuario.id, idPelicula)
          : this.supabase.inmediato(null),
      ),
      map((idCompra) => idCompra !== null),
    );
  }

  publicar(idPelicula: string, estrellas: number, comentario: string): Observable<Resena> {
    const usuario = this.auth.usuarioActual;
    if (!usuario) {
      return throwError(() => new Error('Necesitás iniciar sesión para dejar una reseña.'));
    }

    return this.compras.compraQueHabilitaResena(usuario.id, idPelicula).pipe(
      switchMap((idCompra) => {
        if (!idCompra) {
          return throwError(
            () => new Error('Solo podés calificar películas que ya viste en el cine.'),
          );
        }

        const resena: Resena = {
          id: this.supabase.nuevoId('re'),
          idPelicula,
          idUsuario: usuario.id,
          nombreUsuario: `${usuario.nombre} ${usuario.apellido.charAt(0)}.`,
          estrellas,
          comentario,
          fecha: new Date().toISOString(),
          idCompraVerificada: idCompra,
        };
        const cliente = this.supabase.cliente;

        const guardar = cliente
          ? from(this.guardarEnSupabase(cliente, resena))
          : this.supabase.inmediato(resena);

        return guardar.pipe(switchMap((guardada) => this.actualizarBaseLocal(guardada)));
      }),
    );
  }

  private async guardarEnSupabase(
    cliente: NonNullable<SupabaseServicio['cliente']>,
    resena: Resena,
  ): Promise<Resena> {
    const idPelicula = this.idParaBase(resena.idPelicula);
    const fila = {
      id_pelicula: idPelicula,
      id_usuario: resena.idUsuario,
      nombre_usuario: resena.nombreUsuario,
      estrellas: resena.estrellas,
      comentario: resena.comentario,
      fecha: resena.fecha,
      id_compra_verificada: resena.idCompraVerificada,
    };

    const resultado = await cliente
      .from('comentarios_peliculas')
      .upsert(fila, { onConflict: 'id_compra_verificada' })
      .select('*')
      .single();
    if (resultado.error) throw new Error(resultado.error.message);

    const registro = resultado.data as Record<string, unknown>;
    return {
      ...resena,
      id: String(registro['id'] ?? resena.id),
      idPelicula: String(registro['idPelicula'] ?? registro['id_pelicula'] ?? resena.idPelicula),
      idUsuario: Number(registro['idUsuario'] ?? registro['id_usuario'] ?? resena.idUsuario),
      nombreUsuario: String(
        registro['nombreUsuario'] ?? registro['nombre_usuario'] ?? resena.nombreUsuario,
      ),
      estrellas: Number(registro['estrellas'] ?? resena.estrellas),
      comentario: String(registro['comentario'] ?? resena.comentario),
      fecha: String(registro['fecha'] ?? registro['created_at'] ?? resena.fecha),
      idCompraVerificada: String(
        registro['idCompraVerificada'] ??
          registro['id_compra_verificada'] ??
          resena.idCompraVerificada,
      ),
    };
  }

  private actualizarBaseLocal(resena: Resena): Observable<Resena> {
    return this.supabase.transaccion((base) => {
      const indice = base.resenas.findIndex(
        (item) => item.idCompraVerificada === resena.idCompraVerificada,
      );
      if (indice >= 0) base.resenas[indice] = resena;
      else base.resenas.push(resena);
      return resena;
    });
  }

  private idParaBase(id: string): number | string {
    return /^\d+$/.test(id) ? Number(id) : id;
  }
}
