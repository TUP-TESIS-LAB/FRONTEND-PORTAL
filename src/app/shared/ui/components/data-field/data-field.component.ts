import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'ui-data-field',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './data-field.component.html',
  styleUrl: './data-field.component.scss',
})
export class DataFieldComponent {
  @Input({ required: true }) icon!: string;   // 'pi-envelope', 'pi-phone', etc.
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string;
  @Input() editable = false;
  @Input() multiline = false;

  @Output() edit = new EventEmitter<void>();

  get displayValue(): string {
    return this.value?.trim() ? this.value : '—';
  }

  get isEmpty(): boolean {
    return !this.value?.trim();
  }
}
