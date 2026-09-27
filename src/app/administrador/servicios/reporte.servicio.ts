import { Service, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Observable, combineLatest, map } from 'rxjs';

import { Compra } from '../../compartido/interfaces/compra.interfaz';
import {
  PuntoGrafico,
  ReporteDiario,
  ResumenEstadosVenta,
  VentaPorUsuario,
} from '../../compartido/interfaces/reporte.interfaz';
import { CompraServicio } from '../../compartido/servicios/compra.servicio';
import { soloFecha, sumarDias } from '../../nucleo/dominio/fechas';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/** Una hoja de la planilla exportada. */
interface Hoja {
  nombre: string;
  encabezados: string[];
  filas: (string | number)[][];
}

/**
 * Reportes administrativos (§20 de la consigna).
 *
 * TODO Supabase: estos agregados deben ser vistas materializadas o RPCs
 * (`reporte_diario(desde, hasta)`). Traer todas las compras al cliente para
 * sumarlas no escala, y además expone datos de todos los usuarios a cualquiera
 * que abra las herramientas de desarrollo.
 */
@Service()
export class ReporteServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly compras = inject(CompraServicio);

  /** Facturación y ventas con entradas/Candy por día, del más reciente al más viejo. */
  diarios(dias = 14): Observable<ReporteDiario[]> {
    return this.compras.todas().pipe(map((compras) => {
      const hoy = new Date();
      const porDia = new Map<string, ReporteDiario>();

      for (let i = 0; i < dias; i++) {
        const fecha = soloFecha(sumarDias(hoy, -i));
        porDia.set(fecha, { fecha, facturacion: 0, entradasVendidas: 0, productosVendidos: 0 });
      }

      for (const compra of compras) {
        if (compra.estado === 'cancelada') continue;

        const fecha = soloFecha(new Date(compra.fechaCompra));
        const reporte = porDia.get(fecha);
        if (!reporte) continue;

        reporte.facturacion += compra.desglose.aPagar + compra.desglose.creditoAplicado;
        if (compra.desglose.subtotalEntradas > 0) reporte.entradasVendidas += 1;
        if (compra.desglose.subtotalCandy > 0) reporte.productosVendidos += 1;
      }

      return [...porDia.values()].sort((a, b) => b.fecha.localeCompare(a.fecha));
    }));
  }

  /** Totales del período, para las tarjetas de encabezado. */
  totales(dias = 14): Observable<{ facturacion: number; entradas: number; productos: number }> {
    return this.diarios(dias).pipe(
      map((reportes) =>
        reportes.reduce(
          (total, r) => ({
            facturacion: total.facturacion + r.facturacion,
            entradas: total.entradas + r.entradasVendidas,
            productos: total.productos + r.productosVendidos,
          }),
          { facturacion: 0, entradas: 0, productos: 0 },
        ),
      ),
    );
  }

  /** Resumen histórico de facturación de todas las ventas. */
  resumenHistorico(): Observable<{ facturacion: number }> {
    return this.compras.todas().pipe(
      map((compras) => ({
        facturacion: compras.reduce((total, compra) => {
          if (compra.estado === 'cancelada') return total;
          return total + compra.desglose.aPagar + compra.desglose.creditoAplicado;
        }, 0),
      })),
    );
  }

  /** Resumen de la última semana de ventas. */
  resumenUltimaSemana(): Observable<{ facturacion: number }> {
    return this.diarios(7).pipe(
      map((reportes) => ({
        facturacion: reportes.reduce((total, reporte) => total + reporte.facturacion, 0),
      })),
    );
  }


  /** Ventas por usuario para saber quién compró y cuánto se vendió. */
  ventasPorUsuario(dias = 14): Observable<VentaPorUsuario[]> {
    return combineLatest([
      this.compras.todas(),
      this.supabase.consultar((base) => base.usuarios),
    ]).pipe(map(([comprasBase, usuarios]) => {
      const compras = this.comprasEnPeriodo(comprasBase, dias);
      const resumen = new Map<string, VentaPorUsuario>();

      for (const compra of compras) {
        const idUsuario = compra.idUsuario;
        const clave = String(idUsuario ?? '__anonimo__');

        const usuario =
          idUsuario
            ? (() => {
                const encontrado = usuarios.find((u) => String(u.id) === String(idUsuario));
                return encontrado ? `${encontrado.nombre} ${encontrado.apellido}` : String(idUsuario);
              })()
            : 'Cliente anónimo';

        if (!resumen.has(clave)) {
          resumen.set(clave, {
            idUsuario: idUsuario ?? null,
            usuario,
            ventas: 0,
            pagadas: 0,
            usadas: 0,
            canceladas: 0,
            totalVendido: 0,
          });
        }

        const fila = resumen.get(clave)!;
        fila.ventas += 1;
        if (compra.estado === 'pagada') fila.pagadas += 1;
        if (compra.estado === 'usada') fila.usadas += 1;
        if (compra.estado === 'cancelada') fila.canceladas += 1;

        if (compra.estado !== 'cancelada') {
          fila.totalVendido += compra.desglose.aPagar + compra.desglose.creditoAplicado;
        }
      }

      return [...resumen.values()].sort((a, b) => {
        if (b.totalVendido !== a.totalVendido) return b.totalVendido - a.totalVendido;
        return b.ventas - a.ventas;
      });
    }));
  }

  /** §20: películas más vistas por semana. */
  masVistasPorSemana(): Observable<PuntoGrafico[]> {
    return this.vistasEnUltimosDias(7);
  }

  /** §20: películas más vistas por mes. */
  masVistasPorMes(): Observable<PuntoGrafico[]> {
    return this.vistasEnUltimosDias(30);
  }

  /** §20: producto del Candy Bar más vendido. */
  candyMasVendido(): Observable<PuntoGrafico[]> {
    return this.compras.todas().pipe(map((compras) => {
      const unidades = new Map<string, number>();

      for (const compra of compras.filter((c) => c.estado !== 'cancelada')) {
        if (compra.desglose.subtotalCandy > 0) {
          unidades.set('Ventas con Candy Bar', (unidades.get('Ventas con Candy Bar') ?? 0) + 1);
        }
      }

      return [...unidades.entries()]
        .map(([etiqueta, valor]) => ({ etiqueta, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 8);
    }));
  }

  /** §20: exportación a PDF. */
  exportarPdf(reportes: ReporteDiario[], periodo = 'Última semana'): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margen = 18;
    const textoPeriodo = `Período: ${periodo}`;

    doc.setFillColor(26, 23, 20);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(`Reporte de facturación - ${periodo}`, margen, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(textoPeriodo, margen, 22);
    doc.text(
      new Date().toLocaleDateString('es-AR', { dateStyle: 'long' }),
      doc.internal.pageSize.getWidth() - margen,
      18,
      { align: 'right' },
    );

    let y = 42;
    doc.setTextColor(99, 89, 79);
    doc.setFontSize(8);
    doc.text('FECHA', margen, y);
    doc.text('ENTRADAS', margen + 62, y, { align: 'right' });
    doc.text('PRODUCTOS', margen + 104, y, { align: 'right' });
    doc.text('FACTURACIÓN', margen + 160, y, { align: 'right' });

    y += 3;
    doc.setDrawColor(228, 220, 209);
    doc.line(margen, y, doc.internal.pageSize.getWidth() - margen, y);

    doc.setTextColor(26, 23, 20);
    doc.setFontSize(10);
    for (const reporte of reportes) {
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 24;
      }
      doc.text(reporte.fecha, margen, y);
      doc.text(String(reporte.entradasVendidas), margen + 62, y, { align: 'right' });
      doc.text(String(reporte.productosVendidos), margen + 104, y, { align: 'right' });
      doc.text(this.pesos(reporte.facturacion), margen + 160, y, { align: 'right' });
    }

    const total = reportes.reduce((suma, r) => suma + r.facturacion, 0);
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL (${periodo})`, margen, y);
    doc.text(this.pesos(total), margen + 160, y, { align: 'right' });

    doc.save(`reporte-${soloFecha(new Date())}.pdf`);
  }

  /**
   * §20: exportación a Excel.
   *
   * Se genera SpreadsheetML 2003, que es XML plano: Excel y LibreOffice lo
   * abren directamente y no hace falta ninguna librería para escribirlo. Un
   * .xlsx real es un ZIP y exigiría una dependencia solo para comprimir.
   */
  exportarExcel(reportes: ReporteDiario[], candy: PuntoGrafico[]): void {
    const hojas: Hoja[] = [
      {
        nombre: 'Facturación diaria',
        encabezados: ['Fecha', 'Entradas vendidas', 'Productos vendidos', 'Facturación'],
        filas: reportes.map((r) => [
          r.fecha,
          r.entradasVendidas,
          r.productosVendidos,
          r.facturacion,
        ]),
      },
      {
        nombre: 'Candy Bar',
        encabezados: ['Producto', 'Unidades vendidas'],
        filas: candy.map((p) => [p.etiqueta, p.valor]),
      },
    ];

    this.descargar(
      this.aSpreadsheetMl(hojas),
      `reporte-${soloFecha(new Date())}.xls`,
      'application/vnd.ms-excel',
    );
  }

  private vistasEnUltimosDias(dias: number): Observable<PuntoGrafico[]> {
    return combineLatest([
      this.compras.todas(),
      this.supabase.consultar((base) => base.funciones),
      this.supabase.consultar((base) => base.peliculas),
    ]).pipe(map(([compras, funciones, peliculas]) => {
      const desde = sumarDias(new Date(), -dias).toISOString();
      const conteo = new Map<string, number>();

      for (const compra of compras) {
        if (compra.estado === 'cancelada' || compra.fechaCompra < desde) continue;

        const funcion = funciones.find((f) => f.id === compra.idFuncion);
        if (!funcion) continue;

        const nombre = this.nombrePelicula(peliculas, funcion.idPelicula);
        const entradas =
          compra.items.length > 0
            ? compra.items.filter((i) => i.tipo === 'entrada').reduce((suma, item) => suma + item.cantidad, 0)
            : compra.desglose.subtotalEntradas > 0
              ? 1
              : 0;
        conteo.set(nombre, (conteo.get(nombre) ?? 0) + entradas);
      }

      return [...conteo.entries()]
        .map(([etiqueta, valor]) => ({ etiqueta, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 8);
    }));
  }

  private nombrePelicula(peliculas: { id: string; nombre: string }[], idPelicula: string): string {
    return peliculas.find((p) => p.id === idPelicula)?.nombre ?? idPelicula;
  }

  private comprasEnPeriodo(compras: Compra[], dias: number) {
    const desde = sumarDias(new Date(), -dias).toISOString();
    return compras.filter((compra) => compra.fechaCompra >= desde);
  }

  private aSpreadsheetMl(hojas: Hoja[]): string {
    const escapar = (valor: string | number): string =>
      String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const celda = (valor: string | number): string => {
      const tipo = typeof valor === 'number' ? 'Number' : 'String';
      return `<Cell><Data ss:Type="${tipo}">${escapar(valor)}</Data></Cell>`;
    };

    const cuerpo = hojas
      .map(
        (hoja) => `  <Worksheet ss:Name="${escapar(hoja.nombre)}">
   <Table>
    <Row>${hoja.encabezados.map((e) => `<Cell ss:StyleID="cabecera">${`<Data ss:Type="String">${escapar(e)}</Data>`}</Cell>`).join('')}</Row>
${hoja.filas.map((fila) => `    <Row>${fila.map(celda).join('')}</Row>`).join('\n')}
   </Table>
  </Worksheet>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="cabecera"><Font ss:Bold="1"/></Style>
 </Styles>
${cuerpo}
</Workbook>`;
  }

  private descargar(contenido: string, nombre: string, tipo: string): void {
    const blob = new Blob([`﻿${contenido}`], { type: `${tipo};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private pesos(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(monto);
  }
}
