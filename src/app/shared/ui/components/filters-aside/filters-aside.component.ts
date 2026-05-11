import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { EstudiosFiltros, EstadoEstudio, CategoriaEstudio } from '../../../../core/models/estudio.model';

export interface FilterOption<T> {
  label: string;
  value: T;
  count: number;
}

const TIPOS_OPCIONES: FilterOption<CategoriaEstudio>[] = [
  { label: 'Hematología',  value: 'hematologia',  count: 0 },
  { label: 'Bioquímica',   value: 'bioquimica',   count: 0 },
  { label: 'Hormonas',     value: 'hormonas',     count: 0 },
  { label: 'Orina',        value: 'orina',        count: 0 },
  { label: 'Coagulación',  value: 'coagulacion',  count: 0 },
];

const ESTADOS_OPCIONES: FilterOption<EstadoEstudio>[] = [
  { label: 'Disponible',  value: 'disponible',  count: 0 },
  { label: 'En proceso',  value: 'en-proceso',  count: 0 },
  { label: 'Pendiente',   value: 'pendiente',   count: 0 },
];

const RANGOS_RAPIDOS = [
  { label: 'Último mes', meses: 1 },
  { label: '3 meses',    meses: 3 },
  { label: '6 meses',    meses: 6 },
  { label: 'Año',        meses: 12 },
];

@Component({
  selector: 'ui-filters-aside',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CheckboxModule, DatePickerModule],
  templateUrl: './filters-aside.component.html',
  styleUrl: './filters-aside.component.scss',
})
export class FiltersAsideComponent implements OnChanges {
  @Input() filtros: EstudiosFiltros = { rangoFechas: null, tipos: [], estados: [] };
  @Input() countsByTipo: Record<string, number> = {};
  @Input() countsByEstado: Record<EstadoEstudio, number> = {} as Record<EstadoEstudio, number>;
  /** En mobile (dentro del bottom sheet) muestra los botones de Aplicar/Limpiar en el footer */
  @Input() mobileMode = false;

  @Output() filtrosChange = new EventEmitter<EstudiosFiltros>();
  @Output() limpiar       = new EventEmitter<void>();
  @Output() aplicar       = new EventEmitter<EstudiosFiltros>();

  tiposOpciones   = TIPOS_OPCIONES;
  estadosOpciones = ESTADOS_OPCIONES;
  rangosRapidos   = RANGOS_RAPIDOS;

  // Estado interno de edición (sincronizado con el @Input al abrir)
  tiposSeleccionados: CategoriaEstudio[]  = [];
  estadosSeleccionados: EstadoEstudio[]   = [];
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  rangoActivoMeses: number | null = null;

  // Colores de punto por estado
  readonly estadoColors: Record<EstadoEstudio, string> = {
    'disponible': 'var(--ds-success)',
    'en-proceso': 'var(--ds-info)',
    'pendiente':  'var(--ds-warning)',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filtros']) {
      this.tiposSeleccionados    = [...this.filtros.tipos];
      this.estadosSeleccionados  = [...this.filtros.estados];
      this.fechaDesde = this.filtros.rangoFechas?.desde ?? null;
      this.fechaHasta = this.filtros.rangoFechas?.hasta ?? null;
      this.rangoActivoMeses = null;
    }
  }

  getCountTipo(valor: CategoriaEstudio): number {
    return this.countsByTipo[valor] ?? 0;
  }

  getCountEstado(valor: EstadoEstudio): number {
    return this.countsByEstado[valor] ?? 0;
  }

  onRangoRapido(meses: number): void {
    if (this.rangoActivoMeses === meses) {
      // toggle off
      this.rangoActivoMeses = null;
      this.fechaDesde = null;
      this.fechaHasta = null;
    } else {
      this.rangoActivoMeses = meses;
      const hasta = new Date();
      const desde = new Date();
      desde.setMonth(desde.getMonth() - meses);
      this.fechaDesde = desde;
      this.fechaHasta = hasta;
    }
    if (!this.mobileMode) this.emitir();
  }

  onFechaChange(): void {
    this.rangoActivoMeses = null;
    if (!this.mobileMode) this.emitir();
  }

  onTipoChange(): void {
    if (!this.mobileMode) this.emitir();
  }

  onEstadoChange(): void {
    if (!this.mobileMode) this.emitir();
  }

  onAplicar(): void {
    const filtros = this.buildFiltros();
    this.filtrosChange.emit(filtros);
    this.aplicar.emit(filtros);
  }

  onLimpiar(): void {
    this.limpiar.emit();
  }

  private emitir(): void {
    this.filtrosChange.emit(this.buildFiltros());
  }

  private buildFiltros(): EstudiosFiltros {
    return {
      rangoFechas: this.fechaDesde && this.fechaHasta
        ? { desde: this.fechaDesde, hasta: this.fechaHasta }
        : null,
      tipos:   [...this.tiposSeleccionados],
      estados: [...this.estadosSeleccionados],
    };
  }
}
