import { Component, OnInit, effect, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PublicTopbarComponent } from '../ui/public-topbar/public-topbar.component';
import { TenantService } from '../../../core/tenant/tenant.service';
import { validateToken, resetPassword } from './store/password-recovery.actions';
import {
  selectSubmitting,
  selectTokenStatus,
  selectResetDone,
} from './store/password-recovery.selectors';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    PasswordModule,
    FloatLabelModule,
    ToastModule,
    PublicTopbarComponent,
  ],
  providers: [MessageService],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(MessageService);
  readonly tenant = inject(TenantService);

  private token = '';

  readonly submitting = this.store.selectSignal(selectSubmitting);
  readonly tokenStatus = this.store.selectSignal(selectTokenStatus);
  readonly resetDone = this.store.selectSignal(selectResetDone);

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    repeat: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      if (this.resetDone()) {
        this.toast.add({
          severity: 'success',
          summary: 'Listo',
          detail: 'Tu contraseña fue restablecida. Ya podés ingresar.',
          life: 3500,
        });
        setTimeout(() => this.router.navigateByUrl('/login'), 1200);
      }
    });
  }

  get f() { return this.form.controls; }

  hasError(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.get(field as string);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  get mismatch(): boolean {
    const { newPassword, repeat } = this.form.getRawValue();
    return !!repeat && newPassword !== repeat;
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.store.dispatch(validateToken({ token: this.token }));
  }

  submit(): void {
    if (this.form.invalid || this.mismatch) { this.form.markAllAsTouched(); return; }
    this.store.dispatch(resetPassword({
      token: this.token,
      newPassword: this.form.getRawValue().newPassword!,
    }));
  }
}
