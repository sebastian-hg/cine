import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, map, of, shareReplay, switchMap } from 'rxjs';

import { PeliculaConMetricas } from '../../../../compartido/interfaces/pelicula.interfaz';
import { Resena, ResumenResenas } from '../../../../compartido/interfaces/resena.interfaz';
import { ConfiguracionServicio } from '../../../../compartido/servicios/configuracion.servicio';
import { FuncionDetallada, FuncionServicio } from '../../../../compartido/servicios/funcion.servicio';
import { GeneroServicio } from '../../../../compartido/servicios/genero.servicio';
import { PeliculaServicio } from '../../../../compartido/servicios/pelicula.servicio';
import { ResenaServicio } from '../../../../compartido/servicios/resena.servicio';
import { estadoPreventa } from '../../../../nucleo/dominio/preventa';
import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { CargandoComponente } from '../../../../compartido/componentes/cargando/cargando.componente';
import { InsigniaClasificacionComponente } from '../../../../compartido/componentes/insignia-clasificacion/insignia-clasificacion.componente';
import { PipeDuracion } from '../../../../compartido/pipes/duracion.pipe';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { FormularioResenaComponente, ResenaEnviada } from '../formulario-resena/formulario-resena.componente';
import { ListadoFuncionesComponente } from '../listado-funciones/listado-funciones.componente';
import { ListadoResenasComponente } from '../listado-resenas/listado-resenas.componente';

/**
 * Detalle de película (§2 de la consigna).
 *
 * Muestra los doce datos que pide la sección: póster, nombre, sinopsis,
 * duración, géneros, clasificación, idioma y modalidad (de cada función),
 * puntuación promedio, reseñas, funciones disponibles e información de preventa.
 */
@Component({
  selector: 'app-detalle-pelicula',
  imports: [
    DatePipe,
    CargandoComponente,
    InsigniaClasificacionComponente,
    ListadoFuncionesComponente,
    ListadoResenasComponente,
    FormularioResenaComponente,
    PipeDuracion,
    PipeMonedaArs,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle-pelicula.componente.html',
  styleUrl: './detalle-pelicula.componente.scss',
})
export class DetallePeliculaComponente {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly peliculas = inject(PeliculaServicio);
  private readonly funcionesServicio = inject(FuncionServicio);
  private readonly generos = inject(GeneroServicio);
  private readonly resenasServicio = inject(ResenaServicio);
  private readonly configuracion = inject(ConfiguracionServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly avisos = inject(NotificacionServicio);
  private readonly actualizarResenas = new BehaviorSubject<void>(undefined);

  private readonly idPelicula$ = this.ruta.paramMap.pipe(
    map((parametros) => parametros.get('id') ?? ''),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly pelicula$: Observable<PeliculaConMetricas | null> = this.idPelicula$.pipe(
    switchMap((id) => this.peliculas.obtener(id)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly funciones$ = this.idPelicula$.pipe(
    switchMap((id) => this.funcionesServicio.dePelicula(id)),
  );

  private readonly resenas$ = combineLatest([this.idPelicula$, this.actualizarResenas]).pipe(
    switchMap(([id]) => this.resenasServicio.dePelicula(id)),
  );

  private readonly resumen$ = combineLatest([this.idPelicula$, this.actualizarResenas]).pipe(
    switchMap(([id]) => this.resenasServicio.resumen(id)),
  );

  private readonly puedeResenar$ = this.idPelicula$.pipe(
    switchMap((id) => this.resenasServicio.puedeResenar(id)),
  );

  /** Modalidades e idiomas realmente disponibles, que es lo que pide §2. */
  private readonly modalidades$ = this.funciones$.pipe(
    map((funciones) => [...new Set(funciones.map((f) => f.modalidad))].sort()),
  );

  private readonly idiomas$ = this.funciones$.pipe(
    map((funciones) => [...new Set(funciones.map((f) => f.idioma))]),
  );

  private readonly nombresGenero$ = combineLatest([this.pelicula$, this.generos.nombresPorId()]).pipe(
    map(([pelicula, nombres]) =>
      pelicula ? pelicula.generos.map((id) => nombres.get(id) ?? id) : [],
    ),
  );

  /** §16: estado de preventa de esta película. */
  private readonly preventa$ = combineLatest([this.pelicula$, this.configuracion.obtener()]).pipe(
    map(([pelicula, config]) =>
      pelicula ? estadoPreventa(pelicula, config.diasAnticipacionPreventa) : null,
    ),
  );

  private readonly motivoBloqueoResena$ = this.auth.usuarioActual$.pipe(
    map((usuario) =>
      usuario
        ? 'Vas a poder calificarla cuando hayas visto una función de esta película.'
        : 'Iniciá sesión y mirá la película para poder calificarla.',
    ),
  );

  protected readonly pelicula = toSignal<PeliculaConMetricas | null, PeliculaConMetricas | null>(this.pelicula$, {
    initialValue: null,
  });
  protected readonly funciones = toSignal<FuncionDetallada[], FuncionDetallada[]>(this.funciones$, {
    initialValue: [],
  });
  protected readonly resenas = toSignal<Resena[], Resena[]>(this.resenas$, {
    initialValue: [],
  });
  protected readonly resumen = toSignal<ResumenResenas, ResumenResenas>(this.resumen$, {
    initialValue: { promedio: 0, cantidad: 0 },
  });
  protected readonly puedeResenar = toSignal<boolean, boolean>(this.puedeResenar$, {
    initialValue: false,
  });
  protected readonly modalidades = toSignal<string[], string[]>(this.modalidades$, {
    initialValue: [],
  });
  protected readonly idiomas = toSignal<string[], string[]>(this.idiomas$, {
    initialValue: [],
  });
  protected readonly nombresGenero = toSignal<string[], string[]>(this.nombresGenero$, {
    initialValue: [],
  });
  protected readonly preventa = toSignal(this.preventa$, {
    initialValue: null,
  });
  protected readonly motivoBloqueoResena = toSignal<string, string>(this.motivoBloqueoResena$, {
    initialValue: this.auth.usuarioActual
      ? 'Vas a poder calificarla cuando hayas visto una función de esta película.'
      : 'Iniciá sesión y mirá la película para poder calificarla.',
  });

  protected irAButacas(funcion: FuncionDetallada): void {
    void this.router.navigate(['/butacas', funcion.id]);
  }

  protected publicarResena(idPelicula: string, resena: ResenaEnviada): void {
    this.resenasServicio.publicar(idPelicula, resena.estrellas, resena.comentario).subscribe({
      next: () => {
        this.avisos.mostrar('¡Gracias! Tu reseña ya está publicada.', 'exito');
        this.actualizarResenas.next();
      },
      error: (error: Error) => this.avisos.mostrar(error.message, 'error'),
    });
  }
}
