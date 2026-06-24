import { Injectable, computed, inject, signal } from '@angular/core';
import { FamilyService } from '../family/family.service';
import type { Familiar } from '../models/familiar.model';

@Injectable({ providedIn: 'root' })
export class ActivePatientService {
  private readonly family = inject(FamilyService);

  private readonly _accessible = signal<Familiar[]>([]);
  private readonly _activeId = signal<number | null>(null);
  private readonly _loading = signal(false);

  readonly accessiblePatients = this._accessible.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly activePatient = computed<Familiar | null>(() => {
    const id = this._activeId();
    return this._accessible().find(f => f.id === id) ?? null;
  });

  init(): void {
    this._loading.set(true);
    this.family.getFamily().subscribe({
      next: (list) => {
        this._accessible.set(list);
        const propio = list.find(f => f.vinculo === 'Yo');
        this._activeId.set((propio ?? list[0])?.id ?? null);
        this._loading.set(false);
      },
      error: () => { this._accessible.set([]); this._activeId.set(null); this._loading.set(false); },
    });
  }

  setActive(patientId: number): void {
    if (this._accessible().some(f => f.id === patientId)) {
      this._activeId.set(patientId);
    }
  }
}
