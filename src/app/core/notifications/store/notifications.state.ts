import { HttpErrorResponse } from '@angular/common/http';
import { Notificacion } from '../../models/notificacion.model';

export interface NotificationsState {
  items: Notificacion[];
  unreadCount: number;
  loading: boolean;
  error: HttpErrorResponse | null;
}

export const initialNotificationsState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

export const NOTIFICATIONS_KEY = 'notifications';
