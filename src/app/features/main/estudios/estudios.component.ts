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
import { DrawerModule } from 'primeng/drawer';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/components/empty-state/empty-state.component';
import { FiltersAsideComponent } from '../../../shared/ui/components/filters-aside/filters-aside.component';
import { BreakpointService } from '../../../shared/utils/breakpoint.service';
import { mapApiError } from '../../../shared/utils/api-error-mapper';
import { ActivePatientService } from '../../../core/active-patient/active-patient.service';
import {
  PatientFilterComponent,
  PatientFilterOption,
} from '../../../shared/ui/components/patient-filter/patient-filter.component';
import { EstudioService } from './estudio.service';
import {
  Estudio,
  EstudiosFiltros,
  EstadoEstudio,
  CategoriaEstudio,
} from '../../../core/models/estudio.model';
import { loadEstudios, loadEstudiosTodos } from './store/estudios.actions';
import {
  selectEstudios,
  selectEstudiosLoading,
  selectEstudiosError,
} from './store/estudios.selectors';

/** Filtros por defecto: rango del último mes (desde hace un mes hasta hoy). */
function defaultFiltros(): EstudiosFiltros {
  const hasta = new Date();
  const desde = new Date();
  desde.setMonth(desde.getMonth() - 1);
  return { rangoFechas: { desde, hasta }, tipos: [], estados: [] };
}

// Alineado con CATEGORIA_TO_PI de shared/utils/analysis-icon.ts.
const CATEGORIA_ICON_MAP: Record<CategoriaEstudio, string> = {
  hematologia:  'pi pi-heart',
  bioquimica:   'pi pi-chart-line',
  hormonas:     'pi pi-sync',
  orina:        'pi pi-filter',
  coagulacion:  'pi pi-shield',
};

// Parsea 'DD/MM/YYYY' → timestamp para comparar
function parseFecha(f: string): number {
  const [d, m, y] = f.split('/').map(Number);
  return new Date(y, m - 1, d).getTime();
}

