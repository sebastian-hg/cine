import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Cupon } from '../interfaces/cupon.interfaz';
import { Usuario } from '../interfaces/usuario.interfaz';
import { EDAD_CUPON_MAYORES } from '../../nucleo/dominio/calculo-precio';
import { calcularEdad } from '../../nucleo/dominio/fechas';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

export type ValidacionCupon =
  | { valido: true; cupon: Cupon }
  | { valido: false; motivo: string };

/**
 * Cupones y sus condiciones (§9 de la consigna).
 *
 * TODO Supabase: la validación tiene que correr en el servidor. §26 lo dice
 * expresamente: los descuentos no se validan únicamente en Angular. Acá se
 * valida para dar respuesta inmediata, pero una RPC `aplicar_cupon` debe
 * repetir el chequeo y registrar el uso de forma atómica.
 */
@Service()
export class CuponServicio {
  private readonly supabase = inject(SupabaseServicio);

  listar(): Observable<Cupon[]> {
    return this.supabase.consultar((base) => [...base.cupones]);
  }

  /** Valida un código contra sus condiciones y el historial del usuario. */
  validar(codigo: string, usuario: Usuario | null): Observable<ValidacionCupon> {
    return this.supabase.consultar((base) => {
      const buscado = codigo.trim().toUpperCase();
      const cupon = base.cupones.find((c) => c.codigo.toUpperCase() === buscado);

      if (!cupon) {
        return { valido: false as const, motivo: 'Ese código no existe.' };
      }

      if (!cupon.activo) {
        return { valido: false as const, motivo: 'Ese cupón ya no está vigente.' };
      }

      if (cupon.tipo !== 'generico' && !usuario) {
        return {
          valido: false as const,
          motivo: 'Necesitás iniciar sesión para usar este cupón.',
        };
      }

      if (cupon.tipo === 'primera-compra' && usuario?.primeraCompraUsada) {
        return { valido: false as const, motivo: 'Este cupón es solo para la primera compra.' };
      }

      if (
        cupon.tipo === 'mayores-50' &&
        usuario &&
        calcularEdad(usuario.fechaNacimiento) < EDAD_CUPON_MAYORES
      ) {
        return {
          valido: false as const,
          motivo: `Este cupón es para mayores de ${EDAD_CUPON_MAYORES} años.`,
        };
      }

      // §9: evitar la utilización repetida.
      if (usuario && cupon.usosPorUsuario > 0) {
        const usados = base.cuponesUsados.get(usuario.id);
        if (usados?.has(cupon.codigo)) {
          return { valido: false as const, motivo: 'Ya usaste este cupón.' };
        }
      }

      return { valido: true as const, cupon };
    });
  }

  /** Marca el cupón como usado al confirmar la compra. */
  registrarUso(codigo: string, idUsuario: string): Observable<void> {
    return this.supabase.transaccion((base) => {
      const usados = base.cuponesUsados.get(idUsuario) ?? new Set<string>();
      usados.add(codigo);
      base.cuponesUsados.set(idUsuario, usados);
    });
  }

  crear(datos: Omit<Cupon, 'id'>): Observable<Cupon> {
    return this.supabase.transaccion((base) => {
      const cupon: Cupon = { ...datos, id: this.supabase.nuevoId('cu') };
      base.cupones.push(cupon);
      return cupon;
    });
  }

  actualizar(id: string, cambios: Partial<Omit<Cupon, 'id'>>): Observable<void> {
    return this.supabase.transaccion((base) => {
      const cupon = base.cupones.find((c) => c.id === id);
      if (cupon) Object.assign(cupon, cambios);
    });
  }
}
