import { Service } from '@angular/core';
import { Observable, delay, of, switchMap, throwError } from 'rxjs';

export interface DatosPago {
  titular: string;
  numero: string;
  vencimiento: string;
  codigoSeguridad: string;
}

export interface ResultadoPago {
  aprobado: true;
  referencia: string;
}

/** Demora simulada de la pasarela, para que el estado de carga se note. */
const DEMORA_PASARELA_MS = 900;

/**
 * Pasarela de pago (§26: «proteger operaciones de pago») — MOCKEADA.
 *
 * TODO: contra un proveedor real, el frontend nunca ve el número de tarjeta
 * completo: se tokeniza en el SDK del proveedor y acá solo viaja el token. El
 * importe a cobrar tampoco lo manda el cliente, lo recalcula el backend a
 * partir del carrito.
 */
@Service()
export class PagoServicio {
  /** Aprueba salvo que la tarjeta termine en 0000, para poder probar el fallo. */
  cobrar(datos: DatosPago, monto: number): Observable<ResultadoPago> {
    return of(null).pipe(
      delay(DEMORA_PASARELA_MS),
      switchMap(() => {
        if (monto <= 0) {
          return of({ aprobado: true as const, referencia: 'SIN-CARGO' });
        }
        if (datos.numero.replace(/\s/g, '').endsWith('0000')) {
          return throwError(
            () => new Error('La tarjeta fue rechazada. Probá con otro medio de pago.'),
          );
        }
        return of({
          aprobado: true as const,
          referencia: `PAGO-${Date.now().toString(36).toUpperCase()}`,
        });
      }),
    );
  }
}
