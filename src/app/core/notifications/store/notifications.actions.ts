import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import { Notificacion } from '../../models/notificacion.model';

/** Arranca el polling (shell init). El effect emite loadNotifications cada 60s. */
export const startNotificationsPolling = createAction('[Notifications Shell] Start Polling');
export const stopNotificationsPolling = createAction('[Notifications Shell] Stop Polling');

export const loadNotifications = createAction('[Notifications Poll] Load Notifications');
export const loadNotificationsSuccess = createAction(
  '[Notifications API] Load Notifications Success',
  props<{ items: Notificacion[]; unreadCount: number }>(),
);
/** 304 del backend: sin cambios, no tocar el estado. */
export const loadNotificationsNotModified = createAction('[Notifications API] Load Notifications Not Modified');
export const loadNotificationsFailure = createAction(
  '[Notifications API] Load Notifications Failure',
  props<{ error: HttpErrorResponse }>(),
);

/** ids vacío = todas. */
export const markNotificationsRead = createAction(
  '[Notifications Panel] Mark Read',
  props<{ ids: number[] }>(),
);
export const markNotificationsReadSuccess = createAction(
  '[Notifications API] Mark Read Success',
  props<{ ids: number[] }>(),
);
export const markNotificationsReadFailure = createAction(
  '[Notifications API] Mark Read Failure',
  props<{ error: HttpErrorResponse }>(),
);
