import { describe, it, expect } from 'vitest';
import { perfilReducer } from './perfil.reducer';
import { initialPerfilState } from './perfil.state';
import * as A from './perfil.actions';

const PROFILE = { patientId: 1, firstName: 'Ana', lastName: 'Lopez', dni: '123', email: 'a@b.com', phone: '111', address: 'calle 1', coverageName: 'OSDE' };

describe('perfilReducer one-shot profileSaved', () => {
  it('updateProfile resets profileSaved to false', () => {
    const seeded = { ...initialPerfilState, profileSaved: true };
    const next = perfilReducer(seeded, A.updateProfile({ payload: { email: 'a', phone: 'b', address: 'c' } }));
    expect(next.profileSaved).toBe(false);
    expect(next.saving).toBe(true);
  });
  it('updateProfileSuccess sets profileSaved to true', () => {
    const next = perfilReducer(initialPerfilState, A.updateProfileSuccess({ profile: PROFILE }));
    expect(next.profileSaved).toBe(true);
    expect(next.saving).toBe(false);
    expect(next.user).toEqual(PROFILE);
  });
  it('profileSavedHandled resets profileSaved to false', () => {
    const seeded = { ...initialPerfilState, profileSaved: true };
    const next = perfilReducer(seeded, A.profileSavedHandled());
    expect(next.profileSaved).toBe(false);
  });
});

describe('perfilReducer one-shot passwordChanged', () => {
  it('changePassword resets passwordChanged to false', () => {
    const seeded = { ...initialPerfilState, passwordChanged: true };
    const next = perfilReducer(seeded, A.changePassword({ currentPassword: 'x', newPassword: 'y' }));
    expect(next.passwordChanged).toBe(false);
  });
  it('changePasswordSuccess sets passwordChanged to true', () => {
    const next = perfilReducer(initialPerfilState, A.changePasswordSuccess());
    expect(next.passwordChanged).toBe(true);
  });
  it('passwordChangeHandled resets passwordChanged to false', () => {
    const seeded = { ...initialPerfilState, passwordChanged: true };
    const next = perfilReducer(seeded, A.passwordChangeHandled());
    expect(next.passwordChanged).toBe(false);
  });
});
