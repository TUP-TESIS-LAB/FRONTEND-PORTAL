import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { FamilyCardComponent } from '../../../shared/ui/components/family-card/family-card.component';
import { FamilyGridComponent } from '../../../shared/ui/components/family-grid/family-grid.component';
import { AddFamilyCardComponent } from '../../../shared/ui/components/add-family-card/add-family-card.component';
import { AgregarFamiliarComponent } from './agregar-familiar/agregar-familiar.component';
import { Familiar } from '../../../core/models/familiar.model';
import { selectAllFamily, selectFamilyPending } from './store/family.selectors';
import { loadFamily, removeFamilyMember } from './store/family.actions';

@Component({
  selector: 'app-familia',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    SkeletonModule,
    ToastModule,
    PageHeaderComponent,
    FamilyCardComponent,
    FamilyGridComponent,
    AddFamilyCardComponent,
    AgregarFamiliarComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './familia.component.html',
  styleUrl: './familia.component.scss',
})
export class FamiliaComponent implements OnInit {
  private readonly store           = inject(Store);
  private readonly messageService  = inject(MessageService);
  private readonly confirmService  = inject(ConfirmationService);

  @ViewChild(AgregarFamiliarComponent) private agregarDialog!: AgregarFamiliarComponent;

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

  onRemoveFamiliar(f: Familiar): void {
    this.confirmService.confirm({
      message: `¿Quitar a ${f.nombre} ${f.apellido} de tu grupo familiar?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, quitar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.store.dispatch(removeFamilyMember({ userPatientId: f.userPatientId }));
        this.messageService.add({
          severity: 'success',
          summary: 'Familiar quitado',
          detail: `${f.nombre} ${f.apellido} fue eliminado del grupo familiar.`,
          life: 3000,
        });
      },
    });
  }

  onAddFamily(): void {
    this.agregarDialog.open();
  }
}
