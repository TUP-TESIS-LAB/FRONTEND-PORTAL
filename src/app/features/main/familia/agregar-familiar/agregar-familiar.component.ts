import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { addFamilyMember, addFamilyMemberSuccess, addFamilyMemberFailure } from '../store/family.actions';
import { AddFamilyMemberPayload } from '../../../../core/family/family.service';

export interface GenderOption {
  label: string;
  value: string;
}

export interface BondOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-agregar-familiar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    FloatLabelModule,
    SelectModule,
    DatePickerModule,
  ],
  templateUrl: './agregar-familiar.component.html',
  styleUrl: './agregar-familiar.component.scss',
})
export class AgregarFamiliarComponent {
  private readonly fb             = inject(FormBuilder);
  private readonly store          = inject(Store);
  private readonly actions$       = inject(Actions);
  private readonly messageService = inject(MessageService);

  @Output() closed = new EventEmitter<void>();

  visible    = false;
  submitting = signal(false);

  constructor() {
    this.actions$.pipe(
      ofType(addFamilyMemberSuccess),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.submitting.set(false);
      this.visible = false;
      this.messageService.add({
        severity: 'info',
        summary:  'Familiar agregado',
        detail:   'Queda pendiente de verificación.',
        life:     4000,
      });
    });

    this.actions$.pipe(
      ofType(addFamilyMemberFailure),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.submitting.set(false);
      this.messageService.add({
        severity: 'error',
        summary:  'Error',
        detail:   'No se pudo agregar el familiar.',
        life:     5000,
      });
    });
  }

  readonly genderOptions: GenderOption[] = [
    { label: 'Masculino',      value: 'MALE'          },
    { label: 'Femenino',       value: 'FEMALE'        },
    { label: 'Otro',           value: 'OTHER'         },
    { label: 'Sin especificar', value: 'NOT_SPECIFIED' },
  ];

  readonly today = new Date();

  readonly bondOptions: BondOption[] = [
    { label: 'Hijo',    value: 'HIJO'   },
    { label: 'Hija',    value: 'HIJA'   },
    { label: 'Padre',   value: 'PADRE'  },
    { label: 'Madre',   value: 'MADRE'  },
    { label: 'Hermano', value: 'HERMANO'},
    { label: 'Hermana', value: 'HERMANA'},
    { label: 'Tutor',   value: 'TUTOR'  },
    { label: 'Otro',    value: 'OTROS'  },
  ];

  form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName:  ['', [Validators.required]],
    dni:       ['', [Validators.required]],
    birthDate: [null as Date | null],
    gender:    [null as string | null],
    bond:      ['', [Validators.required]],
  });

  private readonly status   = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly canSubmit = computed(() => this.status() === 'VALID' && !this.submitting());

  open(): void {
    this.form.reset();
    this.visible = true;
  }

  close(): void {
    this.visible = false;
    this.closed.emit();
  }

  onHide(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();

    const birthDate = raw.birthDate ? this.formatDate(raw.birthDate) : null;

    const payload: AddFamilyMemberPayload = {
      firstName: raw.firstName!,
      lastName:  raw.lastName!,
      dni:       raw.dni!,
      birthDate,
      gender:    raw.gender ?? null,
      bond:      raw.bond!,
    };

    this.submitting.set(true);
    this.store.dispatch(addFamilyMember({ payload }));
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
