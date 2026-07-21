import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { familyReducer } from './family.reducer';
import { initialFamilyState } from './family.state';
import {
  loadFamily,
  loadFamilySuccess,
  loadFamilyFailure,
  addFamilyMember,
  addFamilyMemberSuccess,
  addFamilyMemberFailure,
  removeFamilyMember,
  removeFamilyMemberSuccess,
  removeFamilyMemberFailure,
} from './family.actions';
import { Familiar } from '../../../../core/models/familiar.model';

const FAMILIAR: Familiar = {
  id: 1,
  userPatientId: 10,
  status: 'VERIFIED',
  nombre: 'Ana',
  apellido: 'Lopez',
  iniciales: 'A',
  edad: 30,
  vinculo: 'Hija',
  dni: '12345678',
  tieneCuenta: false, cobertura: '',
  totalTurnos: 0,
  totalEstudios: 0,
  accentColor: 'primary',
};

const FAMILIAR_2: Familiar = {
  ...FAMILIAR,
  id: 2,
  userPatientId: 20,
  nombre: 'Carlos',
  iniciales: 'C',
};

describe('familyReducer — loadFamily', () => {
  it('loadFamily → pending true, error null', () => {
    const state = familyReducer(initialFamilyState, loadFamily());
    expect(state.pending).toBe(true);
    expect(state.error).toBeNull();
  });

  it('loadFamilySuccess → family set, pending false', () => {
    const family = [FAMILIAR];
    const state = familyReducer({ ...initialFamilyState, pending: true }, loadFamilySuccess({ family }));
    expect(state.family).toEqual(family);
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loadFamilyFailure → pending false, error set', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const state = familyReducer({ ...initialFamilyState, pending: true }, loadFamilyFailure({ error }));
    expect(state.pending).toBe(false);
    expect(state.error).toBe(error);
  });
});

describe('familyReducer — addFamilyMember', () => {
  it('addFamilyMember → pending true, error null', () => {
    const payload = { firstName: 'Juan', lastName: 'Perez', dni: '99999999', birthDate: '1990-01-01', gender: 'MALE', bond: 'HIJO' };
    const state = familyReducer(initialFamilyState, addFamilyMember({ payload }));
    expect(state.pending).toBe(true);
    expect(state.error).toBeNull();
  });

  it('addFamilyMemberSuccess → pending false, list untouched', () => {
    const seeded = { ...initialFamilyState, pending: true, family: [FAMILIAR] };
    const state = familyReducer(seeded, addFamilyMemberSuccess());
    expect(state.pending).toBe(false);
    expect(state.family).toEqual([FAMILIAR]);
    expect(state.error).toBeNull();
  });

  it('addFamilyMemberFailure → pending false, error set', () => {
    const error = new HttpErrorResponse({ status: 400 });
    const state = familyReducer({ ...initialFamilyState, pending: true }, addFamilyMemberFailure({ error }));
    expect(state.pending).toBe(false);
    expect(state.error).toBe(error);
  });
});

describe('familyReducer — removeFamilyMember', () => {
  it('removeFamilyMember → pending true, error null', () => {
    const state = familyReducer(initialFamilyState, removeFamilyMember({ userPatientId: 10 }));
    expect(state.pending).toBe(true);
    expect(state.error).toBeNull();
  });

  it('removeFamilyMemberSuccess → filters by userPatientId', () => {
    const seeded = { ...initialFamilyState, pending: true, family: [FAMILIAR, FAMILIAR_2] };
    const state = familyReducer(seeded, removeFamilyMemberSuccess({ userPatientId: 10 }));
    expect(state.family).toHaveLength(1);
    expect(state.family[0].userPatientId).toBe(20);
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
  });

  it('removeFamilyMemberFailure → pending false, error set', () => {
    const error = new HttpErrorResponse({ status: 404 });
    const state = familyReducer({ ...initialFamilyState, pending: true }, removeFamilyMemberFailure({ error }));
    expect(state.pending).toBe(false);
    expect(state.error).toBe(error);
  });
});
