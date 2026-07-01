import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';

/**
 * Marca del tenant con fallback: muestra el logo si hay URL válida y cargable;
 * si no (tenant sin logo configurado o imagen rota), cae a un chip con las
 * iniciales (`shortName`) sobre color de marca. Único punto de render de la
 * identidad del tenant — auth (public-topbar) y shell (sidebar) lo comparten
 * para que nunca diverjan.
 *
 * El fondo del chip se puede ajustar por contexto vía la custom property
 * `--ui-brand-mark-bg` (default: `--brand-primary`).
 */
@Component({
  selector: 'ui-brand-mark',
  standalone: true,
  templateUrl: './brand-mark.component.html',
  styleUrl: './brand-mark.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandMarkComponent {
  @Input() set logoUrl(value: string | null | undefined) {
    this._logoUrl.set(value ?? null);
    // Nueva URL = nuevo intento de carga (el error anterior no aplica).
    this.imgFailed.set(false);
  }

  @Input() name = '';
  @Input() shortName = '';

  protected readonly _logoUrl = signal<string | null>(null);
  protected readonly imgFailed = signal(false);

  protected get showLogo(): boolean {
    return this._logoUrl() !== null && !this.imgFailed();
  }

  protected onImgError(): void {
    this.imgFailed.set(true);
  }
}
