import { describe, it, expect } from 'vitest';
import { PatientFilterComponent, PatientFilterOption } from './patient-filter.component';

const OPTS: PatientFilterOption[] = [
  { id: 1, nombre: 'Carlos', iniciales: 'CG', accentColor: 'primary', sublabel: 'vos' },
  { id: 2, nombre: 'mateo',  iniciales: 'MP', accentColor: 'secondary', sublabel: 'Hijo' },
];

describe('PatientFilterComponent', () => {
  it('arma las opciones del select con "Todos" primero + una por paciente', () => {
    const cmp = new PatientFilterComponent();
    cmp.options = OPTS;
    expect(cmp.selectOptions.length).toBe(3); // Todos + 2
    expect(cmp.selectOptions[0]).toEqual({ label: 'Todos', value: null });
    expect(cmp.selectOptions[1]).toEqual({ label: 'Carlos · vos', value: 1 });
    expect(cmp.selectOptions[2]).toEqual({ label: 'Mateo · Hijo', value: 2 });
  });

  it('sin sublabel usa solo el nombre', () => {
    const cmp = new PatientFilterComponent();
    cmp.options = [{ id: 9, nombre: 'Sin Vinculo', iniciales: 'SV' }];
    expect(cmp.selectOptions[1]).toEqual({ label: 'Sin Vinculo', value: 9 });
  });

  it('options vacío/undefined deja solo "Todos"', () => {
    const cmp = new PatientFilterComponent();
    cmp.options = undefined as unknown as PatientFilterOption[];
    expect(cmp.selectOptions).toEqual([{ label: 'Todos', value: null }]);
  });

  it('selectedIdChange emite el valor elegido', () => {
    const cmp = new PatientFilterComponent();
    const emitted: (number | null)[] = [];
    cmp.selectedIdChange.subscribe(v => emitted.push(v));
    cmp.selectedIdChange.emit(2);
    cmp.selectedIdChange.emit(null);
    expect(emitted).toEqual([2, null]);
  });
});
