import { Component, Input } from '@angular/core';

export interface Reminder {
  color: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
  text: string;
}

const COLOR_MAP: Record<Reminder['color'], string> = {
  primary:   'var(--brand-primary)',
  secondary: 'var(--brand-secondary)',
  accent:    'var(--brand-accent)',
  success:   'var(--ds-success)',
  warning:   'var(--ds-warning)',
  danger:    'var(--ds-danger)',
};

@Component({
  selector: 'ui-reminder-list',
  standalone: true,
  imports: [],
  templateUrl: './reminder-list.component.html',
  styleUrl: './reminder-list.component.scss',
})
export class ReminderListComponent {
  @Input({ required: true }) reminders!: Reminder[];
  @Input() title?: string;

  dotColor(color: Reminder['color']): string {
    return COLOR_MAP[color];
  }

  // Parsea **texto** → [{text, bold}] sin usar innerHTML
  parseBold(text: string): { text: string; bold: boolean }[] {
    return text.split('**').map((part, i) => ({ text: part, bold: i % 2 === 1 }));
  }
}
