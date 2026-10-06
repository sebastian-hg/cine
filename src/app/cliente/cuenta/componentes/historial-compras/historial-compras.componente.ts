import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, map, of, switchMap, take } from 'rxjs';

import { CompraDetallada, CompraServicio } from '../../../../compartido/servicios/compra.servicio';
import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { DialogoConfirmacionComponente } from '../../../../compartido/componentes/dialogo-confirmacion/dialogo-confirmacion.componente';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { TarjetaCompraComponente } from '../tarjeta-compra/tarjeta-compra.componente';







@Component({
  selector: 'app-historial-compras',
  imports: [
    RouterLink,
    TarjetaCompraComponente,
    DialogoConfirmacionComponente,
    PipeMonedaArs,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial-compras.componente.html',
})
export class HistorialComprasComponente {
  private readonly compras = inject(CompraServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly recargar = new BehaviorSubject<void>(undefined);

  private readonly compras$ = this.recargar.pipe(
    switchMap(() => this.auth.usuarioActual$),
    switchMap((usuario) =>
      usuario ? this.compras.deUsuario(usuario.id) : of<CompraDetallada[]>([]),
    ),
  );

  protected readonly comprasLista = toSignal<CompraDetallada[], CompraDetallada[]>(this.compras$, {
    initialValue: [],
  });

  protected readonly resumenEstados = toSignal(
    this.compras$.pipe(
      map((compras) => {
        const resumen = { total: compras.length, pagadas: 0, usadas: 0, canceladas: 0 };

        for (const compra of compras) {
          if (compra.estado === 'pagada') resumen.pagadas += 1;
          if (compra.estado === 'usada') resumen.usadas += 1;
          if (compra.estado === 'cancelada') resumen.canceladas += 1;
        }

        return resumen;
      }),
    ),
    {
      initialValue: { total: 0, pagadas: 0, usadas: 0, canceladas: 0 },
    },
  );

  protected readonly porCancelar = signal<CompraDetallada | null>(null);

  protected pedirConfirmacion(compra: CompraDetallada): void {
    this.porCancelar.set(compra);
  }

  protected confirmarCancelacion(): void {
    const compra = this.porCancelar();
    if (!compra) return;

    this.compras
      .cancelar(compra.id)
      .pipe(take(1))
      .subscribe({
        next: (credito) => {
          this.porCancelar.set(null);
          this.avisos.mostrar(
            `Compra cancelada. Te acreditamos ${this.pesos(credito)} para tu próxima compra.`,
            'exito',
          );
          this.recargar.next();
        },
        error: (error: Error) => {
          this.porCancelar.set(null);
          this.avisos.mostrar(error.message, 'error');
        },
      });
  }

  protected cerrarDialogo(): void {
    this.porCancelar.set(null);
  }

  private pesos(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(monto);
  }
}
