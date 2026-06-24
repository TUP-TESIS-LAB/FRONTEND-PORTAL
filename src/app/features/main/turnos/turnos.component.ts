import { Component, OnInit, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, switchMap, catchError, EMPTY, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DrawerModule } from 'primeng/drawer';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/components/empty-state/empty-state.component';
import { EventCardComponent } from '../../../shared/ui/components/event-card/event-card.component';
import { PlaceholderCardComponent } from '../../../shared/ui/components/placeholder-card/placeholder-card.component';
import { TurnoDetailComponent } from '../../../shared/ui/components/turno-detail/turno-detail.component';
import { SlotPickerComponent } from '../../../shared/ui/components/slot-picker/slot-picker.component';
import { EstadoTurnoLabelPipe } from '../../../shared/pipes/estado-turno-label.pipe';
import { EstadoTurnoKeyPipe } from '../../../shared/pipes/estado-turno-key.pipe';
import { BreakpointService } from '../../../shared/utils/breakpoint.service';
import { AppointmentService } from './services/appointment.service';
import { ActivePatientService } from '../../../core/active-patient/active-patient.service';
import { mapApiError } from '../../../shared/utils/api-error-mapper';
import { toLocalDateTimeString } from '../../../shared/utils/local-datetime';
import { EstadoTurno, Turno } from '../../../core/models/turno.model';
import { SlotDisponible } from '../../../core/models/slot-disponible.model';
import { selectRescheduling, selectRescheduledId, selectRescheduleError } from './store/turnos.selectors';
import * as TurnosActions from './store/turnos.actions';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    DrawerModule,
    SelectButtonModule,
    SkeletonModule,
    ToastModule,
    PageHeaderComponent,
    EmptyStateComponent,
    EventCardComponent,
    PlaceholderCardComponent,
    TurnoDetailComponent,
    SlotPickerComponent,
    EstadoTurnoLabelPipe,
    EstadoTurnoKeyPipe,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './turnos.component.html',
  styleUrl: './turnos.component.scss',
})
export class TurnosComponent implements OnInit, OnDestroy {
  private readonly appointmentSvc  = inject(AppointmentService);
  private readonly activePatientSvc = inject(ActivePatientService);
  private readonly messageService = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly router         = inject(Router);
  private readonly store          = inject(Store);
  readonly bp                     = inject(BreakpointService);

  readonly rescheduling = this.store.selectSignal(selectRescheduling);

  // ─── Reprogramar: estado del drawer (picker de slots) ─────
  reprogramarOpen     = signal(false);
  reprogramarTurnoId  = signal<number | null>(null);
  reprogramarBranchId = signal<number | null>(null);
  reprogramarFecha    = signal<Date | null>(null);
  reprogramarHora     = signal<string | null>(null);
  reprogramarSlots    = signal<SlotDisponible[]>([]);

  // El backend exige fecha del turno >= hoy + 2 días (igual que sacar-turno).
  readonly minBookingDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  proximosTurnos   = signal<Turno[]>([]);
  anterioresTurnos = signal<Turno[]>([]);
  cargando         = signal(true);

  selectedTurno    = signal<Turno | null>(null);
  mobileDetailOpen = signal(false);

  // ─── Filtros seleccionables ──────────────────────────────
  /** Chips de estado activos (estado local). Vacío = todos. */
  estadoFilter   = signal<EstadoTurno[]>([]);
  /** Fecha desde (filtro mínimo). null = sin tope inferior. */
  fechaDesde     = signal<Date | null>(null);
  /** Fecha hasta (filtro máximo). null = sin tope superior. */
  fechaHasta     = signal<Date | null>(null);

  /** Chips de estado: 4 categorías user-facing fijas que agrupan los 7 estados
   *  del backend (per appointment-to-turno.mapper.ts). Curado para UX:
   *    - SCHEDULED / IN_PROGRESS / RESCHEDULED → "Pendiente"
   *    - CONFIRMED                              → "Confirmado"
   *    - COMPLETED                              → "Completado"
   *    - CANCELLED / NO_SHOW                    → "Cancelado" */
  /** 3 chips relevantes para el paciente. Confirmado se omite (back no lo setea hoy). */
  protected readonly estadoOptions: { label: string; value: EstadoTurno }[] = [
    { label: 'Programado', value: 'pendiente' },  // SCHEDULED + IN_PROGRESS + RESCHEDULED
    { label: 'Asistido',   value: 'completado' }, // COMPLETED
    { label: 'Cancelado',  value: 'cancelado' },  // CANCELLED + NO_SHOW
  ];

