import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PasswordRecoveryService } from './password-recovery.service';
import { TenantService } from '../../../../core/tenant/tenant.service';

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: TenantService, useValue: { config: () => ({ id: 'demo' }) } },
        PasswordRecoveryService,
      ],
    });
    service = TestBed.inject(PasswordRecoveryService);
    http = TestBed.inject(HttpTestingController);
  });
  it('forgot posts email + X-Tenant-Slug', () => {
    service.forgot('a@a.com').subscribe();
    const req = http.expectOne('/api/v1/auth/password/forgot');
    expect(req.request.body).toEqual({ email: 'a@a.com' });
    expect(req.request.headers.get('X-Tenant-Slug')).toBe('demo');
    req.flush(null);
  });
  it('validateToken posts token', () => {
    service.validateToken('tok').subscribe();
    const req = http.expectOne('/api/v1/auth/password/validate-token');
    expect(req.request.body).toEqual({ token: 'tok' });
    req.flush(null);
  });
  it('reset posts token + newPassword', () => {
    service.reset('tok', 'Password123').subscribe();
    const req = http.expectOne('/api/v1/auth/password/reset');
    expect(req.request.body).toEqual({ token: 'tok', newPassword: 'Password123' });
    req.flush(null);
  });
});
