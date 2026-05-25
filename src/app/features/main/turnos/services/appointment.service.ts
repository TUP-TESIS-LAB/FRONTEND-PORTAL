import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { AppointmentResponse, appointmentToTurno, MapperContext } from '../../../../shared/mappers/appointment-to-turno.mapper';
import { Turno } from '../../../../core/models/turno.model';
import { SlotDisponible } from '../../../../core/models/slot-disponible.model';
import { TipoAnalisisService } from './tipo-analisis.service';
import { SucursalPublicService } from '../../../../core/sucursales/sucursal-public.service';
import { FamilyService } from '../../../../core/family/family.service';
import { parseLocalDateTime, toLocalDateString } from '../../../../shared/utils/local-datetime';

export interface BookPayload {
  patientId: number;
  branchId: number;
  scheduledAt: string;   // ISO datetime, e.g. "2026-05-30T08:30:00"
  determinations: Array<{ determinationId: number; orderNumber: number }>;
  comments?: string;
}

/**
 * Shape returned by GET /api/v1/turnos/availability
 * Matches AvailableSlotResponse Java record:
 *   configId, branchId, date, startTime ("HH:mm:ss"), endTime ("HH:mm:ss"),
 *   totalCapacity, bookedCount, available, slotId
 */
interface AvailableSlotResponse {
  configId: number;
  branchId: number;
  date: string;        // "2026-05-30"
  startTime: string;   // "08:30:00"  — LocalTime as ISO string
  endTime: string;     // "09:00:00"
  totalCapacity: number;
  bookedCount: number;
  available: number;
  slotId: string;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http      = inject(HttpClient);
  private readonly tiposSvc  = inject(TipoAnalisisService);
  private readonly sedeSvc   = inject(SucursalPublicService);
  private readonly familySvc = inject(FamilyService);

  getMyAppointments(): Observable<{ proximos: Turno[]; anteriores: Turno[] }> {
    return forkJoin({
      ap:     this.http.get<AppointmentResponse[]>('/api/v1/turnos/appointments?mine=true'),
      tipos:  this.tiposSvc.getTipos(),
      sedes:  this.sedeSvc.getSedes(),
      family: this.familySvc.getFamily(),
    }).pipe(map(({ ap, tipos, sedes, family }) => {
      const tiposByDetermination = new Map<number, typeof tipos[number]>();
      for (const t of tipos) {
        for (const d of t.determinationIds) {
          tiposByDetermination.set(d, t);
        }
      }

      const ctx: MapperContext = {
        tiposAnalisis: tiposByDetermination,
        sedes:  new Map(sedes.map(s => [s.id, s])),
        family: new Map(family.map(f => [f.id, f])),
      };

      const now = Date.now();
      const proximos: Turno[]   = [];
      const anteriores: Turno[] = [];

      for (const a of ap) {
        const turno = appointmentToTurno(a, ctx);
        const parsed = parseLocalDateTime(a.scheduledAt);
        const ts = parsed?.getTime() ?? NaN;
        (isFinite(ts) && ts >= now ? proximos : anteriores).push(turno);
      }

      return { proximos, anteriores };
    }));
  }

  cancel(id: number): Observable<void> {
    return this.http.patch<void>(`/api/v1/turnos/appointments/${id}/cancel`, {});
  }

  book(p: BookPayload): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/v1/turnos/appointments', {
      patientId:          p.patientId,
      branchId:           p.branchId,
      scheduledAt:        p.scheduledAt,
      comments:           p.comments ?? null,
      prescriptionFileUrl: null,
      determinations:     p.determinations,
    });
  }

  getAvailability(branchId: number, date: Date): Observable<SlotDisponible[]> {
    const iso = toLocalDateString(date);
    return this.http
      .get<AvailableSlotResponse[]>(
        `/api/v1/turnos/availability?branchId=${branchId}&date=${iso}`,
      )
      .pipe(map(slots => slots.map(s => ({
        hora:       s.startTime.slice(0, 5),   // "08:30:00" → "08:30"
        disponible: s.available > 0,
      }))));
  }
}