  /** Lista combinada (próximos + anteriores) filtrada según los filtros activos. */
  protected readonly visibleTurnos = computed(() => {
    const all = [...this.proximosTurnos(), ...this.anterioresTurnos()];
    return this.applyFilters(all);
  });

  /** Turnos pendientes (arriba, antes del HR). */
  protected readonly pendientes = computed(() =>
    this.visibleTurnos().filter(t => t.estado === 'pendiente')
  );

  /** Resto de turnos (después del HR): asistidos, cancelados, completados. */
  protected readonly otrosTurnos = computed(() =>
    this.visibleTurnos().filter(t => t.estado !== 'pendiente')
  );

  // ─── Drawer de filtros en mobile ─────────────────────────
  filtersOpen = signal(false);

  protected readonly activeFiltersCount = computed(() => {
    let n = 0;
    if (this.estadoFilter().length > 0) n++;
    if (this.fechaDesde()) n++;
    if (this.fechaHasta()) n++;
    return n;
  });

  protected readonly hasActiveFilters = computed(() =>
    this.fechaDesde() !== null
    || this.fechaHasta() !== null
    || this.estadoFilter().length > 0
  );

  private applyFilters(list: Turno[]): Turno[] {
    const estados = new Set(this.estadoFilter());
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();

    return list.filter(t => {
      if (estados.size > 0 && !estados.has(t.estado)) return false;
      if (desde || hasta) {
        const turnoDate = new Date(t.fechaCompleta);
        if (desde && turnoDate < desde) return false;
        if (hasta && turnoDate > hasta) return false;
      }
      return true;
    });
  }

  clearFilters(): void {
    this.estadoFilter.set([]);
    this.fechaDesde.set(null);
    this.fechaHasta.set(null);
  }

  private subs = new Subscription();
  private readonly reload$ = new Subject<number | undefined>();

  constructor() {
    // Single cancelling stream: switchMap ensures a new patient switch cancels any
    // in-flight request from a prior patient.
    this.subs.add(
      this.reload$.pipe(
        tap(() => this.cargando.set(true)),
        switchMap(id =>
          this.appointmentSvc.getMyAppointments(id).pipe(
            catchError(err => {
              this.cargando.set(false);
              this.messageService.add({
                severity: 'error', summary: 'Error',
                detail: mapApiError(err), life: 4000,
              });
              return EMPTY;
            }),
          ),
        ),
      ).subscribe(({ proximos, anteriores }) => {
        this.proximosTurnos.set(proximos);
        this.anterioresTurnos.set(anteriores);
        this.cargando.set(false);
      }),
    );

    effect(() => {
      const p = this.activePatientSvc.activePatient();
      if (p) this.reload$.next(p.id);
    });
  }

  private readonly autoSelectEffect = effect(() => {
    const turnos = this.proximosTurnos();
    if (!this.bp.isMobile() && turnos.length > 0 && !this.selectedTurno()) {
      this.selectedTurno.set(turnos[0]);
    }
  });

  private readonly rescheduledId    = this.store.selectSignal(selectRescheduledId);
  private readonly rescheduleError  = this.store.selectSignal(selectRescheduleError);

  /** Reacciona al resultado de la reprogramación (éxito/fallo) desde la store. */
  private readonly rescheduleResultEffect = effect(() => {
    const id = this.rescheduledId();
    if (id !== null) {
      this.reprogramarOpen.set(false);
      this.reprogramarTurnoId.set(null);
      this.mobileDetailOpen.set(false);
      this.selectedTurno.set(null);
      this.reload$.next(untracked(() => this.activePatientSvc.activePatient()?.id));
      this.messageService.add({
        severity: 'success', summary: 'Turno reprogramado',
        detail: 'Tu turno fue reprogramado correctamente.', life: 4000,
      });
      // One-shot: consumimos el id pasando rescheduledId a null. Reprogramar el
      // mismo turno de nuevo vuelve a disparar (pasa por null en la request).
      this.store.dispatch(TurnosActions.rescheduleHandled());
      return;
    }
    const err = this.rescheduleError();
    if (err) {
      this.messageService.add({
        severity: 'error', summary: 'Error',
        detail: mapApiError(err), life: 4000,
      });
    }
  });

