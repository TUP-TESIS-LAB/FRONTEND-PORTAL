import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { TenantService } from '../tenant/tenant.service';
import { AuthUser, RegisterPayload, RegisterResponse, LoginPatientResponse } from './auth.types';
import { tokenStorage } from './token-storage';

const USER_KEY = 'portal_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantService);

  private readonly _currentUser = signal<AuthUser | null>(null);
  private readonly _token = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly userId = computed(() => this._currentUser()?.id ?? null);
  readonly roles = computed(() => this._currentUser()?.roles ?? []);

  loadFromStorage(): void {
    const t = tokenStorage.get();
    if (t && !this.isExpired(t)) {
      this._token.set(t);
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        try { this._currentUser.set(JSON.parse(raw) as AuthUser); } catch { /* corrupto: se ignora */ }
      }
    } else if (t) {
      tokenStorage.clear();
      localStorage.removeItem(USER_KEY);
    }
  }

  login(dni: string, password: string): Observable<void> {
    const slug = this.tenant.config()?.id ?? '';
    return this.http.post<LoginPatientResponse>('/api/v1/auth/login-patient', { tenantSlug: slug, dni, password })
      .pipe(tap(res => {
        const user: AuthUser = {
          id: res.userId,
          nombre: `${res.firstName} ${res.lastName}`,
          dni: res.dni,
          email: res.email,
          roles: res.roles,
          tenantSlug: slug,
        };
        this.persistAuth(res.token, user);
      }), map(() => void 0));
  }

  register(payload: RegisterPayload): Observable<void> {
    return this.http.post<RegisterResponse>('/api/v1/auth/register-patient', payload)
      .pipe(tap(res => {
        const user: AuthUser = {
          id: res.userId,
          nombre: `${payload.firstName} ${payload.lastName}`,
          dni: payload.dni,
          email: payload.email,
          roles: ['EXTERNO'],
          tenantSlug: payload.tenantSlug,
        };
        this.persistAuth(res.token, user);
      }), map(() => void 0));
  }

  logout(): void {
    this._currentUser.set(null);
    this._token.set(null);
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
  }

  private persistAuth(token: string, user: AuthUser): void {
    tokenStorage.set(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._token.set(token);
    this._currentUser.set(user);
  }

  private isExpired(token: string): boolean {
    try {
      const part = token.split('.')[1];
      if (!part) return false;
      // JWT payload is base64url; normalize to base64 (replace -/_ and pad).
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      return payload.exp && payload.exp * 1000 < Date.now();
    } catch {
      return false;
    }
  }
}
