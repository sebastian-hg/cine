import { Component, ChangeDetectionStrategy, ElementRef, AfterViewInit, input, output, viewChild } from '@angular/core';







@Component({
  selector: 'app-dialogo-confirmacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="telon" (click)="cancelado.emit()"></div>

    <div
      class="dialogo"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="titulo-dialogo"
      aria-describedby="mensaje-dialogo"
      (keydown.escape)="cancelado.emit()"
    >
      <h2 id="titulo-dialogo">{{ titulo() }}</h2>
      <p id="mensaje-dialogo" class="dialogo__mensaje">{{ mensaje() }}</p>

      <div class="dialogo__acciones">
        <button type="button" class="boton boton--fantasma" (click)="cancelado.emit()">
          {{ textoCancelar() }}
        </button>
        <button
          #botonConfirmar
          type="button"
          class="boton"
          [class.boton--peligro]="peligroso()"
          [class.boton--primario]="!peligroso()"
          (click)="confirmado.emit()"
        >
          {{ textoConfirmar() }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .telon {
      position: fixed;
      inset: 0;
      z-index: 110;
      background: rgba(0, 0, 0, 0.62);
      backdrop-filter: blur(2px);
    }

    .dialogo {
      position: fixed;
      z-index: 111;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(440px, calc(100vw - 32px));
      padding: 24px;
      border-radius: var(--radio-l);
      background: var(--superficie);
      border: 1px solid var(--borde-fuerte);
      box-shadow: var(--sombra);

      h2 {
        font-size: 20px;
        margin-bottom: 10px;
      }

      &__mensaje {
        margin: 0 0 22px;
        color: var(--texto-suave);
        font-size: 14.5px;
      }

      &__acciones {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
    }
  `,
})
export class DialogoConfirmacionComponente implements AfterViewInit {
  readonly titulo = input.required<string>();
  readonly mensaje = input.required<string>();
  readonly textoConfirmar = input<string>('Confirmar');
  readonly textoCancelar = input<string>('Cancelar');
  readonly peligroso = input<boolean>(false);

  readonly confirmado = output<void>();
  readonly cancelado = output<void>();

  private readonly botonConfirmar = viewChild<ElementRef<HTMLButtonElement>>('botonConfirmar');

  ngAfterViewInit(): void {
    this.botonConfirmar()?.nativeElement.focus();
  }
}
