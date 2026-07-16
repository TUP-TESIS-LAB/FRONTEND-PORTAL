import { createReducer, on } from '@ngrx/store';
import {
  loadNotifications,
  loadNotificationsFailure,
  loadNotificationsNotModified,
  loadNotificationsSuccess,
  markNotificationsReadSuccess,
} from './notifications.actions';
import { NotificationsState, initialNotificationsState } from './notifications.state';

export const notificationsReducer = createReducer(
  initialNotificationsState,
  on(loadNotifications, (state): NotificationsState => ({ ...state, loading: true, error: null })),
  on(
    loadNotificationsSuccess,
    (state, { items, unreadCount }): NotificationsState => ({
      ...state,
      items,
      unreadCount,
      loading: false,
      error: null,
    }),
  ),
  on(loadNotificationsNotModified, (state): NotificationsState => ({ ...state, loading: false })),
  on(loadNotificationsFailure, (state, { error }): NotificationsState => ({ ...state, loading: false, error })),
  on(markNotificationsReadSuccess, (state, { ids }): NotificationsState => {
    const markAll = ids.length === 0;
    const items = state.items.map(n => (markAll || ids.includes(n.id) ? { ...n, read: true } : n));
    return { ...state, items, unreadCount: items.filter(n => !n.read).length };
  }),
);
