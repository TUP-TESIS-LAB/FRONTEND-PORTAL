import { Component } from '@angular/core';

@Component({
  selector: 'app-patient-placeholder',
  standalone: true,
  template: `
    <div style="padding: 2rem; text-align: center; color: var(--ds-text-muted)">
      <p style="font-size: 1.25rem; font-weight: 500">Portal Paciente</p>
      <p>Seleccioná una opción del menú para continuar.</p>
    </div>
  `,
})
export class PatientPlaceholderComponent {}
