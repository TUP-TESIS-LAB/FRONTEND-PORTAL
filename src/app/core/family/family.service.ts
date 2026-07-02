import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { Familiar } from '../models/familiar.model';

interface PatientFamilyResponse {
  patientId: number;
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  bond: string;        // PROPIO | MADRE | PADRE | HIJO | HIJA | HERMANO | HERMANA | TUTOR | OTROS
  isOwner: boolean;
  status: string;
  userPatientId: number;
  /** True si el paciente tiene su propia cuenta del portal. Opcional para
   *  tolerar backends que todavía no exponen el campo. */
  hasOwnAccount?: boolean;
}

export interface AddFamilyMemberPayload {
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string | null;
  gender: string | null;
  bond: string;
}

const ACCENT_COLORS: Array<'primary' | 'secondary' | 'accent'> = ['primary', 'secondary', 'accent'];

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private readonly http = inject(HttpClient);
  private cached = signal<Familiar[] | null>(null);

  getFamily(): Observable<Familiar[]> {
    const cached = this.cached();
    if (cached) return of(cached);
    return this.http.get<PatientFamilyResponse[]>('/api/v1/empresa/patients/me/family')
      .pipe(
        map(list => list.map((p, idx) => this.toFamiliar(p, idx))),
        tap(list => this.cached.set(list)),
      );
  }

  addFamilyMember(payload: AddFamilyMemberPayload): Observable<void> {
    return this.http.post<void>('/api/v1/empresa/patients/me/family', payload);
  }

  removeFamilyMember(userPatientId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/empresa/patients/me/family/${userPatientId}`);
  }

  refresh(): void { this.cached.set(null); }

  private toFamiliar(p: PatientFamilyResponse, idx: number): Familiar {
    const edad = Math.floor(
      (Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000),
    );
    const vinculo: Familiar['vinculo'] =
      p.bond === 'PROPIO' ? 'Yo' : this.normalizeBond(p.bond);
    return {
      id: p.patientId,
      userPatientId: p.userPatientId,
      status: p.status as Familiar['status'],
      nombre: p.firstName,
      apellido: p.lastName,
      iniciales: (p.firstName[0] ?? '?').toUpperCase(),
      edad,
      vinculo,
      dni: p.dni,
      // Fallback conservador: si el backend no manda el campo, se asume que
      // tiene cuenta (no se habilita la edición por el titular).
      tieneCuenta: p.hasOwnAccount ?? true,
      cobertura: '',                                 // TODO: backend does not return this in MVP
      totalTurnos: 0,                                // TODO: derive from appointments
      totalEstudios: 0,                              // TODO: derive from results
      accentColor: ACCENT_COLORS[idx % ACCENT_COLORS.length],
    };
  }

  private normalizeBond(raw: string): Familiar['vinculo'] {
    const bondMap: Record<string, Familiar['vinculo']> = {
      PROPIO: 'Yo',
      HIJO: 'Hijo', HIJA: 'Hija',
      MADRE: 'Madre', PADRE: 'Padre',
      HERMANO: 'Otro', HERMANA: 'Otro',
      TUTOR: 'Otro', OTROS: 'Otro',
    };
    return bondMap[raw] ?? 'Otro';
  }
}
