import { Component, effect, inject, OnInit, signal } from '@angular/core';
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
import * as A from './store/perfil.actions';
import {
  selectUser, selectLoading, selectSaving, selectProfileSaved,
  selectPasswordChanging, selectPasswordChanged, selectError,
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
  ],
  providers: [MessageService],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  private readonly messageService = inject(MessageService);
  private readonly store          = inject(Store);
  private readonly fb             = inject(FormBuilder);

  readonly user    = this.store.selectSignal(selectUser);
  readonly loading = this.store.selectSignal(selectLoading);
  readonly saving  = this.store.selectSignal(selectSaving);
  private readonly profileSaved = this.store.selectSignal(selectProfileSaved);

  readonly passwordChanging = this.store.selectSignal(selectPasswordChanging);
  private readonly passwordChanged = this.store.selectSignal(selectPasswordChanged);
  private readonly error = this.store.selectSignal(selectError);

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
  }

  ngOnInit(): void {
    this.store.dispatch(A.loadProfile());
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
