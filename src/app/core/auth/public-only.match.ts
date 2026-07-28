import { CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Deja pasar una ruta solo cuando NO hay sesión.
 *
 * A diferencia de un guard de bloqueo, nunca redirige: devolver false hace que el
 * router siga evaluando las rutas siguientes. Así una misma URL (ej. /ayuda) puede
 * resolverse a la versión pública standalone o a la versión dentro del shell del
 * paciente, según haya sesión o no.
 *
 * Requiere que la ruta pública esté declarada ANTES de la ruta '' del shell.
 */
export const publicOnlyMatch: CanMatchFn = () => !inject(AuthService).isAuthenticated();
