import { HttpErrorResponse } from '@angular/common/http';

export interface TurnosState {
  rescheduling: boolean;
  rescheduledId: number | null;
  error: HttpErrorResponse | null;
}

export const initialTurnosState: TurnosState = {
  rescheduling: false,
  rescheduledId: null,
  error: null,
};
