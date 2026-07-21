import { describe, it, expect } from 'vitest';
import { of, throwError, ReplaySubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { FamilyEffects } from './family.effects';
import { FamilyService } from '../../../../core/family/family.service';
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

function setup(svc: Partial<FamilyService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1);
  actions$.next(action);
  TestBed.configureTestingModule({
    providers: [
      FamilyEffects,
      provideMockActions(() => actions$),
      { provide: FamilyService, useValue: svc },
    ],
  });
  return TestBed.inject(FamilyEffects);
}

describe('FamilyEffects', () => {
  describe('loadFamily$', () => {
    it('dispatches loadFamilySuccess on success', () => new Promise<void>(done => {
      const eff = setup({ getFamily: () => of([FAMILIAR]) }, loadFamily());
      eff.loadFamily$.subscribe(a => {
        expect(a).toEqual(loadFamilySuccess({ family: [FAMILIAR] }));
        done();
      });
    }));

    it('dispatches loadFamilyFailure on error', () => new Promise<void>(done => {
      const error = new HttpErrorResponse({ status: 500 });
      const eff = setup({ getFamily: () => throwError(() => error) }, loadFamily());
      eff.loadFamily$.subscribe(a => {
        expect(a).toEqual(loadFamilyFailure({ error }));
        done();
      });
    }));
  });

  describe('addFamilyMember$', () => {
    const payload = { firstName: 'Juan', lastName: 'Perez', dni: '99999999', birthDate: '1990-01-01', gender: 'MALE', bond: 'HIJO' };

    it('dispatches addFamilyMemberSuccess on success', () => new Promise<void>(done => {
      const eff = setup({ addFamilyMember: () => of(void 0), refresh: () => {} }, addFamilyMember({ payload }));
      eff.addFamilyMember$.subscribe(a => {
        expect(a).toEqual(addFamilyMemberSuccess());
        done();
      });
    }));

    it('calls familyService.refresh() on success', () => new Promise<void>(done => {
      let refreshCalled = false;
      const eff = setup(
        { addFamilyMember: () => of(void 0), refresh: () => { refreshCalled = true; } },
        addFamilyMember({ payload }),
      );
      eff.addFamilyMember$.subscribe(() => {
        expect(refreshCalled).toBe(true);
        done();
      });
    }));

    it('dispatches addFamilyMemberFailure on error', () => new Promise<void>(done => {
      const error = new HttpErrorResponse({ status: 400 });
      const eff = setup({ addFamilyMember: () => throwError(() => error), refresh: () => {} }, addFamilyMember({ payload }));
      eff.addFamilyMember$.subscribe(a => {
        expect(a).toEqual(addFamilyMemberFailure({ error }));
        done();
      });
    }));
  });

  describe('reloadAfterAdd$', () => {
    it('dispatches loadFamily after addFamilyMemberSuccess', () => new Promise<void>(done => {
      // reloadAfterAdd$ does not call any service method
      const eff = setup({}, addFamilyMemberSuccess());
      eff.reloadAfterAdd$.subscribe(a => {
        expect(a).toEqual(loadFamily());
        done();
      });
    }));
  });

  describe('removeFamilyMember$', () => {
    it('dispatches removeFamilyMemberSuccess with userPatientId on success', () => new Promise<void>(done => {
      const eff = setup({ removeFamilyMember: () => of(void 0), refresh: () => {} }, removeFamilyMember({ userPatientId: 10 }));
      eff.removeFamilyMember$.subscribe(a => {
        expect(a).toEqual(removeFamilyMemberSuccess({ userPatientId: 10 }));
        done();
      });
    }));

    it('calls familyService.refresh() on remove success', () => new Promise<void>(done => {
      let refreshCalled = false;
      const eff = setup(
        { removeFamilyMember: () => of(void 0), refresh: () => { refreshCalled = true; } },
        removeFamilyMember({ userPatientId: 10 }),
      );
      eff.removeFamilyMember$.subscribe(() => {
        expect(refreshCalled).toBe(true);
        done();
      });
    }));

    it('dispatches removeFamilyMemberFailure on error', () => new Promise<void>(done => {
      const error = new HttpErrorResponse({ status: 404 });
      const eff = setup({ removeFamilyMember: () => throwError(() => error), refresh: () => {} }, removeFamilyMember({ userPatientId: 10 }));
      eff.removeFamilyMember$.subscribe(a => {
        expect(a).toEqual(removeFamilyMemberFailure({ error }));
        done();
      });
    }));
  });
});
