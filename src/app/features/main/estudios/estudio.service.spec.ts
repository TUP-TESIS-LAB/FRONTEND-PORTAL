import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EstudioService, fromAnalyticalResult } from './estudio.service';
import type { AnalyticalResultResponse } from '../../../core/models/estudio.model';

const DTO: AnalyticalResultResponse = {
  id: 7,
  tenantId: 1,
  protocolId: 42,
  analysisOrderId: 99,
  sectionId: 3,
  patientId: 10,
  collectionDate: '2026-04-14T10:30:00',
  active: true,
  version: 0,
};

describe('fromAnalyticalResult (mapper)', () => {
  it('mapea los campos mínimos y formatea la fecha a DD/MM/YYYY', () => {
    const e = fromAnalyticalResult(DTO);
    expect(e.id).toBe(7);
    expect(e.patientId).toBe(10);
    expect(e.protocolId).toBe(42);
    expect(e.fecha).toBe('14/04/2026');
    expect(e.fechaTs).toBe(new Date('2026-04-14T10:30:00').getTime());
  });

  it('deja los campos diferidos (KAN-168) como undefined', () => {
    const e = fromAnalyticalResult(DTO);
    expect(e.sucursal).toBeUndefined();
    expect(e.nombre).toBeUndefined();
    expect(e.estadoFirma).toBeUndefined();
    expect(e.reporteDisponible).toBeUndefined();
  });
});

describe('EstudioService', () => {
  let service: EstudioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EstudioService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EstudioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getEstudios pega a /api/v1/me/results con el patientId y mapea', () => {
    let result: unknown;
    service.getEstudios(10).subscribe(r => (result = r));

    const req = httpMock.expectOne(r => r.url === '/api/v1/me/results');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('patientId')).toBe('10');
    req.flush([DTO]);

    expect(result).toEqual([fromAnalyticalResult(DTO)]);
  });
});
