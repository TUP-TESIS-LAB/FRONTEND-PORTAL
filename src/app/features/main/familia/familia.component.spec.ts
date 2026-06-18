import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject } from 'rxjs';
import { Action } from '@ngrx/store';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FamiliaComponent } from './familia.component';
import { removeFamilyMember, removeFamilyMemberSuccess, removeFamilyMemberFailure } from './store/family.actions';
import { initialFamilyState } from './store/family.state';
import { Familiar } from '../../../core/models/familiar.model';

const familiarHijo: Familiar = {
  id: 42,
  userPatientId: 7,
  status: 'VERIFIED',
  nombre: 'Juan',
  apellido: 'Pérez',
  iniciales: 'JP',
  edad: 12,
  vinculo: 'Hijo',
  dni: '40000000',
  cobertura: '',
  totalTurnos: 0,
  totalEstudios: 0,
  accentColor: 'primary',
};

const familiarCreado: Familiar = {
  ...familiarHijo,
  id: 43,
  userPatientId: 8,
  status: 'CREATED',
  nombre: 'Ana',
  apellido: 'López',
  iniciales: 'AL',
  vinculo: 'Hija',
};

function setup() {
  const actions$ = new ReplaySubject<Action>(1);
  TestBed.configureTestingModule({
    providers: [
      provideMockStore({ initialState: { family: initialFamilyState } }),
      provideMockActions(() => actions$),
      MessageService,
      ConfirmationService,
    ],
  });
  const store    = TestBed.inject(MockStore);
  const injector = TestBed.inject(Injector);
  const cmp      = runInInjectionContext(injector, () => new FamiliaComponent());
  return { cmp, store, actions$ };
}

describe('FamiliaComponent — onRemoveFamiliar', () => {
  let cmp: FamiliaComponent;
  let store: MockStore;
  let actions$: ReplaySubject<Action>;

  beforeEach(() => {
    ({ cmp, store, actions$ } = setup());
  });

  it('dispatches removeFamilyMember with the correct userPatientId when confirmation is accepted', () => {
    const spy = vi.spyOn(store, 'dispatch');

    // Mock ConfirmationService.confirm to call `accept` immediately
    const confirmService = TestBed.inject(ConfirmationService);
    vi.spyOn(confirmService, 'confirm').mockImplementation((config) => {
      config.accept?.();
      return confirmService;
    });

    cmp.onRemoveFamiliar(familiarHijo);

    expect(spy).toHaveBeenCalledWith(removeFamilyMember({ userPatientId: familiarHijo.userPatientId }));
  });

  it('does NOT dispatch removeFamilyMember when confirmation is rejected', () => {
    const spy = vi.spyOn(store, 'dispatch');

    // Mock to call reject (do nothing with accept)
    const confirmService = TestBed.inject(ConfirmationService);
    vi.spyOn(confirmService, 'confirm').mockImplementation((_config) => {
      // reject: don't call accept
      return confirmService;
    });

    cmp.onRemoveFamiliar(familiarHijo);

    expect(spy).not.toHaveBeenCalledWith(removeFamilyMember({ userPatientId: familiarHijo.userPatientId }));
  });

  it('dispatches with userPatientId of a CREATED familiar (pending status)', () => {
    const spy = vi.spyOn(store, 'dispatch');

    const confirmService = TestBed.inject(ConfirmationService);
    vi.spyOn(confirmService, 'confirm').mockImplementation((config) => {
      config.accept?.();
      return confirmService;
    });

    cmp.onRemoveFamiliar(familiarCreado);

    expect(spy).toHaveBeenCalledWith(removeFamilyMember({ userPatientId: familiarCreado.userPatientId }));
  });

  it('shows success toast on removeFamilyMemberSuccess', () => {
    const msgSpy = vi.spyOn(TestBed.inject(MessageService), 'add');

    actions$.next(removeFamilyMemberSuccess({ userPatientId: familiarHijo.userPatientId }));

    expect(msgSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
  });

  it('shows error toast on removeFamilyMemberFailure', () => {
    const msgSpy = vi.spyOn(TestBed.inject(MessageService), 'add');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions$.next(removeFamilyMemberFailure({ error: {} as any }));

    expect(msgSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
  });
});
