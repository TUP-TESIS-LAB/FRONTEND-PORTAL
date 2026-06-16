import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { initialPasswordRecoveryState } from './store/password-recovery.state';
import * as A from './store/password-recovery.actions';

// El runner por defecto (`vitest run` puro) no resuelve `templateUrl`, por lo que
// `TestBed.createComponent` falla al compilar el template. Estos tests solo
// ejercitan la clase (form + submit), no el render: instanciamos el componente
// dentro del injection context del TestBed sin renderizar. Bajo `ng test`
// (builder @angular/build:unit-test) este enfoque también funciona.
describe('ForgotPasswordComponent', () => {
  let store: MockStore;
  let cmp: ForgotPasswordComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState: { passwordRecovery: initialPasswordRecoveryState } })],
    });
    store = TestBed.inject(MockStore);
    cmp = runInInjectionContext(
      TestBed.inject(EnvironmentInjector),
      () => new ForgotPasswordComponent(),
    );
  });

  it('dispatches requestReset on valid submit', () => {
    const spy = vi.spyOn(store, 'dispatch');
    cmp.form.setValue({ email: 'a@a.com' });
    cmp.submit();
    expect(spy).toHaveBeenCalledWith(A.requestReset({ email: 'a@a.com' }));
  });

  it('does not dispatch on invalid email', () => {
    const spy = vi.spyOn(store, 'dispatch');
    cmp.form.setValue({ email: 'bad' });
    cmp.submit();
    expect(spy).not.toHaveBeenCalled();
  });
});
