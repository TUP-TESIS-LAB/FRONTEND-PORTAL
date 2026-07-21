export interface AuthUser {
  id: number;
  nombre: string;
  dni: string;
  email: string;
  roles: string[];
  tenantSlug: string;
}

export interface LoginPayload { dni: string; password: string; }
export interface RegisterPayload {
  tenantSlug: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  password: string;
}
export interface AuthTokenResponse { token: string; user: AuthUser; }
export interface RegisterResponse { token: string; userId: number; }

// Response del POST /api/v1/auth/login-patient — el backend devuelve los
// campos del user sueltos (no anidados como AuthUser) para mantener la
// forma de los responses del flow patient (RegisterResponse hace igual).
export interface LoginPatientResponse {
  token: string;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  dni: string;
  roles: string[];
}
