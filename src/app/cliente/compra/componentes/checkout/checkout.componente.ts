import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, take } from 'rxjs';

import { Cupon } from '../../../../compartido/interfaces/cupon.interfaz';
import { CompraServicio } from '../../../../compartido/servicios/compra.servicio';
import { CuponServicio } from '../../../../compartido/servicios/cupon.servicio';
import { ButacaNoDisponibleError } from '../../../../compartido/servicios/butaca.servicio';
import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { CarritoServicio } from '../../servicios/carrito.servicio';
import { DatosPago, PagoServicio } from '../../servicios/pago.servicio';
import { PrecioServicio } from '../../servicios/precio.servicio';
import { AplicarCreditoComponente } from '../aplicar-credito/aplicar-credito.componente';
import { FormularioCuponComponente } from '../formulario-cupon/formulario-cupon.componente';
import { FormularioPagoComponente } from '../formulario-pago/formulario-pago.componente';
import { ResumenTotalesComponente } from '../resumen-totales/resumen-totales.componente';

/**
 * Confirmación de compra (§9, §12, §15, §19).
 *
 * Orquesta cupón, crédito, pago y generación del QR. El orden importa: primero
 * se cobra, y recién después `CompraServicio` intenta reservar las butacas. Si
 * la reserva falla por concurrencia, se avisa y se vuelve al mapa sin dejar la
 * compra a medias.
 */
@Component({
  selector: 'app-checkout',
  imports: [
    AsyncPipe,
    RouterLink,
    AplicarCreditoComponente,
    FormularioCuponComponente,
    FormularioPagoComponente,
    ResumenTotalesComponente,
    PipeMonedaArs,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.componente.html',
  styleUrl: './checkout.componente.scss',
})
export class CheckoutComponente {
  private readonly carrito = inject(CarritoServicio);
  private readonly precio = inject(PrecioServicio);
  private readonly cupones = inject(CuponServicio);
  private readonly pago = inject(PagoServicio);
  private readonly compras = inject(CompraServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly avisos = inject(NotificacionServicio);
  private readonly router = inject(Router);

  protected readonly items$ = this.carrito.items$;
  protected readonly desglose$ = this.precio.desglose$;
  protected readonly usuario$ = this.auth.usuarioActual$;
  protected readonly creditoDisponible$ = this.precio.creditoDisponible$;

  protected readonly desglose = toSignal(this.precio.desglose$);
  protected readonly creditoDisponible = toSignal(this.precio.creditoDisponible$, {
    initialValue: 0,
  });
  protected readonly cuponAplicado = toSignal(this.precio.cupon$, { initialValue: null });
  protected readonly creditoAplicado = toSignal(this.precio.creditoSolicitado$, {
    initialValue: 0,
  });

  protected readonly errorCupon = signal<string | null>(null);
  protected readonly procesando = signal(false);

  protected aplicarCupon(codigo: string): void {
    this.cupones
      .validar(codigo, this.auth.usuarioActual)
      .pipe(take(1))
      .subscribe((resultado) => {
        if (resultado.valido) {
          this.errorCupon.set(null);
          this.precio.aplicarCupon(resultado.cupon);
          this.avisos.mostrar(`Cupón ${resultado.cupon.codigo} aplicado.`, 'exito');
        } else {
          this.errorCupon.set(resultado.motivo);
          this.precio.aplicarCupon(null);
        }
      });
  }

  protected quitarCupon(): void {
    this.precio.aplicarCupon(null);
    this.errorCupon.set(null);
  }

  protected aplicarCredito(monto: number): void {
    this.precio.aplicarCredito(monto);
  }

  protected confirmar(datos: DatosPago): void {
    const desglose = this.desglose();
    if (!desglose || this.procesando()) return;

    this.procesando.set(true);

    this.pago
      .cobrar(datos, desglose.aPagar)
      .pipe(
        switchMap(() =>
          this.compras.confirmar({
            items: [...this.carrito.actual.items],
            desglose,
            idFuncion: this.carrito.idFuncion,
            codigoCupon: this.precio.codigoCuponAplicado,
          }),
        ),
        take(1),
      )
      .subscribe({
        next: (compra) => {
          this.carrito.vaciar();
          this.precio.reiniciar();
          this.procesando.set(false);
          void this.router.navigate(['/compra/entrada', compra.id]);
        },
        error: (error: Error) => {
          this.procesando.set(false);

          // §6: si otro usuario se quedó con la butaca, se vuelve al mapa.
          if (error instanceof ButacaNoDisponibleError) {
            this.avisos.mostrar(error.message, 'error');
            const idFuncion = this.carrito.idFuncion;
            if (idFuncion) void this.router.navigate(['/butacas', idFuncion]);
            return;
          }

          this.avisos.mostrar(error.message, 'error');
        },
      });
  }

  protected readonly cuponActual = (): Cupon | null => this.cuponAplicado();
}
