import { Component } from '@angular/core';

@Component({
  selector: 'ui-family-grid',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './family-grid.component.scss',
  host: { class: 'ui-family-grid' },
})
export class FamilyGridComponent {}
