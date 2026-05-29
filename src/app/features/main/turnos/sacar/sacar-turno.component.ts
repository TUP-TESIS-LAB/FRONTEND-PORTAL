import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, switchMap } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { WizardComponent } from '../../../../shared/ui/wizard/wizard/wizard.component';
import { AnalysisCardGridComponent } from '../../../../shared/ui/components/analysis-card-grid/analysis-card-grid.component';
import { SedeListComponent } from '../../../../shared/ui/components/sede-list/sede-list.component';
import { TimeSlotsComponent } from '../../../../shared/ui/components/time-slots/time-slots.component';
import { TurnoResumenComponent } from '../../../../shared/ui/components/turno-resumen/turno-resumen.component';
import { StepParaQuienComponent } from './steps/step-para-quien/step-para-quien.component';
import { BreakpointService } from '../../../../shared/utils/breakpoint.service';
import { TipoAnalisisService } from '../services/tipo-analisis.service';
import { SucursalPublicService } from '../../../../core/sucursales/sucursal-public.service';
import { AppointmentService } from '../services/appointment.service';
import { FamilyService } from '../../../../core/family/family.service';
import { mapApiError } from '../../../../shared/utils/api-error-mapper';
import { toLocalDateTimeString } from '../../../../shared/utils/local-datetime';
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
    DrawerModule,
    ToastModule,
    WizardComponent,
    AnalysisCardGridComponent,
    SedeListComponent,
    TimeSlotsComponent,
    TurnoResumenComponent,
    StepParaQuienComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './sacar-turno.component.html',
  styleUrl: './sacar-turno.component.scss',
})
export class SacarTurnoComponent implements OnInit, OnDestroy {
  private readonly tiposSvc       = inject(TipoAnalisisService);
  private readonly sedeSvc        = inject(SucursalPublicService);
  private readonly appointmentSvc = inject(AppointmentService);
  private readonly familySvc      = inject(FamilyService);
  private readonly messageService = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly router         = inject(Router);
  private readonly route          = inject(ActivatedRoute);
  private readonly destroyRef     = inject(DestroyRef);
  readonly bp                     = inject(BreakpointService);

  // ─── Datos del catálogo (cargados una sola vez) ──────
  readonly tiposAnalisis = toSignal(this.tiposSvc.getTipos(), { initialValue: [] });
  readonly sedes         = toSignal(this.sedeSvc.getSedes(),  { initialValue: [] });
  readonly family        = toSignal(this.familySvc.getFamily(), { initialValue: [] });

  // ─── Slots: mutables, dependen de sede + fecha ───────
  readonly slots        = signal<SlotDisponible[]>([]);
  readonly loadingSlots = signal(false);
  readonly saving       = signal(false);

  // ─── Selecciones del usuario ─────────────────────────
  readonly selectedPatientId = signal<number | null>(null);
  readonly selectedTipoIds   = signal<(number | string)[]>([]);
  readonly selectedSedeId    = signal<string | null>(null);
  readonly selectedFecha     = signal<Date | null>(null);
  readonly selectedHora      = signal<string | null>(null);

  // ─── ngModel del datepicker (visual, no lógica) ──────
  fechaModel: Date | null = null;

  // ─── Paso actual del wizard ───────────────────────────
  readonly currentStep = signal(0);

  // True cuando el patient se eligió via ?personaId= → ocultar el picker.
  private readonly preselectedFromUrl = signal(false);

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

  // ─── Definición de pasos (dinámicos: ocultan 'para-quien' cuando no aporta) ───
  // 'para-quien' sólo tiene sentido si hay más de un familiar real y el patient
  // no vino preseleccionado desde un deeplink. En cualquier otro caso, el
  // wizard arranca directo en 'tipo' (el patient ya está fijado).
  readonly steps = computed<WizardStep[]>(() => {
    const all: WizardStep[] = [
      { id: 'para-quien', label: 'Para quién'      },
      { id: 'tipo',       label: 'Tipo de análisis' },
      { id: 'sede',       label: 'Sede'             },
      { id: 'fecha',      label: 'Fecha y hora'     },
      { id: 'confirmar',  label: 'Confirmar'         },
    ];
    if (this.family().length <= 1 || this.preselectedFromUrl()) {
      return all.filter(s => s.id !== 'para-quien');
    }
    return all;
  });

