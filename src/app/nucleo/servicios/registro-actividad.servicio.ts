import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  AccionRegistrada,
  RegistroActividad,
} from '../../compartido/interfaces/registro-actividad.interfaz';
import { AutenticacionServicio } from './autenticacion.servicio';
import { SupabaseServicio } from './supabase.servicio';

/** Etiqueta legible del rol, para que el log se lea como los ejemplos de §21. */
const ETIQUETA_ROL: Record<string, string> = {
  administrador: 'Admin',
  empleado: 'Empleado',
  cliente: 'Cliente',
  anonimo: 'Anónimo',
};

/**
 * Log de actividad (§21 de la consigna).
 *
 * Registra quién hizo qué y cuándo:
 *   «Admin Juan creó la función de "Órbita Cero".»
 *   «Empleado Carlos validó un QR.»
 *
 * TODO Supabase: `from('registro_actividad').insert(...)`. La tabla debe tener
 * una policy que permita INSERT a cualquier usuario autenticado pero SELECT solo
 * al rol administrador, y no debe admitir UPDATE ni DELETE para nadie: un log
 * que se puede editar no sirve como log.
 */
@Service()
export class RegistroActividadServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly auth = inject(AutenticacionServicio);

  /** Escribe una entrada. No falla la operación de negocio si el log falla. */
  registrar(accion: AccionRegistrada, detalle: string): Observable<void> {
    return this.supabase.transaccion((base) => {
      const usuario = this.auth.usuarioActual;
      const etiqueta = ETIQUETA_ROL[usuario?.rol ?? 'anonimo'] ?? 'Usuario';

      base.registros.unshift({
        id: this.supabase.nuevoId('log'),
        usuario: usuario ? `${etiqueta} ${usuario.nombre}` : 'Visitante anónimo',
        idUsuario: usuario?.id ?? 'anonimo',
        accion,
        fechaHora: new Date().toISOString(),
        detalle,
      });
    });
  }

  /** Listado completo, más reciente primero. Solo lo consume el panel admin. */
  listar(): Observable<RegistroActividad[]> {
    return this.supabase.consultar((base) => [...base.registros]);
  }

  /** Validaciones hechas por un empleado, para su pantalla de historial. */
  validacionesDe(idEmpleado: string): Observable<RegistroActividad[]> {
    return this.supabase.consultar((base) =>
      base.registros.filter(
        (r) =>
          r.idUsuario === idEmpleado && (r.accion === 'validar-qr' || r.accion === 'validar-candy'),
      ),
    );
  }

  /** Filtro del panel admin: por usuario, acción y rango de fechas. */
  filtrar(filtros: {
    texto?: string;
    accion?: AccionRegistrada | null;
    desde?: string | null;
    hasta?: string | null;
  }): Observable<RegistroActividad[]> {
    return this.listar().pipe(
      map((registros) =>
        registros.filter((r) => {
          if (filtros.accion && r.accion !== filtros.accion) return false;
          if (filtros.desde && r.fechaHora < filtros.desde) return false;
          if (filtros.hasta && r.fechaHora > `${filtros.hasta}T23:59:59`) return false;
          if (filtros.texto) {
            const aguja = filtros.texto.toLowerCase();
            const pajar = `${r.usuario} ${r.detalle}`.toLowerCase();
            if (!pajar.includes(aguja)) return false;
          }
          return true;
        }),
      ),
    );
  }
}
