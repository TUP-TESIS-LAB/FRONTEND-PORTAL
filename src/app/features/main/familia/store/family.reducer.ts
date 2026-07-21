import { createReducer, on } from '@ngrx/store';
import { FamilyState, initialFamilyState } from './family.state';
import {
  loadFamily,
  loadFamilySuccess,
  loadFamilyFailure,
  addFamilyMember,
  addFamilyMemberSuccess,
  addFamilyMemberFailure,
  removeFamilyMember,
  removeFamilyMemberSuccess,
  removeFamilyMemberFailure,
} from './family.actions';

export const familyReducer = createReducer(
  initialFamilyState,

  on(loadFamily, (state): FamilyState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(loadFamilySuccess, (state, { family }): FamilyState => ({
    ...state,
    family,
    pending: false,
    error: null,
  })),
  on(loadFamilyFailure, (state, { error }): FamilyState => ({
    ...state,
    pending: false,
    error,
  })),

  on(addFamilyMember, (state): FamilyState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(addFamilyMemberSuccess, (state): FamilyState => ({
    ...state,
    pending: false,
    error: null,
  })),
  on(addFamilyMemberFailure, (state, { error }): FamilyState => ({
    ...state,
    pending: false,
    error,
  })),

  on(removeFamilyMember, (state): FamilyState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(removeFamilyMemberSuccess, (state, { userPatientId }): FamilyState => ({
    ...state,
    family: state.family.filter(f => f.userPatientId !== userPatientId),
    pending: false,
    error: null,
  })),
  on(removeFamilyMemberFailure, (state, { error }): FamilyState => ({
    ...state,
    pending: false,
    error,
  })),
);
