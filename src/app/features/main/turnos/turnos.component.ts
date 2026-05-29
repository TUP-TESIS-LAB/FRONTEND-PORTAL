import { Component, OnInit, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DrawerModule } from 'primeng/drawer';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/components/empty-state/empty-state.component';
import { EventCardComponent } from '../../../shared/ui/components/event-card/event-card.component';
import { PlaceholderCardComponent } from '../../../shared/ui/components/placeholder-card/placeholder-card.component';
import { TurnoDetailComponent } from '../../../shared/ui/components/turno-detail/turno-detail.component';
import { BreakpointService } from '../../../shared/utils/breakpoint.service';
import { AppointmentService } from './services/appointment.service';
import { mapApiError } from '../../../shared/utils/api-error-mapper';
import { Turno } from '../../../core/models/turno.model';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    DrawerModule,
    MultiSelectModule,
    SelectButtonModule,
    SkeletonModule,
    ToastModule,
    PageHeaderComponent,
    EmptyStateComponent,
    EventCardComponent,
    PlaceholderCardComponent,
    TurnoDetailComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './turnos.component.html',
  styleUrl: './turnos.component.scss',
})
export class TurnosComponent implements OnInit, OnDestroy {
  private readonly appointmentSvc  = inject(AppointmentService);
  private readonly messageService = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly router         = inject(Router);
  readonly bp                     = inject(BreakpointService);

  proximosTurnos   = signal<Turno[]>([]);
  anterioresTurnos = signal<Turno[]>([]);
  cargando         = signal(true);

  selectedTurno    = signal<Turno | null>(null);
  mobileDetailOpen = signal(false);

  // ─── Filtros seleccionables ──────────────────────────────
  /** Chips de estado activos (estadoLabel del backend). Vacío = todos. */
  estadoFilter   = signal<string[]>([]);
  /** Familiares seleccionados. Vacío = todos. */
  familiarFilter = signal<string[]>([]);
  /** Fecha desde (filtro mínimo). null = todas. */
  fechaDesde     = signal<Date | null>(null);

  /** Lista única de familiares presentes en los turnos. */
  protected readonly familiares = computed(() => {
    const all = [...this.proximosTurnos(), ...this.anterioresTurnos()];
    const map = new Map<string, { label: string; value: string }>();
    for (const t of all) {
      if (!map.has(t.personaNombre)) {
        map.set(t.personaNombre, { label: t.personaNombre, value: t.personaNombre });
      }
    }
    return Array.from(map.values());
  });

  /** Chips de estado: solo los estadoLabels que el backend devuelve
   *  para los turnos actuales (sin hardcodear "pendiente / confirmado"). */
  protected readonly estadoOptions = computed(() => {
    const all = [...this.proximosTurnos(), ...this.anterioresTurnos()];
    const seen = new Set<string>();
    for (const t of all) seen.add(t.estadoLabel);
    return Array.from(seen).map(label => ({ label, value: label }));
  });

  /** Lista combinada (próximos + anteriores) filtrada según los filtros activos. */
  protected readonly visibleTurnos = computed(() => {
    const all = [...this.proximosTurnos(), ...this.anterioresTurnos()];
    return this.applyFilters(all);
  });

  protected readonly hasActiveFilters = computed(() =>
    this.familiarFilter().length > 0
    || this.fechaDesde() !== null
    || this.estadoFilter().length > 0
  );

  private applyFilters(list: Turno[]): Turno[] {
    const estados = new Set(this.estadoFilter());
    const fams = new Set(this.familiarFilter());
    const desde = this.fechaDesde();

    return list.filter(t => {
      if (estados.size > 0 && !estados.has(t.estadoLabel)) return false;
      if (fams.size > 0 && !fams.has(t.personaNombre)) return false;
      if (desde) {
        const turnoDate = new Date(t.fechaCompleta);
        if (turnoDate < desde) return false;
      }
      return true;
    });
  }

  clearFilters(): void {
    this.estadoFilter.set([]);
    this.familiarFilter.set([]);
    this.fechaDesde.set(null);
  }

  private subs = new Subscription();

  private readonly autoSelectEffect = effect(() => {
    const turnos = this.proximosTurnos();
    if (!this.bp.isMobile() && turnos.length > 0 && !this.selectedTurno()) {
      this.selectedTurno.set(turnos[0]);
    }
  });

  ngOnInit(): void {
    this.cargarTurnos();
  }

  private cargarTurnos(): void {
    this.cargando.set(true);
    this.subs.add(
      this.appointmentSvc.getMyAppointments().subscribe({
        next: ({ proximos, anteriores }) => {
          this.proximosTurnos.set(proximos);
          this.anterioresTurnos.set(anteriores);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.messageService.add({
            severity: 'error', summary: 'Error',
            detail: mapApiError(err), life: 4000,
          });
        },
      }),
    );
  }

  onTurnoClick(turno: Turno): void {
    this.selectedTurno.set(turno);
    if (this.bp.isMobile()) {
      this.mobileDetailOpen.set(true);
    }
  }

  onReprogramar(_turno: Turno): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Próximamente',
      detail: 'La función de reprogramar estará disponible pronto.',
      life: 3000,
    });
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
              this.cargarTurnos();
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

  ngOnDestroy(): void {
    this.autoSelectEffect.destroy();
    this.subs.unsubscribe();
  }
}
