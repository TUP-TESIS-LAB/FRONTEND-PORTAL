import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersonaChip, AvatarColor } from '../../../../core/models/estudio.model';

@Component({
  selector: 'ui-person-chips',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './person-chips.component.html',
  styleUrl: './person-chips.component.scss',
})
export class PersonChipsComponent {
  @Input({ required: true }) personas!: PersonaChip[];
  @Input() selectedId: number | null = null;

  @Output() selectionChange = new EventEmitter<number | null>();

  select(id: number | null): void {
    this.selectionChange.emit(id);
  }

  avatarColorClass(color: AvatarColor): string {
    return `ui-person-chip__avatar--${color}`;
  }

  isSelected(persona: PersonaChip): boolean {
    return this.selectedId === persona.id;
  }

  selectedColorClass(persona: PersonaChip): string {
    if (!this.isSelected(persona)) return '';
    return `ui-person-chip--selected-${persona.avatarColor}`;
  }
}
