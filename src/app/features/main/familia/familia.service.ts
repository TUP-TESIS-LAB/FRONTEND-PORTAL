import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Familiar } from '../../../core/models/familiar.model';

export interface FamiliaStats {
  personasVinculadas: number;
  turnosProximos: number;
  estudiosDisponibles: number;
  pendientesRetiro: number;
}

const FAMILIARES_MOCK: Familiar[] = [
  {
    id: 1,
    nombre: 'Lucía',
    apellido: 'Fernández',
    iniciales: 'LF',
    edad: 8,
    vinculo: 'Hija',
    dni: '55.123.456',
    cobertura: 'OSDE 410',
    proximoTurno: {
      dia: '21',
      fechaResumen: 'Mié 21 may · 9:00 · Sede Centro',
    },
    totalTurnos: 1,
    totalEstudios: 2,
    accentColor: 'secondary',
  },
  {
    id: 2,
    nombre: 'Tomás',
    apellido: 'Fernández',
    iniciales: 'TF',
    edad: 5,
    vinculo: 'Hijo',
    dni: '56.789.012',
    cobertura: 'OSDE 410',
    proximoTurno: undefined,
    totalTurnos: 0,
    totalEstudios: 1,
    accentColor: 'primary',
  },
  {
    id: 3,
    nombre: 'Marta',
    apellido: 'Pérez',
    iniciales: 'MP',
    edad: 67,
    vinculo: 'Madre',
    dni: '12.345.678',
    cobertura: 'PAMI',
    proximoTurno: {
      dia: '27',
      fechaResumen: 'Lun 27 may · 10:30 · Sede Centro',
    },
    totalTurnos: 1,
    totalEstudios: 1,
    accentColor: 'accent',
  },
];

const FAMILIA_STATS_MOCK: FamiliaStats = {
  personasVinculadas: 3,
  turnosProximos: 2,
  estudiosDisponibles: 4,
  pendientesRetiro: 1,
};

@Injectable({ providedIn: 'root' })
export class FamiliaService {
  getFamiliares(): Observable<Familiar[]> {
    return of(FAMILIARES_MOCK).pipe(delay(300));
  }

  getStats(): Observable<FamiliaStats> {
    return of(FAMILIA_STATS_MOCK).pipe(delay(300));
  }
}
