import { HttpErrorResponse } from '@angular/common/http';

export interface PasswordRecoveryState {
  submitting: boolean;
  emailSent: boolean;
  tokenStatus: 'idle' | 'checking' | 'valid' | 'invalid';
  resetDone: boolean;
  error: HttpErrorResponse | null;
}

export const initialPasswordRecoveryState: PasswordRecoveryState = {
  submitting: false, emailSent: false, tokenStatus: 'idle', resetDone: false, error: null,
};
