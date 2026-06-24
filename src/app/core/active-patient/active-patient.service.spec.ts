import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivePatientService } from './active-patient.service';
import { FamilyService } from '../family/family.service';
import { of } from 'rxjs';
import type { Familiar } from '../models/familiar.model';

function fam(id: number, vinculo: Familiar['vinculo']): Familiar {
  return { id, userPatientId: id * 10, status: 'VERIFIED', nombre: 'N'+id, apellido: 'A'+id,
    iniciales: 'N', edad: 30, vinculo, dni: '30'+id, cobertura: '', totalTurnos: 0, totalEstudios: 0, accentColor: 'primary' };
}

describe('ActivePatientService', () => {
  let service: ActivePatientService;
  let familyStub: { getFamily: () => any };

  function setup(list: Familiar[]) {
    familyStub = { getFamily: () => of(list) };
    TestBed.configureTestingModule({
      providers: [
        { provide: FamilyService, useValue: familyStub },
        ActivePatientService,
      ],
    });
    service = TestBed.inject(ActivePatientService);
  }

  it('default = la entrada PROPIO (vinculo Yo) cuando existe', () => {
    setup([fam(2, 'Hijo'), fam(1, 'Yo')]);
    service.init();
    expect(service.activePatient()?.id).toBe(1);
    expect(service.accessiblePatients().length).toBe(2);
  });

  it('default = el primero cuando no hay PROPIO', () => {
    setup([fam(2, 'Hijo'), fam(3, 'Hija')]);
    service.init();
    expect(service.activePatient()?.id).toBe(2);
  });

  it('setActive cambia el activo', () => {
    setup([fam(1, 'Yo'), fam(2, 'Hijo')]);
    service.init();
    service.setActive(2);
    expect(service.activePatient()?.id).toBe(2);
  });

  it('familia vacía → activo null', () => {
    setup([]);
    service.init();
    expect(service.activePatient()).toBeNull();
  });
});
