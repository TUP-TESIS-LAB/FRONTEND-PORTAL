import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { PerfilPaciente, UpdatePerfilPayload } from '../../../../core/models/perfil.model';

export const loadProfile = createAction('[Perfil Page] Load Profile');
export const loadProfileSuccess = createAction('[Perfil API] Load Profile Success', props<{ profile: PerfilPaciente }>());
export const loadProfileFailure = createAction('[Perfil API] Load Profile Failure', props<{ error: HttpErrorResponse }>());

export const updateProfile = createAction('[Perfil Page] Update Profile', props<{ payload: UpdatePerfilPayload }>());
export const updateProfileSuccess = createAction('[Perfil API] Update Profile Success', props<{ profile: PerfilPaciente }>());
export const updateProfileFailure = createAction('[Perfil API] Update Profile Failure', props<{ error: HttpErrorResponse }>());
export const profileSavedHandled = createAction('[Perfil Page] Profile Saved Handled');

export const changePassword = createAction('[Perfil Page] Change Password', props<{ currentPassword: string; newPassword: string }>());
export const changePasswordSuccess = createAction('[Perfil API] Change Password Success');
export const changePasswordFailure = createAction('[Perfil API] Change Password Failure', props<{ error: HttpErrorResponse }>());
export const passwordChangeHandled = createAction('[Perfil Page] Password Change Handled');
