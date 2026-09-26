import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-encontrado',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor seccion no-encontrado">
      <p class="etiqueta-seccion">Error 404</p>
      <h1>Esta función no existe</h1>
      <p>La página que buscabas no está, o cambió de dirección.</p>
      <a routerLink="/" class="boton boton--primario">Volver a la cartelera</a>
    </div>
  `,
  styles: `
    .no-encontrado {
      text-align: center;
      max-width: 520px;

      h1 {
        margin-bottom: 12px;
      }
      p {
        color: var(--texto-suave);
        margin-bottom: 24px;
      }
    }
  `,
})
export class NoEncontradoComponente {}
