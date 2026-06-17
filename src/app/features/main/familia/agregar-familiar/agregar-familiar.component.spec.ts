import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { AgregarFamiliarComponent } from './agregar-familiar.component';
import { addFamilyMember } from '../store/family.actions';
import { initialFamilyState } from '../store/family.state';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideMockStore({ initialState: { family: initialFamilyState } }),
      MessageService,
    ],
  });
  const store    = TestBed.inject(MockStore);
  const injector = TestBed.inject(Injector);
  const cmp      = runInInjectionContext(injector, () => new AgregarFamiliarComponent());
  return { cmp, store };
}

describe('AgregarFamiliarComponent — onSubmit', () => {
  let cmp: AgregarFamiliarComponent;
  let store: MockStore;

  beforeEach(() => {
    ({ cmp, store } = setup());
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

  it('closes the dialog after a successful submit', () => {
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

    expect(cmp.visible).toBe(false);
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

    const dispatchedPayload = (spy.mock.calls[0][0] as ReturnType<typeof addFamilyMember>).payload;
    expect(dispatchedPayload.birthDate).toBe('2005-12-03');
  });
});
