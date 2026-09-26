import { Service, inject } from '@angular/core';
import { Observable, from, map, mergeMap, throwError } from 'rxjs';

import { Combo } from '../interfaces/combo.interfaz';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/**
 * Combos (§11 de la consigna).
 *
 * TODO Supabase: `from('combos_candy').select('*, combo_productos_candy(idProducto, cantidad)')`.
 */
@Service()
export class ComboServicio {
  private readonly supabase = inject(SupabaseServicio);

  activos(): Observable<Combo[]> {
    const cliente = this.supabase.cliente;
    if (!cliente) return this.supabase.consultar((base) => base.combos.filter((c) => c.activo));

    return this.cargarCombosRemotos().pipe(map((combos) => combos.filter((c) => c.activo)));
  }

  /** §3 y §11: los destacados aparecen en la página principal y en la compra. */
  destacados(): Observable<Combo[]> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.consultar((base) => base.combos.filter((c) => c.activo && c.destacado));
    }

    return this.cargarCombosRemotos().pipe(map((combos) => combos.filter((c) => c.activo && c.destacado)));
  }

  todos(): Observable<Combo[]> {
    const cliente = this.supabase.cliente;
    if (!cliente) return this.supabase.consultar((base) => [...base.combos]);
    return this.cargarCombosRemotos();
  }

  obtener(id: string): Observable<Combo | null> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.consultar((base) => base.combos.find((c) => c.id === id) ?? null);
    }

    return this.cargarCombosRemotos().pipe(
      map((combos) => combos.find((combo) => combo.id === id) ?? null),
    );
  }

  crear(datos: Omit<Combo, 'id'>): Observable<Combo> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        const combo: Combo = { ...datos, id: this.supabase.nuevoId('cb') };
        base.combos.push(combo);
        return combo;
      });
    }

    const filaCombo = {
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      imagen: datos.imagen,
      incluyeEntrada: datos.incluyeEntrada,
      precioFijo: datos.precioFijo,
      activo: datos.activo,
      destacado: datos.destacado,
    };

    return from(cliente.from('combos_candy').insert(filaCombo).select('*').single()).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));

        const idCombo = String((data as { id?: string } | null)?.id ?? '');
        if (!idCombo) return throwError(() => new Error('No se pudo crear el combo.'));

        const filasProductos = datos.productos.map((item) => ({
          idCombo: idCombo,
          idProducto: item.idProducto,
          cantidad: item.cantidad,
        }));

        return from(cliente.from('combo_productos_candy').insert(filasProductos)).pipe(
          mergeMap(({ error: errorProductos }) => {
            if (errorProductos) return throwError(() => new Error(errorProductos.message));
            return this.supabase.inmediato(this.mapearCombo(data as Record<string, unknown>, filasProductos));
          }),
        );
      }),
    );
  }

  actualizar(id: string, cambios: Partial<Omit<Combo, 'id'>>): Observable<void> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        const combo = base.combos.find((c) => c.id === id);
        if (combo) Object.assign(combo, cambios);
      });
    }

    const fila: Record<string, unknown> = {};
    if (cambios.nombre !== undefined) fila['nombre'] = cambios.nombre;
    if (cambios.descripcion !== undefined) fila['descripcion'] = cambios.descripcion;
    if (cambios.imagen !== undefined) fila['imagen'] = cambios.imagen;
    if (cambios.incluyeEntrada !== undefined) fila['incluyeEntrada'] = cambios.incluyeEntrada;
    if (cambios.precioFijo !== undefined) fila['precioFijo'] = cambios.precioFijo;
    if (cambios.activo !== undefined) fila['activo'] = cambios.activo;
    if (cambios.destacado !== undefined) fila['destacado'] = cambios.destacado;

    return from(cliente.from('combos_candy').update(fila).eq('id', id)).pipe(
      mergeMap(({ error }) => {
        if (error) return throwError(() => new Error(error.message));

        if (!cambios.productos) return this.supabase.inmediato(undefined);

        return from(cliente.from('combo_productos_candy').delete().eq('idCombo', id)).pipe(
          mergeMap(({ error: errorBorrar }) => {
            if (errorBorrar) return throwError(() => new Error(errorBorrar.message));

            const filas = cambios.productos?.map((item) => ({
              idCombo: id,
              idProducto: item.idProducto,
              cantidad: item.cantidad,
            }));

            if (!filas || filas.length === 0) return this.supabase.inmediato(undefined);

            return from(cliente.from('combo_productos_candy').insert(filas)).pipe(
              mergeMap(({ error: errorInsertar }) => {
                if (errorInsertar) return throwError(() => new Error(errorInsertar.message));
                return this.supabase.inmediato(undefined);
              }),
            );
          }),
        );
      }),
    );
  }

  private cargarCombosRemotos(): Observable<Combo[]> {
    const cliente = this.supabase.cliente;
    if (!cliente) return this.supabase.inmediato([]);

    return from(
      Promise.all([
        cliente.from('combos_candy').select('*'),
        cliente.from('combo_productos_candy').select('*'),
      ]),
    ).pipe(
      mergeMap(([combosRespuesta, productosRespuesta]) => {
        if (combosRespuesta.error) return throwError(() => new Error(combosRespuesta.error.message));
        if (productosRespuesta.error) {
          return throwError(() => new Error(productosRespuesta.error.message));
        }

        const productosPorCombo = new Map<string, { idProducto: string; cantidad: number }[]>();
        for (const fila of productosRespuesta.data ?? []) {
          const idCombo = String(
            (fila as Record<string, unknown>)['idCombo'] ??
              (fila as Record<string, unknown>)['id_combo'] ??
              '',
          );
          if (!idCombo) continue;

          const lista = productosPorCombo.get(idCombo) ?? [];
          lista.push({
            idProducto: String(
              (fila as Record<string, unknown>)['idProducto'] ??
                (fila as Record<string, unknown>)['id_producto'] ??
                '',
            ),
            cantidad: Number((fila as Record<string, unknown>)['cantidad'] ?? 0),
          });
          productosPorCombo.set(idCombo, lista);
        }

        const combos = (combosRespuesta.data ?? []).map((fila) => {
          const id = String((fila as Record<string, unknown>)['id'] ?? '');
          return this.mapearCombo(
            fila as Record<string, unknown>,
            productosPorCombo.get(id) ?? [],
          );
        });

        return this.supabase.inmediato(combos);
      }),
    );
  }

  private mapearCombo(
    fila: Record<string, unknown>,
    productosOverride?: { idProducto: string; cantidad: number }[],
  ): Combo {
    const productos = productosOverride ??
      ((fila['combo_productos_candy'] as { idProducto?: string; cantidad?: number }[] | undefined) ??
        []);

    return {
      id: String(fila['id'] ?? ''),
      nombre: String(fila['nombre'] ?? ''),
      descripcion: String(fila['descripcion'] ?? ''),
      imagen: String(fila['imagen'] ?? ''),
      productos: productos.map((item) => ({
        idProducto: String(item.idProducto ?? ''),
        cantidad: Number(item.cantidad ?? 0),
      })),
      incluyeEntrada: Boolean(fila['incluyeEntrada'] ?? fila['incluye_entrada'] ?? false),
      precioFijo: Number(fila['precioFijo'] ?? fila['precio_fijo'] ?? 0),
      activo: Boolean(fila['activo'] ?? true),
      destacado: Boolean(fila['destacado'] ?? false),
    };
  }
}
