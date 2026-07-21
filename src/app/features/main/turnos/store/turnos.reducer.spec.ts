import { describe, it, expect } from 'vitest';
import { turnosReducer } from './turnos.reducer';
import { initialTurnosState } from './turnos.state';
import * as A from './turnos.actions';

describe('turnosReducer one-shot rescheduledId', () => {
  it('reschedule resets rescheduledId to null', () => {
    const seeded = { ...initialTurnosState, rescheduledId: 5 };
    const next = turnosReducer(seeded, A.reschedule({ id: 5, newScheduledAt: 'x' }));
    expect(next.rescheduledId).toBeNull();
    expect(next.rescheduling).toBe(true);
  });
  it('rescheduleSuccess sets rescheduledId', () => {
    const next = turnosReducer(initialTurnosState, A.rescheduleSuccess({ id: 7 }));
    expect(next.rescheduledId).toBe(7);
    expect(next.rescheduling).toBe(false);
  });
  it('rescheduleHandled resets rescheduledId to null', () => {
    const seeded = { ...initialTurnosState, rescheduledId: 7 };
    const next = turnosReducer(seeded, A.rescheduleHandled());
    expect(next.rescheduledId).toBeNull();
  });
});

describe('turnosReducer — búsqueda y selección de análisis', () => {
  it('searchAnalisis marca pending y limpia error previo', () => {
    const seeded = { ...initialTurnosState, analisisSearchError: { status: 500 } as any };
    const next = turnosReducer(seeded, A.searchAnalisis({ q: 'gluc' }));
    expect(next.analisisSearchPending).toBe(true);
    expect(next.analisisSearchError).toBeNull();
  });

  it('searchAnalisisSuccess reemplaza los resultados de la última búsqueda', () => {
    const seeded = { ...initialTurnosState, analisisResults: [{ id: 1, name: 'viejo', familyName: null }] };
    const next = turnosReducer(seeded, A.searchAnalisisSuccess({ results: [{ id: 2, name: 'Glucemia', familyName: 'Bioquímica' }] }));
    expect(next.analisisResults).toEqual([{ id: 2, name: 'Glucemia', familyName: 'Bioquímica' }]);
    expect(next.analisisSearchPending).toBe(false);
  });

  it('selectAnalisisSuccess acumula el detalle sin duplicar si ya estaba', () => {
    const detail = { id: 1, name: 'Hemograma', familyName: 'Hematología', determinations: [{ id: 10, name: 'GR' }] };
    const seeded = { ...initialTurnosState, analisisDetails: [detail] };
    const next = turnosReducer(seeded, A.selectAnalisisSuccess({ detail }));
    expect(next.analisisDetails).toHaveLength(1);
  });

  it('selectAnalisisSuccess agrega un detalle nuevo sin perder los ya acumulados de búsquedas anteriores', () => {
    const prev = { id: 1, name: 'Hemograma', familyName: null, determinations: [] };
    const nuevo = { id: 2, name: 'Glucemia', familyName: null, determinations: [] };
    const seeded = { ...initialTurnosState, analisisDetails: [prev] };
    const next = turnosReducer(seeded, A.selectAnalisisSuccess({ detail: nuevo }));
    expect(next.analisisDetails).toEqual([prev, nuevo]);
  });

  it('deselectAnalisis saca solo el id indicado', () => {
    const a = { id: 1, name: 'A', familyName: null, determinations: [] };
    const b = { id: 2, name: 'B', familyName: null, determinations: [] };
    const seeded = { ...initialTurnosState, analisisDetails: [a, b] };
    const next = turnosReducer(seeded, A.deselectAnalisis({ id: 1 }));
    expect(next.analisisDetails).toEqual([b]);
  });

  it('selectAnalisis agrega el id a analisisPendingIds (varias selecciones en vuelo a la vez)', () => {
    const seeded = { ...initialTurnosState, analisisPendingIds: [1] };
    const next = turnosReducer(seeded, A.selectAnalisis({ id: 2 }));
    expect(next.analisisPendingIds).toEqual([1, 2]);
  });

  it('selectAnalisisSuccess saca el id resuelto de analisisPendingIds sin afectar otros en vuelo', () => {
    const detail = { id: 2, name: 'Glucemia', familyName: null, determinations: [] };
    const seeded = { ...initialTurnosState, analisisPendingIds: [1, 2] };
    const next = turnosReducer(seeded, A.selectAnalisisSuccess({ detail }));
    expect(next.analisisPendingIds).toEqual([1]);
  });

  it('selectAnalisisFailure saca el id fallido de analisisPendingIds y guarda el error', () => {
    const error = { status: 404 } as any;
    const seeded = { ...initialTurnosState, analisisPendingIds: [1, 2] };
    const next = turnosReducer(seeded, A.selectAnalisisFailure({ id: 2, error }));
    expect(next.analisisPendingIds).toEqual([1]);
    expect(next.analisisDetailError).toBe(error);
  });

  it('computeAyunoSuccess guarda fastingHours', () => {
    const next = turnosReducer(initialTurnosState, A.computeAyunoSuccess({ fastingHours: 8 }));
    expect(next.fastingHours).toBe(8);
  });

  it('computeAyunoFailure deja fastingHours en null (no muestra un dato incierto)', () => {
    const seeded = { ...initialTurnosState, fastingHours: 8 };
    const next = turnosReducer(seeded, A.computeAyunoFailure({ error: {} as any }));
    expect(next.fastingHours).toBeNull();
  });
});
