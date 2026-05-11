import { Component, Input } from '@angular/core';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'ui-medical-flags',
  standalone: true,
  imports: [],
  templateUrl: './medical-flags.component.html',
  styleUrl: './medical-flags.component.scss',
})
export class MedicalFlagsComponent {
  @Input({ required: true }) datosMedicos!: User['datosMedicos'];
}
