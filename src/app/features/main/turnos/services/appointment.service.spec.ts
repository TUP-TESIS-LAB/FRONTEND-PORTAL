import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AppointmentService } from './appointment.service';
import { TipoAnalisisService } from './tipo-analisis.service';
import { SucursalPublicService } from '../../../../core/sucursales/sucursal-public.service';
import { FamilyService } from '../../../../core/family/family.service';

describe('AppointmentService.reschedule', () => {
  let service: AppointmentService; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: TipoAnalisisService, useValue: { getTipos: () => of([]) } },
        { provide: SucursalPublicService, useValue: { getSedes: () => of([]) } },
        { provide: FamilyService, useValue: { getFamily: () => of([]) } },
        AppointmentService,
      ],
    });
    service = TestBed.inject(AppointmentService);
    http = TestBed.inject(HttpTestingController);
  });
  it('PATCHes newScheduledAt', () => {
    service.reschedule(5, '2026-07-01T09:00:00').subscribe();
    const req = http.expectOne('/api/v1/turnos/appointments/5/reschedule');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ newScheduledAt: '2026-07-01T09:00:00' });
    req.flush(null);
  });
});
