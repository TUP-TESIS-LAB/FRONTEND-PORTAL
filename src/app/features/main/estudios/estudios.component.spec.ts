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

describe('EstudiosComponent — filtro de paciente (mock re-mapeado a la familia)', () => {
  let injector: Injector;

  // 2 pacientes accesibles reales (ids 10 y 20).
  const accessibleSignal = signal<Familiar[]>([]);
  const activePatientStub = { accessiblePatients: accessibleSignal };

  // Mock: 1 estudio de persona-mock 1 + 2 estudios de persona-mock 2.
  const estudiosSvcStub = {
    getEstudios: vi.fn(() =>
      of([makeEstudio(1, 1), makeEstudio(2, 2), makeEstudio(3, 2)]),
    ),
    getPersonas: vi.fn(() => of([])),
  };

  const bpStub = { isMobile: signal(false) };

  function mount(): EstudiosComponent {
    let comp!: EstudiosComponent;
    runInInjectionContext(injector, () => {
      comp = new EstudiosComponent();
      (comp as any).ngOnInit();
    });
    TestBed.flushEffects();
    return comp;
  }

  beforeEach(() => {
    accessibleSignal.set([makeFam(10), makeFam(20)]);
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

  it('Todos: muestra todos los estudios, re-mapeados a ids reales de la familia', () => {
    const comp = mount();
    const filtrados = comp.estudiosFiltrados();
    expect(filtrados.length).toBe(3);
    // ya no usa los ids del mock (1/2), sino los reales (10/20)
    expect(filtrados.every(e => e.personaId === 10 || e.personaId === 20)).toBe(true);
  });

  it('filtra por el paciente seleccionado', () => {
    const comp = mount();
    // mock-id 2 (2 estudios) → mapea a fam[1] = id 20
    comp.selectedPatientId.set(20);
    const filtrados = comp.estudiosFiltrados();
    expect(filtrados.length).toBe(2);
    expect(filtrados.every(e => e.personaId === 20)).toBe(true);
  });

  it('expone una opción de filtro por cada paciente accesible', () => {
    const comp = mount();
    expect(comp.patientFilterOptions().length).toBe(2);
  });
});
