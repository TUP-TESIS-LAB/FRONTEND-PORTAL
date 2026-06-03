import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { HeroCardComponent, HeroCardDetail } from '../../../shared/ui/components/hero-card/hero-card.component';
import { PlaceholderCardComponent } from '../../../shared/ui/components/placeholder-card/placeholder-card.component';
import { AppointmentService } from '../turnos/services/appointment.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Turno } from '../../../core/models/turno.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    ButtonModule,
    SkeletonModule,
    PageHeaderComponent,
    HeroCardComponent,
    PlaceholderCardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
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

  /**
   * Detalles que renderiza ui-hero-card del próximo turno: hora, sede,
   * dirección (si existe). Mismo patrón que TurnosComponent.sedeDetailsFor.
   */
  protected readonly heroDetails = computed<HeroCardDetail[]>(() => {
    const t = this.proximoTurno();
    if (!t) return [];
    const details: HeroCardDetail[] = [
      { icon: 'pi-clock', text: `${t.hora} hs · ${t.fechaCompleta}` },
      { icon: 'pi-map-marker', text: t.sede.nombre },
    ];
    const direccion = t.sede.direccion?.trim();
    if (direccion && direccion !== '—') {
      details.push({ icon: 'pi-compass', text: direccion });
    }
    return details;
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
