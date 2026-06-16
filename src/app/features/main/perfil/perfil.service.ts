import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PerfilPaciente, UpdatePerfilPayload } from '../../../core/models/perfil.model';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  getPerfil(): Observable<PerfilPaciente> { return this.http.get<PerfilPaciente>('/api/v1/me/profile'); }
  updatePerfil(payload: UpdatePerfilPayload): Observable<PerfilPaciente> { return this.http.put<PerfilPaciente>('/api/v1/me/profile', payload); }
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`/api/v1/user/${this.auth.userId()}/password`, { currentPassword, newPassword });
  }
}
