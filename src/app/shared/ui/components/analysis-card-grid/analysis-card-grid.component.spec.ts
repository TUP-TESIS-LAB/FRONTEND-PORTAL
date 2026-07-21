import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalysisCardGridComponent } from './analysis-card-grid.component';
import { AnalysisBooking } from '../../../../core/models/analysis-booking.model';

function item(overrides: Partial<AnalysisBooking>): AnalysisBooking {
  return { id: 1, name: 'Hemograma', familyName: 'Hematología', ...overrides };
}

describe('AnalysisCardGridComponent', () => {
  let cmp: AnalysisCardGridComponent;

  beforeEach(() => {
    cmp = new AnalysisCardGridComponent();
    cmp.items = [item({ id: 1, name: 'Hemograma' }), item({ id: 2, name: 'Glucemia', familyName: 'Bioquímica' })];
    cmp.selectedIds = [];
    cmp.pendingSelectionIds = [];
  });

  it('onSearchInput actualiza el término local y emite searchChange (el debounce vive en el effect, no acá)', () => {
    const spy = vi.fn();
    cmp.searchChange.subscribe(spy);
    cmp.onSearchInput('gluc');
    expect(cmp.search).toBe('gluc');
    expect(spy).toHaveBeenCalledWith('gluc');
  });

  it('clearSearch vacía el término y emite searchChange con string vacío', () => {
    cmp.search = 'gluc';
    const spy = vi.fn();
    cmp.searchChange.subscribe(spy);
    cmp.clearSearch();
    expect(cmp.search).toBe('');
    expect(spy).toHaveBeenCalledWith('');
  });

  it('toggle emite analysisSelect() para un id no seleccionado', () => {
    const spy = vi.fn();
    cmp.analysisSelect.subscribe(spy);
    cmp.toggle(1);
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('toggle emite analysisDeselect() para un id ya seleccionado', () => {
    cmp.selectedIds = [1];
    const spy = vi.fn();
    cmp.analysisDeselect.subscribe(spy);
    cmp.toggle(1);
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('isSelected refleja selectedIds independientemente de los resultados de búsqueda actuales', () => {
    // La selección persiste aunque el ítem ya no esté en items() (nueva búsqueda lo reemplazó).
    cmp.selectedIds = [99];
    cmp.items = [item({ id: 1 })];
    expect(cmp.isSelected(99)).toBe(true);
    expect(cmp.isSelected(1)).toBe(false);
  });

  it('isResolvingSelection refleja pendingSelectionIds', () => {
    cmp.pendingSelectionIds = [1];
    expect(cmp.isResolvingSelection(1)).toBe(true);
    expect(cmp.isResolvingSelection(2)).toBe(false);
  });

  it('icon() no rompe cuando familyName es null (default genérico)', () => {
    expect(() => cmp.icon(item({ familyName: null }))).not.toThrow();
  });
});
