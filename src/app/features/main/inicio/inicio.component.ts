import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../shared/ui/layout/page-header/page-header.component';
import { SectionComponent } from '../../../shared/ui/layout/section/section.component';
import { StatCardComponent } from '../../../shared/ui/components/stat-card/stat-card.component';
import { ListCardComponent } from '../../../shared/ui/components/list-card/list-card.component';
import { EmptyStateComponent } from '../../../shared/ui/components/empty-state/empty-state.component';
import { PlaceholderCardComponent } from '../../../shared/ui/components/placeholder-card/placeholder-card.component';
import { HeroCardComponent } from '../../../shared/ui/components/hero-card/hero-card.component';
import { ReminderListComponent, Reminder } from '../../../shared/ui/components/reminder-list/reminder-list.component';
import { NoticeCardComponent } from '../../../shared/ui/components/notice-card/notice-card.component';
import { PerfilService } from '../perfil/perfil.service';
import { AppointmentService } from '../turnos/services/appointment.service';
import { EstudioService } from '../estudios/estudio.service';
import { FamilyService } from '../../../core/family/family.service';
import { Turno } from '../../../core/models/turno.model';
import { map } from 'rxjs';

interface NoticeData {
  icon: string;
  text: string;
}

const RECORDATORIOS_MOCK: Reminder[] = [
  { color: 'accent',    text: 'Para tu turno del martes necesitás **8 horas de ayuno**.' },
  { color: 'secondary', text: 'Lucía tiene resultados nuevos sin abrir.' },
];

const AVISO_MOCK: NoticeData = {
  icon: 'pi-megaphone',
  text: 'Atención reducida el **25 de mayo** por feriado nacional. Consultá horarios especiales en cada sede.',
};

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    ButtonModule,
    SkeletonModule,
    ToastModule,
    PageHeaderComponent,
    SectionComponent,
    StatCardComponent,
    ListCardComponent,
    EmptyStateComponent,
    PlaceholderCardComponent,
    HeroCardComponent,
    ReminderListComponent,
    NoticeCardComponent,
  ],
  providers: [MessageService],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent {
  private router = inject(Router);
  private toast  = inject(MessageService);

  // ── Signals de datos ─────────────────────────────────────
  user            = toSignal(inject(PerfilService).getPerfil(),                                                          { initialValue: null });
  proximosTurnos  = toSignal(inject(AppointmentService).getMyAppointments().pipe(map(r => r.proximos)), { initialValue: [] });
  estudios        = toSignal(inject(EstudioService).getEstudios(),                                                       { initialValue: [] });
  familiares      = toSignal(inject(FamilyService).getFamily(),                                                          { initialValue: [] });

  // ── Derivados ────────────────────────────────────────────
  loading = computed(() => this.user() === null);

  proximoTurno = computed(() => this.proximosTurnos()[0] ?? null);

  estudiosNuevos = computed(() =>
    this.estudios().filter(e => e.esNuevo).length
  );

  ultimosResultados = computed(() =>
    this.estudios()
      .filter(e => e.estado === 'disponible')
      .slice(0, 3)
  );

  pendientesRetiro = computed(() =>
    this.estudios().filter(e => e.estado === 'pendiente').length
  );

  stats = computed(() => {
    if (!this.user()) return [];
    return [
      { label: 'Turnos próximos', value: this.proximosTurnos().length, accent: 'secondary' as const },
      { label: 'Estudios nuevos', value: this.estudiosNuevos(),         accent: 'primary'   as const },
      { label: 'Pend. retiro',    value: this.pendientesRetiro(),       accent: 'warning'   as const },
      { label: 'Familiares',      value: this.familiares().length,      accent: 'accent'    as const },
    ];
  });

  heroCardData = computed(() => {
    const t = this.proximoTurno();
    if (!t) return null;
    return {
      label:   'TU PRÓXIMO TURNO',
      title:   `${this.formatDateShort(t)} · ${t.hora} hs`,
      details: [{ icon: 'pi-map-marker', text: `${t.sede.nombre} · ${t.sede.direccion}` }],
      chips:   t.estudios,
    };
  });

  // ── Datos hardcodeados ───────────────────────────────────
  reminders: Reminder[] = RECORDATORIOS_MOCK;
  aviso: NoticeData = AVISO_MOCK;

  // ── Acciones ─────────────────────────────────────────────
  onSacarTurno(): void {
    this.router.navigate(['/turnos/sacar']);
  }

  onComoPrepararme(): void {
    const t = this.proximoTurno();
    if (!t) return;
    this.toast.add({
      severity: 'info',
      summary:  'Preparación',
      detail:   t.preparacion.join(' · '),
      life:     6000,
    });
  }

  onVerDetalleTurno(): void {
    this.router.navigate(['/turnos']);
  }

  onVerTodosResultados(): void {
    this.router.navigate(['/estudios']);
  }

  onDescargarEstudio(url: string): void {
    if (url && url !== '#') {
      window.open(url, '_blank');
    } else {
      this.toast.add({
        severity: 'info',
        summary:  'Próximamente',
        detail:   'La descarga estará disponible en breve.',
        life:     3000,
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  formatDateShort(t: Turno): string {
    const dayAbbr  = t.fechaCompleta.substring(0, 3);             // 'Mar' de 'Martes...'
    const month    = t.mes.slice(0, 3).toLowerCase();             // 'may' de 'MAY'
    return `${dayAbbr} ${t.dia} ${month}`;
  }
}
