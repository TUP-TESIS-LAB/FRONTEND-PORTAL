import { HttpErrorResponse } from '@angular/common/http';

export interface FirstLoginState {
  submitting: boolean;
  done: boolean;
  error: HttpErrorResponse | null;
}

export const initialFirstLoginState: FirstLoginState = {
  submitting: false,
  done: false,
  error: null,
};

export const FIRST_LOGIN_KEY = 'firstLogin';
