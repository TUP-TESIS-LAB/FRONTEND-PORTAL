import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TipoAnalisis } from '../../../../core/models/tipo-analisis.model';
import { analysisIcon } from '../../../utils/analysis-icon';

@Component({
  selector: 'ui-analysis-card-grid',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './analysis-card-grid.component.html',
  styleUrl: './analysis-card-grid.component.scss',
})
export class AnalysisCardGridComponent {
  @Input({ required: true }) tipos!: TipoAnalisis[];
  @Input({ required: true }) selectedIds!: (number | string)[];
  @Input() loading = false;

  @Output() selectionChange = new EventEmitter<(number | string)[]>();

  toggleTipo(id: number | string): void {
    const next = this.selectedIds.includes(id)
      ? this.selectedIds.filter(s => s !== id)
      : [...this.selectedIds, id];
    this.selectionChange.emit(next);
  }

  isSelected(id: number | string): boolean {
    return this.selectedIds.includes(id);
  }

  /** Clase PrimeIcons para el tipo (el backend manda nombres de Material Icons). */
  icon(tipo: TipoAnalisis): string {
    return analysisIcon(tipo.icono, tipo.categoria);
  }
}
