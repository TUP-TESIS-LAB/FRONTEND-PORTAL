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
