import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';

import { Combo } from '../../../../compartido/interfaces/combo.interfaz';
import { ComboServicio } from '../../../../compartido/servicios/combo.servicio';
import { GeneroServicio } from '../../../../compartido/servicios/genero.servicio';
import { PeliculaServicio } from '../../../../compartido/servicios/pelicula.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { CarritoServicio } from '../../../compra/servicios/carrito.servicio';
import { CargandoComponente } from '../../../../compartido/componentes/cargando/cargando.componente';
import { BuscadorComponente } from '../buscador/buscador.componente';
import { CarteleraComponente } from '../cartelera/cartelera.componente';
import { CombosDestacadosComponente } from '../combos-destacados/combos-destacados.componente';
import { FiltroGenerosComponente } from '../filtro-generos/filtro-generos.componente';
import { MasVendidasComponente } from '../mas-vendidas/mas-vendidas.componente';

/**
 * Página principal (§3 de la consigna).
 *
 * Contenedor: inyecta los servicios y reparte los datos a los componentes de
 * presentación por `@Input()`. Las 3 más vendidas van primero, después la
 * cartelera con buscador y filtro, y al final los combos destacados.
 */
@Component({
  selector: 'app-inicio',
  imports: [
    RouterLink,
    CargandoComponente,
    BuscadorComponente,
    CarteleraComponente,
    CombosDestacadosComponente,
    FiltroGenerosComponente,
    MasVendidasComponente,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inicio.componente.html',
  styleUrl: './inicio.componente.scss',
})
export class InicioComponente {
  private readonly peliculas = inject(PeliculaServicio);
  private readonly generos = inject(GeneroServicio);
  private readonly combos = inject(ComboServicio);
  private readonly carrito = inject(CarritoServicio);
  private readonly avisos = inject(NotificacionServicio);
  private readonly router = inject(Router);

  /** Valor por defecto para el pipe async: las plantillas no pueden usar `new`. */
  protected readonly sinGeneros = signal(new Map<string, string>());

  protected readonly masVendidas = toSignal(this.peliculas.masVendidas(), {
    initialValue: [],
  });
  protected readonly cartelera = toSignal(this.peliculas.carteleraFiltrada(), {
    initialValue: [],
  });
  protected readonly generosActivos = toSignal(this.generos.activos(), {
    initialValue: [],
  });
  protected readonly nombresGenero = toSignal(this.generos.nombresPorId(), {
    initialValue: this.sinGeneros(),
  });
  protected readonly combosDestacados = toSignal(this.combos.destacados(), {
    initialValue: [],
  });
  protected readonly seleccionados = toSignal(this.peliculas.generosSeleccionados$, {
    initialValue: [],
  });

  /** `true` cuando hay búsqueda o filtro activos: oculta el podio de más vendidas. */
  protected readonly hayFiltro = toSignal(
    combineLatest([
    this.peliculas.texto$,
    this.peliculas.generosSeleccionados$,
    ]).pipe(map(([texto, generos]) => texto.trim().length > 0 || generos.length > 0)),
    { initialValue: false },
  );

  protected buscar(texto: string): void {
    this.peliculas.buscar(texto);
  }

  protected filtrar(ids: string[]): void {
    this.peliculas.filtrarPorGeneros(ids);
  }

  protected verDetalle(id: string): void {
    void this.router.navigate(['/pelicula', id]);
  }

  protected agregarCombo(combo: Combo): void {
    this.carrito.agregarCombo(combo);
    this.avisos.mostrar(`${combo.nombre} agregado al carrito.`, 'exito');
  }
}
