import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { Select } from 'primeng/select';
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
import { PatientFilterComponent, PatientFilterOption } from '../../../shared/ui/components/patient-filter/patient-filter.component';
import { EstudioService } from './estudio.service';
import {
  Estudio,
  EstudiosFiltros,
  EstadoEstudio,
  CategoriaEstudio,
} from '../../../core/models/estudio.model';

type SortBy = 'recientes' | 'antiguos';

const SORT_OPTIONS = [
  { label: 'Más recientes', value: 'recientes' },
  { label: 'Más antiguos',  value: 'antiguos'  },
];

// Alineado con CATEGORIA_TO_PI de shared/utils/analysis-icon.ts.
// Solo PrimeIcons existentes (pi-flask y pi-droplet NO existen en PrimeIcons 7).
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
    Select,
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
export class EstudiosComponent implements OnInit, OnDestroy {
  private readonly service        = inject(EstudioService);
  private readonly messageService = inject(MessageService);
  readonly bp                     = inject(BreakpointService);
  readonly activePatient          = inject(ActivePatientService);

  // ── Estado base ──────────────────────────────────────────
  /** Estudios mock crudos (ids de persona ficticios del mock). */
  rawEstudios     = signal<Estudio[]>([]);
  loadingEstudios = signal(true);

  /** Lista de pacientes accesibles (familia) — NO un "paciente activo" global,
   *  solo la lista para armar el filtro de esta pantalla. */
  private readonly accessiblePatients = this.activePatient.accessiblePatients;

  /**
   * DEMO (hasta cablear /me/results real): re-mapea cada estudio mock a un
   * paciente real accesible, para que la pantalla muestre la familia real
   * (Carlos/dependientes) y el filtro funcione. Cuando exista /me/results se
   * reemplaza por la data real ya atribuida por paciente.
   */
  estudios = computed<Estudio[]>(() => {
    const fam = this.accessiblePatients();
    const raw = this.rawEstudios();
    if (fam.length === 0) return raw;
    const distinct = [...new Set(raw.map(e => e.personaId))];
    const idMap = new Map<number, typeof fam[number]>();
    distinct.forEach((pid, i) => idMap.set(pid, fam[i % fam.length]));
    return raw.map(e => {
      const f = idMap.get(e.personaId);
      return f ? { ...e, personaId: f.id, personaNombre: f.nombre, personaIniciales: f.iniciales } : e;
    });
  });

  // ── Filtro de paciente (contextual, por pantalla) ────────
  /** Paciente seleccionado. null = Todos. */
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
  sortBy            = signal<SortBy>('recientes');
  filtros           = signal<EstudiosFiltros>({ rangoFechas: null, tipos: [], estados: [] });
  mobileFiltersOpen = signal(false);

  // ── Opciones para dropdown ───────────────────────────────
  readonly sortOptions = SORT_OPTIONS;

  private subs = new Subscription();

  // ── Computed: contadores por tipo y estado ───────────────
  countsByTipo = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const e of this.estudios()) {
      counts[e.categoria] = (counts[e.categoria] ?? 0) + 1;
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

    const pid = this.selectedPatientId();
    if (pid !== null) {
      lista = lista.filter(e => e.personaId === pid);
    }

    const f = this.filtros();
    if (f.tipos.length > 0) {
      lista = lista.filter(e => f.tipos.includes(e.categoria));
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

    const dir = this.sortBy() === 'recientes' ? -1 : 1;
    return lista.slice().sort((a, b) => (parseFecha(a.fecha) - parseFecha(b.fecha)) * dir);
  });

  activeFiltersCount = computed<number>(() => {
    const f = this.filtros();
    let count = 0;
    if (f.rangoFechas) count++;
    count += f.tipos.length;
    count += f.estados.length;
    return count;
  });

  // ── Helpers de template ──────────────────────────────────
  getIconForCategoria(cat: CategoriaEstudio): string {
    return CATEGORIA_ICON_MAP[cat] ?? 'pi pi-file';
  }

  getAvatarColor(personaId: number): string {
    return this.accessiblePatients().find(f => f.id === personaId)?.accentColor ?? 'neutral';
  }

  /**
   * Estado simplificado para el paciente: solo "disponible" o "pendiente".
   * Cualquier estado interno (en-proceso, etc.) se muestra como pendiente
   * porque el paciente no tiene contexto operativo para distinguirlos.
   */
  displayEstado(e: Estudio): 'disponible' | 'pendiente' {
    return e.estado === 'disponible' ? 'disponible' : 'pendiente';
  }

  displayEstadoLabel(e: Estudio): string {
    return this.displayEstado(e) === 'disponible' ? 'Disponible' : 'Pendiente';
  }

  isAvailable(e: Estudio): boolean {
    return e.estado === 'disponible';
  }

  /** Click en la card → ver detalle SOLO si está disponible. */
  onCardClick(e: Estudio): void {
    if (this.isAvailable(e)) this.onVerEstudio(e);
  }

  /** Click en el botón de descargar (mobile) sin propagar al card. */
  onDescargarFromCard(e: Estudio, event: Event): void {
    event.stopPropagation();
    this.onDescargar(e);
  }

  ngOnInit(): void {
    this.subs.add(
      this.service.getEstudios().subscribe({
        next: lista => {
          this.rawEstudios.set(lista);
          this.loadingEstudios.set(false);
        },
        error: err => {
          this.rawEstudios.set([]);
          this.loadingEstudios.set(false);
          this.messageService.add({
            severity: 'error', summary: 'Error',
            detail: mapApiError(err), life: 4000,
          });
        },
      }),
    );
  }

  // ── Handlers ─────────────────────────────────────────────
  onSortChange(value: SortBy): void {
    this.sortBy.set(value);
  }

  onFiltrosChange(f: EstudiosFiltros): void {
    this.filtros.set(f);
  }

  onFiltrosApplyMobile(f: EstudiosFiltros): void {
    this.filtros.set(f);
    this.mobileFiltersOpen.set(false);
  }

  onLimpiarFiltros(): void {
    this.filtros.set({ rangoFechas: null, tipos: [], estados: [] });
    this.mobileFiltersOpen.set(false);
  }

  onDescargar(estudio: Estudio): void {
    if (estudio.pdf?.url && estudio.pdf.url !== '#') {
      window.open(estudio.pdf.url, '_blank');
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Próximamente',
        detail: 'La visualización de PDF estará disponible pronto.',
        life: 3500,
      });
    }
  }

  onVerEstudio(estudio: Estudio): void {
    this.onDescargar(estudio);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
