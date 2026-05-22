import { describe, it, expect } from 'vitest';
import { appointmentToTurno, MapperContext } from './appointment-to-turno.mapper';

const ctx: MapperContext = {
  tiposAnalisis: new Map([
    [101, { id: 50, nombre: 'Hemograma', preparacion: ['Sin ayuno'], ayuno: false,
            descripcionCorta: '', categoria: 'h', icono: '', determinationIds: [101] }],
  ]),
  family: new Map([
    [10, { id: 10, nombre: 'María', apellido: 'García', iniciales: 'M',
           edad: 35, vinculo: 'Yo', dni: '30000000', cobertura: '',
           totalTurnos: 0, totalEstudios: 0, accentColor: 'primary' }],
  ]),
  sedes: new Map([
    ['5', { id: '5', nombre: 'Sede Centro', direccion: 'Av. Colón 450' }],
  ]),
};

describe('appointmentToTurno', () => {
  it('maps SCHEDULED appointment', () => {
    const t = appointmentToTurno({
      id: 1, patientId: 10, branchId: 5, scheduledAt: '2026-05-30T08:30:00',
      confirmationNumber: 'TRN-X', status: 'SCHEDULED', comments: null,
      prescriptionFileUrl: null,
      determinations: [{ determinationId: 101, orderNumber: 1 }],
    }, ctx);

    expect(t.estado).toBe('pendiente');
    expect(t.estadoLabel).toBe('Pendiente');
    expect(t.personaNombre).toBe('María');
    expect(t.sede.nombre).toBe('Sede Centro');
    expect(t.estudios).toContain('Hemograma');
    expect(t.hora).toBe('08:30');
    expect(t.preparacion).toContain('Sin ayuno');
  });

  it('maps CANCELLED status', () => {
    const t = appointmentToTurno({
      id: 1, patientId: 10, branchId: 5, scheduledAt: '2026-05-30T08:30:00',
      confirmationNumber: 'TRN-X', status: 'CANCELLED', comments: null,
      prescriptionFileUrl: null, determinations: [],
    }, ctx);
    expect(t.estado).toBe('cancelado');
  });

  it('falls back when family unknown', () => {
    const t = appointmentToTurno({
      id: 1, patientId: 999, branchId: 5, scheduledAt: '2026-05-30T08:30:00',
      confirmationNumber: 'TRN-X', status: 'SCHEDULED', comments: null,
      prescriptionFileUrl: null, determinations: [],
    }, ctx);
    expect(t.personaNombre).toBe('Desconocido');
  });

  it('maps CONFIRMED status', () => {
    const t = appointmentToTurno({
      id: 2, patientId: 10, branchId: 5, scheduledAt: '2026-05-30T10:00:00',
      confirmationNumber: 'TRN-Y', status: 'CONFIRMED', comments: null,
      prescriptionFileUrl: null, determinations: [],
    }, ctx);
    expect(t.estado).toBe('confirmado');
    expect(t.estadoLabel).toBe('Confirmado');
  });

  it('maps COMPLETED status', () => {
    const t = appointmentToTurno({
      id: 3, patientId: 10, branchId: 5, scheduledAt: '2026-05-30T10:00:00',
      confirmationNumber: 'TRN-Z', status: 'COMPLETED', comments: null,
      prescriptionFileUrl: null, determinations: [],
    }, ctx);
    expect(t.estado).toBe('completado');
  });

  it('sets ordenCargada true when prescriptionFileUrl present', () => {
    const t = appointmentToTurno({
      id: 4, patientId: 10, branchId: 5, scheduledAt: '2026-05-30T10:00:00',
      confirmationNumber: 'TRN-W', status: 'SCHEDULED', comments: null,
      prescriptionFileUrl: 'https://example.com/order.pdf', determinations: [],
    }, ctx);
    expect(t.ordenCargada).toBe(true);
  });

  it('falls back to "Sede sin asignar" when sede unknown', () => {
    const t = appointmentToTurno({
      id: 5, patientId: 10, branchId: 999, scheduledAt: '2026-05-30T10:00:00',
      confirmationNumber: 'TRN-V', status: 'SCHEDULED', comments: null,
      prescriptionFileUrl: null, determinations: [],
    }, ctx);
    expect(t.sede.nombre).toBe('Sede sin asignar');
  });

  it('deduplicates studies from multiple determinations mapping to same tipo', () => {
    const ctxDup: MapperContext = {
      ...ctx,
      tiposAnalisis: new Map([
        [101, { id: 50, nombre: 'Hemograma', preparacion: ['Sin ayuno'], ayuno: false,
                descripcionCorta: '', categoria: 'h', icono: '', determinationIds: [101, 102] }],
        [102, { id: 50, nombre: 'Hemograma', preparacion: ['Sin ayuno'], ayuno: false,
                descripcionCorta: '', categoria: 'h', icono: '', determinationIds: [101, 102] }],
      ]),
    };
    const t = appointmentToTurno({
      id: 6, patientId: 10, branchId: 5, scheduledAt: '2026-05-30T10:00:00',
      confirmationNumber: 'TRN-U', status: 'SCHEDULED', comments: null,
      prescriptionFileUrl: null,
      determinations: [
        { determinationId: 101, orderNumber: 1 },
        { determinationId: 102, orderNumber: 2 },
      ],
    }, ctxDup);
    expect(t.estudios.filter(e => e === 'Hemograma').length).toBe(1);
  });
});
