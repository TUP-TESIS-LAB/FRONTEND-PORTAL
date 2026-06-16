import { describe, it, expect } from 'vitest';
import { of, throwError, ReplaySubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { PerfilEffects } from './perfil.effects';
import { PerfilService } from '../perfil.service';
import * as A from './perfil.actions';

function setup(svc: Partial<PerfilService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1); actions$.next(action);
  TestBed.configureTestingModule({ providers: [PerfilEffects, provideMockActions(() => actions$), { provide: PerfilService, useValue: svc }] });
  return TestBed.inject(PerfilEffects);
}

const PROFILE = { patientId: 1, firstName: 'Ana', lastName: 'Lopez', dni: '123', email: 'a@b.com', phone: '111', address: 'calle 1', coverageName: 'OSDE' };

describe('PerfilEffects', () => {
  it('loadProfile → success', () => new Promise<void>(done => {
    const eff = setup({ getPerfil: () => of(PROFILE) }, A.loadProfile());
    eff.loadProfile$.subscribe(a => { expect(a).toEqual(A.loadProfileSuccess({ profile: PROFILE })); done(); });
  }));
  it('updateProfile → success', () => new Promise<void>(done => {
    const payload = { email: 'a@b.com', phone: '111', address: 'calle 1' };
    const eff = setup({ updatePerfil: () => of(PROFILE) }, A.updateProfile({ payload }));
    eff.updateProfile$.subscribe(a => { expect(a).toEqual(A.updateProfileSuccess({ profile: PROFILE })); done(); });
  }));
  it('changePassword → success', () => new Promise<void>(done => {
    const eff = setup({ changePassword: () => of(void 0) }, A.changePassword({ currentPassword: 'old12345', newPassword: 'new12345' }));
    eff.changePassword$.subscribe(a => { expect(a).toEqual(A.changePasswordSuccess()); done(); });
  }));
  it('changePassword → failure', () => new Promise<void>(done => {
    const err = new HttpErrorResponse({ status: 400 });
    const eff = setup({ changePassword: () => throwError(() => err) }, A.changePassword({ currentPassword: 'x', newPassword: 'y' }));
    eff.changePassword$.subscribe(a => { expect(a).toEqual(A.changePasswordFailure({ error: err })); done(); });
  }));
});