  readonly currentStepId = computed(() => this.steps()[this.currentStep()]?.id);

  readonly canProceed = computed(() => {
    switch (this.currentStepId()) {
      case 'para-quien': return this.selectedPatientId() !== null;
      case 'tipo':       return this.selectedTipoIds().length > 0;
      case 'sede':       return this.selectedSedeId() !== null;
      case 'fecha':      return this.selectedFecha() !== null && this.selectedHora() !== null;
      case 'confirmar':  return true;
      default:           return false;
    }
  });

  // El backend (GetAvailableSlotsUseCase + CreateAppointmentUseCase) exige que
  // la fecha del turno sea >= hoy + 2 días. Si el datepicker permite menos, el
  // submit del slot pega 400 con InvalidBookingDateException. Reflejarlo en el
  // minDate evita el viaje al servidor.
  readonly minBookingDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  // ─── Subject para cancelar requests de slots previos ─
  private readonly loadSlotsSubject = new Subject<{ sedeId: string; fecha: Date }>();

  constructor() {
    this.loadSlotsSubject.pipe(
      switchMap(({ sedeId, fecha }) => {
        this.loadingSlots.set(true);
        return this.appointmentSvc.getAvailability(Number(sedeId), fecha);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(slots => {
      this.slots.set(slots);
      this.loadingSlots.set(false);
    });
  }

  // El wizard se monta como overlay full-sheet en mobile (drawer) y como
  // modal en desktop. Marca el body para que la patient-shell oculte el
  // bottom-nav fijo mientras el wizard esté abierto (z-index --z-bottom-nav
  // 400 > --z-drawer 300, así que sin ocultar el nav pinta encima del sheet).
  ngOnInit(): void {
    document.body.classList.add('wizard-open');

    const personaIdParam = this.route.snapshot.queryParamMap.get('personaId');
    if (personaIdParam !== null) {
      const id = Number(personaIdParam);
      if (!isNaN(id)) {
        this.selectedPatientId.set(id);
        this.preselectedFromUrl.set(true);
      }
    }
    // Preselect the first family member once it loads. The 'para-quien' step
    // is hidden via the steps computed when family.length <= 1, so no need
    // to manually advance currentStep — step 0 is already 'tipo' in that case.
    this.familySvc.getFamily()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(family => {
        if (this.selectedPatientId() === null && family.length > 0) {
          this.selectedPatientId.set(family[0].id);
        }
      });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('wizard-open');
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
    const patientId = this.selectedPatientId();
    const sedeId    = this.selectedSedeId();
    const fecha     = this.selectedFecha();
    const hora      = this.selectedHora();
    const tipoIds   = this.selectedTipoIds();

    if (!patientId || !sedeId || !fecha || !hora || tipoIds.length === 0) return;

    const [hh, mm] = hora.split(':').map(Number);
    const scheduledAt = new Date(fecha);
    scheduledAt.setHours(hh, mm, 0, 0);

    // Resolve determinationIds from selected tipos
    const tiposMap = new Map(this.tiposAnalisis().map(t => [t.id, t]));
    const allDetIds: number[] = [];
    for (const id of tipoIds) {
      const tipo = tiposMap.get(id);
      if (!tipo) continue;
      for (const d of tipo.determinationIds) {
        if (!allDetIds.includes(d)) allDetIds.push(d);
      }
    }
    const determinations = allDetIds.map((determinationId, idx) => ({
      determinationId, orderNumber: idx + 1,
    }));

    this.saving.set(true);
    this.appointmentSvc.book({
      patientId,
      branchId: Number(sedeId),
      scheduledAt: toLocalDateTimeString(scheduledAt),
      determinations,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Turno reservado',
          detail: `Tu turno quedó confirmado para el ${fecha.getDate()} de ${
            this.MESES_FULL[fecha.getMonth()]} a las ${hora} hs.`,
          life: 5000,
        });
        this.router.navigate(['/turnos']);
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: mapApiError(err),
          life: 4000,
        });
      },
    });
  }

  private readonly MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio',
                                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
}
