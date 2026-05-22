import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { TenantService } from '../tenant/tenant.service';
import { AuthUser, RegisterPayload, AuthTokenResponse, RegisterResponse } from './auth.types';
import { tokenStorage } from './token-storage';

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
    } else if (t) {
      tokenStorage.clear();
    }
  }

  login(dni: string, password: string): Observable<void> {
    const slug = this.tenant.config()?.id ?? '';
    return this.http.post<AuthTokenResponse>('/api/v1/auth/login', { dni, password, tenantSlug: slug })
      .pipe(tap(res => this.persistAuth(res.token, res.user)), map(() => void 0));
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
  }

  private persistAuth(token: string, user: AuthUser): void {
    tokenStorage.set(token);
    this._token.set(token);
    this._currentUser.set(user);
  }

  private isExpired(token: string): boolean {
    try {
      const part = token.split('.')[1];
      if (!part) return false;
      const payload = JSON.parse(atob(part));
      return payload.exp && payload.exp * 1000 < Date.now();
    } catch {
      return false;
    }
  }
}
