import { Component, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PublicTopbarComponent } from '../ui/public-topbar/public-topbar.component';
import { TenantService } from '../../../core/tenant/tenant.service';
import { setFirstLoginPassword } from './store/first-login.actions';
import {
  selectFirstLoginSubmitting,
  selectFirstLoginDone,
  selectFirstLoginError,
} from './store/first-login.selectors';
import { mapApiError } from '../../../shared/utils/api-error-mapper';

@Component({
  selector: 'app-first-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    PasswordModule,
    InputTextModule,
    FloatLabelModule,
    ToastModule,
    PublicTopbarComponent,
  ],
  providers: [MessageService],
  templateUrl: './first-login.component.html',
})
export class FirstLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  readonly tenant = inject(TenantService);

  readonly submitting = this.store.selectSignal(selectFirstLoginSubmitting);
  readonly done = this.store.selectSignal(selectFirstLoginDone);
  readonly errorSignal = this.store.selectSignal(selectFirstLoginError);

  form = this.fb.group({
    token: [
      this.route.snapshot.queryParamMap.get('token') ?? '',
      [Validators.required, Validators.minLength(8)],
    ],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      if (this.done()) {
        this.toast.add({
          severity: 'success',
          summary: 'Listo',
          detail: 'Ya podés ingresar con tu DNI y tu nueva contraseña.',
          life: 3500,
        });
        setTimeout(() => this.router.navigate(['/login']), 1200);
      }
    });

    effect(() => {
      const err = this.errorSignal();
      if (err) {
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: mapApiError(err),
          life: 5000,
        });
      }
    });
  }

  get f() { return this.form.controls; }

  hasError(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.get(field as string);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  get mismatch(): boolean {
    const { password, confirm } = this.form.getRawValue();
    return !!confirm && password !== confirm;
  }

  submit(): void {
    if (this.form.invalid || this.mismatch) { this.form.markAllAsTouched(); return; }
    const { token, password } = this.form.getRawValue();
    this.store.dispatch(setFirstLoginPassword({ token: token!, newPassword: password! }));
  }
}
