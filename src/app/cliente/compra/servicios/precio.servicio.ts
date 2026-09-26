import { Service, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, of, switchMap } from 'rxjs';

import { Desglose } from '../../../compartido/interfaces/compra.interfaz';
import { Cupon } from '../../../compartido/interfaces/cupon.interfaz';
import { calcularDesglose } from '../../../nucleo/dominio/calculo-precio';
import { AutenticacionServicio } from '../../../nucleo/servicios/autenticacion.servicio';
import { ConfiguracionServicio } from '../../../compartido/servicios/configuracion.servicio';
import { CreditoServicio } from '../../../compartido/servicios/credito.servicio';
import { CarritoServicio } from './carrito.servicio';

/**
 * Desglose de la compra en curso (§9, §15, §19).
 *
 * Envuelve la función pura `calcularDesglose` y la conecta con el carrito, el
 * usuario, el cupón elegido y el crédito disponible. El cálculo en sí vive en
 * `nucleo/dominio/calculo-precio.ts`, que es lo que permite testearlo sin
 * montar un componente.
 */
@Service()
export class PrecioServicio {
  private readonly carrito = inject(CarritoServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly configuracion = inject(ConfiguracionServicio);
  private readonly credito = inject(CreditoServicio);

  private readonly cupon = new BehaviorSubject<Cupon | null>(null);
  private readonly creditoSolicitado = new BehaviorSubject<number>(0);

  readonly cupon$ = this.cupon.asObservable();
  readonly creditoSolicitado$ = this.creditoSolicitado.asObservable();

  /** Saldo de crédito del usuario, o 0 si es anónimo. */
  readonly creditoDisponible$: Observable<number> = this.auth.usuarioActual$.pipe(
    switchMap((usuario) => (usuario ? this.credito.saldo(usuario.id) : of(0))),
  );

  /** Se recalcula solo cuando cambia alguna de sus entradas. */
  readonly desglose$: Observable<Desglose> = combineLatest([
    this.carrito.items$,
    this.auth.usuarioActual$,
    this.configuracion.obtener(),
    this.cupon$,
    this.creditoSolicitado$,
    this.creditoDisponible$,
  ]).pipe(
    map(([items, usuario, configuracion, cupon, creditoSolicitado, creditoDisponible]) =>
      calcularDesglose({
        items,
        configuracion,
        usuario,
        cupon,
        creditoSolicitado,
        creditoDisponible,
      }),
    ),
  );

  aplicarCupon(cupon: Cupon | null): void {
    this.cupon.next(cupon);
  }

  aplicarCredito(monto: number): void {
    this.creditoSolicitado.next(Math.max(0, monto));
  }

  /** Se llama al confirmar o al vaciar el carrito. */
  reiniciar(): void {
    this.cupon.next(null);
    this.creditoSolicitado.next(0);
  }

  get codigoCuponAplicado(): string | null {
    return this.cupon.value?.codigo ?? null;
  }
}
