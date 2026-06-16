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
