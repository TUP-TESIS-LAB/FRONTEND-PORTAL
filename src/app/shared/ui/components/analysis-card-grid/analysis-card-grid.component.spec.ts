import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalysisCardGridComponent } from './analysis-card-grid.component';
import { AnalysisBooking, AnalysisBookingDetail } from '../../../../core/models/analysis-booking.model';

function item(overrides: Partial<AnalysisBooking>): AnalysisBooking {
  return { id: 1, name: 'Hemograma', familyName: 'Hematología', ...overrides };
}

function selectedItem(overrides: Partial<AnalysisBookingDetail>): AnalysisBookingDetail {
  return { id: 1, name: 'Hemograma', familyName: 'Hematología', determinations: [], ...overrides };
}

describe('AnalysisCardGridComponent', () => {
  let cmp: AnalysisCardGridComponent;

  beforeEach(() => {
    cmp = new AnalysisCardGridComponent();
    cmp.items = [item({ id: 1, name: 'Hemograma' }), item({ id: 2, name: 'Glucemia', familyName: 'Bioquímica' })];
    cmp.selected = [];
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
    cmp.selected = [selectedItem({ id: 1 })];
    const spy = vi.fn();
    cmp.analysisDeselect.subscribe(spy);
    cmp.toggle(1);
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('isSelected refleja selected independientemente de los resultados de búsqueda actuales', () => {
    // La selección persiste aunque el ítem ya no esté en items() (nueva búsqueda lo reemplazó).
    cmp.selected = [selectedItem({ id: 99 })];
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

  it('retry() re-emite searchChange con el término de búsqueda actual (incluido vacío)', () => {
    cmp.search = 'gluc';
    const spy = vi.fn();
    cmp.searchChange.subscribe(spy);
    cmp.retry();
    expect(spy).toHaveBeenCalledWith('gluc');
  });

  it('displayItems pone lo seleccionado primero, seguido de los resultados no elegidos', () => {
    cmp.items = [item({ id: 1, name: 'Hemograma' }), item({ id: 2, name: 'Glucemia' })];
    cmp.selected = [selectedItem({ id: 99, name: 'Colesterol Total' })];
    expect(cmp.displayItems.map(i => i.id)).toEqual([99, 1, 2]);
  });

  it('displayItems no duplica un ítem que está seleccionado y también vino en los resultados de búsqueda', () => {
    cmp.items = [item({ id: 1, name: 'Hemograma' }), item({ id: 2, name: 'Glucemia' })];
    cmp.selected = [selectedItem({ id: 1, name: 'Hemograma' })];
    expect(cmp.displayItems.map(i => i.id)).toEqual([1, 2]);
  });

  it('displayItems es solo lo seleccionado cuando la búsqueda actual no trae resultados', () => {
    cmp.items = [];
    cmp.selected = [selectedItem({ id: 1 }), selectedItem({ id: 2 })];
    expect(cmp.displayItems.map(i => i.id)).toEqual([1, 2]);
  });
});
