import { HttpErrorResponse } from '@angular/common/http';
import { PerfilPaciente } from '../../../../core/models/perfil.model';

export interface PerfilState {
  user: PerfilPaciente | null;
  loading: boolean;
  saving: boolean;
  passwordChanging: boolean;
  passwordChanged: boolean;
  error: HttpErrorResponse | null;
}

export const initialPerfilState: PerfilState = {
  user: null,
  loading: false,
  saving: false,
  passwordChanging: false,
  passwordChanged: false,
  error: null,
};
