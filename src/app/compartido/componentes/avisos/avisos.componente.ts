import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';

import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';

/** Avisos efímeros. `aria-live` para que los anuncien los lectores de pantalla. */
@Component({
  selector: 'app-avisos',
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="avisos" role="status" aria-live="polite">
      @for (aviso of avisos.avisos$ | async; track aviso.id) {
        <div class="aviso" [class]="'aviso--' + aviso.tono">
          <span>{{ aviso.texto }}</span>
          <button type="button" aria-label="Descartar" (click)="avisos.descartar(aviso.id)">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    .avisos {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 120;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: min(380px, calc(100vw - 32px));
    }

    .aviso {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: var(--radio);
      background: var(--superficie-2);
      border: 1px solid var(--borde-fuerte);
      box-shadow: var(--sombra);
      font-size: 14px;
      animation: entrar 0.18s ease-out;

      button {
        background: none;
        border: 0;
        color: var(--texto-tenue);
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        padding: 0 2px;
        width: auto;
      }
    }

    .aviso--exito {
      border-color: color-mix(in srgb, var(--ok) 45%, transparent);
      background: var(--ok-tenue);
    }
    .aviso--error {
      border-color: color-mix(in srgb, var(--error) 45%, transparent);
      background: var(--error-tenue);
    }

    @keyframes entrar {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
  `,
})
export class AvisosComponente {
  protected readonly avisos = inject(NotificacionServicio);
}
