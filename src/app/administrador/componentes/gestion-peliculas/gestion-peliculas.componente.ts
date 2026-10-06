import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap } from 'rxjs';

import { Pelicula } from '../../../compartido/interfaces/pelicula.interfaz';
import { GeneroServicio } from '../../../compartido/servicios/genero.servicio';
import { PeliculaServicio } from '../../../compartido/servicios/pelicula.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';
import { PipeDuracion } from '../../../compartido/pipes/duracion.pipe';
import { PipeMonedaArs } from '../../../compartido/pipes/moneda-ars.pipe';
import { FormularioPeliculaComponente } from '../formulario-pelicula/formulario-pelicula.componente';

 
@Component({
  selector: 'app-gestion-peliculas',
  imports: [DatePipe, FormularioPeliculaComponente, PipeDuracion, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="seccion-cabecera">
      <div>
        <p class="etiqueta-seccion">Programación</p>
        <h1>Películas</h1>
      </div>
    </header>

    <div class="cuerpo">
      <section class="bloque">
        <h2>Nueva película</h2>
        <app-formulario-pelicula
          [generos]="generosActivos()"
          (peliculaGuardada)="crear($event)"
        />
      </section>

      <section class="bloque">
        <h2>Catálogo</h2>
        @if (catalogoPeliculas(); as peliculas) {
          <div class="tabla-scroll">
            <table>
              <caption class="solo-lectores">Películas del catálogo</caption>
              <thead>
                <tr>
                  <th scope="col">Película</th>
                  <th scope="col">Estreno</th>
                  <th scope="col">Duración</th>
                  <th scope="col">Clasif.</th>
                  <th scope="col" class="numerico">Precio</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (pelicula of peliculas; track pelicula.id) {
                  <tr>
                    <td>{{ pelicula.nombre }}</td>
                    <td>{{ pelicula.fechaEstreno | date: 'd MMM y' }}</td>
                    <td>{{ pelicula.duracionMinutos | pipeDuracion }}</td>
                    <td>{{ pelicula.clasificacion }}</td>
                    <td class="numerico">{{ pelicula.precioNormal | pipeMonedaArs }}</td>
                    <td>
                      <button
                        type="button"
                        class="boton boton--chico"
                        [class.boton--fantasma]="pelicula.disponible"
                        (click)="alternar(pelicula)"
                      >
                        {{ pelicula.disponible ? 'Disponible' : 'Oculta' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .cuerpo {
      display: grid;
      grid-template-columns: 400px minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 1100px) {
      .cuerpo {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class GestionPeliculasComponente {
  private readonly peliculas = inject(PeliculaServicio);
  private readonly generos = inject(GeneroServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly recargar = new BehaviorSubject<void>(undefined);

  protected readonly catalogoPeliculas = toSignal<Pelicula[], Pelicula[]>(
    this.recargar.pipe(switchMap(() => this.peliculas.listar())),
    { initialValue: [] },
  );
  protected readonly generosActivos = toSignal(this.generos.activos(), {
    initialValue: [],
  });

  protected crear(datos: Omit<Pelicula, 'id'>): void {
    this.peliculas.crear(datos).subscribe((pelicula) => {
      this.registro.registrar('crear', `creó la película "${pelicula.nombre}"`).subscribe();
      this.avisos.mostrar(`"${pelicula.nombre}" agregada al catálogo.`, 'exito');
      this.recargar.next();
    });
  }

  protected alternar(pelicula: Pelicula): void {
    this.peliculas.actualizar(pelicula.id, { disponible: !pelicula.disponible }).subscribe(() => {
      this.registro
        .registrar(
          'modificar',
          `${pelicula.disponible ? 'ocultó' : 'publicó'} la película "${pelicula.nombre}"`,
        )
        .subscribe();
      this.recargar.next();
    });
  }
}
