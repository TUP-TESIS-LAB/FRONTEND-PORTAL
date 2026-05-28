import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { WizardStep } from '../../types';

@Component({
  selector: 'ui-wizard',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './wizard.component.html',
  styleUrl: './wizard.component.scss',
})
export class WizardComponent {
  @Input({ required: true }) steps!: WizardStep[];
  // El padre controla el paso actual y decide si se puede avanzar
  @Input({ required: true }) currentStep!: number;
  @Input() canProceed = false;
  @Input() confirmLabel = 'Confirmar';
  @Input() loading = false;
  /** Título opcional del wizard. Si se setea, aparece arriba con un botón de
   *  back que dispara (cancelled) — pensado para usar al wizard como página. */
  @Input() title?: string;

  @Output() next      = new EventEmitter<void>(); // padre incrementa currentStep
  @Output() back      = new EventEmitter<void>(); // padre decrementa currentStep
  @Output() confirmed = new EventEmitter<void>(); // se disparó next en el último paso
  @Output() cancelled = new EventEmitter<void>(); // se disparó back en el primer paso

  get isLastStep(): boolean {
    return this.currentStep === this.steps.length - 1;
  }

  isStepCompleted(index: number): boolean {
    // Un paso es completado si el usuario ya pasó por él
    return index < this.currentStep;
  }

  onNext(): void {
    if (this.isLastStep) {
      this.confirmed.emit();
    } else {
      this.next.emit();
    }
  }

  onBack(): void {
    if (this.currentStep === 0) {
      this.cancelled.emit();
    } else {
      this.back.emit();
    }
  }
}
