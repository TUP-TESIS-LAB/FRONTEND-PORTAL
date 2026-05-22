import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, switchMap } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { WizardComponent } from '../../../../shared/ui/wizard/wizard/wizard.component';
import { AnalysisCardGridComponent } from '../../../../shared/ui/components/analysis-card-grid/analysis-card-grid.component';
import { SedeListComponent } from '../../../../shared/ui/components/sede-list/sede-list.component';
import { TimeSlotsComponent } from '../../../../shared/ui/components/time-slots/time-slots.component';
import { TurnoResumenComponent } from '../../../../shared/ui/components/turno-resumen/turno-resumen.component';
import { BreakpointService } from '../../../../shared/utils/breakpoint.service';
import { SacarTurnoService } from './sacar-turno.service';
import { WizardStep } from '../../../../shared/ui/types';
import { SlotDisponible } from '../../../../core/models/slot-disponible.model';

@Component({
  selector: 'app-sacar-turno',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    DrawerModule,
    ToastModule,
    WizardComponent,
    AnalysisCardGridComponent,
    SedeListComponent,
    TimeSlotsComponent,
    TurnoResumenComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './sacar-turno.component.html',
  styleUrl: './sacar-turno.component.scss',
})
export class SacarTurnoComponent {
  private readonly service       = inject(SacarTurnoService);
  private readonly messageService = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly router         = inject(Router);
  private readonly destroyRef     = inject(DestroyRef);
  readonly bp                     = inject(BreakpointService);

  // ─── Datos del catálogo (cargados una sola vez) ──────
  readonly tiposAnalisis = toSignal(this.service.getTiposAnalisis(), { initialValue: [] });
  readonly sedes         = toSignal(this.service.getSedes(),         { initialValue: [] });

  // ─── Slots: mutables, dependen de sede + fecha ───────
  readonly slots        = signal<SlotDisponible[]>([]);
  readonly loadingSlots = signal(false);
  readonly saving       = signal(false);

  // ─── Selecciones del usuario ─────────────────────────
  readonly selectedTipoIds = signal<(number | string)[]>([]);
  readonly selectedSedeId  = signal<string | null>(null);
  readonly selectedFecha   = signal<Date | null>(null);
  readonly selectedHora    = signal<string | null>(null);

  // ─── ngModel del datepicker (visual, no lógica) ──────
  // Necesario para que el calendario muestre el día seleccionado al volver al paso
  fechaModel: Date | null = null;

  // ─── Paso actual del wizard ───────────────────────────
  readonly currentStep = signal(0);

  // ─── Computed: datos derivados ───────────────────────
  readonly selectedTipos = computed(() =>
    this.tiposAnalisis().filter(t => this.selectedTipoIds().includes(t.id)),
  );

  readonly selectedSede = computed(() =>
    this.sedes().find(s => s.id === this.selectedSedeId()) ?? null,
  );

  readonly requiereAyuno = computed(() =>
    this.selectedTipos().some(t => t.ayuno),
  );

  readonly canProceed = computed(() => {
    switch (this.currentStep()) {
      case 0: return this.selectedTipoIds().length > 0;
      case 1: return this.selectedSedeId() !== null;
      case 2: return this.selectedFecha() !== null && this.selectedHora() !== null;
      case 3: return true;
      default: return false;
    }
  });

  // ─── Definición de pasos ─────────────────────────────
  readonly steps: WizardStep[] = [
    { id: 'tipo',      label: 'Tipo de análisis' },
    { id: 'sede',      label: 'Sede'             },
    { id: 'fecha',     label: 'Fecha y hora'     },
    { id: 'confirmar', label: 'Confirmar'         },
  ];

  readonly today = new Date();

  // ─── Subject para cancelar requests de slots previos ─
  private readonly loadSlotsSubject = new Subject<{ sedeId: string; fecha: Date }>();

  constructor() {
    // switchMap cancela la petición anterior si llega una nueva antes de completarse
    this.loadSlotsSubject.pipe(
      switchMap(({ sedeId, fecha }) => {
        this.loadingSlots.set(true);
        return this.service.getSlots(sedeId, fecha);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(slots => {
      this.slots.set(slots);
      this.loadingSlots.set(false);
    });
  }

  // ─── Handlers de navegación del wizard ───────────────

  onNext(): void {
    this.currentStep.update(s => s + 1);
  }

  onBack(): void {
    this.currentStep.update(s => s - 1);
  }

  onCancel(): void {
    this.confirmService.confirm({
      message: '¿Querés salir sin reservar el turno?',
      header: 'Salir del proceso',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, salir',
      rejectLabel: 'Cancelar',
      accept: () => this.router.navigate(['/turnos']),
    });
  }

  // ─── Handlers de selección por paso ──────────────────

  onSedeChange(sedeId: string): void {
    this.selectedSedeId.set(sedeId);
    // Resetear hora al cambiar sede (slots cambiarán)
    this.selectedHora.set(null);
    if (this.selectedFecha()) {
      this.loadSlots();
    }
  }

  onFechaChange(fecha: Date): void {
    this.selectedFecha.set(fecha);
    this.selectedHora.set(null);
    this.loadSlots();
  }

  private loadSlots(): void {
    const sedeId = this.selectedSedeId();
    const fecha  = this.selectedFecha();
    if (sedeId && fecha) {
      this.loadSlotsSubject.next({ sedeId, fecha });
    }
  }

  // ─── Confirmación final ───────────────────────────────

  onConfirm(): void {
    const sedeId          = this.selectedSedeId();
    const fecha           = this.selectedFecha();
    const hora            = this.selectedHora();
    const tipoAnalisisIds = this.selectedTipoIds();

    if (!sedeId || !fecha || !hora || tipoAnalisisIds.length === 0) return;

    this.saving.set(true);
    this.service.reservar({ tipoAnalisisIds, sedeId, fecha, hora })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Turno reservado',
            detail: `Tu turno quedó confirmado para el ${fecha.getDate()} de ${
              ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'][fecha.getMonth()]
            } a las ${hora} hs.`,
            life: 5000,
          });
          this.router.navigate(['/turnos']);
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo reservar el turno. Intentá de nuevo.',
            life: 4000,
          });
        },
      });
  }
}
