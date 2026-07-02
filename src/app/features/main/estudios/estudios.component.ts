import {
  Component,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/components/empty-state/empty-state.component';
import { BreakpointService } from '../../../shared/utils/breakpoint.service';
import { mapApiError } from '../../../shared/utils/api-error-mapper';
import { ActivePatientService } from '../../../core/active-patient/active-patient.service';
import {
  PatientFilterComponent,
  PatientFilterOption,
} from '../../../shared/ui/components/patient-filter/patient-filter.component';
import { EstudioService } from './estudio.service';
import { Estudio } from '../../../core/models/estudio.model';
import { loadEstudios } from './store/estudios.actions';
import {
  selectEstudios,
  selectEstudiosLoading,
  selectEstudiosError,
} from './store/estudios.selectors';

type SortBy = 'recientes' | 'antiguos';

const SORT_OPTIONS = [
  { label: 'Más recientes', value: 'recientes' },
  { label: 'Más antiguos',  value: 'antiguos'  },
];

@Component({
  selector: 'app-estudios',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    Select,
    SkeletonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    PageHeaderComponent,
    EmptyStateComponent,
    PatientFilterComponent,
  ],
  providers: [MessageService],
  templateUrl: './estudios.component.html',
  styleUrl: './estudios.component.scss',
})
export class EstudiosComponent {
  private readonly store          = inject(Store);
  private readonly service        = inject(EstudioService);
  private readonly messageService = inject(MessageService);
  readonly bp                     = inject(BreakpointService);
  readonly activePatient          = inject(ActivePatientService);

  // ── Estado desde el store ────────────────────────────────
  readonly estudios = this.store.selectSignal(selectEstudios);
  readonly loading  = this.store.selectSignal(selectEstudiosLoading);
  readonly error    = this.store.selectSignal(selectEstudiosError);

  // ── Filtro de paciente (contextual, por pantalla) ────────
  private readonly accessiblePatients = this.activePatient.accessiblePatients;
  /** Paciente seleccionado; se siembra del paciente activo al cargar la familia. */
  selectedPatientId = signal<number | null>(null);
  patientFilterOptions = computed<PatientFilterOption[]>(() =>
    this.accessiblePatients().map(f => ({
      id: f.id,
      nombre: f.nombre,
      iniciales: f.iniciales,
      accentColor: f.accentColor,
      sublabel: f.vinculo === 'Yo' ? 'vos' : f.vinculo,
    })));

  // ── Orden ────────────────────────────────────────────────
  sortBy = signal<SortBy>('recientes');
  readonly sortOptions = SORT_OPTIONS;

  estudiosFiltrados = computed<Estudio[]>(() => {
    const dir = this.sortBy() === 'recientes' ? -1 : 1;
    return this.estudios().slice().sort((a, b) => (a.fechaTs - b.fechaTs) * dir);
  });

  constructor() {
    // Siembra el paciente seleccionado desde el paciente activo cuando la familia
    // termina de cargar (el shell dispara ActivePatientService.init()).
    effect(() => {
      const ap = this.activePatient.activePatient();
      if (ap && this.selectedPatientId() === null) {
        this.selectedPatientId.set(ap.id);
      }
    });

    // Carga (y recarga al cambiar de paciente) vía store.
    effect(() => {
      const pid = this.selectedPatientId();
      if (pid !== null) {
        this.store.dispatch(loadEstudios({ patientId: pid }));
      }
    });

    // Feedback de error en español, sin leak de internals (CLAUDE.md #4).
    effect(() => {
      const err = this.error();
      if (err) {
        this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: mapApiError(err), life: 4000,
        });
      }
    });
  }

  // ── Helpers de template ──────────────────────────────────
  nombreEstudio(e: Estudio): string {
    return e.nombre ?? `Estudio Nº ${e.protocolId}`;
  }

  sucursalEstudio(e: Estudio): string {
    return e.sucursal ?? '—';
  }

  /** El reporte está disponible para descargar (llega con KAN-168). */
  reporteDisponible(e: Estudio): boolean {
    return !!e.reporteDisponible;
  }

  estadoLabel(e: Estudio): string {
    return this.reporteDisponible(e) ? 'Disponible' : 'En proceso';
  }

  estadoClass(e: Estudio): string {
    return this.reporteDisponible(e) ? 'disponible' : 'pendiente';
  }

  // ── Handlers ─────────────────────────────────────────────
  onSortChange(value: SortBy): void {
    this.sortBy.set(value);
  }

  onDescargar(estudio: Estudio): void {
    if (!this.reporteDisponible(estudio)) {
      this.messageService.add({
        severity: 'info',
        summary: 'Próximamente',
        detail: 'La descarga del PDF estará disponible pronto.',
        life: 3500,
      });
      return;
    }
    this.service.descargarReporte(estudio.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: mapApiError(err), life: 4000,
        });
      },
    });
  }

  onDescargarFromCard(estudio: Estudio, event: Event): void {
    event.stopPropagation();
    this.onDescargar(estudio);
  }
}
