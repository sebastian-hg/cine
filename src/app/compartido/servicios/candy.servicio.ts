import { Service, inject } from '@angular/core';
import { Observable, forkJoin, from, map, mergeMap, throwError } from 'rxjs';

import { CategoriaCandy } from '../interfaces/categoria.interfaz';
import { Producto } from '../interfaces/producto.interfaz';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/** Categoría con sus productos, que es como lo consume el catálogo. */
export interface CategoriaConProductos extends CategoriaCandy {
  productos: Producto[];
}

/**
 * Candy Bar (§10 de la consigna).
 *
 * TODO Supabase: `from('productos').select('*, categorias(*)').eq('activo', true)`.
 * Storage: `imagen` apunta al bucket público `productos`.
 * El descuento de stock debe ser una RPC atómica, no un UPDATE desde el cliente.
 */
@Service()
export class CandyServicio {
  private readonly supabase = inject(SupabaseServicio);

  categorias(): Observable<CategoriaCandy[]> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.consultar((base) => base.categorias.filter((c) => c.activa));
    }

    return from(
      cliente
        .from('categorias_candy')
        .select('*')
        .eq('activa', true)
        .order('nombre', { ascending: true }),
    ).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));
        return this.supabase.inmediato((data ?? []).map((fila) => this.mapearCategoria(fila)));
      }),
    );
  }

  productos(): Observable<Producto[]> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.consultar((base) => base.productos.filter((p) => p.activo));
    }

    return from(cliente.from('productos_candy').select('*').eq('activo', true).order('nombre')).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));
        return this.supabase.inmediato((data ?? []).map((fila) => this.mapearProducto(fila)));
      }),
    );
  }

  /** Todos los productos, incluidos los desactivados. Para el panel admin. */
  todosLosProductos(): Observable<Producto[]> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.consultar((base) => [...base.productos]);
    }

    return from(cliente.from('productos_candy').select('*').order('nombre')).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));
        return this.supabase.inmediato((data ?? []).map((fila) => this.mapearProducto(fila)));
      }),
    );
  }

  /** Catálogo agrupado, listo para renderizar por secciones. */
  catalogo(): Observable<CategoriaConProductos[]> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.consultar((base) =>
        base.categorias
          .filter((categoria) => categoria.activa)
          .map((categoria) => ({
            ...categoria,
            productos: base.productos.filter((p) => p.activo && p.idCategoria === categoria.id),
          }))
          .filter((categoria) => categoria.productos.length > 0),
      );
    }

    return this.categorias().pipe(
      mergeMap((categorias) =>
        this.productos().pipe(
          map((productos) =>
            categorias
              .map((categoria) => ({
                ...categoria,
                productos: productos.filter((p) => p.idCategoria === categoria.id),
              }))
              .filter((categoria) => categoria.productos.length > 0),
          ),
        ),
      ),
    );
  }

  obtener(id: string): Observable<Producto | null> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.consultar((base) => base.productos.find((p) => p.id === id) ?? null);
    }

    return from(cliente.from('productos_candy').select('*').eq('id', id).maybeSingle()).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));
        return this.supabase.inmediato(data ? this.mapearProducto(data) : null);
      }),
    );
  }

  /** Descuenta stock al confirmar una compra. */
  descontarStock(unidadesPorProducto: Map<string, number>): Observable<void> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        for (const [idProducto, unidades] of unidadesPorProducto) {
          const producto = base.productos.find((p) => p.id === idProducto);
          if (producto) {
            producto.stock = Math.max(0, producto.stock - unidades);
          }
        }
      });
    }

    return this.ajustarStockRemoto(unidadesPorProducto, -1);
  }

  /** Devuelve stock al cancelar una compra (§19). */
  reponerStock(unidadesPorProducto: Map<string, number>): Observable<void> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        for (const [idProducto, unidades] of unidadesPorProducto) {
          const producto = base.productos.find((p) => p.id === idProducto);
          if (producto) {
            producto.stock += unidades;
          }
        }
      });
    }

    return this.ajustarStockRemoto(unidadesPorProducto, 1);
  }

  crearCategoria(nombre: string): Observable<CategoriaCandy> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        const categoria: CategoriaCandy = { id: this.supabase.nuevoId('c'), nombre, activa: true };
        base.categorias.push(categoria);
        return categoria;
      });
    }

    return from(
      cliente
        .from('categorias_candy')
        .insert({ nombre: nombre.trim(), activa: true })
        .select('*')
        .single(),
    ).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));
        return this.supabase.inmediato(this.mapearCategoria(data));
      }),
    );
  }

  crearProducto(datos: Omit<Producto, 'id'>): Observable<Producto> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        const producto: Producto = { ...datos, id: this.supabase.nuevoId('pr') };
        base.productos.push(producto);
        return producto;
      });
    }

    const fila = {
      idCategoria: datos.idCategoria,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      imagen: datos.imagen,
      precio: datos.precio,
      stock: datos.stock,
      activo: datos.activo,
    };

    return from(cliente.from('productos_candy').insert(fila).select('*').single()).pipe(
      mergeMap(({ data, error }) => {
        if (error) return throwError(() => new Error(error.message));
        return this.supabase.inmediato(this.mapearProducto(data));
      }),
    );
  }

  actualizarProducto(id: string, cambios: Partial<Omit<Producto, 'id'>>): Observable<void> {
    const cliente = this.supabase.cliente;
    if (!cliente) {
      return this.supabase.transaccion((base) => {
        const producto = base.productos.find((p) => p.id === id);
        if (producto) Object.assign(producto, cambios);
      });
    }

    const fila: Record<string, unknown> = {};
    if (cambios.idCategoria !== undefined) fila['idCategoria'] = cambios.idCategoria;
    if (cambios.nombre !== undefined) fila['nombre'] = cambios.nombre;
    if (cambios.descripcion !== undefined) fila['descripcion'] = cambios.descripcion;
    if (cambios.imagen !== undefined) fila['imagen'] = cambios.imagen;
    if (cambios.precio !== undefined) fila['precio'] = cambios.precio;
    if (cambios.stock !== undefined) fila['stock'] = cambios.stock;
    if (cambios.activo !== undefined) fila['activo'] = cambios.activo;

    return from(cliente.from('productos_candy').update(fila).eq('id', id)).pipe(
      mergeMap(({ error }) => {
        if (error) return throwError(() => new Error(error.message));
        return this.supabase.inmediato(undefined);
      }),
    );
  }

  /** §20: producto más vendido, para el gráfico del panel admin. */
  masVendidos(): Observable<{ nombre: string; unidades: number }[]> {
    return this.supabase.consultar((base) => {
      const unidadesPorProducto = new Map<string, number>();

      for (const compra of base.compras.filter((c) => c.estado !== 'cancelada')) {
        for (const item of compra.items) {
          if (item.tipo !== 'producto') continue;
          unidadesPorProducto.set(
            item.idProducto,
            (unidadesPorProducto.get(item.idProducto) ?? 0) + item.cantidad,
          );
        }
      }

      return [...unidadesPorProducto.entries()]
        .map(([id, unidades]) => ({
          nombre: base.productos.find((p) => p.id === id)?.nombre ?? id,
          unidades,
        }))
        .sort((a, b) => b.unidades - a.unidades);
    });
  }

  private ajustarStockRemoto(unidadesPorProducto: Map<string, number>, signo: -1 | 1): Observable<void> {
    const cliente = this.supabase.cliente;
    if (!cliente || unidadesPorProducto.size === 0) return this.supabase.inmediato(undefined);

    const tareas = [...unidadesPorProducto.entries()].map(([idProducto, unidades]) =>
      from(cliente.from('productos_candy').select('stock').eq('id', idProducto).single()).pipe(
        mergeMap(({ data, error }) => {
          if (error) return throwError(() => new Error(error.message));

          const stockActual = Number((data as { stock?: number } | null)?.stock ?? 0);
          const nuevoStock = signo < 0 ? Math.max(0, stockActual - unidades) : stockActual + unidades;

          return from(cliente.from('productos_candy').update({ stock: nuevoStock }).eq('id', idProducto)).pipe(
            mergeMap(({ error: errorActualizar }) => {
              if (errorActualizar) return throwError(() => new Error(errorActualizar.message));
              return this.supabase.inmediato(undefined);
            }),
          );
        }),
      ),
    );

    return forkJoin(tareas).pipe(map(() => undefined));
  }

  private mapearCategoria(fila: Record<string, unknown>): CategoriaCandy {
    return {
      id: String(fila['id'] ?? ''),
      nombre: String(fila['nombre'] ?? ''),
      activa: Boolean(fila['activa'] ?? true),
    };
  }

  private mapearProducto(fila: Record<string, unknown>): Producto {
    return {
      id: String(fila['id'] ?? ''),
      idCategoria: String(fila['idCategoria'] ?? fila['id_categoria'] ?? ''),
      nombre: String(fila['nombre'] ?? ''),
      descripcion: String(fila['descripcion'] ?? ''),
      imagen: String(fila['imagen'] ?? ''),
      precio: Number(fila['precio'] ?? 0),
      stock: Number(fila['stock'] ?? 0),
      activo: Boolean(fila['activo'] ?? true),
    };
  }
}
