import { Component, ChangeDetectionStrategy } from '@angular/core';

/** Leyenda del mapa. Explica forma e icono, no solo color. */
@Component({
  selector: 'app-referencia-butacas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="referencia">
      <li><span class="muestra muestra--libre"></span> Libre</li>
      <li><span class="muestra muestra--elegida"></span> Tu selección</li>
      <li><span class="muestra muestra--ocupada"></span> Ocupada</li>
      <li><span class="muestra muestra--accesible">♿</span> Accesible</li>
      <li><span class="muestra muestra--vip">★</span> VIP</li>
    </ul>
  `,
  styles: `
    .referencia {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 18px;
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 12.5px;
      color: var(--texto-suave);

      li {
        display: flex;
        align-items: center;
        gap: 6px;
      }
    }

    .muestra {
      display: grid;
      place-items: center;
      width: 16px;
      height: 16px;
      border-radius: 4px 4px 2px 2px;
      border: 1px solid var(--butaca-libre-borde);
      background: var(--butaca-libre);
      font-size: 8px;
      color: #fff;
    }

    .muestra--elegida {
      background: var(--ambar);
      border-color: var(--ambar-fuerte);
    }

    .muestra--ocupada {
      background: var(--butaca-ocupada);
      border-color: var(--borde);
      position: relative;

      &::after {
        content: '';
        position: absolute;
        inset: 22%;
        background:
          linear-gradient(45deg, transparent 44%, var(--borde-fuerte) 44%, var(--borde-fuerte) 56%, transparent 56%),
          linear-gradient(-45deg, transparent 44%, var(--borde-fuerte) 44%, var(--borde-fuerte) 56%, transparent 56%);
      }
    }

    .muestra--accesible {
      background: var(--butaca-accesible);
      border-radius: 50%;
      font-size: 9px;
    }

    .muestra--vip {
      background: var(--butaca-vip);
      border-radius: 6px 6px 2px 2px;
      color: var(--ambar-fuerte);
      font-size: 7px;
    }
  `,
})
export class ReferenciaButacasComponente {}
