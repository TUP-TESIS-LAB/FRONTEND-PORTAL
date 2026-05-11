import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';

export interface BottomSheetItem {
  id: string;
  icon: string;           // clase PrimeIcons sin 'pi ': 'pi-user', 'pi-users'
  label: string;
  route?: any[];          // si está presente, navega al hacer click
  action?: () => void;    // si está presente, ejecuta la función
  destructive?: boolean;  // estilo danger (texto e ícono en --ds-danger)
}

@Component({
  selector: 'ui-bottom-sheet',
  standalone: true,
  imports: [DrawerModule],
  templateUrl: './bottom-sheet.component.html',
  styleUrl: './bottom-sheet.component.scss',
})
export class BottomSheetComponent {
  private readonly router = inject(Router);

  @Input() visible = false;
  @Input() title?: string;
  @Input({ required: true }) items!: BottomSheetItem[];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() itemClick     = new EventEmitter<BottomSheetItem>();

  onItemClick(item: BottomSheetItem): void {
    if (item.route) {
      this.router.navigate(item.route);
    } else if (item.action) {
      item.action();
    }
    this.itemClick.emit(item);
    // Cierra el sheet después de ejecutar la acción
    this.visibleChange.emit(false);
  }

  onVisibleChange(value: boolean): void {
    this.visibleChange.emit(value);
  }
}
