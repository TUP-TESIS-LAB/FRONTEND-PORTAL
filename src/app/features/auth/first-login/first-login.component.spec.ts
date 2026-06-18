import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { ActivatedRoute, Router } from '@angular/router';
import { FirstLoginComponent } from './first-login.component';
import { initialFirstLoginState } from './store/first-login.state';
import * as A from './store/first-login.actions';

// These tests exercise the class only (form + submit), without template rendering.
// Mirrors the forgot-password and perfil component spec patterns.
describe('FirstLoginComponent', () => {
  let store: MockStore;
  let injector: EnvironmentInjector;

  const mockActivatedRoute = {
    snapshot: { queryParamMap: { get: (_k: string) => null } },
  };

  const mockRouter = { navigate: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState: { firstLogin: initialFirstLoginState } }),
        MessageService,
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
      ],
    });
    store = TestBed.inject(MockStore);
    injector = TestBed.inject(EnvironmentInjector);
  });

  it('dispatches setFirstLoginPassword on valid submit', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const cmp = runInInjectionContext(injector, () => new FirstLoginComponent());
    cmp.form.setValue({ token: 'tok12345', password: 'Password1', confirm: 'Password1' });
    cmp.submit();
    expect(spy).toHaveBeenCalledWith(
      A.setFirstLoginPassword({ token: 'tok12345', newPassword: 'Password1' }),
    );
  });

  it('does not dispatch when form is invalid (empty token)', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const cmp = runInInjectionContext(injector, () => new FirstLoginComponent());
    cmp.form.setValue({ token: '', password: 'Password1', confirm: 'Password1' });
    cmp.submit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not dispatch when passwords do not match', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const cmp = runInInjectionContext(injector, () => new FirstLoginComponent());
    cmp.form.setValue({ token: 'tok12345', password: 'Password1', confirm: 'Different1' });
    cmp.submit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not dispatch when password is too short', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const cmp = runInInjectionContext(injector, () => new FirstLoginComponent());
    cmp.form.setValue({ token: 'tok12345', password: 'short', confirm: 'short' });
    cmp.submit();
    expect(spy).not.toHaveBeenCalled();
  });
});
