import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TenantService } from '../../../../core/tenant/tenant.service';

@Injectable({ providedIn: 'root' })
export class PasswordRecoveryService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantService);

  private slugHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Tenant-Slug': this.tenant.config()?.id ?? '' });
  }

  forgot(email: string): Observable<void> {
    return this.http.post<void>('/api/v1/auth/password/forgot', { email }, { headers: this.slugHeaders() });
  }

  validateToken(token: string): Observable<void> {
    return this.http.post<void>('/api/v1/auth/password/validate-token', { token }, { headers: this.slugHeaders() });
  }

  reset(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>('/api/v1/auth/password/reset', { token, newPassword }, { headers: this.slugHeaders() });
  }
}
