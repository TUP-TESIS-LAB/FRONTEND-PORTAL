import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { PerfilPaciente, UpdatePerfilPayload } from '../../../../core/models/perfil.model';

// patientId opcional: null/ausente = perfil propio; un id = perfil de ese dependiente accesible.
export const loadProfile = createAction('[Perfil Page] Load Profile', props<{ patientId?: number | null }>());
export const loadProfileSuccess = createAction('[Perfil API] Load Profile Success', props<{ profile: PerfilPaciente }>());
export const loadProfileFailure = createAction('[Perfil API] Load Profile Failure', props<{ error: HttpErrorResponse }>());

// Autoalta: la cuenta de gestión se registra como paciente propio.
export const registerAsPatient = createAction('[Perfil Page] Register As Patient');
export const registerAsPatientSuccess = createAction('[Perfil API] Register As Patient Success', props<{ patientId: number }>());
export const registerAsPatientFailure = createAction('[Perfil API] Register As Patient Failure', props<{ error: HttpErrorResponse }>());
export const registerHandled = createAction('[Perfil Page] Register Handled');

// patientId opcional: null/ausente = perfil propio; un id = dependiente sin cuenta propia (KAN-165).
export const updateProfile = createAction('[Perfil Page] Update Profile', props<{ payload: UpdatePerfilPayload; patientId?: number | null }>());
export const updateProfileSuccess = createAction('[Perfil API] Update Profile Success', props<{ profile: PerfilPaciente }>());
export const updateProfileFailure = createAction('[Perfil API] Update Profile Failure', props<{ error: HttpErrorResponse }>());
export const profileSavedHandled = createAction('[Perfil Page] Profile Saved Handled');

export const changePassword = createAction('[Perfil Page] Change Password', props<{ currentPassword: string; newPassword: string }>());
export const changePasswordSuccess = createAction('[Perfil API] Change Password Success');
export const changePasswordFailure = createAction('[Perfil API] Change Password Failure', props<{ error: HttpErrorResponse }>());
export const passwordChangeHandled = createAction('[Perfil Page] Password Change Handled');
