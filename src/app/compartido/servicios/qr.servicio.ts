import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ItemCarrito } from '../interfaces/carrito.interfaz';
import { CodigoQr, ConceptoQr, PermisoQr, ResultadoValidacion } from '../interfaces/qr.interfaz';
import { AutenticacionServicio } from '../../nucleo/servicios/autenticacion.servicio';
import { RegistroActividadServicio } from '../../nucleo/servicios/registro-actividad.servicio';
import { SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';

/**
 * Generación y validación de QR (§12 de la consigna).
 *
 * §12 deja abierto si una compra genera uno o varios QR. Decisión del plan:
 * **un único QR por compra**, con permisos independientes para entrada y candy.
 * Validar la entrada no consume el retiro del Candy Bar.
 *
 * TODO Supabase: la validación debe ser una RPC con `UPDATE ... WHERE usado = false
 * RETURNING *`. Comprobar y después escribir en dos pasos desde el cliente deja
 * una ventana en la que dos lectores validan el mismo permiso (§26).
 */
@Service()
export class QrServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly auth = inject(AutenticacionServicio);
  private readonly registro = inject(RegistroActividadServicio);

  /**
   * Crea el código de una compra.
   *
   * Un permiso solo existe si la compra incluye ese concepto: una compra sin
   * candy no debería tener un permiso de candy que nadie va a usar.
   */
  generar(idCompra: string, items: readonly ItemCarrito[]): Observable<CodigoQr> {
    return this.supabase.transaccion((base) => {
      const permisos: CodigoQr['permisos'] = {};
      const nuevo = (): PermisoQr => ({ usado: false, validadoPor: null, validadoEn: null });

      if (items.some((i) => i.tipo === 'entrada')) permisos.entrada = nuevo();
      if (items.some((i) => i.tipo !== 'entrada')) permisos.candy = nuevo();

      const codigo: CodigoQr = { id: this.supabase.nuevoId('QR'), idCompra, permisos };
      base.codigosQr.push(codigo);
      return codigo;
    });
  }

  obtener(idQr: string): Observable<CodigoQr | null> {
    return this.supabase.consultar(
      (base) => base.codigosQr.find((c) => c.id === idQr.trim().toUpperCase()) ?? null,
    );
  }

  /** Contenido que se codifica en la imagen del QR. */
  payload(codigo: CodigoQr): string {
    return JSON.stringify({
      id: codigo.id,
      compra: codigo.idCompra,
      conceptos: Object.keys(codigo.permisos),
    });
  }

  /**
   * Valida un permiso concreto. Idempotente solo la primera vez: el segundo
   * intento sobre el mismo concepto se rechaza y queda en el log (§21).
   */
  validar(idQr: string, concepto: ConceptoQr): Observable<ResultadoValidacion> {
    return this.supabase.transaccion((base) => {
      const buscado = idQr.trim().toUpperCase();
      const codigo = base.codigosQr.find((c) => c.id.toUpperCase() === buscado);

      if (!codigo) {
        return { valido: false as const, motivo: 'El código no corresponde a ninguna compra.' };
      }

      const compra = base.compras.find((c) => c.id === codigo.idCompra);
      if (compra?.estado === 'cancelada') {
        return { valido: false as const, motivo: 'Esta compra fue cancelada.' };
      }

      const permiso = codigo.permisos[concepto];
      if (!permiso) {
        return {
          valido: false as const,
          motivo:
            concepto === 'candy'
              ? 'Esta compra no incluye productos del Candy Bar.'
              : 'Esta compra no incluye entradas.',
        };
      }

      if (permiso.usado) {
        const cuando = permiso.validadoEn
          ? new Date(permiso.validadoEn).toLocaleString('es-AR')
          : 'antes';
        this.registrarIntento(concepto, codigo.id, true);
        return {
          valido: false as const,
          motivo:
            concepto === 'entrada'
              ? `Esta entrada ya fue validada (${cuando}). No puede reutilizarse.`
              : `Este retiro del Candy Bar ya fue realizado (${cuando}).`,
        };
      }

      permiso.usado = true;
      permiso.validadoPor = this.auth.usuarioActual?.id ?? null;
      permiso.validadoEn = new Date().toISOString();

      // La compra pasa a 'usada' recién cuando se consumieron todos sus permisos.
      if (compra && Object.values(codigo.permisos).every((p) => p.usado)) {
        compra.estado = 'usada';
      }

      this.registrarIntento(concepto, codigo.id, false);

      return {
        valido: true as const,
        concepto,
        detalle:
          concepto === 'entrada'
            ? 'Entrada válida. Podés pasar a la sala.'
            : 'Retiro habilitado. Entregá los productos.',
      };
    });
  }

  private registrarIntento(concepto: ConceptoQr, idQr: string, rechazado: boolean): void {
    const accion = concepto === 'entrada' ? 'validar-qr' : 'validar-candy';
    const detalle = rechazado
      ? `intentó revalidar el ${concepto === 'entrada' ? 'QR' : 'retiro de Candy Bar'} ${idQr} (rechazado)`
      : `validó ${concepto === 'entrada' ? 'el QR' : 'el retiro de Candy Bar'} ${idQr}`;
    this.registro.registrar(accion, detalle).subscribe();
  }
}
