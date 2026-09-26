import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AutenticacionServicio } from '../../../nucleo/servicios/autenticacion.servicio';

interface EntradaMenu {
  ruta: string;
  etiqueta: string;
  grupo: string;
}

/**
 * Layout del panel de administración (§22: interfaces diferenciadas por rol).
 *
 * Tablas densas y navegación lateral, en contraste con el catálogo visual del
 * cliente y la pantalla de un solo propósito del empleado.
 */
@Component({
  selector: 'app-panel-administrador',
  imports: [AsyncPipe, RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-administrador.componente.html',
  styleUrl: './panel-administrador.componente.scss',
})
export class PanelAdministradorComponente {
  private readonly auth = inject(AutenticacionServicio);

  protected readonly usuario$ = this.auth.usuarioActual$;

  protected readonly menu: EntradaMenu[] = [
    { grupo: 'Análisis', ruta: 'reportes', etiqueta: 'Reportes' },
    { grupo: 'Análisis', ruta: 'graficos', etiqueta: 'Gráficos' },
    { grupo: 'Análisis', ruta: 'log', etiqueta: 'Log de actividad' },

    { grupo: 'Programación', ruta: 'peliculas', etiqueta: 'Películas' },
    { grupo: 'Programación', ruta: 'generos', etiqueta: 'Géneros' },
    { grupo: 'Programación', ruta: 'funciones', etiqueta: 'Funciones' },
    { grupo: 'Programación', ruta: 'salas', etiqueta: 'Salas' },
    { grupo: 'Programación', ruta: 'butacas', etiqueta: 'Butacas' },

    { grupo: 'Candy Bar', ruta: 'categorias', etiqueta: 'Categorías' },
    { grupo: 'Candy Bar', ruta: 'productos', etiqueta: 'Productos' },
    { grupo: 'Candy Bar', ruta: 'combos', etiqueta: 'Combos' },

    { grupo: 'Promociones', ruta: 'cupones', etiqueta: 'Cupones' },
    { grupo: 'Promociones', ruta: 'descuentos', etiqueta: 'Descuentos' },
    { grupo: 'Promociones', ruta: 'puntos', etiqueta: 'Puntos y recompensas' },
    { grupo: 'Promociones', ruta: 'preventa', etiqueta: 'Preventa' },
  ];

  /** Agrupa el menú conservando el orden de declaración. */
  protected get grupos(): { nombre: string; entradas: EntradaMenu[] }[] {
    const porGrupo = new Map<string, EntradaMenu[]>();
    for (const entrada of this.menu) {
      porGrupo.set(entrada.grupo, [...(porGrupo.get(entrada.grupo) ?? []), entrada]);
    }
    return [...porGrupo.entries()].map(([nombre, entradas]) => ({ nombre, entradas }));
  }
}
