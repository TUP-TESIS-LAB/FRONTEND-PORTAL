import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/auth/auth.service';

const USER_MOCK: User = {
  id: 1,
  nombre: 'María Soledad',
  apellido: 'Fernández',
  iniciales: 'MF',
  dni: '30.456.789',
  fechaNac: '14/05/1988',
  edad: 38,
  sexo: 'F',
  ciudad: 'Córdoba',
  email: 'maria.fernandez@email.com',
  telefono: '+54 351 555-1234',
  direccion: 'Av. Hipólito Yrigoyen 1234, Córdoba',

  cobertura: {
    tipo: 'Obra social',
    nombre: 'OSDE 410',
    plan: 'Plan Premium',
    afiliado: '12345678/01',
    vigente: true,
    venceEn: '12/2026',
  },

  datosMedicos: {
    grupoSanguineo: '0+',
    alergias: ['Penicilina', 'Polen'],
    condiciones: ['Tiroides controlada'],
    medicacionHabitual: ['Levotiroxina 50 mcg · diaria'],
    cirugiasPrevias: ['Apendicectomía 2018'],
    ultimaRevision: '14/04/2026',
    habitos: {
      fuma: 'No',
      alcohol: 'Ocasional',
      actividadFisica: '3 veces / semana',
    },
  },

  contactoEmergencia: {
    nombre: 'Juan Pérez',
    vinculo: 'Cónyuge',
    telefono: '+54 351 555-9999',
  },
};

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getPerfil(): Observable<User> {
    return of(USER_MOCK).pipe(delay(300));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`/api/v1/user/${this.auth.userId()}/password`, { currentPassword, newPassword });
  }
}
