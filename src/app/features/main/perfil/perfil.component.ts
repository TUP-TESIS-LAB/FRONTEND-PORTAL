import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { ProfileSummaryComponent } from '../../../shared/ui/components/profile-summary/profile-summary.component';
import { DataFieldComponent } from '../../../shared/ui/components/data-field/data-field.component';
import { PerfilService } from './perfil.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    ButtonModule,
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

  user    = toSignal(this.perfilService.getPerfil(), { initialValue: null });
  loading = computed(() => this.user() === null);

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
