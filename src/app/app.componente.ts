import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';

import { AvisosComponente } from './compartido/componentes/avisos/avisos.componente';
import { EncabezadoComponente } from './compartido/componentes/encabezado/encabezado.componente';
import { PieComponente } from './compartido/componentes/pie/pie.componente';
import { AutenticacionServicio } from './nucleo/servicios/autenticacion.servicio';
import { CargaServicio } from './nucleo/servicios/carga.servicio';
import { CarritoServicio } from './cliente/compra/servicios/carrito.servicio';







@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EncabezadoComponente, PieComponente, AvisosComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.componente.html',
  styleUrl: './app.componente.scss',
})
export class App {
  private readonly auth = inject(AutenticacionServicio);
  private readonly router = inject(Router);
  private readonly carrito = inject(CarritoServicio);

  protected readonly cargando = inject(CargaServicio);
  protected readonly usuario = toSignal(this.auth.usuarioActual$, {
    initialValue: this.auth.usuarioActual,
  });
  protected readonly itemsCarrito = toSignal(this.carrito.cantidad$, {
    initialValue: 0,
  });
  protected readonly estaCargando = toSignal(this.cargando.cargando$, {
    initialValue: false,
  });

  protected alCerrarSesion(): void {
    this.auth.salir();
    void this.router.navigate(['/']);
  }
}
