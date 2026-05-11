import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { Sede } from '../../../../core/models/sede.model';

@Component({
  selector: 'ui-sede-list',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './sede-list.component.html',
  styleUrl: './sede-list.component.scss',
})
export class SedeListComponent {
  @Input({ required: true }) sedes!: Sede[];
  @Input({ required: true }) selectedId!: string | null;
  @Input() loading = false;

  @Output() selectionChange = new EventEmitter<string>();

  selectSede(id: string): void {
    this.selectionChange.emit(id);
  }

  isSelected(id: string): boolean {
    return this.selectedId === id;
  }
}
