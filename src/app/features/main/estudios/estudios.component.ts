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
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/components/empty-state/empty-state.component';
import { PersonChipsComponent } from '../../../shared/ui/components/person-chips/person-chips.component';
import { FiltersAsideComponent } from '../../../shared/ui/components/filters-aside/filters-aside.component';
import { BreakpointService } from '../../../shared/utils/breakpoint.service';
import { EstudioService } from './estudio.service';
import {
  Estudio,
  PersonaChip,
  EstudiosFiltros,
  EstadoEstudio,
  CategoriaEstudio,
} from '../../../core/models/estudio.model';

type SortBy = 'recientes' | 'antiguos';

const SORT_OPTIONS = [
  { label: 'Más recientes', value: 'recientes' },
  { label: 'Más antiguos',  value: 'antiguos'  },
];

const AVATAR_COLOR_MAP: Record<number, string> = {
  1: 'secondary',
  2: 'accent',
  3: 'primary',
  4: 'warning',
};

const CATEGORIA_ICON_MAP: Record<CategoriaEstudio, string> = {
  hematologia:  'pi pi-heart',
  bioquimica:   'pi pi-flask',
  hormonas:     'pi pi-sync',
  orina:        'pi pi-droplet',
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
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SkeletonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    PageHeaderComponent,
    EmptyStateComponent,
    PersonChipsComponent,
    FiltersAsideComponent,
  ],
  providers: [MessageService],
  templateUrl: './estudios.component.html',
  styleUrl: './estudios.component.scss',
})
export class EstudiosComponent implements OnInit, OnDestroy {
  private readonly service        = inject(EstudioService);
  private readonly messageService = inject(MessageService);
  readonly bp                     = inject(BreakpointService);

  // ── Estado base ──────────────────────────────────────────
  estudios      = signal<Estudio[]>([]);
  personas      = signal<PersonaChip[]>([]);
  loadingEstudios = signal(true);

  // ── Filtros activos ──────────────────────────────────────
  selectedPersonaId = signal<number | null>(null);
  searchTerm        = signal('');
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

    const pid = this.selectedPersonaId();
    if (pid !== null) {
      lista = lista.filter(e => e.personaId === pid);
    }

    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      lista = lista.filter(e =>
        e.nombre.toLowerCase().includes(term)        ||
        e.personaNombre.toLowerCase().includes(term) ||
        e.fecha.includes(term),
      );
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
    return AVATAR_COLOR_MAP[personaId] ?? 'neutral';
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
      this.service.getEstudios().subscribe(lista => {
        this.estudios.set(lista);
        this.loadingEstudios.set(false);
      }),
    );
    this.subs.add(
      this.service.getPersonas().subscribe(lista => {
        this.personas.set(lista);
      }),
    );
  }

  // ── Handlers ─────────────────────────────────────────────
  onPersonaChange(id: number | null): void {
    this.selectedPersonaId.set(id);
  }

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
