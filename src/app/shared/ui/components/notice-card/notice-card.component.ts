import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'ui-notice-card',
  standalone: true,
  imports: [NgClass],
  templateUrl: './notice-card.component.html',
  styleUrl: './notice-card.component.scss',
})
export class NoticeCardComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) text!: string;
  @Input() title?: string;
  @Input() variant: 'info' | 'warning' = 'info';

  // Parsea **texto** → [{text, bold}] sin usar innerHTML
  parseBold(text: string): { text: string; bold: boolean }[] {
    return text.split('**').map((part, i) => ({ text: part, bold: i % 2 === 1 }));
  }
}