@Component({
  selector: 'app-estudios',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DrawerModule,
    SkeletonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    PageHeaderComponent,
    EmptyStateComponent,
    FiltersAsideComponent,
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

  // ── Datos reales desde el store ──────────────────────────
  /** Estudios reales del paciente seleccionado (sin persona todavía). */
  private readonly rawEstudios = this.store.selectSignal(selectEstudios);
  loadingEstudios              = this.store.selectSignal(selectEstudiosLoading);
  private readonly error       = this.store.selectSignal(selectEstudiosError);

  private readonly accessiblePatients = this.activePatient.accessiblePatients;

  /**
   * Enriquece cada estudio con su propia persona (por `patientId` de la fila,
   * no por el `selectedPatientId` único) — necesario para "Todos", donde la
   * lista fusiona estudios de varios miembros de la familia.
   */
  estudios = computed<Estudio[]>(() => {
    const list = this.rawEstudios();
    const porId = new Map(this.accessiblePatients().map(f => [f.id, f]));
    return list.map(e => {
      const f = porId.get(e.patientId);
      if (!f) return e;
      return {
        ...e,
        personaId: f.id,
        personaNombre: f.nombre,
        personaIniciales: f.iniciales,
      };
    });
  });

  // ── Filtro de paciente (contextual, por pantalla) ────────
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

  // ── Filtros activos ──────────────────────────────────────
  filtros           = signal<EstudiosFiltros>(defaultFiltros());
  mobileFiltersOpen = signal(false);

  // ── Computed: contadores por tipo y estado ───────────────
  countsByTipo = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const e of this.estudios()) {
      if (e.categoria) counts[e.categoria] = (counts[e.categoria] ?? 0) + 1;
    }
    return counts;
  });

  countsByEstado = computed<Record<EstadoEstudio, number>>(() => {
    const counts = { 'disponible': 0, 'en-proceso': 0, 'pendiente': 0 };
    for (const e of this.estudios()) {
      counts[e.estado] = (counts[e.estado] ?? 0) + 1;
    }
    return counts;
  });

  // ── Computed: lista filtrada y ordenada ──────────────────
  estudiosFiltrados = computed<Estudio[]>(() => {
    let lista = this.estudios();

    const f = this.filtros();
    if (f.tipos.length > 0) {
      lista = lista.filter(e => e.categoria != null && f.tipos.includes(e.categoria));
    }
    if (f.estados.length > 0) {
      lista = lista.filter(e => f.estados.includes(e.estado));
    }
    if (f.rangoFechas) {
      const desde = f.rangoFechas.desde.getTime();
      const hasta = f.rangoFechas.hasta.getTime();
      lista = lista.filter(e => {
        const ts = parseFecha(e.fecha);
        return ts >= desde && ts <= hasta;
      });
    }

    // Orden fijo: más recientes primero (sin control de UI).
    return lista.slice().sort((a, b) => b.fechaTs - a.fechaTs);
  });

  activeFiltersCount = computed<number>(() => {
    const f = this.filtros();
    let count = 0;
    if (f.rangoFechas) count++;
    count += f.tipos.length;
    count += f.estados.length;
    return count;
  });

  // Bandera plana (no signal): distingue "todavía no sembrado" de "Todos"
  // seleccionado por el usuario — ambos casos comparten selectedPatientId===null.
  private seeded = false;

  constructor() {
    // Siembra el paciente seleccionado desde el paciente activo (solo una vez;
    // de lo contrario, elegir "Todos" luego de sembrado se revertiría solo).
    effect(() => {
      const ap = this.activePatient.activePatient();
      if (ap && !this.seeded) {
        this.seeded = true;
        this.selectedPatientId.set(ap.id);
      }
    });

    // Carga (y recarga al cambiar de paciente) vía store. "Todos" (pid null)
    // hace fan-out sobre todos los pacientes accesibles.
    effect(() => {
      const pid = this.selectedPatientId();
      if (pid !== null) {
        this.store.dispatch(loadEstudios({ patientId: pid }));
      } else {
        const ids = this.accessiblePatients().map(p => p.id);
        if (ids.length > 0) {
          this.store.dispatch(loadEstudiosTodos({ patientIds: ids }));
        }
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
  getIconForCategoria(cat?: CategoriaEstudio): string {
    return (cat && CATEGORIA_ICON_MAP[cat]) || 'pi pi-file';
  }

  getAvatarColor(personaId: number): string {
    return this.accessiblePatients().find(f => f.id === personaId)?.accentColor ?? 'neutral';
  }

  /** Estado simplificado para el paciente: "disponible" o "pendiente". */
  displayEstado(e: Estudio): 'disponible' | 'pendiente' {
    return e.estado === 'disponible' ? 'disponible' : 'pendiente';
  }

  displayEstadoLabel(e: Estudio): string {
    return this.displayEstado(e) === 'disponible' ? 'Disponible' : 'En proceso';
  }

  isAvailable(e: Estudio): boolean {
    return e.estado === 'disponible' && !!e.reporteDisponible;
  }

  onCardClick(e: Estudio): void {
    if (this.isAvailable(e)) this.onVerEstudio(e);
  }

  onDescargarFromCard(e: Estudio, event: Event): void {
    event.stopPropagation();
    this.onDescargar(e);
  }

  // ── Handlers ─────────────────────────────────────────────
  onFiltrosChange(f: EstudiosFiltros): void {
    this.filtros.set(f);
  }

  onFiltrosApplyMobile(f: EstudiosFiltros): void {
    this.filtros.set(f);
    this.mobileFiltersOpen.set(false);
  }

  onLimpiarFiltros(): void {
    // Reset al filtro por defecto (último mes), que es la línea base de la pantalla.
    this.filtros.set(defaultFiltros());
    this.mobileFiltersOpen.set(false);
  }

  onDescargar(estudio: Estudio): void {
    if (!this.isAvailable(estudio)) {
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

  onVerEstudio(estudio: Estudio): void {
    this.onDescargar(estudio);
  }
}
