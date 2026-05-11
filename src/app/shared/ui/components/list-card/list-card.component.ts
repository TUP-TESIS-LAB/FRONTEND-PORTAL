import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';

export type AvatarColor = 'primary' | 'secondary' | 'accent';

const AVATAR_COLOR_MAP: Record<AvatarColor, string> = {
  primary:   'var(--brand-primary)',
  secondary: 'var(--brand-secondary)',
  accent:    'var(--brand-accent)',
};

@Component({
  selector: 'ui-list-card',
  standalone: true,
  imports: [RouterLink, AvatarModule],
  templateUrl: './list-card.component.html',
  styleUrl: './list-card.component.scss',
})
export class ListCardComponent {
  @Input({ required: true }) initials!: string;
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input({ required: true }) routerLink!: any[];
  @Input() avatarColor: AvatarColor = 'secondary';

  get avatarBg(): string {
    return AVATAR_COLOR_MAP[this.avatarColor];
  }
}
