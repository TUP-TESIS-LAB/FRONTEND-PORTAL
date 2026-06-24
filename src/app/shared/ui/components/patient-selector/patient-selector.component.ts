import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ActivePatientService } from '../../../../core/active-patient/active-patient.service';

@Component({
  selector: 'app-patient-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SelectModule],
  template: `
    @if (active(); as a) {
      @if (hasMultiple()) {
        <p-select
          [options]="options()"
          [ngModel]="a.id"
          optionLabel="label"
          optionValue="id"
          (onChange)="onSelect($event.value)"
          styleClass="ui-patient-selector"
          [appendTo]="'body'"
          ariaLabel="Seleccionar paciente" />
      } @else {
        <span class="ui-patient-selector__single">{{ a.nombre }} {{ a.apellido }}</span>
      }
    }
  `,
})
export class PatientSelectorComponent {
  private readonly svc = inject(ActivePatientService);
  protected readonly active = this.svc.activePatient;
  readonly hasMultiple = computed(() => this.svc.accessiblePatients().length > 1);
  protected readonly options = computed(() =>
    this.svc.accessiblePatients().map(f => ({
      id: f.id,
      label: f.vinculo === 'Yo' ? `${f.nombre} ${f.apellido} (vos)` : `${f.nombre} ${f.apellido} · ${f.vinculo}`,
    })));

  onSelect(id: number): void { this.svc.setActive(id); }
}
