import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PublicTopbarComponent } from '../ui/public-topbar/public-topbar.component';
import { PublicFooterComponent } from '../../../shared/ui/layout/public-footer/public-footer.component';
import { TenantService } from '../../../core/tenant/tenant.service';
import { requestReset } from './store/password-recovery.actions';
import { selectSubmitting, selectEmailSent } from './store/password-recovery.selectors';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    PublicTopbarComponent,
    PublicFooterComponent,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  readonly tenant = inject(TenantService);

  readonly submitting = this.store.selectSignal(selectSubmitting);
  readonly emailSent = this.store.selectSignal(selectEmailSent);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get f() { return this.form.controls; }

  hasError(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.get(field as string);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.store.dispatch(requestReset({ email: this.form.getRawValue().email! }));
  }
}
