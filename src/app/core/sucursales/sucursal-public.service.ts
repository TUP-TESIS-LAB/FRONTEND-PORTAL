import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { Sede } from '../models/sede.model';
import { TenantService } from '../tenant/tenant.service';

/**
 * Matches the actual BranchPublicResponse Java record which exposes
 * flat street/streetNumber fields (NOT nested under address).
 */
interface BranchPublicResponse {
  id: number;
  code: string;
  description: string;
  status: string;
  street?: string | null;
  streetNumber?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SucursalPublicService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantService);
  private cache$: Observable<Sede[]> | null = null;

  getSedes(): Observable<Sede[]> {
    if (!this.cache$) {
      const slug = this.tenant.config()?.id ?? '';
      this.cache$ = this.http
        .get<BranchPublicResponse[]>(`/api/v1/sucursales/public?slug=${encodeURIComponent(slug)}`)
        .pipe(
          map(list => list.map(b => this.toSede(b))),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.cache$;
  }

  private toSede(b: BranchPublicResponse): Sede {
    const direccion = [b.street, b.streetNumber]
      .filter(Boolean).join(' ').trim() || '—';
    return {
      id: String(b.id),
      nombre: b.description,
      direccion,
      // telefono / horario / distanciaKm not exposed by backend
    };
  }
}
