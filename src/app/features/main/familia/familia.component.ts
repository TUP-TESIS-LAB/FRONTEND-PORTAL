import { Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { FamilyCardComponent } from '../../../shared/ui/components/family-card/family-card.component';
import { FamilyGridComponent } from '../../../shared/ui/components/family-grid/family-grid.component';
import { AddFamilyCardComponent } from '../../../shared/ui/components/add-family-card/add-family-card.component';
import { Familiar } from '../../../core/models/familiar.model';
import { selectAllFamily, selectFamilyPending } from './store/family.selectors';
import { loadFamily } from './store/family.actions';

@Component({
  selector: 'app-familia',
  standalone: true,
  imports: [
    ButtonModule,
    SkeletonModule,
    ToastModule,
    PageHeaderComponent,
    FamilyCardComponent,
    FamilyGridComponent,
    AddFamilyCardComponent,
  ],
  providers: [MessageService],
  templateUrl: './familia.component.html',
  styleUrl: './familia.component.scss',
})
export class FamiliaComponent implements OnInit {
  private readonly store         = inject(Store);
  private readonly messageService = inject(MessageService);

  familiares = this.store.selectSignal(selectAllFamily);
  loading    = this.store.selectSignal(selectFamilyPending);

  ngOnInit(): void {
    this.store.dispatch(loadFamily());
  }

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
