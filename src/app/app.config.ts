import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  isDevMode,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { RutasApp } from './app.rutas';
import { ManejadorErroresGlobal } from './nucleo/manejador-errores';
import { InterceptorAuth } from './nucleo/interceptores/auth.interceptor';
import { InterceptorCarga } from './nucleo/interceptores/carga.interceptor';
import { InterceptorErrores } from './nucleo/interceptores/errores.interceptor';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    // El orden importa: carga envuelve a todo para contar la petición completa,
    // auth agrega la cabecera, y errores queda más cerca del backend para ver
    // la respuesta cruda.
    provideHttpClient(withInterceptors([InterceptorCarga, InterceptorAuth, InterceptorErrores])),

    provideRouter(
      RutasApp,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),

    { provide: ErrorHandler, useClass: ManejadorErroresGlobal },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
