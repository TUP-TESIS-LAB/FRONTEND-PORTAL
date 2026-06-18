import { describe, it, expect } from 'vitest';
import { of, throwError, ReplaySubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { FirstLoginEffects } from './first-login.effects';
import { FirstLoginService } from '../services/first-login.service';
import * as A from './first-login.actions';

function setup(svc: Partial<FirstLoginService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1);
  actions$.next(action);
  TestBed.configureTestingModule({
    providers: [
      FirstLoginEffects,
      provideMockActions(() => actions$),
      { provide: FirstLoginService, useValue: svc },
    ],
  });
  return TestBed.inject(FirstLoginEffects);
}

describe('FirstLoginEffects', () => {
  it('setPassword$ → success', () => new Promise<void>(done => {
    const eff = setup(
      { setPassword: () => of(void 0) },
      A.setFirstLoginPassword({ token: 'tok12345', newPassword: 'Password1' }),
    );
    eff.setPassword$.subscribe(a => {
      expect(a).toEqual(A.setFirstLoginPasswordSuccess());
      done();
    });
  }));

  it('setPassword$ → failure', () => new Promise<void>(done => {
    const err = new HttpErrorResponse({ status: 400 });
    const eff = setup(
      { setPassword: () => throwError(() => err) },
      A.setFirstLoginPassword({ token: 'tok12345', newPassword: 'Password1' }),
    );
    eff.setPassword$.subscribe(a => {
      expect(a).toEqual(A.setFirstLoginPasswordFailure({ error: err }));
      done();
    });
  }));
});
