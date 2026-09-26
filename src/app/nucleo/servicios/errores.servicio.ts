import { Service } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ErrorApp {
  mensaje: string;
  /** Detalle técnico; solo se muestra en desarrollo. */
  detalle?: string;
  momento: Date;
}

/**
 * Manejo centralizado de errores (§23 de la consigna).
 *
 * Es el único lugar donde se decide qué ve el usuario cuando algo falla.
 * Lo alimentan `InterceptorErrores` (fallos HTTP) y `ManejadorErroresGlobal`
 * (todo lo demás).
 */
@Service()
export class ErroresServicio {
  private readonly ultimo = new BehaviorSubject<ErrorApp | null>(null);

  readonly error$: Observable<ErrorApp | null> = this.ultimo.asObservable();

  reportar(mensaje: string, detalle?: string): void {
    this.ultimo.next({ mensaje, detalle, momento: new Date() });
  }

  limpiar(): void {
    this.ultimo.next(null);
  }

  /**
   * Traduce un error a un mensaje accionable en español.
   *
   * La consigna (§22) pide mensajes de error claros, así que nada de
   * «Error 400»: o sabemos qué pasó y lo decimos, o damos un texto genérico
   * que al menos indique qué hacer.
   */
  traducir(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
    return 'Algo salió mal. Volvé a intentarlo en unos segundos.';
  }
}
