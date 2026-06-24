import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PatientSelectorComponent } from './patient-selector.component';
import { ActivePatientService } from '../../../../core/active-patient/active-patient.service';
import type { Familiar } from '../../../../core/models/familiar.model';

function fam(id: number, vinculo: Familiar['vinculo']): Familiar {
  return { id, userPatientId: id*10, status: 'VERIFIED', nombre: 'N'+id, apellido: 'A'+id,
    iniciales: 'N', edad: 30, vinculo, dni: '30'+id, cobertura: '', totalTurnos: 0, totalEstudios: 0, accentColor: 'primary' };
}

describe('PatientSelectorComponent', () => {
  it('renderiza el activo y al elegir llama setActive', () => {
    const setActive = vi.fn();
    const stub = {
      accessiblePatients: signal([fam(1,'Yo'), fam(2,'Hijo')]),
      activePatient: signal(fam(1,'Yo')),
      setActive,
    };
    TestBed.configureTestingModule({
      imports: [PatientSelectorComponent],
      providers: [{ provide: ActivePatientService, useValue: stub }],
    });
    const fixture = TestBed.createComponent(PatientSelectorComponent);
    fixture.detectChanges();
    fixture.componentInstance.onSelect(2);
    expect(setActive).toHaveBeenCalledWith(2);
  });

  it('con 1 accesible no ofrece dropdown interactivo', () => {
    const stub = { accessiblePatients: signal([fam(1,'Yo')]), activePatient: signal(fam(1,'Yo')), setActive: vi.fn() };
    TestBed.configureTestingModule({ imports: [PatientSelectorComponent], providers: [{ provide: ActivePatientService, useValue: stub }] });
    const fixture = TestBed.createComponent(PatientSelectorComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.hasMultiple()).toBe(false);
  });
});
