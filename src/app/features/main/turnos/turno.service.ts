import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Turno } from '../../../core/models/turno.model';

const SEDE_CENTRO = {
  id: 'centro',
  nombre: 'Sede Centro',
  direccion: 'Av. Colón 450, Córdoba',
  telefono: '(0351) 422-0100',
  horario: 'L-V 7:00 a 19:00',
};

const SEDE_NORTE = {
  id: 'norte',
  nombre: 'Sede Norte',
  direccion: 'Bv. Los Andes 1250, Córdoba',
  telefono: '(0351) 480-5500',
  horario: 'L-V 7:00 a 17:00',
};

const PROXIMOS_MOCK: Turno[] = [
  {
    id: 1,
    personaId: 1,
    personaNombre: 'María',
    personaIniciales: 'M',
    dia: '19',
    mes: 'MAY',
    fechaCompleta: 'Martes 19 de mayo de 2026',
    hora: '08:30',
    tipo: 'Hemoglobina glicosilada + Vitamina D',
    estudios: ['Hemoglobina glicosilada', 'Vitamina D'],
    sede: SEDE_CENTRO,
    estado: 'confirmado',
    estadoLabel: 'Confirmado',
    preparacion: [
      '8 horas de ayuno (puede tomar agua)',
      'Evitar actividad física intensa el día previo',
      'Llevar orden médica firmada',
    ],
    llegarMinAntes: 10,
    ordenCargada: true,
  },
  {
    id: 2,
    personaId: 2,
    personaNombre: 'Lucía',
    personaIniciales: 'L',
    dia: '21',
    mes: 'MAY',
    fechaCompleta: 'Jueves 21 de mayo de 2026',
    hora: '09:00',
    tipo: 'Orina completa + Hemograma',
    estudios: ['Orina completa', 'Hemograma'],
    sede: SEDE_CENTRO,
    estado: 'pendiente',
    estadoLabel: 'Pendiente',
    preparacion: [
      'Sin ayuno requerido',
      'Llevar muestra de orina fresca (primera de la mañana)',
      'Llevar orden médica firmada',
    ],
    llegarMinAntes: 10,
    ordenCargada: true,
  },
  {
    id: 3,
    personaId: 1,
    personaNombre: 'María',
    personaIniciales: 'M',
    dia: '03',
    mes: 'JUN',
    fechaCompleta: 'Miércoles 3 de junio de 2026',
    hora: '07:45',
    tipo: 'Perfil lipídico',
    estudios: ['Colesterol total', 'HDL', 'LDL', 'Triglicéridos'],
    sede: SEDE_NORTE,
    estado: 'confirmado',
    estadoLabel: 'Confirmado',
    preparacion: [
      '12 horas de ayuno',
      'Evitar alcohol 48 horas antes',
      'Llevar orden médica firmada',
    ],
    llegarMinAntes: 10,
    duracionEstimada: '15 min',
    ordenCargada: false,
  },
];

const ANTERIORES_MOCK: Turno[] = [
  {
    id: 10,
    personaId: 1,
    personaNombre: 'María',
    personaIniciales: 'M',
    dia: '07',
    mes: 'ABR',
    fechaCompleta: 'Martes 7 de abril de 2026',
    hora: '08:00',
    tipo: 'Hemograma completo',
    estudios: ['Hemograma completo'],
    sede: SEDE_CENTRO,
    estado: 'completado',
    estadoLabel: 'Completado',
    preparacion: [],
    llegarMinAntes: 10,
    ordenCargada: true,
  },
  {
    id: 11,
    personaId: 2,
    personaNombre: 'Lucía',
    personaIniciales: 'L',
    dia: '22',
    mes: 'MAR',
    fechaCompleta: 'Sábado 22 de marzo de 2026',
    hora: '09:30',
    tipo: 'Perfil tiroideo',
    estudios: ['TSH', 'T4 libre'],
    sede: SEDE_NORTE,
    estado: 'completado',
    estadoLabel: 'Completado',
    preparacion: [],
    llegarMinAntes: 10,
    ordenCargada: true,
  },
  {
    id: 12,
    personaId: 1,
    personaNombre: 'María',
    personaIniciales: 'M',
    dia: '10',
    mes: 'FEB',
    fechaCompleta: 'Martes 10 de febrero de 2026',
    hora: '08:15',
    tipo: 'Glucemia + Insulina',
    estudios: ['Glucemia en ayunas', 'Insulina basal'],
    sede: SEDE_CENTRO,
    estado: 'cancelado',
    estadoLabel: 'Cancelado',
    preparacion: [],
    llegarMinAntes: 10,
    ordenCargada: false,
  },
  {
    id: 13,
    personaId: 3,
    personaNombre: 'Tomás',
    personaIniciales: 'T',
    dia: '15',
    mes: 'ENE',
    fechaCompleta: 'Jueves 15 de enero de 2026',
    hora: '10:00',
    tipo: 'Hemograma + Orina',
    estudios: ['Hemograma completo', 'Orina completa'],
    sede: SEDE_CENTRO,
    estado: 'completado',
    estadoLabel: 'Completado',
    preparacion: [],
    llegarMinAntes: 10,
    ordenCargada: true,
  },
  {
    id: 14,
    personaId: 1,
    personaNombre: 'María',
    personaIniciales: 'M',
    dia: '05',
    mes: 'DIC',
    fechaCompleta: 'Viernes 5 de diciembre de 2025',
    hora: '07:30',
    tipo: 'Coagulograma',
    estudios: ['TP', 'KPTT', 'Fibrinógeno'],
    sede: SEDE_NORTE,
    estado: 'completado',
    estadoLabel: 'Completado',
    preparacion: [],
    llegarMinAntes: 10,
    ordenCargada: true,
  },
];

// Estado mutable interno para simular cancelaciones
const _proximos = signal<Turno[]>([...PROXIMOS_MOCK]);
const _anteriores = signal<Turno[]>([...ANTERIORES_MOCK]);

@Injectable({ providedIn: 'root' })
export class TurnoService {
  getProximos(): Observable<Turno[]> {
    return of(_proximos()).pipe(delay(300));
  }

  getAnteriores(): Observable<Turno[]> {
    return of(_anteriores()).pipe(delay(300));
  }

  cancelarTurno(id: number): Observable<void> {
    return of(undefined).pipe(
      delay(500),
      map(() => {
        _proximos.update(lista =>
          lista.map(t =>
            t.id === id ? { ...t, estado: 'cancelado' as const, estadoLabel: 'Cancelado' } : t,
          ),
        );
        _anteriores.update(lista =>
          lista.map(t =>
            t.id === id ? { ...t, estado: 'cancelado' as const, estadoLabel: 'Cancelado' } : t,
          ),
        );
      }),
    );
  }
}
