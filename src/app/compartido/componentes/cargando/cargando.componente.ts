import { Component, ChangeDetectionStrategy, input } from '@angular/core';

 
@Component({
  selector: 'app-cargando',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cargando" role="status" aria-live="polite">
      <span class="cargando__cinta" aria-hidden="true"></span>
      <p>{{ mensaje() }}</p>
    </div>
  `,
  styles: `
    .cargando {
      display: grid;
      place-items: center;
      gap: 14px;
      padding: 56px 20px;
      color: var(--texto-tenue);

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    .cargando__cinta {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 3px solid var(--borde-fuerte);
      border-top-color: var(--ambar);
      animation: girar 0.8s linear infinite;
    }

    @keyframes girar {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class CargandoComponente {
  readonly mensaje = input<string>('Cargando…');
}
