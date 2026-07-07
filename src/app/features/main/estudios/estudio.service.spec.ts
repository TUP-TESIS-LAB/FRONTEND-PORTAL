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
  reportId: null,
  reportAvailable: false,
  analysisName: null,
  familyName: null,
};

const DTO_CON_INFORME: AnalyticalResultResponse = {
  ...DTO,
  reportId: 77,
  reportAvailable: true,
};

const DTO_CON_CATALOGO: AnalyticalResultResponse = {
  ...DTO,
  analysisName: 'TGO (AST)',
  familyName: 'Bioquímica',
};

describe('fromAnalyticalResult (mapper)', () => {
  it('mapea los campos mínimos y formatea la fecha a DD/MM/YYYY', () => {
    const e = fromAnalyticalResult(DTO);
    expect(e.id).toBe(7);
    expect(e.patientId).toBe(10);
    expect(e.protocolId).toBe(42);
    expect(e.nombre).toBe('Estudio Nº 42');
    expect(e.fecha).toBe('14/04/2026');
    expect(e.fechaTs).toBe(new Date('2026-04-14T10:30:00').getTime());
  });

  it('sin informe firmado: estado "en proceso", descarga no disponible, sin reportId', () => {
    const e = fromAnalyticalResult(DTO);
    expect(e.estado).toBe('en-proceso');
    expect(e.reporteDisponible).toBe(false);
    expect(e.reportId).toBeUndefined();
    expect(e.personaNombre).toBe('');
  });

  it('con informe firmado (KAN-168): estado "disponible", descarga habilitada y reportId', () => {
    const e = fromAnalyticalResult(DTO_CON_INFORME);
    expect(e.estado).toBe('disponible');
    expect(e.reporteDisponible).toBe(true);
    expect(e.reportId).toBe(77);
  });

  it('deja los campos ricos diferidos como undefined', () => {
    const e = fromAnalyticalResult(DTO);
    expect(e.sucursal).toBeUndefined();
    expect(e.categoria).toBeUndefined();
    expect(e.estadoFirma).toBeUndefined();
    expect(e.sede).toBeUndefined();
  });

  it('con analysisName/familyName del catálogo (KAN-209): nombre real y categoría mapeada', () => {
    const e = fromAnalyticalResult(DTO_CON_CATALOGO);
    expect(e.nombre).toBe('TGO (AST)');
    expect(e.categoria).toBe('bioquimica');
  });

  it('sin analysisName: degrada al placeholder "Estudio Nº {protocolId}"', () => {
    const e = fromAnalyticalResult(DTO);
    expect(e.nombre).toBe('Estudio Nº 42');
  });

  it('con familyName sin mapeo conocido (ej. Serología): categoria degrada a undefined', () => {
    const e = fromAnalyticalResult({ ...DTO, analysisName: 'VDRL', familyName: 'Serología' });
    expect(e.categoria).toBeUndefined();
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

  it('descargarReporte pega a /api/v1/me/results/reports/{reportId}/pdf como blob', () => {
    let result: unknown;
    service.descargarReporte(77).subscribe(r => (result = r));

    const req = httpMock.expectOne('/api/v1/me/results/reports/77/pdf');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    req.flush(blob);

    expect(result).toBeInstanceOf(Blob);
  });
});
