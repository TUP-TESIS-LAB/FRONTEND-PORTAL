import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';

export const changePassword = createAction('[Perfil Page] Change Password', props<{ currentPassword: string; newPassword: string }>());
export const changePasswordSuccess = createAction('[Perfil API] Change Password Success');
export const changePasswordFailure = createAction('[Perfil API] Change Password Failure', props<{ error: HttpErrorResponse }>());
