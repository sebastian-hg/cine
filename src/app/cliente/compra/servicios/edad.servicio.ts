import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ClasificacionEdad } from '../../../compartido/interfaces/pelicula.interfaz';
import {
  ResultadoEdad,
  evaluarFechaNacimiento,
  requiereVerificacion,
} from '../../../nucleo/dominio/restriccion-edad';
import { AutenticacionServicio } from '../../../nucleo/servicios/autenticacion.servicio';

/** Fecha de nacimiento declarada por un visitante anónimo, dentro de la sesión. */
const CLAVE_EDAD_DECLARADA = 'cine.edadDeclarada';

/**
 * Restricción por edad (§7 de la consigna).
 *
 * Para el usuario registrado la edad sale del perfil. Para el anónimo no hay
 * identidad que consultar, así que se le pide una declaración jurada que vive
 * en `sessionStorage`: se le pregunta una vez por sesión, no en cada compra.
 */
@Service()
export class EdadServicio {
  private readonly auth = inject(AutenticacionServicio);

  /** ¿Hay que preguntar la edad antes de dejar comprar? */
  necesitaDeclaracion(clasificacion: ClasificacionEdad): boolean {
    if (!requiereVerificacion(clasificacion)) return false;
    if (this.auth.usuarioActual) return false;
    return this.fechaDeclarada() === null;
  }

  /** Evalúa con los datos que haya: perfil si hay sesión, declaración si no. */
  evaluar(clasificacion: ClasificacionEdad): ResultadoEdad | null {
    const fecha = this.auth.usuarioActual?.fechaNacimiento ?? this.fechaDeclarada();
    if (!fecha) return null;
    return evaluarFechaNacimiento(fecha, clasificacion);
  }

  evaluar$(clasificacion: ClasificacionEdad): Observable<ResultadoEdad | null> {
    return this.auth.usuarioActual$.pipe(map(() => this.evaluar(clasificacion)));
  }

  declarar(fechaNacimiento: string): void {
    try {
      sessionStorage.setItem(CLAVE_EDAD_DECLARADA, fechaNacimiento);
    } catch {
      // Sin sessionStorage se volverá a preguntar; es molesto, no incorrecto.
    }
  }

  fechaDeclarada(): string | null {
    try {
      return sessionStorage.getItem(CLAVE_EDAD_DECLARADA);
    } catch {
      return null;
    }
  }

  olvidar(): void {
    try {
      sessionStorage.removeItem(CLAVE_EDAD_DECLARADA);
    } catch {
      // Nada que limpiar.
    }
  }
}
