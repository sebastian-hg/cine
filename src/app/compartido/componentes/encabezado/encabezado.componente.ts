import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Usuario } from '../../interfaces/usuario.interfaz';







@Component({
  selector: 'app-encabezado',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './encabezado.componente.html',
  styleUrl: './encabezado.componente.scss',
})
export class EncabezadoComponente {
  readonly usuario = input<Usuario | null>(null);
  readonly itemsCarrito = input<number>(0);

  readonly cerrarSesion = output<void>();
}
