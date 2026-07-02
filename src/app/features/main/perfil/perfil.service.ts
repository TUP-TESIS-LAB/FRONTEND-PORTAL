import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PerfilPaciente, UpdatePerfilPayload } from '../../../core/models/perfil.model';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  /** Perfil propio (sin patientId) o de un dependiente accesible (?patientId=X, anti-IDOR en el back). */
  getPerfil(patientId?: number | null): Observable<PerfilPaciente> {
    const url = '/api/v1/me/profile' + (patientId != null ? `?patientId=${patientId}` : '');
    return this.http.get<PerfilPaciente>(url);
  }
  /** Actualiza el perfil propio (sin patientId) o el de un dependiente SIN
   *  cuenta propia (?patientId=X — el backend valida acceso y que no tenga cuenta). */
  updatePerfil(payload: UpdatePerfilPayload, patientId?: number | null): Observable<PerfilPaciente> {
    const url = '/api/v1/me/profile' + (patientId != null ? `?patientId=${patientId}` : '');
    return this.http.put<PerfilPaciente>(url, payload);
  }
  /** Autoalta: la cuenta de gestión se registra como paciente propio. */
  registerAsPatient(): Observable<{ patientId: number }> {
    return this.http.post<{ patientId: number }>('/api/v1/me/register-as-patient', {});
  }
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`/api/v1/user/${this.auth.userId()}/password`, { currentPassword, newPassword });
  }
}
