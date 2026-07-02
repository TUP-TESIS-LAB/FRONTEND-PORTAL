import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, switchMap, catchError, EMPTY } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { HeroCardComponent, HeroCardDetail } from '../../../shared/ui/components/hero-card/hero-card.component';
import { PlaceholderCardComponent } from '../../../shared/ui/components/placeholder-card/placeholder-card.component';
import { TopSheetComponent, TopSheetItem } from '../../../shared/ui/overlays/top-sheet/top-sheet.component';
import { AppointmentService } from '../turnos/services/appointment.service';
import { EstudioService } from '../estudios/estudio.service';
import { ActivePatientService } from '../../../core/active-patient/active-patient.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Turno } from '../../../core/models/turno.model';
import { Estudio } from '../../../core/models/estudio.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    ButtonModule,
    SkeletonModule,
    PageHeaderComponent,
    HeroCardComponent,
    PlaceholderCardComponent,
    TopSheetComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnDestroy {
  private readonly appointmentSvc = inject(AppointmentService);
  private readonly estudioSvc = inject(EstudioService);
  private readonly activePatient = inject(ActivePatientService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly proximoTurno = signal<Turno | null>(null);
  protected readonly ultimoEstudio = signal<Estudio | null>(null);
  protected readonly turnosCount = signal(0);

  /** True cuando NO hay próximo turno pero SÍ hay último estudio para fallback. */
  protected readonly mostrandoEstudioFallback = computed(
    () => this.proximoTurno() == null && this.ultimoEstudio() != null,
  );

  /** Detalles del último estudio para el hero card cuando se usa como fallback. */
  protected readonly estudioHeroDetails = computed<HeroCardDetail[]>(() => {
    const e = this.ultimoEstudio();
    if (!e) return [];
    const details: HeroCardDetail[] = [
      { icon: 'pi-file', text: e.nombre ?? `Estudio Nº ${e.protocolId}` },
      { icon: 'pi-calendar', text: e.fecha },
    ];
    if (e.sucursal) details.push({ icon: 'pi-map-marker', text: e.sucursal });
    return details;
  });

  /** Sheet de notificaciones (campanita en el header del dashboard). */
  protected readonly notificationsOpen = signal(false);

  // TODO: reemplazar por endpoint real de notificaciones cuando exista en el backend
  protected readonly notifications = signal<TopSheetItem[]>([]);

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
      { icon: 'pi-user', text: t.personaNombre },
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
  private readonly reload$ = new Subject<number | undefined>();

  constructor() {
    // Single cancelling stream: switchMap ensures a new patient switch cancels any
    // in-flight request from a prior patient.
    this.subs.add(
      this.reload$.pipe(
        switchMap(id =>
          this.appointmentSvc.getMyAppointments(id).pipe(
            catchError(() => {
              this.cargarUltimoEstudio();
              return EMPTY;
            }),
          ),
        ),
      ).subscribe(({ proximos }) => {
        this.turnosCount.set(proximos.length);
        // "El más próximo de cualquiera": el turno futuro más cercano entre todos
        // los pacientes accesibles (vos + dependientes).
        const proximo = [...proximos].sort((a, b) => a.fechaTs - b.fechaTs)[0] ?? null;
        this.proximoTurno.set(proximo);
        // Sin turno próximo → fallback al último estudio (mejor que placeholder vacío).
        if (proximo == null) {
          this.cargarUltimoEstudio();
        } else {
          this.cargando.set(false);
        }
      }),
    );

    // Carga inicial: todos los pacientes accesibles (sin patientId).
    this.cargando.set(true);
    this.reload$.next(undefined);
  }

  private cargarUltimoEstudio(): void {
    // El fallback de "último estudio" usa el paciente activo (uno a la vez, como
    // exige GET /me/results). Si aún no hay paciente activo resuelto, no hay fallback.
    const patientId = this.activePatient.activePatient()?.id ?? null;
    if (patientId == null) {
      this.ultimoEstudio.set(null);
      this.cargando.set(false);
      return;
    }
    this.subs.add(
      this.estudioSvc.getEstudios(patientId).subscribe({
        next: (estudios) => {
          const ordenados = [...estudios].sort((a, b) => b.fechaTs - a.fechaTs);
          this.ultimoEstudio.set(ordenados[0] ?? null);
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
