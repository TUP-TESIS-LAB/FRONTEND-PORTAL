import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/ui/components/stat-card/stat-card.component';
import { FamilyCardComponent } from '../../../shared/ui/components/family-card/family-card.component';
import { FamilyGridComponent } from '../../../shared/ui/components/family-grid/family-grid.component';
import { AddFamilyCardComponent } from '../../../shared/ui/components/add-family-card/add-family-card.component';
import { FamiliaService } from './familia.service';
import { Familiar } from '../../../core/models/familiar.model';

@Component({
  selector: 'app-familia',
  standalone: true,
  imports: [
    ButtonModule,
    SkeletonModule,
    ToastModule,
    PageHeaderComponent,
    StatCardComponent,
    FamilyCardComponent,
    FamilyGridComponent,
    AddFamilyCardComponent,
  ],
  providers: [MessageService],
  templateUrl: './familia.component.html',
  styleUrl: './familia.component.scss',
})
export class FamiliaComponent {
  private readonly router         = inject(Router);
  private readonly familiaService = inject(FamiliaService);
  private readonly messageService = inject(MessageService);

  familiares = toSignal(this.familiaService.getFamiliares(), { initialValue: [] });
  stats      = toSignal(this.familiaService.getStats(),      { initialValue: null });
  loading    = computed(() => this.stats() === null);

  onVerEstudios(f: Familiar): void {
    // TODO: la ruta /estudios aún no existe
    this.router.navigate(['/estudios'], { queryParams: { personaId: f.id } });
  }

  onSacarTurno(f: Familiar): void {
    // TODO: la ruta /turnos/sacar aún no existe
    this.router.navigate(['/turnos/sacar'], { queryParams: { personaId: f.id } });
  }

  onAddFamily(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Próximamente',
      detail: 'Esta funcionalidad estará disponible pronto.',
      life: 3000,
    });
  }
}
