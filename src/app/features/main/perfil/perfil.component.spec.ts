import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { of } from 'rxjs';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { PerfilComponent } from './perfil.component';
import { PerfilService } from './perfil.service';
import { initialPerfilState } from './store/perfil.state';
import * as A from './store/perfil.actions';
import { ActivePatientService } from '../../../core/active-patient/active-patient.service';
import type { Familiar } from '../../../core/models/familiar.model';

const USER = { patientId: 1, firstName: 'Ana', lastName: 'Lopez', dni: '123', email: 'a@b.com', phone: '111', address: 'calle 1', coverageName: 'OSDE' };

function fam(id: number, vinculo: Familiar['vinculo'], tieneCuenta: boolean, status: Familiar['status'] = 'VERIFIED'): Familiar {
  return { id, userPatientId: id * 10, status, nombre: 'N' + id, apellido: 'A' + id,
    iniciales: 'N', edad: 30, vinculo, dni: '30' + id, tieneCuenta, cobertura: '',
    totalTurnos: 0, totalEstudios: 0, accentColor: 'primary' };
}

describe('PerfilComponent', () => {
  let store: MockStore; let injector: Injector;
  const familia = signal<Familiar[]>([]);
  beforeEach(() => {
    familia.set([]);
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState: { perfil: { ...initialPerfilState, user: USER } } }),
        MessageService,
        { provide: PerfilService, useValue: { getPerfil: () => of(USER) } },
        { provide: ActivePatientService, useValue: { accessiblePatients: familia.asReadonly(), reload: vi.fn() } },
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
  it('guardarEdicion del perfil propio dispatchea updateProfile con patientId null', () => {
    familia.set([fam(1, 'Yo', true)]);
    const cmp = runInInjectionContext(injector, () => new PerfilComponent());
    cmp.selectedPatientId.set(1);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.abrirEdicion();
    cmp.editForm.setValue({ email: 'n@n', phone: '9', address: 'b' });
    cmp.guardarEdicion();
    expect(spy).toHaveBeenCalledWith(A.updateProfile({ payload: { email: 'n@n', phone: '9', address: 'b' }, patientId: null }));
  });

  it('guardarEdicion de un dependiente dispatchea updateProfile con su patientId', () => {
    familia.set([fam(1, 'Yo', true), fam(2, 'Hijo', false)]);
    const cmp = runInInjectionContext(injector, () => new PerfilComponent());
    cmp.selectedPatientId.set(2);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.abrirEdicion();
    cmp.editForm.setValue({ email: 'n@n', phone: '9', address: 'b' });
    cmp.guardarEdicion();
    expect(spy).toHaveBeenCalledWith(A.updateProfile({ payload: { email: 'n@n', phone: '9', address: 'b' }, patientId: 2 }));
  });

  describe('canEditSelected', () => {
    const canEdit = (cmp: PerfilComponent) =>
      (cmp as unknown as { canEditSelected(): boolean }).canEditSelected();

    it('perfil propio → editable', () => {
      familia.set([fam(1, 'Yo', true)]);
      const cmp = runInInjectionContext(injector, () => new PerfilComponent());
      cmp.selectedPatientId.set(1);
      expect(canEdit(cmp)).toBe(true);
    });

    it('dependiente VERIFIED sin cuenta → editable', () => {
      familia.set([fam(1, 'Yo', true), fam(2, 'Hijo', false)]);
      const cmp = runInInjectionContext(injector, () => new PerfilComponent());
      cmp.selectedPatientId.set(2);
      expect(canEdit(cmp)).toBe(true);
    });

    it('familiar con cuenta propia → NO editable', () => {
      familia.set([fam(1, 'Yo', true), fam(3, 'Padre', true)]);
      const cmp = runInInjectionContext(injector, () => new PerfilComponent());
      cmp.selectedPatientId.set(3);
      expect(canEdit(cmp)).toBe(false);
    });

    it('familiar sin cuenta pero con vínculo no verificado → NO editable', () => {
      familia.set([fam(1, 'Yo', true), fam(4, 'Hija', false, 'CREATED')]);
      const cmp = runInInjectionContext(injector, () => new PerfilComponent());
      cmp.selectedPatientId.set(4);
      expect(canEdit(cmp)).toBe(false);
    });
  });
});
