import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FamilyService } from './family.service';

const RAW_RESPONSE = [
  {
    patientId: 1,
    firstName: 'Ana',
    lastName: 'Lopez',
    dni: '12345678',
    birthDate: '1994-06-15',
    bond: 'HIJA',
    isOwner: false,
    status: 'VERIFIED',
    userPatientId: 10,
  },
  {
    patientId: 2,
    firstName: 'Carlos',
    lastName: 'Lopez',
    dni: '87654321',
    birthDate: '2010-03-20',
    bond: 'HIJO',
    isOwner: false,
    status: 'CREATED',
    userPatientId: 20,
  },
];

describe('FamilyService', () => {
  let service: FamilyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FamilyService,
      ],
    });
    service = TestBed.inject(FamilyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('getFamily', () => {
    it('maps status and userPatientId from response', () => {
      let result: ReturnType<typeof service.getFamily> extends import('rxjs').Observable<infer T> ? T : never = [];
      service.getFamily().subscribe(r => { result = r; });

      const req = httpMock.expectOne('/api/v1/empresa/patients/me/family');
      expect(req.request.method).toBe('GET');
      req.flush(RAW_RESPONSE);

      expect(result).toHaveLength(2);
      expect(result[0].userPatientId).toBe(10);
      expect(result[0].status).toBe('VERIFIED');
      expect(result[1].userPatientId).toBe(20);
      expect(result[1].status).toBe('CREATED');
    });

    it('maps nombre and apellido from firstName/lastName', () => {
      let result: any[] = [];
      service.getFamily().subscribe(r => { result = r; });
      httpMock.expectOne('/api/v1/empresa/patients/me/family').flush(RAW_RESPONSE);

      expect(result[0].nombre).toBe('Ana');
      expect(result[0].apellido).toBe('Lopez');
    });
  });

  describe('addFamilyMember', () => {
    it('POST to /api/v1/empresa/patients/me/family with payload', () => {
      const payload = {
        firstName: 'Juan',
        lastName: 'Perez',
        dni: '99999999',
        birthDate: '1990-01-01',
        gender: 'MALE',
        bond: 'HIJO',
      };
      service.addFamilyMember(payload).subscribe();

      const req = httpMock.expectOne('/api/v1/empresa/patients/me/family');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(null, { status: 201, statusText: 'Created' });
    });
  });

  describe('removeFamilyMember', () => {
    it('DELETE to /api/v1/empresa/patients/me/family/{userPatientId}', () => {
      service.removeFamilyMember(42).subscribe();

      const req = httpMock.expectOne('/api/v1/empresa/patients/me/family/42');
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });
});
