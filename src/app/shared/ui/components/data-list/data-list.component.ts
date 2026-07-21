import { Component, Input } from '@angular/core';

export interface DataListItem {
  label: string;
  value: string;
}

@Component({
  selector: 'ui-data-list',
  standalone: true,
  imports: [],
  templateUrl: './data-list.component.html',
  styleUrl: './data-list.component.scss',
})
export class DataListComponent {
  @Input({ required: true }) items!: DataListItem[];
}
