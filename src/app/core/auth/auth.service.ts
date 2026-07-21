import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { TenantService } from '../tenant/tenant.service';
import { AuthUser, RegisterPayload, RegisterResponse, LoginPatientResponse } from './auth.types';
import { tokenStorage } from './token-storage';

const USER_KEY = 'portal_auth_user';

/** Shape parcial de GET /api/v1/me/profile usado para rehidratar el usuario logueado. */
interface MeProfile {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
}

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

  /**
   * Si hay token válido pero no tenemos el usuario en memoria (sesión previa a la persistencia,
   * o localStorage limpiado), lo trae de /me/profile y lo completa. Para el portal del paciente.
   */
  hydrateUserIfNeeded(): Observable<void> {
    const token = this._token();
    if (!token || this._currentUser()) {
      return of(void 0);
    }
    const claims = this.decodePayload(token);
    return this.http.get<MeProfile>('/api/v1/me/profile').pipe(
      tap(p => {
        const user: AuthUser = {
          id: Number(claims?.['userId']) || 0,
          nombre: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
          dni: p.dni ?? '',
          email: p.email ?? '',
          roles: (claims?.['roles'] as string[] | undefined) ?? [],
          tenantSlug: this.tenant.config()?.id ?? '',
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this._currentUser.set(user);
      }),
      map(() => void 0),
      catchError(() => of(void 0)),
    );
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
    const payload = this.decodePayload(token);
    return !!(payload?.['exp'] && (payload['exp'] as number) * 1000 < Date.now());
  }

  /** Decodifica el payload (claims) de un JWT base64url, o null si no se puede. */
  private decodePayload(token: string): Record<string, unknown> | null {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      return JSON.parse(atob(padded)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
