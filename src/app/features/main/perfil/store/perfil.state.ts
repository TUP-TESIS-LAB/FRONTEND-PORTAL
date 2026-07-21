import { HttpErrorResponse } from '@angular/common/http';
import { PerfilPaciente } from '../../../../core/models/perfil.model';

export interface PerfilState {
  user: PerfilPaciente | null;
  loading: boolean;
  saving: boolean;
  profileSaved: boolean;
  passwordChanging: boolean;
  passwordChanged: boolean;
  registering: boolean;
  /** patientId recién creado por autoalta (one-shot, lo consume el componente). */
  registeredPatientId: number | null;
  error: HttpErrorResponse | null;
}

export const initialPerfilState: PerfilState = {
  user: null,
  loading: false,
  saving: false,
  profileSaved: false,
  passwordChanging: false,
  passwordChanged: false,
  registering: false,
  registeredPatientId: null,
  error: null,
};
