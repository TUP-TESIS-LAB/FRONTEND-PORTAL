import { Component, Input } from '@angular/core';

export type StatAccent =
  | 'primary' | 'secondary' | 'accent'
  | 'success' | 'warning' | 'danger' | 'info';

const ACCENT_MAP: Record<StatAccent, string> = {
  primary:   'var(--brand-primary)',
  secondary: 'var(--brand-secondary)',
  accent:    'var(--brand-accent)',
  success:   'var(--ds-success)',
  warning:   'var(--ds-warning)',
  danger:    'var(--ds-danger)',
  info:      'var(--ds-info)',
};

@Component({
  selector: 'ui-stat-card',
  standalone: true,
  imports: [],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() sub?: string;
  @Input() accent: StatAccent = 'secondary';

  get accentColor(): string {
    return ACCENT_MAP[this.accent];
  }
}
