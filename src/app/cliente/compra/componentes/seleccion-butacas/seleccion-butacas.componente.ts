import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { ButacaFuncion } from '../../../../compartido/interfaces/butaca.interfaz';
import { ConfiguracionServicio } from '../../../../compartido/servicios/configuracion.servicio';
import { FuncionServicio } from '../../../../compartido/servicios/funcion.servicio';
import { PeliculaServicio } from '../../../../compartido/servicios/pelicula.servicio';
import { TiempoRealServicio } from '../../../../compartido/servicios/tiempo-real.servicio';
import { etiquetaButaca } from '../../../../nucleo/dominio/generador-butacas';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { CargandoComponente } from '../../../../compartido/componentes/cargando/cargando.componente';
import { InsigniaClasificacionComponente } from '../../../../compartido/componentes/insignia-clasificacion/insignia-clasificacion.componente';
import { PipeModalidad } from '../../../../compartido/pipes/modalidad.pipe';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { CarritoServicio } from '../../servicios/carrito.servicio';
import { EdadServicio } from '../../servicios/edad.servicio';
import { AvisoVipComponente } from '../aviso-vip/aviso-vip.componente';
import { MapaButacasComponente } from '../mapa-butacas/mapa-butacas.componente';
import { VerificacionEdadComponente } from '../verificacion-edad/verificacion-edad.componente';

/**
 * Selección de butacas (§6 y §7).
 *
 * Las butacas llegan por el stream de `TiempoRealServicio`, así que si otro
 * usuario ocupa una mientras miramos, el mapa se actualiza solo. La reserva
 * definitiva se hace al confirmar la compra, no acá: reservar al seleccionar
 * dejaría butacas bloqueadas por gente que nunca termina de comprar.
 */
@Component({
  selector: 'app-seleccion-butacas',
  imports: [
    AsyncPipe,
    DatePipe,
    RouterLink,
    CargandoComponente,
    InsigniaClasificacionComponente,
    MapaButacasComponente,
    AvisoVipComponente,
    VerificacionEdadComponente,
    PipeModalidad,
    PipeMonedaArs,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seleccion-butacas.componente.html',
  styleUrl: './seleccion-butacas.componente.scss',
})
export class SeleccionButacasComponente {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly funciones = inject(FuncionServicio);
  private readonly peliculas = inject(PeliculaServicio);
  private readonly tiempoReal = inject(TiempoRealServicio);
  private readonly carrito = inject(CarritoServicio);
  private readonly configuracion = inject(ConfiguracionServicio);
  private readonly edad = inject(EdadServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly idFuncion = this.ruta.snapshot.paramMap.get('idFuncion') ?? '';

  protected readonly funcion$ = this.funciones.obtener(this.idFuncion);

  protected readonly pelicula$ = this.funcion$.pipe(
    switchMap((funcion) => (funcion ? this.peliculas.obtener(funcion.idPelicula) : of(null))),
  );

  /** Stream en vivo: refleja lo que compran otros usuarios (§6). */
  protected readonly butacas = toSignal(this.tiempoReal.butacas$(this.idFuncion), {
    initialValue: [] as ButacaFuncion[],
  });

  private readonly config = toSignal(this.configuracion.obtener());

  protected readonly elegidas = signal<ButacaFuncion[]>([]);

  protected readonly idsElegidos = computed(() => this.elegidas().map((b) => b.id));

  protected readonly total = computed(() =>
    this.elegidas().reduce((suma, butaca) => suma + butaca.precio, 0),
  );

  protected readonly cantidadVip = computed(
    () => this.elegidas().filter((b) => b.tipo === 'vip').length,
  );

  /** Cuánto se paga de más por las VIP, para el aviso de §5. */
  protected readonly recargoVip = computed(() => {
    const multiplicador = this.config()?.multiplicadorVip ?? 1;
    if (multiplicador <= 1) return 0;

    return this.elegidas()
      .filter((b) => b.tipo === 'vip')
      .reduce((suma, butaca) => suma + (butaca.precio - butaca.precio / multiplicador), 0);
  });

  protected readonly etiquetas = computed(() =>
    this.elegidas()
      .map((b) => etiquetaButaca(b))
      .sort(),
  );

  protected readonly libres = computed(
    () => this.butacas().filter((b) => b.estado === 'libre').length,
  );

  /** §7: el modal de declaración de edad, solo si hace falta. */
  protected readonly pideEdad = signal(false);
  protected readonly clasificacionPendiente = signal<'ATP' | '+13' | '+18'>('ATP');

  /** Aviso de acompañante para menores en funciones +13. */
  protected readonly avisoEdad$ = this.pelicula$.pipe(
    map((pelicula) => {
      if (!pelicula) return null;
      const resultado = this.edad.evaluar(pelicula.clasificacion);
      return resultado?.permitido ? resultado.aviso : null;
    }),
  );

  protected readonly bloqueoEdad$ = this.pelicula$.pipe(
    map((pelicula) => {
      if (!pelicula) return null;
      const resultado = this.edad.evaluar(pelicula.clasificacion);
      return resultado && !resultado.permitido ? resultado.motivo : null;
    }),
  );

  protected alternarButaca(butaca: ButacaFuncion): void {
    if (butaca.estado !== 'libre') return;

    const actuales = this.elegidas();
    const yaEstaba = actuales.some((b) => b.id === butaca.id);

    this.elegidas.set(
      yaEstaba ? actuales.filter((b) => b.id !== butaca.id) : [...actuales, butaca],
    );
  }

  protected continuar(clasificacion: 'ATP' | '+13' | '+18', idPelicula: string): void {
    if (this.elegidas().length === 0) return;

    // §7: al visitante anónimo se le pide la edad antes de seguir.
    if (this.edad.necesitaDeclaracion(clasificacion)) {
      this.clasificacionPendiente.set(clasificacion);
      this.pideEdad.set(true);
      return;
    }

    const resultado = this.edad.evaluar(clasificacion);
    if (resultado && !resultado.permitido) {
      this.avisos.mostrar(resultado.motivo, 'error');
      void this.router.navigate(['/pelicula', idPelicula]);
      return;
    }

    this.carrito.fijarEntradas(this.idFuncion, this.elegidas());
    void this.router.navigate(['/candy']);
  }

  protected alDeclararEdad(fecha: string, idPelicula: string): void {
    this.edad.declarar(fecha);
    this.pideEdad.set(false);
    this.continuar(this.clasificacionPendiente(), idPelicula);
  }

  protected cancelarVerificacion(): void {
    this.pideEdad.set(false);
  }
}
