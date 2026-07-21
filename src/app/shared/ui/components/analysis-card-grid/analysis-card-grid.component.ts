import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { AnalysisBooking, AnalysisBookingDetail } from '../../../../core/models/analysis-booking.model';
import { analysisIcon } from '../../../utils/analysis-icon';

@Component({
  selector: 'ui-analysis-card-grid',
  standalone: true,
  imports: [SkeletonModule, FormsModule, InputTextModule, ButtonModule, EmptyStateComponent],
  templateUrl: './analysis-card-grid.component.html',
  styleUrl: './analysis-card-grid.component.scss',
})
export class AnalysisCardGridComponent {
  /** Resultados de la búsqueda en curso (catálogo real, búsqueda contra backend). */
  @Input({ required: true }) items!: AnalysisBooking[];
  /** Análisis ya elegidos, con nombre — permite listarlos aunque hayan salido de items(). */
  @Input({ required: true }) selected!: AnalysisBookingDetail[];
  /** true mientras se resuelve la búsqueda actual. */
  @Input() loading = false;
  /** true si la última búsqueda (o precarga) falló contra el backend. */
  @Input() searchError = false;
  /** ids con el detalle (determinations) todavía resolviéndose tras seleccionarlos. */
  @Input() pendingSelectionIds: number[] = [];

  /** Cada tecleo dispara esto — el debounce vive en el effect de NgRx, no acá. */
  @Output() searchChange = new EventEmitter<string>();
  // No usar "select"/"deselect" a secas: colisiona con el evento nativo del
  // DOM `select` (se dispara al seleccionar texto en el <input> de acá
  // adentro y termina llamando al handler del padre con un Event, no un id).
  @Output() analysisSelect = new EventEmitter<number>();
  @Output() analysisDeselect = new EventEmitter<number>();

  search = '';

  onSearchInput(value: string): void {
    this.search = value;
    this.searchChange.emit(value);
  }

  clearSearch(): void {
    this.search = '';
    this.searchChange.emit('');
  }

  /** Reintentar la última búsqueda (o precarga, si search está vacío) tras un fallo. */
  retry(): void {
    this.searchChange.emit(this.search);
  }

  toggle(id: number): void {
    if (this.isSelected(id)) {
      this.analysisDeselect.emit(id);
    } else {
      this.analysisSelect.emit(id);
    }
  }

  /**
   * Una sola lista: lo ya seleccionado va primero (fijo arriba, así no
   * "desaparece" cuando una búsqueda nueva no lo trae), seguido de los
   * resultados de la búsqueda actual que todavía no están elegidos.
   */
  get displayItems(): AnalysisBooking[] {
    const selectedIds = new Set(this.selected.map(s => s.id));
    return [...this.selected, ...this.items.filter(i => !selectedIds.has(i.id))];
  }

  isSelected(id: number): boolean {
    return this.selected.some(s => s.id === id);
  }

  isResolvingSelection(id: number): boolean {
    return this.pendingSelectionIds.includes(id);
  }

  /** Clase PrimeIcons — sin icono propio por análisis, cae al fallback por familia/default. */
  icon(item: AnalysisBooking): string {
    return analysisIcon(null, item.familyName);
  }
}
