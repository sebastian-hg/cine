import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

import { AvisosComponente } from './compartido/componentes/avisos/avisos.componente';
import { EncabezadoComponente } from './compartido/componentes/encabezado/encabezado.componente';
import { PieComponente } from './compartido/componentes/pie/pie.componente';
import { AutenticacionServicio } from './nucleo/servicios/autenticacion.servicio';
import { CargaServicio } from './nucleo/servicios/carga.servicio';
import { CarritoServicio } from './cliente/compra/servicios/carrito.servicio';

/**
 * Cascarón de la aplicación: encabezado, contenido enrutado, pie y avisos.
 *
 * Es el único componente que inyecta autenticación y carrito para pasárselos al
 * encabezado por `@Input()`; así el encabezado se puede probar aislado.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AsyncPipe, EncabezadoComponente, PieComponente, AvisosComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.componente.html',
  styleUrl: './app.componente.scss',
})
export class App {
  private readonly auth = inject(AutenticacionServicio);
  private readonly router = inject(Router);
  private readonly carrito = inject(CarritoServicio);

  protected readonly cargando = inject(CargaServicio);
  protected readonly usuario$ = this.auth.usuarioActual$;
  protected readonly itemsCarrito$ = this.carrito.cantidad$;

  protected alCerrarSesion(): void {
    this.auth.salir();
    void this.router.navigate(['/']);
  }
}
