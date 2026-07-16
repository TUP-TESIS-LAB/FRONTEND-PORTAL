import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { ReplaySubject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsService } from '../notifications.service';
import {
  loadNotifications,
  loadNotificationsNotModified,
  loadNotificationsSuccess,
  markNotificationsRead,
  markNotificationsReadSuccess,
} from './notifications.actions';
import { NotificationsEffects } from './notifications.effects';

describe('NotificationsEffects', () => {
  let actions$: ReplaySubject<Action>;

  function setup(svc: Partial<NotificationsService>): NotificationsEffects {
    actions$ = new ReplaySubject<Action>(1);
    TestBed.configureTestingModule({
      providers: [
        NotificationsEffects,
        provideMockActions(() => actions$),
        { provide: NotificationsService, useValue: svc },
      ],
    });
    return TestBed.inject(NotificationsEffects);
  }

  it('load con datos emite success', () =>
    new Promise<void>(done => {
      const effects = setup({
        getInbox: vi.fn().mockReturnValue(of({ items: [], unreadCount: 0 })),
      });
      actions$.next(loadNotifications());
      effects.load$.subscribe(action => {
        expect(action).toEqual(loadNotificationsSuccess({ items: [], unreadCount: 0 }));
        done();
      });
    }));

  it('load con 304 (null) emite notModified', () =>
    new Promise<void>(done => {
      const effects = setup({ getInbox: vi.fn().mockReturnValue(of(null)) });
      actions$.next(loadNotifications());
      effects.load$.subscribe(action => {
        expect(action).toEqual(loadNotificationsNotModified());
        done();
      });
    }));

  it('markRead delega al service y emite success con los ids', () =>
    new Promise<void>(done => {
      const markRead = vi.fn().mockReturnValue(of(void 0));
      const effects = setup({ markRead });
      actions$.next(markNotificationsRead({ ids: [3] }));
      effects.markRead$.subscribe(action => {
        expect(markRead).toHaveBeenCalledWith([3]);
        expect(action).toEqual(markNotificationsReadSuccess({ ids: [3] }));
        done();
      });
    }));
});
