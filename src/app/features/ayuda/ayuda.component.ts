import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionPanel,
} from 'primeng/accordion';
import { PublicTopbarComponent } from '../auth/ui/public-topbar/public-topbar.component';
import { PageHeaderComponent } from '../../shared/ui/layout/page-header/page-header.component';
import { AuthService } from '../../core/auth/auth.service';
import { TenantService } from '../../core/tenant/tenant.service';
import { TenantConfig } from '../../core/tenant/tenant-config.model';
import { FAQ_CATEGORIES } from './ayuda.content';

@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [
    RouterLink,
    Accordion,
    AccordionPanel,
    AccordionHeader,
    AccordionContent,
    PublicTopbarComponent,
    PageHeaderComponent,
  ],
  templateUrl: './ayuda.component.html',
  styleUrl: './ayuda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaComponent {
  private readonly auth = inject(AuthService);
  private readonly tenant = inject(TenantService);

  readonly isAuthenticated = this.auth.isAuthenticated;

  // Deslogueado: solo las preguntas de cuenta y acceso. Las de turnos, estudios y
  // familia describen pantallas a las que todavía no puede llegar.
  readonly categories = computed(() =>
    this.isAuthenticated()
      ? FAQ_CATEGORIES
      : FAQ_CATEGORIES.filter(c => c.publicVisible),
  );

  // Tipado explícito: sin él, TS infiere la unión con `{}` y el template no puede
  // leer .helpPhone. Todos los campos de TenantConfig['contact'] son opcionales,
  // así que `{}` es asignable.
  readonly contact = computed<TenantConfig['contact']>(
    () => this.tenant.config()?.contact ?? {},
  );
}
