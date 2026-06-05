import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PrepWarningComponent } from '../prep-warning/prep-warning.component';
import { Turno } from '../../../../core/models/turno.model';

@Component({
  selector: 'ui-turno-detail',
  standalone: true,
  imports: [ButtonModule, TagModule, PrepWarningComponent],
  templateUrl: './turno-detail.component.html',
  styleUrl: './turno-detail.component.scss',
})
export class TurnoDetailComponent {
  private readonly sanitizer = inject(DomSanitizer);

  @Input({ required: true }) turno!: Turno;

  @Output() reprogramar = new EventEmitter<Turno>();
  @Output() cancelar    = new EventEmitter<Turno>();
  @Output() close       = new EventEmitter<void>();

  /** True cuando la sede tiene direccion utilizable (no es placeholder). */
  hasDireccion(direccion: string | undefined | null): boolean {
    const v = direccion?.trim() ?? '';
    return v !== '' && v !== '—';
  }

  /**
   * URL del embed de Google Maps centrado en la direccion de la sede.
   * Usa la API de search (sin API key) — Google interpreta el query y
   * pone un pin en la mejor coincidencia.
   */
  mapaUrl(direccion: string): SafeResourceUrl {
    const q = encodeURIComponent(direccion);
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${q}&output=embed`,
    );
  }
}
