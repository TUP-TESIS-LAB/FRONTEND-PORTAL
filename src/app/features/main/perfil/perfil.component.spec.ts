import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { of } from 'rxjs';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { PerfilComponent } from './perfil.component';
import { PerfilService } from './perfil.service';
import { initialPerfilState } from './store/perfil.state';
import * as A from './store/perfil.actions';

const USER = { patientId: 1, firstName: 'Ana', lastName: 'Lopez', dni: '123', email: 'a@b.com', phone: '111', address: 'calle 1', coverageName: 'OSDE' };

describe('PerfilComponent', () => {
  let store: MockStore; let injector: Injector;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState: { perfil: { ...initialPerfilState, user: USER } } }),
        MessageService,
        { provide: PerfilService, useValue: { getPerfil: () => of(USER) } },
      ],
    });
    store = TestBed.inject(MockStore);
    injector = TestBed.inject(Injector);
  });
  it('guardarPassword dispatches changePassword when form valid', () => {
    const cmp = runInInjectionContext(injector, () => new PerfilComponent());
    const spy = vi.spyOn(store, 'dispatch');
    cmp.passForm.setValue({ currentPassword: 'old12345', newPassword: 'new12345' });
    cmp.guardarPassword();
    expect(spy).toHaveBeenCalledWith(A.changePassword({ currentPassword: 'old12345', newPassword: 'new12345' }));
  });
  it('does not dispatch when form invalid', () => {
    const cmp = runInInjectionContext(injector, () => new PerfilComponent());
    const spy = vi.spyOn(store, 'dispatch');
    cmp.passForm.setValue({ currentPassword: 'x', newPassword: 'y' });
    cmp.guardarPassword();
    expect(spy).not.toHaveBeenCalled();
  });
  it('guardarEdicion dispatches updateProfile', () => {
    const cmp = runInInjectionContext(injector, () => new PerfilComponent());
    const spy = vi.spyOn(store, 'dispatch');
    cmp.abrirEdicion();
    cmp.editForm.setValue({ email: 'n@n', phone: '9', address: 'b' });
    cmp.guardarEdicion();
    expect(spy).toHaveBeenCalledWith(A.updateProfile({ payload: { email: 'n@n', phone: '9', address: 'b' } }));
  });
});
