import { createFeatureSelector, createSelector } from '@ngrx/store';
import { NOTIFICATIONS_KEY, NotificationsState } from './notifications.state';

export const selectNotificationsState = createFeatureSelector<NotificationsState>(NOTIFICATIONS_KEY);
export const selectNotifications = createSelector(selectNotificationsState, s => s.items);
export const selectUnreadCount = createSelector(selectNotificationsState, s => s.unreadCount);
export const selectNotificationsLoading = createSelector(selectNotificationsState, s => s.loading);
