import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TipoAnalisis } from '../../../../core/models/tipo-analisis.model';

@Component({
  selector: 'ui-analysis-card-grid',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './analysis-card-grid.component.html',
  styleUrl: './analysis-card-grid.component.scss',
})
export class AnalysisCardGridComponent {
  @Input({ required: true }) tipos!: TipoAnalisis[];
  @Input({ required: true }) selectedIds!: string[];
  @Input() loading = false;

  @Output() selectionChange = new EventEmitter<string[]>();

  toggleTipo(id: string): void {
    const next = this.selectedIds.includes(id)
      ? this.selectedIds.filter(s => s !== id)
      : [...this.selectedIds, id];
    this.selectionChange.emit(next);
  }

  isSelected(id: string): boolean {
    return this.selectedIds.includes(id);
  }
}
