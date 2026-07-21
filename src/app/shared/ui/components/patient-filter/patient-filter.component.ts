import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { capitalizeWords } from '../../../utils/capitalize-words';

export interface PatientFilterOption {
  id: number;
  nombre: string;
  iniciales: string;
  accentColor?: 'primary' | 'secondary' | 'accent';
  /** Texto chico junto al nombre (ej. el vínculo: "vos", "Hijo"). */
  sublabel?: string;
}

interface SelectItem { label: string; value: number | null; }

/**
 * Filtro de paciente por pantalla, como dropdown con una opción "Todos".
 * Reusable en Turnos/Estudios: cada pantalla pasa sus opciones y maneja el id
 * seleccionado (null = Todos). No conoce ningún "paciente activo" global.
 */
@Component({
  selector: 'app-patient-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SelectModule],
  template: `
    <p-select
      [options]="selectOptions"
      [ngModel]="selectedId"
      optionLabel="label"
      optionValue="value"
      (onChange)="selectedIdChange.emit($event.value)"
      styleClass="ui-patient-filter-select"
      [appendTo]="'body'"
      ariaLabel="Filtrar por paciente" />
  `,
  styles: [`
    :host { display: inline-block; min-width: 0; vertical-align: middle; }
  `],
})
export class PatientFilterComponent {
  /** Opción "Todos" al frente (value null). En perfil se desactiva con includeTodos=false. */
  selectOptions: SelectItem[] = [{ label: 'Todos', value: null }];

  private _raw: PatientFilterOption[] = [];
  private _includeTodos = true;

  @Input()
  set options(value: PatientFilterOption[]) {
    this._raw = value ?? [];
    this.rebuild();
  }

  @Input()
  set includeTodos(value: boolean) {
    this._includeTodos = value;
    this.rebuild();
  }

  private rebuild(): void {
    const patients: SelectItem[] = this._raw.map(o => {
      const nombre = capitalizeWords(o.nombre);
      return {
        label: o.sublabel ? `${nombre} · ${o.sublabel}` : nombre,
        value: o.id as number | null,
      };
    });
    this.selectOptions = this._includeTodos
      ? [{ label: 'Todos', value: null }, ...patients]
      : patients;
  }

  @Input() selectedId: number | null = null;
  @Output() selectedIdChange = new EventEmitter<number | null>();
}
