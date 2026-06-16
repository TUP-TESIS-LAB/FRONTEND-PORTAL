import { HttpErrorResponse } from '@angular/common/http';

export interface PerfilState {
  passwordChanging: boolean;
  passwordChanged: boolean;
  error: HttpErrorResponse | null;
}

export const initialPerfilState: PerfilState = { passwordChanging: false, passwordChanged: false, error: null };
