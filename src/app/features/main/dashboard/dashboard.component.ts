import { Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { signal } from '@angular/core';
import { AppointmentService } from '../turnos/services/appointment.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Turno } from '../../../core/models/turno.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ButtonModule, SkeletonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly appointmentSvc = inject(AppointmentService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly proximoTurno = signal<Turno | null>(null);
  protected readonly turnosCount = signal(0);

  protected readonly nombrePaciente = computed(() => {
    const u = this.auth.currentUser();
    // El AuthUser tiene `nombre` ("Juan Perez") — extraemos solo el primer nombre
    // para un saludo casual ("Hola, Juan!").
    return u?.nombre?.split(' ')[0] ?? 'Paciente';
  });

  private subs = new Subscription();

  ngOnInit(): void {
    this.cargarProximoTurno();
  }

  private cargarProximoTurno(): void {
    this.cargando.set(true);
    this.subs.add(
      this.appointmentSvc.getMyAppointments().subscribe({
        next: ({ proximos }) => {
          this.turnosCount.set(proximos.length);
          this.proximoTurno.set(proximos[0] ?? null);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
        },
      }),
    );
  }

  protected onSacarTurno(): void {
    this.router.navigate(['/turnos/sacar']);
  }
  protected onVerTurnos(): void {
    this.router.navigate(['/turnos']);
  }
  protected onVerEstudios(): void {
    this.router.navigate(['/estudios']);
  }
  protected onVerFamilia(): void {
    this.router.navigate(['/familia']);
  }
  protected onVerPerfil(): void {
    this.router.navigate(['/perfil']);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
