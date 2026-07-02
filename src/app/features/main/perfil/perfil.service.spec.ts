import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PerfilService } from './perfil.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('PerfilService', () => {
  let service: PerfilService; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { userId: () => 500 } },
        PerfilService,
      ],
    });
    service = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });
  it('changePassword PUTs to /user/{id}/password', () => {
    service.changePassword('old12345', 'new12345').subscribe();
    const req = http.expectOne('/api/v1/user/500/password');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentPassword: 'old12345', newPassword: 'new12345' });
    req.flush(null);
  });
  it('getPerfil GETs /me/profile', () => {
    service.getPerfil().subscribe();
    const req = http.expectOne('/api/v1/me/profile');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
  it('updatePerfil PUTs /me/profile with body', () => {
    const payload = { email: 'a@b.com', phone: '123', address: 'calle 1' };
    service.updatePerfil(payload).subscribe();
    const req = http.expectOne('/api/v1/me/profile');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('updatePerfil con patientId agrega ?patientId= (dependiente sin cuenta)', () => {
    const payload = { email: 'a@b.com', phone: '123', address: 'calle 1' };
    service.updatePerfil(payload, 20013).subscribe();
    const req = http.expectOne('/api/v1/me/profile?patientId=20013');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('updatePerfil con patientId null se comporta como el propio', () => {
    service.updatePerfil({ email: 'a@b.com', phone: '1', address: 'x' }, null).subscribe();
    http.expectOne('/api/v1/me/profile').flush({});
  });
});
