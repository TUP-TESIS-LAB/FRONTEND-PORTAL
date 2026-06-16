import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { ProfileSummaryComponent } from '../../../shared/ui/components/profile-summary/profile-summary.component';
import { DataFieldComponent } from '../../../shared/ui/components/data-field/data-field.component';
import { PerfilService } from './perfil.service';
import * as A from './store/perfil.actions';
import { selectPasswordChanging, selectPasswordChanged, selectError } from './store/perfil.selectors';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    PasswordModule,
    SkeletonModule,
    TabsModule,
    ToastModule,
    PageHeaderComponent,
    ProfileSummaryComponent,
    DataFieldComponent,
  ],
  providers: [MessageService],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent {
  private readonly perfilService  = inject(PerfilService);
  private readonly messageService = inject(MessageService);
  private readonly store          = inject(Store);
  private readonly fb             = inject(FormBuilder);

  user    = toSignal(this.perfilService.getPerfil(), { initialValue: null });
  loading = computed(() => this.user() === null);

  readonly passwordChanging = this.store.selectSignal(selectPasswordChanging);
  private readonly passwordChanged = this.store.selectSignal(selectPasswordChanged);
  private readonly error = this.store.selectSignal(selectError);

  mostrarCambioPass = signal(false);

  passForm = this.fb.group({
    currentPassword: ['', [Validators.required, Validators.minLength(8)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
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
      }
    });

    effect(() => {
      if (this.error()) {
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo cambiar la contraseña',
          detail: 'Verificá tu contraseña actual e intentá de nuevo.',
          life: 4000,
        });
      }
    });
  }

  toggleCambioPass(): void {
    this.mostrarCambioPass.update(v => !v);
  }

  guardarPassword(): void {
    if (this.passForm.invalid) { this.passForm.markAllAsTouched(); return; }
    const { currentPassword, newPassword } = this.passForm.getRawValue();
    this.store.dispatch(A.changePassword({ currentPassword: currentPassword!, newPassword: newPassword! }));
  }

  onEditar(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Próximamente',
      detail: 'La edición del perfil estará disponible pronto.',
      life: 3000,
    });
  }

  onSubirCredencial(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Próximamente',
      detail: 'La subida de credencial estará disponible pronto.',
      life: 3000,
    });
  }

  onEditCampo(campo: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Próximamente',
      detail: `Editar ${campo} estará disponible pronto.`,
      life: 3000,
    });
  }
}
