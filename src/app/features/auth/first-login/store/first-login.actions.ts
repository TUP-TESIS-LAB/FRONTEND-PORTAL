import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';

export const setFirstLoginPassword = createAction(
  '[First Login Page] Set Password',
  props<{ token: string; newPassword: string }>(),
);

export const setFirstLoginPasswordSuccess = createAction(
  '[First Login API] Set Password Success',
);

export const setFirstLoginPasswordFailure = createAction(
  '[First Login API] Set Password Failure',
  props<{ error: HttpErrorResponse }>(),
);
