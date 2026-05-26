import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { Sede } from '../models/sede.model';
import { TenantService } from '../tenant/tenant.service';

/**
 * Matches the actual BranchPublicResponse Java record.
 * `phone` and `schedules` are added in feat/branch-public-fields backend branch;
 * when that branch is not merged they are simply absent from the response,
 * and the mapper falls back to empty string safely.
 */
interface BackendPublicSchedule {
  dayFrom: string;
  dayTo: string;
  fromTime: string;
  toTime: string;
}

interface BranchPublicResponse {
  id: number;
  code: string;
  description: string;
  status: string;
  street?: string | null;
  streetNumber?: string | null;
  phone?: string | null;
  schedules?: BackendPublicSchedule[] | null;
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
      telefono: b.phone ?? '',
      horario: this.formatSchedules(b.schedules ?? []),
    };
  }

  private formatSchedules(schedules: BackendPublicSchedule[]): string {
    if (schedules.length === 0) return '';
    const SHORT: Record<string, string> = {
      MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Mié', THURSDAY: 'Jue',
      FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
    };
    return schedules.map(s => {
      const days = s.dayFrom === s.dayTo
        ? (SHORT[s.dayFrom] ?? s.dayFrom)
        : `${SHORT[s.dayFrom] ?? s.dayFrom} a ${SHORT[s.dayTo] ?? s.dayTo}`;
      return `${days} ${s.fromTime} — ${s.toTime}`;
    }).join(', ');
  }
}
