import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject } from 'rxjs';
import { Action } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { AgregarFamiliarComponent } from './agregar-familiar.component';
import { addFamilyMember, addFamilyMemberSuccess, addFamilyMemberFailure } from '../store/family.actions';
import { initialFamilyState } from '../store/family.state';
import { AddFamilyMemberPayload } from '../../../../core/family/family.service';

function setup() {
  const actions$ = new ReplaySubject<Action>(1);
  TestBed.configureTestingModule({
    providers: [
      provideMockStore({ initialState: { family: initialFamilyState } }),
      provideMockActions(() => actions$),
      MessageService,
    ],
  });
  const store    = TestBed.inject(MockStore);
  const injector = TestBed.inject(Injector);
  const cmp      = runInInjectionContext(injector, () => new AgregarFamiliarComponent());
  return { cmp, store, actions$ };
}

describe('AgregarFamiliarComponent — onSubmit', () => {
  let cmp: AgregarFamiliarComponent;
  let store: MockStore;
  let actions$: ReplaySubject<Action>;

  beforeEach(() => {
    ({ cmp, store, actions$ } = setup());
  });

  it('dispatches addFamilyMember with full payload when form is valid', () => {
    const spy = vi.spyOn(store, 'dispatch');

    cmp.form.setValue({
      firstName: 'Juan',
      lastName:  'Perez',
      dni:       '30000000',
      birthDate: new Date(1990, 0, 15),   // 1990-01-15
      gender:    'MALE',
      bond:      'HIJO',
    });

    cmp.onSubmit();

    expect(spy).toHaveBeenCalledWith(
      addFamilyMember({
        payload: {
          firstName: 'Juan',
          lastName:  'Perez',
          dni:       '30000000',
          birthDate: '1990-01-15',
          gender:    'MALE',
          bond:      'HIJO',
        },
      }),
    );
  });

  it('dispatches addFamilyMember with null birthDate and gender when not provided', () => {
    const spy = vi.spyOn(store, 'dispatch');

    cmp.form.setValue({
      firstName: 'Ana',
      lastName:  'Lopez',
      dni:       '25000000',
      birthDate: null,
      gender:    null,
      bond:      'HIJA',
    });

    cmp.onSubmit();

    expect(spy).toHaveBeenCalledWith(
      addFamilyMember({
        payload: {
          firstName: 'Ana',
          lastName:  'Lopez',
          dni:       '25000000',
          birthDate: null,
          gender:    null,
          bond:      'HIJA',
        },
      }),
    );
  });

  it('does NOT dispatch when form is invalid (missing required fields)', () => {
    const spy = vi.spyOn(store, 'dispatch');

    // Leave form in initial (empty) state — firstName/lastName/dni/bond are required
    cmp.onSubmit();

    expect(spy).not.toHaveBeenCalled();
  });

  it('keeps dialog open after dispatch and closes it only on addFamilyMemberSuccess', () => {
    cmp.open();
    expect(cmp.visible).toBe(true);

    cmp.form.setValue({
      firstName: 'Carlos',
      lastName:  'Gomez',
      dni:       '20000000',
      birthDate: null,
      gender:    null,
      bond:      'PADRE',
    });

    cmp.onSubmit();

    // Dialog must NOT close eagerly on dispatch
    expect(cmp.visible).toBe(true);

    // Fire the success action — dialog should close now
    actions$.next(addFamilyMemberSuccess());
    expect(cmp.visible).toBe(false);
  });

  it('shows success toast and closes dialog on addFamilyMemberSuccess', () => {
    const msgSpy = vi.spyOn(TestBed.inject(MessageService), 'add');

    cmp.open();
    cmp.form.setValue({
      firstName: 'Carlos',
      lastName:  'Gomez',
      dni:       '20000000',
      birthDate: null,
      gender:    null,
      bond:      'PADRE',
    });
    cmp.onSubmit();

    actions$.next(addFamilyMemberSuccess());

    expect(cmp.visible).toBe(false);
    expect(msgSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'info' }),
    );
  });

  it('shows error toast and keeps dialog open on addFamilyMemberFailure', () => {
    const msgSpy = vi.spyOn(TestBed.inject(MessageService), 'add');

    cmp.open();
    cmp.form.setValue({
      firstName: 'Carlos',
      lastName:  'Gomez',
      dni:       '20000000',
      birthDate: null,
      gender:    null,
      bond:      'PADRE',
    });
    cmp.onSubmit();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions$.next(addFamilyMemberFailure({ error: {} as any }));

    expect(cmp.visible).toBe(true);
    expect(msgSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
  });

  it('formats Date correctly to yyyy-MM-dd', () => {
    const spy = vi.spyOn(store, 'dispatch');

    cmp.form.setValue({
      firstName: 'Maria',
      lastName:  'Torres',
      dni:       '33000000',
      birthDate: new Date(2005, 11, 3),  // 2005-12-03
      gender:    'FEMALE',
      bond:      'HIJA',
    });

    cmp.onSubmit();

    const dispatchedPayload = (spy.mock.calls[0][0] as unknown as { payload: AddFamilyMemberPayload }).payload;
    expect(dispatchedPayload.birthDate).toBe('2005-12-03');
  });
});
