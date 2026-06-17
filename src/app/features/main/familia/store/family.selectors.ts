import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FamilyState, FAMILY_KEY } from './family.state';

export const selectFamilyState = createFeatureSelector<FamilyState>(FAMILY_KEY);

export const selectAllFamily = createSelector(
  selectFamilyState,
  state => state.family,
);

export const selectFamilyPending = createSelector(
  selectFamilyState,
  state => state.pending,
);

export const selectFamilyError = createSelector(
  selectFamilyState,
  state => state.error,
);
