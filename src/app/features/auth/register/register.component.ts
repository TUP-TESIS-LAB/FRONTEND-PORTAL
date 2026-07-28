import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PublicTopbarComponent } from '../ui/public-topbar/public-topbar.component';
import { PublicFooterComponent } from '../../../shared/ui/layout/public-footer/public-footer.component';
import { TenantService } from '../../../core/tenant/tenant.service';
import { AuthService } from '../../../core/auth/auth.service';
import { mapApiError } from '../../../shared/utils/api-error-mapper';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    FloatLabelModule,
    ToastModule,
    PublicTopbarComponent,
    PublicFooterComponent,
  ],
  providers: [MessageService],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private auth   = inject(AuthService);
  private toast  = inject(MessageService);
  readonly tenant = inject(TenantService);

  submitting = signal(false);

  form = this.fb.group({
    firstName:      ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName:       ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    dni:            ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    email:          ['', [Validators.required, Validators.email]],
    password:       ['', [
      Validators.required,
      Validators.minLength(8),
      // Al menos una mayúscula y un número
      Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/),
    ]],
    aceptaTerminos: [false, [Validators.requiredTrue]],
  });

  get f() { return this.form.controls; }

  hasError(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.get(field as string);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const tenantSlug = this.tenant.config()?.id ?? '';

    this.submitting.set(true);
    this.auth.register({
      tenantSlug,
      firstName: v.firstName!.trim(),
      lastName:  v.lastName!.trim(),
      dni:       v.dni!,
      email:     v.email!,
      password:  v.password!,
    }).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success', summary: '¡Bienvenido!',
          detail: 'Tu cuenta fue creada.', life: 3000,
        });
        this.router.navigate(['/turnos']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.add({
          severity: 'error', summary: 'Error',
          detail: mapApiError(err), life: 4000,
        });
      },
    });
  }
}
