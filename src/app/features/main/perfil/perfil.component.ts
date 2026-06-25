import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { PatientFilterComponent, PatientFilterOption } from '../../../shared/ui/components/patient-filter/patient-filter.component';
import { ActivePatientService } from '../../../core/active-patient/active-patient.service';
import * as A from './store/perfil.actions';
import {
  selectUser, selectLoading, selectSaving, selectProfileSaved,
  selectPasswordChanging, selectPasswordChanged, selectError,
  selectRegistering, selectRegisteredPatientId,
} from './store/perfil.selectors';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    SkeletonModule,
    ToastModule,
    PageHeaderComponent,
    PatientFilterComponent,
  ],
  providers: [MessageService],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent {
  private readonly messageService = inject(MessageService);
  private readonly store          = inject(Store);
  private readonly fb             = inject(FormBuilder);
  private readonly activePatient  = inject(ActivePatientService);

  readonly user    = this.store.selectSignal(selectUser);
  readonly loading = this.store.selectSignal(selectLoading);
  readonly saving  = this.store.selectSignal(selectSaving);
  readonly registering = this.store.selectSignal(selectRegistering);
  private readonly profileSaved = this.store.selectSignal(selectProfileSaved);

  readonly passwordChanging = this.store.selectSignal(selectPasswordChanging);
  private readonly passwordChanged = this.store.selectSignal(selectPasswordChanged);
  private readonly registeredPatientId = this.store.selectSignal(selectRegisteredPatientId);
  private readonly error = this.store.selectSignal(selectError);

  // ── Paciente cuyo perfil se está viendo ──────────────────
  protected readonly accessiblePatients = this.activePatient.accessiblePatients;
  selectedPatientId = signal<number | null>(null);

  protected readonly ownPatientId = computed(() =>
    this.accessiblePatients().find(f => f.vinculo === 'Yo')?.id ?? null);
  /** La cuenta de gestión es, ella misma, paciente (tiene vínculo PROPIO). */
  protected readonly esPaciente = computed(() => this.ownPatientId() !== null);
  /** Estás viendo tu propio perfil → habilita editar / cambiar contraseña. */
  protected readonly viewingOwn = computed(() =>
    this.ownPatientId() !== null && this.selectedPatientId() === this.ownPatientId());

  protected readonly patientFilterOptions = computed<PatientFilterOption[]>(() =>
    this.accessiblePatients().map(f => ({
      id: f.id,
      nombre: f.nombre,
      iniciales: f.iniciales,
      accentColor: f.accentColor,
      sublabel: f.vinculo === 'Yo' ? 'vos' : f.vinculo,
    })));

  mostrarCambioPass = signal(false);
  mostrarEdicion = signal(false);

  passForm = this.fb.group({
    currentPassword: ['', [Validators.required, Validators.minLength(8)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  editForm = this.fb.group({
    email: ['', [Validators.email]],
    phone: [''],
    address: [''],
  });

  private initialized = false;

  constructor() {
    // One-shot: reacciona SOLO al flag passwordChanged y lo consume despachando el reset.
    effect(() => {
      if (this.passwordChanged()) {
        this.messageService.add({
          severity: 'success',
          summary: 'Contraseña actualizada',
          detail: 'Tu contraseña se cambió correctamente.',
          life: 3000,
        });
        this.passForm.reset({ currentPassword: '', newPassword: '' });
        this.mostrarCambioPass.set(false);
        this.store.dispatch(A.passwordChangeHandled());
      }
    });

    // One-shot: reacciona SOLO al flag profileSaved (no a saving/mostrarEdicion) y lo consume con el reset.
    effect(() => {
      if (this.profileSaved()) {
        this.messageService.add({
          severity: 'success',
          summary: 'Perfil actualizado',
          detail: 'Tus datos se guardaron correctamente.',
          life: 3000,
        });
        this.mostrarEdicion.set(false);
        this.store.dispatch(A.profileSavedHandled());
      }
    });

    effect(() => {
      if (this.error()) {
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo completar la operación',
          detail: 'Verificá los datos e intentá de nuevo.',
          life: 4000,
        });
      }
    });

    // Carga inicial: cuando la familia esté lista, elegir el paciente por defecto
    // (propio si la cuenta es paciente; si no, el primer dependiente) y cargar su perfil.
    effect(() => {
      const fam = this.accessiblePatients();
      if (fam.length === 0 || this.initialized) return;
      this.initialized = true;
      const def = (fam.find(f => f.vinculo === 'Yo') ?? fam[0]).id;
      this.selectedPatientId.set(def);
      this.store.dispatch(A.loadProfile({ patientId: def }));
    });

    // Autoalta exitosa → refrescar familia y pasar a ver el perfil propio nuevo.
    effect(() => {
      const pid = this.registeredPatientId();
      if (pid != null) {
        this.messageService.add({
          severity: 'success',
          summary: '¡Listo!',
          detail: 'Ya estás registrado como paciente.',
          life: 3500,
        });
        this.activePatient.reload();
        this.selectedPatientId.set(pid);
        this.store.dispatch(A.loadProfile({ patientId: pid }));
        this.store.dispatch(A.registerHandled());
      }
    });
  }

  onSelectPatient(id: number | null): void {
    if (id == null) return;
    this.selectedPatientId.set(id);
    this.store.dispatch(A.loadProfile({ patientId: id }));
  }

  darmeDeAlta(): void {
    this.store.dispatch(A.registerAsPatient());
  }

  abrirCambioPass(): void {
    this.passForm.reset({ currentPassword: '', newPassword: '' });
    this.mostrarCambioPass.set(true);
  }

  cerrarCambioPass(): void {
    this.mostrarCambioPass.set(false);
    this.passForm.reset({ currentPassword: '', newPassword: '' });
  }

  guardarPassword(): void {
    if (this.passForm.invalid) { this.passForm.markAllAsTouched(); return; }
    const { currentPassword, newPassword } = this.passForm.getRawValue();
    this.store.dispatch(A.changePassword({ currentPassword: currentPassword!, newPassword: newPassword! }));
  }

  abrirEdicion(): void {
    const u = this.user();
    this.editForm.reset({
      email: u?.email ?? '',
      phone: u?.phone ?? '',
      address: u?.address ?? '',
    });
    this.mostrarEdicion.set(true);
  }

  cancelarEdicion(): void {
    this.mostrarEdicion.set(false);
  }

  guardarEdicion(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const { email, phone, address } = this.editForm.getRawValue();
    this.store.dispatch(A.updateProfile({ payload: { email: email!, phone: phone!, address: address! } }));
  }
}
