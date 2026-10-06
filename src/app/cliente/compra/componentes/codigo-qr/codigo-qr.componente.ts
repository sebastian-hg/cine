import { Component, ChangeDetectionStrategy, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import QRCode from 'qrcode';

 
@Component({
  selector: 'app-codigo-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (imagen(); as src) {
      <img class="qr" [src]="src" [alt]="'Código QR ' + contenido()" [width]="lado()" [height]="lado()" />
    } @else {
      <div class="qr qr--vacio" [style.width.px]="lado()" [style.height.px]="lado()"></div>
    }
  `,
  styles: `
    .qr {
      display: block;
      border-radius: var(--radio-s);
      background: #fff;
      padding: 8px;
    }

    .qr--vacio {
      background: var(--superficie-2);
    }
  `,
})
export class CodigoQrComponente {
  readonly contenido = input.required<string>();
  readonly lado = input<number>(180);

  private readonly sanitizador = inject(DomSanitizer);

  protected readonly imagen = signal<SafeUrl | null>(null);

  constructor() {
    effect(() => {
      const texto = this.contenido();
      const lado = this.lado();
      if (!texto) return;

      void QRCode.toDataURL(texto, {
        margin: 1,
        width: lado * 2,
        color: { dark: '#1a1714', light: '#ffffff' },
      }).then((url) => this.imagen.set(this.sanitizador.bypassSecurityTrustUrl(url)));
    });
  }
}
