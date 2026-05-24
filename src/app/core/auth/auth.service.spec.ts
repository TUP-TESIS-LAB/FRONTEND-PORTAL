import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { tokenStorage } from './token-storage';
import { TenantService } from '../tenant/tenant.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: TenantService,
          useValue: { config: () => ({ id: 'demo' }) },
        },
        AuthService,
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('login stores token + sets currentUser', () => {
    service.login('30123456', 'pass').subscribe();
    const req = httpMock.expectOne(r => r.url.endsWith('/api/v1/auth/login-patient'));
    req.flush({
      token: 'jwt-1',
      userId: 1,
      firstName: 'María',
      lastName: 'García',
      email: 'a@a',
      dni: '30123456',
      roles: ['EXTERNO'],
    });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.dni).toBe('30123456');
    expect(service.currentUser()?.nombre).toBe('María García');
    expect(tokenStorage.get()).toBe('jwt-1');
  });

  it('logout clears state', () => {
    tokenStorage.set('jwt-1');
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(tokenStorage.get()).toBeNull();
  });

  it('register issues token and authenticates', () => {
    service.register({
      tenantSlug: 'demo',
      firstName: 'María',
      lastName: 'García',
      dni: '30000000',
      email: 'a@a',
      password: 'Password123',
    }).subscribe();
    const req = httpMock.expectOne(r => r.url.endsWith('/api/v1/auth/register-patient'));
    req.flush({ token: 'jwt-new', userId: 99 });
    expect(service.isAuthenticated()).toBe(true);
    expect(tokenStorage.get()).toBe('jwt-new');
  });
});
