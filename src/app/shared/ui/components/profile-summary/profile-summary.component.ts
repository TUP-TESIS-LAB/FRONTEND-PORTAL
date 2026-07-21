import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CoverageCardComponent } from '../coverage-card/coverage-card.component';
import { MedicalFlagsComponent } from '../medical-flags/medical-flags.component';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'ui-profile-summary',
  standalone: true,
  imports: [CoverageCardComponent, MedicalFlagsComponent],
  templateUrl: './profile-summary.component.html',
  styleUrl: './profile-summary.component.scss',
})
export class ProfileSummaryComponent {
  @Input({ required: true }) user!: User;

  @Output() subirCredencial = new EventEmitter<void>();

  get sexoLabel(): string {
    return this.user.sexo === 'F' ? 'F' : this.user.sexo === 'M' ? 'M' : 'X';
  }
}
