import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-prep-warning',
  standalone: true,
  imports: [],
  templateUrl: './prep-warning.component.html',
  styleUrl: './prep-warning.component.scss',
})
export class PrepWarningComponent {
  @Input({ required: true }) instructions!: string[];
  @Input() title = 'Preparación';
}
