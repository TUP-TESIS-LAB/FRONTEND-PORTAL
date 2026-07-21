import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { AnalysisBooking } from '../../../../core/models/analysis-booking.model';
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
  @Input({ required: true }) selectedIds!: number[];
  /** true mientras se resuelve la búsqueda actual. */
  @Input() loading = false;
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

  toggle(id: number): void {
    if (this.isSelected(id)) {
      this.analysisDeselect.emit(id);
    } else {
      this.analysisSelect.emit(id);
    }
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  isResolvingSelection(id: number): boolean {
    return this.pendingSelectionIds.includes(id);
  }

  /** Clase PrimeIcons — sin icono propio por análisis, cae al fallback por familia/default. */
  icon(item: AnalysisBooking): string {
    return analysisIcon(null, item.familyName);
  }
}
