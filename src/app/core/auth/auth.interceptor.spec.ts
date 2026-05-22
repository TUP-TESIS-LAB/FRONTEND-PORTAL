import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { tokenStorage } from './token-storage';
import { Router } from '@angular/router';
import { TenantService } from '../tenant/tenant.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let mock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: TenantService, useValue: { config: () => ({ id: 'demo' }) } },
      ],
    });
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
  });

  it('injects Bearer when token present and URL not in skip list', () => {
    tokenStorage.set('jwt-1');
    TestBed.inject(AuthService).loadFromStorage();
    http.get('/api/v1/turnos/appointments').subscribe();
    const req = mock.expectOne('/api/v1/turnos/appointments');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-1');
  });

  it('skips Bearer for /auth/login', () => {
    tokenStorage.set('jwt-1');
    TestBed.inject(AuthService).loadFromStorage();
    http.post('/api/v1/auth/login', {}).subscribe();
    const req = mock.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('skips Bearer for /sucursales/public', () => {
    tokenStorage.set('jwt-1');
    TestBed.inject(AuthService).loadFromStorage();
    http.get('/api/v1/sucursales/public?slug=demo').subscribe();
    const req = mock.expectOne(r => r.url.includes('/sucursales/public'));
    expect(req.request.headers.has('Authorization')).toBe(false);
  });
});
