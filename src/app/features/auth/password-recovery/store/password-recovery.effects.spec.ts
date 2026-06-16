import { describe, it, expect } from 'vitest';
import { of, throwError, ReplaySubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { PasswordRecoveryEffects } from './password-recovery.effects';
import { PasswordRecoveryService } from '../services/password-recovery.service';
import * as A from './password-recovery.actions';
function setup(svc: Partial<PasswordRecoveryService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1);
  actions$.next(action);
  TestBed.configureTestingModule({
    providers: [PasswordRecoveryEffects, provideMockActions(() => actions$), { provide: PasswordRecoveryService, useValue: svc }],
  });
  return TestBed.inject(PasswordRecoveryEffects);
}
describe('PasswordRecoveryEffects', () => {
  it('requestReset → success', () => new Promise<void>(done => {
    const eff = setup({ forgot: () => of(void 0) }, A.requestReset({ email: 'a@a' }));
    eff.requestReset$.subscribe(a => { expect(a).toEqual(A.requestResetSuccess()); done(); });
  }));
  it('requestReset → failure', () => new Promise<void>(done => {
    const err = new HttpErrorResponse({ status: 500 });
    const eff = setup({ forgot: () => throwError(() => err) }, A.requestReset({ email: 'a@a' }));
    eff.requestReset$.subscribe(a => { expect(a).toEqual(A.requestResetFailure({ error: err })); done(); });
  }));
  it('resetPassword → success', () => new Promise<void>(done => {
    const eff = setup({ reset: () => of(void 0) }, A.resetPassword({ token: 't', newPassword: 'Password123' }));
    eff.resetPassword$.subscribe(a => { expect(a).toEqual(A.resetPasswordSuccess()); done(); });
  }));
});
