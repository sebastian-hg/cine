import { Service } from '@angular/core';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Observable, from, map } from 'rxjs';

import { Entrada } from '../../../compartido/interfaces/entrada.interfaz';

/** Paleta de la entrada, en el mismo tono que la aplicación. */
const TINTA = { r: 26, g: 23, b: 20 };
const ACENTO = { r: 176, g: 57, b: 29 };
const SUAVE = { r: 99, g: 89, b: 79 };

/**
 * Entrada en PDF (§13 de la consigna).
 *
 * Incluye los datos de la película, fecha, hora, sala, butaca, modalidad,
 * idioma, precio, datos del comprador, el QR y —cuando corresponde— la
 * indicación de restricción de edad.
 */
@Service()
export class PdfServicio {
  /** Genera el PDF y dispara la descarga. */
  descargarEntradas(entradas: Entrada[]): Observable<void> {
    return from(this.construir(entradas)).pipe(
      map((doc) => {
        const referencia = entradas[0]?.idCompra ?? 'entrada';
        doc.save(`entrada-${referencia}.pdf`);
      }),
    );
  }

  private async construir(entradas: Entrada[]): Promise<jsPDF> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    for (const [indice, entrada] of entradas.entries()) {
      if (indice > 0) doc.addPage();
      await this.dibujarEntrada(doc, entrada);
    }

    return doc;
  }

  private async dibujarEntrada(doc: jsPDF, entrada: Entrada): Promise<void> {
    const margen = 18;
    const ancho = doc.internal.pageSize.getWidth() - margen * 2;
    const inicio = new Date(entrada.inicio);

    // Cabecera
    doc.setFillColor(TINTA.r, TINTA.g, TINTA.b);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('CINE', margen, 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('ENTRADA ELECTRÓNICA', margen + 24, 21);
    doc.text(entrada.idCompra, doc.internal.pageSize.getWidth() - margen, 21, { align: 'right' });

    // Película
    let y = 52;
    doc.setTextColor(TINTA.r, TINTA.g, TINTA.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    for (const linea of doc.splitTextToSize(entrada.nombrePelicula, ancho - 55) as string[]) {
      doc.text(linea, margen, y);
      y += 9;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(SUAVE.r, SUAVE.g, SUAVE.b);
    doc.text(`${entrada.modalidad} · ${entrada.idioma} · ${entrada.clasificacion}`, margen, y);

    // Datos de la función, en dos columnas
    y += 14;
    const columna = ancho / 2 - 12;
    const filas: [string, string][] = [
      ['FECHA', inicio.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })],
      ['HORA', inicio.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })],
      ['SALA', entrada.nombreSala],
      ['BUTACA', `${entrada.etiquetaButaca}  (${entrada.tipoButaca})`],
      ['PRECIO', this.pesos(entrada.precio)],
      ['COMPRADOR', entrada.nombreComprador],
    ];

    filas.forEach(([etiqueta, valor], indice) => {
      const x = margen + (indice % 2) * columna;
      const fila = y + Math.floor(indice / 2) * 16;
      doc.setFontSize(7.5);
      doc.setTextColor(SUAVE.r, SUAVE.g, SUAVE.b);
      doc.text(etiqueta, x, fila);
      doc.setFontSize(12);
      doc.setTextColor(TINTA.r, TINTA.g, TINTA.b);
      doc.text(valor, x, fila + 6);
    });

    y += Math.ceil(filas.length / 2) * 16 + 6;

    // QR
    const dataUrl = await QRCode.toDataURL(entrada.idQr, {
      margin: 1,
      width: 320,
      color: { dark: '#1a1714', light: '#ffffff' },
    });
    const ladoQr = 46;
    const xQr = doc.internal.pageSize.getWidth() - margen - ladoQr;
    doc.addImage(dataUrl, 'PNG', xQr, y, ladoQr, ladoQr);
    doc.setFontSize(7.5);
    doc.setTextColor(SUAVE.r, SUAVE.g, SUAVE.b);
    doc.text(entrada.idQr, xQr + ladoQr / 2, y + ladoQr + 5, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(TINTA.r, TINTA.g, TINTA.b);
    const nota = doc.splitTextToSize(
      'Presentá este código en la puerta de la sala. El mismo código habilita el retiro del Candy Bar si tu compra lo incluye; cada concepto se valida una sola vez.',
      ancho - ladoQr - 10,
    ) as string[];
    doc.text(nota, margen, y + 6);

    // §13: advertencia de restricción de edad cuando corresponde.
    if (entrada.clasificacion !== 'ATP') {
      const yAviso = y + ladoQr + 14;
      doc.setFillColor(253, 240, 236);
      doc.rect(margen, yAviso, ancho, 20, 'F');
      doc.setTextColor(ACENTO.r, ACENTO.g, ACENTO.b);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(
        `FUNCIÓN ${entrada.clasificacion} — puede solicitarse documento en la puerta`,
        margen + 4,
        yAviso + 6,
      );
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Los menores deben asistir acompañados por un adulto responsable.',
        margen + 4,
        yAviso + 13,
      );
    }
  }

  private pesos(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(monto);
  }
}
