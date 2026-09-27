import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap, take } from 'rxjs';

import { Entrada } from '../../../../compartido/interfaces/entrada.interfaz';
import { CompraServicio } from '../../../../compartido/servicios/compra.servicio';
import { FuncionServicio } from '../../../../compartido/servicios/funcion.servicio';
import { PeliculaServicio } from '../../../../compartido/servicios/pelicula.servicio';
import { SalaServicio } from '../../../../compartido/servicios/sala.servicio';
import { evaluarFechaNacimiento } from '../../../../nucleo/dominio/restriccion-edad';
import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { CargandoComponente } from '../../../../compartido/componentes/cargando/cargando.componente';
import { PipeModalidad } from '../../../../compartido/pipes/modalidad.pipe';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { EdadServicio } from '../../servicios/edad.servicio';
import { PdfServicio } from '../../servicios/pdf.servicio';
import { CodigoQrComponente } from '../codigo-qr/codigo-qr.componente';

/**
 * Entrada generada tras la compra (§12 y §13).
 *
 * Muestra el QR y permite descargar el PDF. Un mismo código habilita la entrada
 * a la sala y el retiro del Candy Bar, cada uno validable una sola vez.
 */
@Component({
  selector: 'app-entrada-generada',
  imports: [
    DatePipe,
    RouterLink,
    CargandoComponente,
    CodigoQrComponente,
    PipeModalidad,
    PipeMonedaArs,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entrada-generada.componente.html',
  styleUrl: './entrada-generada.componente.scss',
})
export class EntradaGeneradaComponente {
  private readonly ruta = inject(ActivatedRoute);
  private readonly compras = inject(CompraServicio);
  private readonly funciones = inject(FuncionServicio);
  private readonly peliculas = inject(PeliculaServicio);
  private readonly salas = inject(SalaServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly edad = inject(EdadServicio);
  private readonly pdf = inject(PdfServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly idCompra = this.ruta.snapshot.paramMap.get('id') ?? '';

  private readonly compra$ = this.compras.obtener(this.idCompra);

  private readonly funcion$ = this.compra$.pipe(
    switchMap((compra) =>
      compra?.idFuncion ? this.funciones.obtener(compra.idFuncion) : of(null),
    ),
  );

  private readonly pelicula$ = this.funcion$.pipe(
    switchMap((funcion) => (funcion ? this.peliculas.obtener(funcion.idPelicula) : of(null))),
  );

  /** Productos y combos de la compra, para el bloque de retiro del Candy Bar. */
  private readonly itemsCandy$ = this.compra$.pipe(
    map((compra) => compra?.items.filter((i) => i.tipo !== 'entrada') ?? []),
  );

  protected readonly compra = toSignal(this.compra$, {
    initialValue: null,
  });
  protected readonly funcion = toSignal(this.funcion$, {
    initialValue: null,
  });
  protected readonly pelicula = toSignal(this.pelicula$, {
    initialValue: null,
  });
  protected readonly itemsCandy = toSignal(this.itemsCandy$, {
    initialValue: [],
  });

  protected descargarPdf(): void {
    combineLatest([this.compra$, this.funcion$, this.pelicula$])
      .pipe(take(1))
      .subscribe(([compra, funcion, pelicula]) => {
        if (!compra || !funcion || !pelicula) {
          this.avisos.mostrar('No pudimos armar el PDF de esta compra.', 'error');
          return;
        }

        const usuario = this.auth.usuarioActual;
        const fechaNacimiento = usuario?.fechaNacimiento ?? this.edad.fechaDeclarada();
        const evaluacion = fechaNacimiento
          ? evaluarFechaNacimiento(fechaNacimiento, pelicula.clasificacion)
          : null;

        const entradas: Entrada[] = compra.items
          .filter((item) => item.tipo === 'entrada')
          .map((item) => ({
            idCompra: compra.id,
            nombrePelicula: pelicula.nombre,
            poster: pelicula.poster,
            inicio: funcion.inicio,
            nombreSala: funcion.nombreSala,
            etiquetaButaca: item.etiquetaButaca,
            tipoButaca: item.esVip ? 'VIP' : 'normal',
            modalidad: funcion.modalidad,
            idioma: funcion.idioma,
            precio: item.precioUnitario,
            nombreComprador: usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Invitado',
            clasificacion: pelicula.clasificacion,
            requiereAdulto: evaluacion?.permitido ? evaluacion.requiereAdulto : false,
            idQr: compra.idQr,
          }));

        if (entradas.length === 0) {
          this.avisos.mostrar('Esta compra no incluye entradas para imprimir.', 'info');
          return;
        }

        this.pdf.descargarEntradas(entradas).subscribe({
          next: () => this.avisos.mostrar('Descargamos tu entrada en PDF.', 'exito'),
          error: () => this.avisos.mostrar('No pudimos generar el PDF.', 'error'),
        });
      });
  }
}
