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
import { FamilyService } from '../../../core/family/family.service';
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
  private readonly familyService  = inject(FamilyService);
  private readonly messageService = inject(MessageService);

  familiares = toSignal(this.familyService.getFamily(), { initialValue: [] });

  stats = computed(() => {
    const list = this.familiares();
    return {
      personasVinculadas: list.length,
      turnosProximos:     0,   // TODO: derive from AppointmentService when integrated
      estudiosDisponibles: 0,  // TODO: derive from results
      pendientesRetiro:   0,   // TODO: derive from results
    };
  });

  loading = computed(() => false);

  onSelectFamiliar(f: Familiar): void {
    // TODO: cuando exista la ruta de edición de familiar (/familia/:id/editar),
    // navegar ahí. Por ahora avisamos al usuario para que el click no sea silencioso.
    this.messageService.add({
      severity: 'info',
      summary: f.nombre + ' ' + f.apellido,
      detail: 'La edición de familiares estará disponible pronto.',
      life: 3000,
    });
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
