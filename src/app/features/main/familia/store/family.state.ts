import { HttpErrorResponse } from '@angular/common/http';
import { Familiar } from '../../../../core/models/familiar.model';

export interface FamilyState {
  family: Familiar[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialFamilyState: FamilyState = {
  family: [],
  pending: false,
  error: null,
};

export const FAMILY_KEY = 'family';
