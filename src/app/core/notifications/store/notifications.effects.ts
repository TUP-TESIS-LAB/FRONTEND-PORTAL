import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, timer } from 'rxjs';
import { catchError, exhaustMap, map, switchMap, takeUntil } from 'rxjs/operators';
import { NotificationsService } from '../notifications.service';
import {
  loadNotifications,
  loadNotificationsFailure,
  loadNotificationsNotModified,
  loadNotificationsSuccess,
  markNotificationsRead,
  markNotificationsReadFailure,
  markNotificationsReadSuccess,
  startNotificationsPolling,
  stopNotificationsPolling,
} from './notifications.actions';

const POLL_INTERVAL_MS = 60_000;

@Injectable()
export class NotificationsEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(NotificationsService);

  /** Polling: cada tick despacha un load. El backend resuelve barato los ticks sin cambios (304). */
  poll$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startNotificationsPolling),
      switchMap(() =>
        timer(0, POLL_INTERVAL_MS).pipe(
          map(() => loadNotifications()),
          takeUntil(this.actions$.pipe(ofType(stopNotificationsPolling))),
        ),
      ),
    ),
  );

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadNotifications),
      exhaustMap(() =>
        this.service.getInbox().pipe(
          map(inbox =>
            inbox === null
              ? loadNotificationsNotModified()
              : loadNotificationsSuccess({ items: inbox.items, unreadCount: inbox.unreadCount }),
          ),
          catchError((error: HttpErrorResponse) => of(loadNotificationsFailure({ error }))),
        ),
      ),
    ),
  );

  markRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markNotificationsRead),
      exhaustMap(({ ids }) =>
        this.service.markRead(ids).pipe(
          map(() => markNotificationsReadSuccess({ ids })),
          catchError((error: HttpErrorResponse) => of(markNotificationsReadFailure({ error }))),
        ),
      ),
    ),
  );
}
