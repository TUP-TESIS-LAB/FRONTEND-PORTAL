import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { EstudiosComponent } from './estudios.component';
import { EstudioService } from './estudio.service';
import { ActivePatientService } from '../../../core/active-patient/active-patient.service';
import { BreakpointService } from '../../../shared/utils/breakpoint.service';
import type { Familiar } from '../../../core/models/familiar.model';
import type { Estudio } from '../../../core/models/estudio.model';

function makeFam(id: number): Familiar {
  return {
    id,
    userPatientId: id,
    status: 'VERIFIED',
    nombre: 'Test',
    apellido: 'User',
    iniciales: 'TU',
    edad: 30,
    vinculo: 'Yo',
    dni: '12345678',
    cobertura: '',
    totalTurnos: 0,
    totalEstudios: 0,
    accentColor: 'primary',
  };
}

function makeEstudio(id: number, personaId: number): Estudio {
  return {
    id,
    personaId,
    personaNombre: 'Test ' + personaId,
    personaIniciales: 'T',
    nombre: 'Estudio ' + id,
    categoria: 'hematologia',
    fecha: '01/01/2026',
    estado: 'disponible',
    estadoLabel: 'Disponible',
  };
}

describe('EstudiosComponent — active patient filter', () => {
  let injector: Injector;

  const activePatientSignal = signal<Familiar | null>(null);
  const activePatientStub = { activePatient: activePatientSignal };

  const estudiosSvcStub = {
    getEstudios: vi.fn(() =>
      of([makeEstudio(1, 1), makeEstudio(2, 2), makeEstudio(3, 2)]),
    ),
    getPersonas: vi.fn(() => of([])),
  };

  const bpStub = { isMobile: signal(false) };

  beforeEach(() => {
    activePatientSignal.set(null);
    estudiosSvcStub.getEstudios.mockClear();
    estudiosSvcStub.getPersonas.mockClear();

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        { provide: EstudioService,      useValue: estudiosSvcStub },
        { provide: ActivePatientService, useValue: activePatientStub },
        { provide: BreakpointService,   useValue: bpStub },
      ],
    });
    injector = TestBed.inject(Injector);
  });

  it('filtra estudios por el paciente activo', () => {
    activePatientSignal.set(makeFam(2));

    let comp!: EstudiosComponent;
    runInInjectionContext(injector, () => {
      comp = new EstudiosComponent();
      (comp as any).ngOnInit();
    });
    TestBed.flushEffects();

    const filtrados = comp.estudiosFiltrados();
    expect(filtrados.length).toBe(2);
    expect(filtrados.every(e => e.personaId === 2)).toBe(true);
  });

  it('muestra todos los estudios cuando no hay paciente activo (null)', () => {
    activePatientSignal.set(null);

    let comp!: EstudiosComponent;
    runInInjectionContext(injector, () => {
      comp = new EstudiosComponent();
      (comp as any).ngOnInit();
    });
    TestBed.flushEffects();

    const filtrados = comp.estudiosFiltrados();
    expect(filtrados.length).toBe(3);
  });
});
