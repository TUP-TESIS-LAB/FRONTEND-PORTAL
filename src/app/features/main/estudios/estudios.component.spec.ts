import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { EstudiosComponent } from './estudios.component';
import { EstudioService } from './estudio.service';
import { ActivePatientService } from '../../../core/active-patient/active-patient.service';
import { BreakpointService } from '../../../shared/utils/breakpoint.service';
import { ESTUDIOS_KEY } from './store/estudios.state';
import { loadEstudios } from './store/estudios.actions';
import type { Familiar } from '../../../core/models/familiar.model';
import type { Estudio } from '../../../core/models/estudio.model';

function makeFam(id: number, nombre = 'Carlos'): Familiar {
  return {
    id,
    userPatientId: id,
    status: 'VERIFIED',
    nombre,
    apellido: 'User',
    iniciales: nombre[0],
    edad: 30,
    vinculo: 'Yo',
    dni: '12345678',
    tieneCuenta: false, cobertura: '',
    totalTurnos: 0,
    totalEstudios: 0,
    accentColor: 'primary',
  };
}

function makeEstudio(id: number, fechaTs: number, extra: Partial<Estudio> = {}): Estudio {
  return {
    id,
    patientId: 10,
    protocolId: id,
    personaId: 10,
    personaNombre: '',
    personaIniciales: '',
    nombre: `Estudio Nº ${id}`,
    fecha: '01/01/2026',
    fechaTs,
    estado: 'en-proceso',
    estadoLabel: 'En proceso',
    esNuevo: false,
    reporteDisponible: false,
    ...extra,
  };
}

describe('EstudiosComponent', () => {
  let injector: Injector;
  let store: MockStore;

  const accessibleSignal = signal<Familiar[]>([]);
  const activeSignal = signal<Familiar | null>(null);
  const activePatientStub = {
    accessiblePatients: accessibleSignal,
    activePatient: activeSignal,
  };
  const estudiosSvcStub = { getEstudios: vi.fn(), descargarReporte: vi.fn() };
  const bpStub = { isMobile: signal(false) };

  function mount(): EstudiosComponent {
    let comp!: EstudiosComponent;
    runInInjectionContext(injector, () => { comp = new EstudiosComponent(); });
    TestBed.flushEffects();
    return comp;
  }

  beforeEach(() => {
    accessibleSignal.set([makeFam(10, 'Carlos'), makeFam(20, 'Mateo')]);
    activeSignal.set(makeFam(10, 'Carlos'));

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        provideMockStore({
          initialState: {
            [ESTUDIOS_KEY]: {
              estudios: [
                makeEstudio(1, 100),
                makeEstudio(2, 300),
                makeEstudio(3, 200, { estado: 'disponible', estadoLabel: 'Disponible', reporteDisponible: true }),
              ],
              patientId: 10,
              loading: false,
              error: null,
            },
          },
        }),
        { provide: EstudioService,       useValue: estudiosSvcStub },
        { provide: ActivePatientService, useValue: activePatientStub },
        { provide: BreakpointService,    useValue: bpStub },
      ],
    });
    injector = TestBed.inject(Injector);
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
  });

  it('ordena por fecha descendente (más recientes) por defecto', () => {
    const comp = mount();
    expect(comp.estudiosFiltrados().map(e => e.id)).toEqual([2, 3, 1]);
  });

  it('ordena ascendente cuando se elige "antiguos"', () => {
    const comp = mount();
    comp.sortBy.set('antiguos');
    expect(comp.estudiosFiltrados().map(e => e.id)).toEqual([1, 3, 2]);
  });

  it('expone una opción de filtro por cada paciente accesible', () => {
    const comp = mount();
    expect(comp.patientFilterOptions().length).toBe(2);
  });

  it('siembra el paciente activo y despacha loadEstudios', () => {
    const comp = mount();
    expect(comp.selectedPatientId()).toBe(10);
    expect(store.dispatch).toHaveBeenCalledWith(loadEstudios({ patientId: 10 }));
  });

  it('enriquece cada estudio con la persona del paciente seleccionado', () => {
    const comp = mount();
    expect(comp.estudios().every(e => e.personaNombre === 'Carlos')).toBe(true);
    expect(comp.estudios().every(e => e.personaIniciales === 'C')).toBe(true);
  });

  it('degrada el estado sin reporte a "En proceso" y deshabilita la descarga', () => {
    const comp = mount();
    const enProceso = makeEstudio(9, 1);
    expect(comp.displayEstadoLabel(enProceso)).toBe('En proceso');
    expect(comp.isAvailable(enProceso)).toBe(false);
  });

  it('marca disponible y habilita la descarga cuando el reporte existe', () => {
    const comp = mount();
    const disponible = makeEstudio(9, 1, { estado: 'disponible', reporteDisponible: true });
    expect(comp.displayEstado(disponible)).toBe('disponible');
    expect(comp.isAvailable(disponible)).toBe(true);
  });

  it('usa ícono por defecto cuando no hay categoría', () => {
    const comp = mount();
    expect(comp.getIconForCategoria(undefined)).toBe('pi pi-file');
  });
});
