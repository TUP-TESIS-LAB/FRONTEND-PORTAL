import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { Notificacion } from '../../models/notificacion.model';
import {
  loadNotifications,
  loadNotificationsFailure,
  loadNotificationsNotModified,
  loadNotificationsSuccess,
  markNotificationsReadSuccess,
} from './notifications.actions';
import { notificationsReducer } from './notifications.reducer';
import { initialNotificationsState } from './notifications.state';

const notif = (id: number, read = false): Notificacion => ({
  id,
  patientId: 100,
  reportId: 200 + id,
  type: 'REPORT_AVAILABLE',
  read,
  createdAt: new Date('2026-07-14T12:00:00Z'),
});

describe('notificationsReducer', () => {
  it('loadNotifications prende loading', () => {
    const state = notificationsReducer(initialNotificationsState, loadNotifications());
    expect(state.loading).toBe(true);
  });

  it('success reemplaza items y unreadCount', () => {
    const state = notificationsReducer(
      { ...initialNotificationsState, loading: true },
      loadNotificationsSuccess({ items: [notif(1)], unreadCount: 1 }),
    );
    expect(state.items).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
    expect(state.loading).toBe(false);
  });

  it('notModified no toca items', () => {
    const prev = { ...initialNotificationsState, items: [notif(1)], unreadCount: 1, loading: true };
    const state = notificationsReducer(prev, loadNotificationsNotModified());
    expect(state.items).toBe(prev.items);
    expect(state.loading).toBe(false);
  });

  it('failure apaga loading y guarda error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const state = notificationsReducer(initialNotificationsState, loadNotificationsFailure({ error }));
    expect(state.error).toBe(error);
    expect(state.loading).toBe(false);
  });

  it('markReadSuccess con ids marca solo esas y descuenta unread', () => {
    const prev = { ...initialNotificationsState, items: [notif(1), notif(2)], unreadCount: 2 };
    const state = notificationsReducer(prev, markNotificationsReadSuccess({ ids: [1] }));
    expect(state.items.find(n => n.id === 1)?.read).toBe(true);
    expect(state.items.find(n => n.id === 2)?.read).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it('markReadSuccess con ids vacio marca todas', () => {
    const prev = { ...initialNotificationsState, items: [notif(1), notif(2)], unreadCount: 2 };
    const state = notificationsReducer(prev, markNotificationsReadSuccess({ ids: [] }));
    expect(state.items.every(n => n.read)).toBe(true);
    expect(state.unreadCount).toBe(0);
  });
});
