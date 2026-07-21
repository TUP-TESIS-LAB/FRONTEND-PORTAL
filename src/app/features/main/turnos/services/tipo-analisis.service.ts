import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { TipoAnalisis } from '../../../../core/models/tipo-analisis.model';

@Injectable({ providedIn: 'root' })
export class TipoAnalisisService {
  private readonly http = inject(HttpClient);
  private readonly cache$ = this.http
    .get<TipoAnalisis[]>('/api/v1/turnos/catalog/tipos-analisis')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getTipos(): Observable<TipoAnalisis[]> { return this.cache$; }
}
