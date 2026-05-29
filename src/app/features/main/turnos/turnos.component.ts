import { Component, OnInit, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
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
    DrawerModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TabsModule,
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

  activeTab        = signal<string>('proximos');
  selectedTurno    = signal<Turno | null>(null);
  mobileDetailOpen = signal(false);

  // ─── Filtros ──────────────────────────────────────────────
  searchTerm    = signal<string>('');
  familiarFilter = signal<string | null>(null);

  /** Lista única de familiares presentes en los turnos (para el dropdown). */
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

  protected readonly filteredProximos = computed(() => this.applyFilters(this.proximosTurnos()));
  protected readonly filteredAnteriores = computed(() => this.applyFilters(this.anterioresTurnos()));

  private applyFilters(list: Turno[]): Turno[] {
    const q = this.searchTerm().trim().toLowerCase();
    const fam = this.familiarFilter();
    return list.filter(t => {
      if (fam && t.personaNombre !== fam) return false;
      if (q && !`${t.tipo} ${t.sede.nombre}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.familiarFilter.set(null);
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

  onTabChange(value: string | number | undefined): void {
    if (value != null) this.activeTab.set(value.toString());
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
