import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';

export const requestReset = createAction('[Forgot Page] Request Reset', props<{ email: string }>());
export const requestResetSuccess = createAction('[Password API] Request Reset Success');
export const requestResetFailure = createAction('[Password API] Request Reset Failure', props<{ error: HttpErrorResponse }>());

export const validateToken = createAction('[Reset Page] Validate Token', props<{ token: string }>());
export const validateTokenSuccess = createAction('[Password API] Validate Token Success');
export const validateTokenFailure = createAction('[Password API] Validate Token Failure', props<{ error: HttpErrorResponse }>());

export const resetPassword = createAction('[Reset Page] Reset Password', props<{ token: string; newPassword: string }>());
export const resetPasswordSuccess = createAction('[Password API] Reset Password Success');
export const resetPasswordFailure = createAction('[Password API] Reset Password Failure', props<{ error: HttpErrorResponse }>());