  ngOnInit(): void {
    this.showPendingBookingToast();
  }

  /**
   * Si el wizard de sacar turno dejo un flag en sessionStorage (porque el
   * MessageService del wizard se destruye al navegar aca), lo levantamos y
   * mostramos el toast en este componente.
   */
  private showPendingBookingToast(): void {
    const raw = sessionStorage.getItem('portal.turnoJustBooked');
    if (!raw) return;
    sessionStorage.removeItem('portal.turnoJustBooked');
    try {
      const { detail } = JSON.parse(raw) as { detail: string };
      this.messageService.add({
        severity: 'success',
        summary: 'Turno reservado',
        detail,
        life: 5000,
      });
    } catch {
      // sessionStorage corrupto - ignoramos silenciosamente
    }
  }

  onTurnoClick(turno: Turno): void {
    this.selectedTurno.set(turno);
    if (this.bp.isMobile()) {
      this.mobileDetailOpen.set(true);
    }
  }

  /** Abre el drawer de reprogramación para el turno dado. */
  onReprogramar(turno: Turno): void {
    this.reprogramarTurnoId.set(turno.id);
    this.reprogramarBranchId.set(Number(turno.sede.id));
    this.reprogramarFecha.set(null);
    this.reprogramarHora.set(null);
    this.reprogramarSlots.set([]);
    this.reprogramarOpen.set(true);
  }

  /** El paciente eligió una fecha: limpiamos hora y cargamos slots de esa sede/fecha. */
  onReprogramarFecha(fecha: Date): void {
    this.reprogramarFecha.set(fecha);
    this.reprogramarHora.set(null);
    this.reprogramarSlots.set([]);
    const branchId = this.reprogramarBranchId();
    if (branchId === null) return;
    this.subs.add(
      this.appointmentSvc.getAvailability(branchId, fecha).subscribe({
        next: (slots) => this.reprogramarSlots.set(slots),
        error: (err) => {
          this.messageService.add({
            severity: 'error', summary: 'Error',
            detail: mapApiError(err), life: 4000,
          });
        },
      }),
    );
  }

  /** Compone fecha + hora y despacha la reprogramación a la store. */
  confirmReprogramar(): void {
    const id = this.reprogramarTurnoId();
    const fecha = this.reprogramarFecha();
    const hora = this.reprogramarHora();
    if (id === null || !fecha || !hora) return;
    const [h, m] = hora.split(':').map(Number);
    const dt = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), h, m, 0);
    this.store.dispatch(TurnosActions.reschedule({ id, newScheduledAt: toLocalDateTimeString(dt) }));
  }

  onCancelar(turno: Turno): void {
    this.confirmService.confirm({
      message: `¿Querés cancelar el turno del ${turno.fechaCompleta}?`,
      header: 'Confirmar cancelación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cancelar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.subs.add(
          this.appointmentSvc.cancel(turno.id).subscribe({
            next: () => {
              this.mobileDetailOpen.set(false);
              this.selectedTurno.set(null);
              this.reload$.next(this.activePatientSvc.activePatient()?.id);
              this.messageService.add({
                severity: 'success', summary: 'Turno cancelado',
                detail: `El turno del ${turno.fechaCompleta} fue cancelado.`,
                life: 4000,
              });
            },
            error: (err) => {
              this.messageService.add({
                severity: 'error', summary: 'Error',
                detail: mapApiError(err), life: 4000,
              });
            },
          }),
        );
      },
    });
  }

  onSacarTurno(): void {
    this.router.navigate(['/turnos/sacar']);
  }

  /**
   * Detalles que renderiza la `ui-event-card`: hora, sede + direccion (si existe).
   * Si la sucursal viene sin direccion formateada ('—'), se omite esa fila.
   */
  protected sedeDetailsFor(turno: Turno): { icon: string; text: string }[] {
    const details: { icon: string; text: string }[] = [
      { icon: 'pi-clock', text: turno.hora + ' hs' },
      { icon: 'pi-map-marker', text: turno.sede.nombre },
    ];
    const direccion = turno.sede.direccion?.trim();
    if (direccion && direccion !== '—') {
      details.push({ icon: 'pi-compass', text: direccion });
    }
    return details;
  }

  ngOnDestroy(): void {
    this.autoSelectEffect.destroy();
    this.rescheduleResultEffect.destroy();
    this.subs.unsubscribe();
  }
}
