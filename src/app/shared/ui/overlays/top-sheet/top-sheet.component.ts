import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';

export interface TopSheetItem {
  id: string;
  icon: string;
  label: string;
  message?: string;
  route?: any[];
  action?: () => void;
}

/**
 * Sheet que se despliega DESDE ARRIBA (campanita de notificaciones, alertas).
 * Espejo del bottom-sheet: misma estructura, posición invertida.
 */
@Component({
  selector: 'ui-top-sheet',
  standalone: true,
  imports: [DrawerModule],
  templateUrl: './top-sheet.component.html',
  styleUrl: './top-sheet.component.scss',
})
export class TopSheetComponent {
  private readonly router = inject(Router);

  @Input() visible = false;
  @Input() title?: string;
  @Input({ required: true }) items!: TopSheetItem[];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() itemClick     = new EventEmitter<TopSheetItem>();

  onItemClick(item: TopSheetItem): void {
    if (item.route) {
      this.router.navigate(item.route);
    } else if (item.action) {
      item.action();
    }
    this.itemClick.emit(item);
    this.visibleChange.emit(false);
  }

  onVisibleChange(value: boolean): void {
    this.visibleChange.emit(value);
  }
}
