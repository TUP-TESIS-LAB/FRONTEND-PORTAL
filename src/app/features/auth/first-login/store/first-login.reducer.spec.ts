import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { firstLoginReducer } from './first-login.reducer';
import { initialFirstLoginState } from './first-login.state';
import * as A from './first-login.actions';

describe('firstLoginReducer', () => {
  it('setFirstLoginPassword → submitting true, error null', () => {
    const state = firstLoginReducer(initialFirstLoginState, A.setFirstLoginPassword({ token: 'tok12345', newPassword: 'Password1' }));
    expect(state.submitting).toBe(true);
    expect(state.error).toBeNull();
    expect(state.done).toBe(false);
  });

  it('setFirstLoginPasswordSuccess → done true, submitting false', () => {
    const prev = { ...initialFirstLoginState, submitting: true };
    const state = firstLoginReducer(prev, A.setFirstLoginPasswordSuccess());
    expect(state.done).toBe(true);
    expect(state.submitting).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setFirstLoginPasswordFailure → error set, submitting false', () => {
    const err = new HttpErrorResponse({ status: 400 });
    const prev = { ...initialFirstLoginState, submitting: true };
    const state = firstLoginReducer(prev, A.setFirstLoginPasswordFailure({ error: err }));
    expect(state.submitting).toBe(false);
    expect(state.error).toBe(err);
    expect(state.done).toBe(false);
  });
});
