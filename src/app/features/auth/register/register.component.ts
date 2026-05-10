import { Component, inject } from '@angular/core';
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
import { PublicTopbarComponent } from '../ui/public-topbar/public-topbar.component';
import { TenantService } from '../../../core/tenant/tenant.service';

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
    PublicTopbarComponent,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  readonly tenant = inject(TenantService);

  form = this.fb.group({
    nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // TODO: reemplazar por AuthService.register(this.form.getRawValue())
    this.router.navigate(['/dashboard']);
  }
}
