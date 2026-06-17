import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { Familiar } from '../../../../core/models/familiar.model';
import { AddFamilyMemberPayload } from '../../../../core/family/family.service';

export const loadFamily = createAction('[Familia Page] Load Family');
export const loadFamilySuccess = createAction(
  '[Familia API] Load Family Success',
  props<{ family: Familiar[] }>(),
);
export const loadFamilyFailure = createAction(
  '[Familia API] Load Family Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const addFamilyMember = createAction(
  '[Familia Page] Add Family Member',
  props<{ payload: AddFamilyMemberPayload }>(),
);
export const addFamilyMemberSuccess = createAction('[Familia API] Add Family Member Success');
export const addFamilyMemberFailure = createAction(
  '[Familia API] Add Family Member Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const removeFamilyMember = createAction(
  '[Familia Page] Remove Family Member',
  props<{ userPatientId: number }>(),
);
export const removeFamilyMemberSuccess = createAction(
  '[Familia API] Remove Family Member Success',
  props<{ userPatientId: number }>(),
);
export const removeFamilyMemberFailure = createAction(
  '[Familia API] Remove Family Member Failure',
  props<{ error: HttpErrorResponse }>(),
);
