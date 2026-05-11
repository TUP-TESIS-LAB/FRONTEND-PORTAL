import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { TipoAnalisis } from '../../../../core/models/tipo-analisis.model';
import { Sede } from '../../../../core/models/sede.model';
import { SlotDisponible } from '../../../../core/models/slot-disponible.model';

export interface ReservaPayload {
  tipoAnalisisIds: string[];
  sedeId: string;
  fecha: Date;
  hora: string;
}

const TIPOS_ANALISIS_MOCK: TipoAnalisis[] = [
  {
    id: 'hemograma',
    nombre: 'Hemograma completo',
    descripcionCorta: 'Glóbulos rojos, blancos, plaquetas',
    ayuno: false,
    categoria: 'hematologia',
    icono: 'pi-chart-bar',
  },
  {
    id: 'glucemia',
    nombre: 'Glucemia en ayunas',
    descripcionCorta: 'Ayuno mínimo 8 hs',
    ayuno: true,
    categoria: 'bioquimica',
    icono: 'pi-percentage',
  },
  {
    id: 'perfil-lipidico',
    nombre: 'Perfil lipídico',
    descripcionCorta: 'Colesterol, triglicéridos · Ayuno 12 hs',
    ayuno: true,
    categoria: 'bioquimica',
    icono: 'pi-chart-line',
  },
  {
    id: 'perfil-tiroideo',
    nombre: 'Perfil tiroideo',
    descripcionCorta: 'T3, T4, TSH',
    ayuno: false,
    categoria: 'hormonas',
    icono: 'pi-sync',
  },
  {
    id: 'orina-completa',
    nombre: 'Orina completa',
    descripcionCorta: 'Análisis de muestra fresca',
    ayuno: false,
    categoria: 'orina',
    icono: 'pi-filter',
  },
  {
    id: 'covid-pcr',
    nombre: 'Test COVID-19 (PCR)',
    descripcionCorta: 'Resultado en 24-48 hs',
    ayuno: false,
    categoria: 'bioquimica',
    icono: 'pi-shield',
  },
];

const SEDES_MOCK: Sede[] = [
  {
    id: 'centro',
    nombre: 'Sede Centro',
    direccion: 'Av. Colón 450, Córdoba',
    telefono: '(0351) 422-0100',
    horario: 'L-V 7:00 a 19:00',
    distanciaKm: 1.2,
  },
  {
    id: 'nueva-cordoba',
    nombre: 'Sede Nueva Córdoba',
    direccion: 'Bv. Illia 320, Nueva Córdoba',
    telefono: '(0351) 422-0200',
    horario: 'L-V 7:00 a 20:00',
    distanciaKm: 3.5,
  },
  {
    id: 'cerro',
    nombre: 'Sede Cerro de las Rosas',
    direccion: 'Av. Rafael Núñez 4200, Cerro',
    telefono: '(0351) 422-0300',
    horario: 'L-S 7:00 a 13:00',
    distanciaKm: 8.7,
  },
];

function generateSlots(sedeId: string, _fecha: Date): SlotDisponible[] {
  const horas = [
    '07:00', '07:15', '07:30', '07:45',
    '08:00', '08:15', '08:30', '08:45',
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30',
  ];
  // Slots tomados fijos por sede para consistencia en el mock
  const taken = sedeId === 'centro'
    ? ['07:30', '08:00', '09:00', '10:15']
    : ['08:15', '09:30'];

  return horas.map(hora => ({ hora, disponible: !taken.includes(hora) }));
}

@Injectable({ providedIn: 'root' })
export class SacarTurnoService {
  getTiposAnalisis(): Observable<TipoAnalisis[]> {
    return of([...TIPOS_ANALISIS_MOCK]).pipe(delay(200));
  }

  getSedes(): Observable<Sede[]> {
    return of([...SEDES_MOCK]).pipe(delay(200));
  }

  getSlots(sedeId: string, fecha: Date): Observable<SlotDisponible[]> {
    return of(generateSlots(sedeId, fecha)).pipe(delay(300));
  }

  reservar(_payload: ReservaPayload): Observable<{ id: number }> {
    return of({ id: 999 }).pipe(delay(500));
  }
}
