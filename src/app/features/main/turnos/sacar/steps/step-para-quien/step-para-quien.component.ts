import { Component, input, output } from '@angular/core';
import { Familiar } from '../../../../../../core/models/familiar.model';
import { FamilyCardComponent } from '../../../../../../shared/ui/components/family-card/family-card.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-step-para-quien',
  standalone: true,
  imports: [FamilyCardComponent, RouterLink],
  templateUrl: './step-para-quien.component.html',
  styleUrl: './step-para-quien.component.scss',
})
export class StepParaQuienComponent {
  readonly family            = input.required<Familiar[]>();
  readonly selectedPatientId = input<number | null>(null);
  readonly selectionChange   = output<number>();

  onSelect(f: Familiar): void { this.selectionChange.emit(f.id); }

  isSelected(f: Familiar): boolean { return this.selectedPatientId() === f.id; }
}
