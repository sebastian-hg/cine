import { Service, inject } from '@angular/core';
import { Observable, combineLatest, from, map, mergeMap, of, switchMap, throwError } from 'rxjs';

import { Usuario } from '../../../compartido/interfaces/usuario.interfaz';
import { AutenticacionServicio } from '../../../nucleo/servicios/autenticacion.servicio';
import { SupabaseServicio } from '../../../nucleo/servicios/supabase.servicio';
import { CompraServicio } from '../../../compartido/servicios/compra.servicio';
import { CreditoServicio } from '../../../compartido/servicios/credito.servicio';
import { FidelizacionServicio } from '../../../compartido/servicios/fidelizacion.servicio';

/** Película vista, con la calificación propia si la dejó (§18). */
export interface PeliculaVista {
  idPelicula: string;
  nombre: string;
  poster: string;
  inicioFuncion: string;
  calificacionPropia: number | null;
}

export interface ResumenCuenta {
  puntos: number;
  credito: number;
  compras: number;
}

/**
 * Perfil del usuario (§8, §18).
 *
 * TODO Supabase: tabla `perfiles` con RLS `auth.uid() = id`. Un cliente no debe
 * poder leer el perfil de otro (§26).
 */
@Service()
export class PerfilServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly compras = inject(CompraServicio);
  private readonly puntos = inject(FidelizacionServicio);
  private readonly credito = inject(CreditoServicio);

  /** Totales que encabezan la pantalla de perfil. */
  resumen(): Observable<ResumenCuenta> {
    return this.auth.usuarioActual$.pipe(
      switchMap((usuario) => {
        if (!usuario) return of({ puntos: 0, credito: 0, compras: 0 });

        const cliente = this.supabase.cliente;
        if (cliente) {
          return from(
            cliente.from('usuarios_cine').select('*').eq('id', Number(usuario.id)).maybeSingle(),
          ).pipe(
            mergeMap(({ data, error }) => {
              if (error) return throwError(() => new Error(error.message));

              const fila = (data ?? {}) as Record<string, unknown>;
              const puntos = Number(
                fila['puntos'] ?? fila['puntos_acumulados'] ?? fila['puntosAcumulados'] ?? 0,
              );
              const credito = Number(
                fila['credito'] ?? fila['saldo_credito'] ?? fila['saldoCredito'] ?? 0,
              );

              return this.compras.deUsuario(usuario.id).pipe(
                map((compras) => ({
                  puntos,
                  credito,
                  compras: compras.filter((c) => c.estado !== 'cancelada').length,
                })),
              );
            }),
          );
        }

        return combineLatest([
          this.puntos.saldo(usuario.id),
          this.credito.saldo(usuario.id),
          this.compras.deUsuario(usuario.id),
        ]).pipe(
          map(([puntos, credito, compras]) => ({
            puntos,
            credito,
            compras: compras.filter((c) => c.estado !== 'cancelada').length,
          })),
        );
      }),
    );
  }

  /** §18: historial visual de películas vistas, con la calificación propia. */
  misPeliculas(): Observable<PeliculaVista[]> {
    const usuario = this.auth.usuarioActual;
    if (!usuario) return of([]);

    return this.compras.peliculasVistas(usuario.id).pipe(
      switchMap((vistas) =>
        this.supabase.consultar((base) => {
          // Una película vista varias veces aparece una sola vez, con la función
          // más reciente.
          const porPelicula = new Map<string, PeliculaVista>();

          for (const vista of vistas) {
            if (porPelicula.has(vista.idPelicula)) continue;

            const pelicula = base.peliculas.find((p) => p.id === vista.idPelicula);
            if (!pelicula) continue;

            const propia = base.resenas.find(
              (r) => r.idPelicula === vista.idPelicula && r.idUsuario === usuario.id,
            );

            porPelicula.set(vista.idPelicula, {
              idPelicula: pelicula.id,
              nombre: pelicula.nombre,
              poster: pelicula.poster,
              inicioFuncion: vista.inicioFuncion,
              calificacionPropia: propia?.estrellas ?? null,
            });
          }

          return [...porPelicula.values()];
        }),
      ),
    );
  }

  actualizar(cambios: Partial<Omit<Usuario, 'id' | 'rol'>>): Observable<Usuario> {
    const usuario = this.auth.usuarioActual;
    if (!usuario) {
      return throwError(() => new Error('Necesitás iniciar sesión para editar tu perfil.'));
    }

    return this.supabase.transaccion((base) => {
      const encontrado = base.usuarios.find((u) => u.id === usuario.id);
      if (encontrado) {
        Object.assign(encontrado, cambios);
        const { password, ...sinPassword } = encontrado;
        this.auth.refrescar(sinPassword);
        return sinPassword;
      }
      return usuario;
    });
  }
}
