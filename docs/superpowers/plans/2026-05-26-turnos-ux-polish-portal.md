# Turnos UX Polish (Portal) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Spec:** `docs/superpowers/specs/2026-05-26-turnos-cierre-ux-y-sucursales-back-office-design.md` §6
> **Repo:** `FRONTEND-PORTAL`
> **Branch:** `feat/turnos-ux-polish` (sale de `origin/development` HEAD `88ca266`)
> **Jira:** [KAN-49](https://exequielsantoro.atlassian.net/browse/KAN-49) — relates to KAN-41 (cierre TURNOS anterior)
> **Dependencia opcional:** rama 4 backend (`feat/branch-public-fields`) — para cablear `Sede.telefono`/`.horario` reales. Si no entra, el portal usa fallback empty string.

**Goal:** Cerrar los UX pendientes del portal del smoke C: family card minimal, register con inputs separados firstName/lastName, refinamiento del sticky footer en mobile, y cableo de `Sede.telefono`/`.horario` con fallback seguro.

**Architecture:** Cuatro cambios localizados en componentes del portal existentes (`family-card`, `register`, `sacar-turno`, `step-sede` + `sucursal-public.service`). Sin nuevo estado global, sin nuevas dependencias. Signals + servicios puros (no NgRx).

**Tech Stack:** Angular 21, signals, PrimeNG, RxJS.

---

## Convenciones a respetar

- Signals + servicios puros (sin NgRx en este repo).
- OnPush + standalone components.
- Commits convencionales. NO `--no-verify`.
- Validar manualmente en mobile (iPhone Safari + Android Chrome) para el sticky footer.

---

## File Structure

### Files modificados

- `src/app/features/main/familia/components/family-card/family-card.component.{ts,html,scss}` (minimal)
- `src/app/features/main/auth/register/register.component.{ts,html}` (split inputs)
- `src/app/features/main/turnos/sacar/sacar-turno.component.scss` (sticky footer refine)
- `src/app/features/main/turnos/sacar/steps/step-sede/step-sede.component.{ts,html}` (cablear telefono + horario)
- `src/app/core/services/sucursal-public.service.ts` (mapear response → Sede con phone + schedules)

### Files a verificar

- `src/app/core/models/sede.model.ts` (o donde esté `Sede`) — verificar campos.
- `src/app/features/main/auth/register/register.component.ts` (servicio que llama y los campos esperados).

---

# Task 1: Family card minimal

**Files:**
- Modify: `src/app/features/main/familia/components/family-card/family-card.component.{ts,html,scss}`

- [ ] **Step 1: Localizar el componente**

```bash
find src/app/features/main/familia -name "family-card*"
```

- [ ] **Step 2: Refactor template — quitar avatar, dejar nombre + chevron**

```html
<!-- family-card.component.html — nueva versión -->
<button class="family-card" type="button" (click)="onClick()">
  <div class="content">
    <strong class="name">{{ familiar.firstName }} {{ familiar.lastName }}</strong>
    <span class="meta">{{ vinculoLabel(familiar.bond) }} · {{ familiar.age }} años</span>
  </div>
  <i class="pi pi-angle-right chevron"></i>
</button>
```

- [ ] **Step 3: Estilos minimal**

```scss
.family-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.family-card:hover { background: var(--surface-hover); }

.content { display: flex; flex-direction: column; gap: 0.25rem; }
.name { font-size: 1.125rem; font-weight: 600; color: var(--text-color); }
.meta { font-size: 0.875rem; color: var(--text-color-secondary); }

.chevron { font-size: 1.25rem; color: var(--text-color-secondary); }
```

- [ ] **Step 4: Component .ts — manejar click y emitir**

```ts
@Component({
  selector: 'app-family-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './family-card.component.html',
  styleUrl: './family-card.component.scss',
})
export class FamilyCardComponent {
  @Input({ required: true }) familiar!: Familiar;
  @Output() select = new EventEmitter<Familiar>();

  onClick() { this.select.emit(this.familiar); }

  vinculoLabel(bond: string): string {
    const map: Record<string, string> = {
      PROPIO: 'Yo', MADRE: 'Mamá', PADRE: 'Papá',
      HIJO: 'Hijo', HIJA: 'Hija', HERMANO: 'Hermano', HERMANA: 'Hermana',
      TUTOR: 'Tutor', OTROS: 'Otro',
    };
    return map[bond] ?? bond;
  }
}
```

- [ ] **Step 5: Smoke visual en mobile**

```bash
npm start
```

DevTools mobile viewport → `/familia` → ver cards minimal → click → navega o emite.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/main/familia/components/family-card/family-card.component.*
git commit -m "feat(portal): minimal family-card (only name + meta + chevron, no avatar)"
```

---

# Task 2: Register split nombre/apellido

**Files:**
- Modify: `src/app/features/main/auth/register/register.component.{ts,html}`

- [ ] **Step 1: Localizar el componente y verificar shape actual**

```bash
grep -n "nombreCompleto\|firstName\|lastName" src/app/features/main/auth/register/register.component.ts
```

- [ ] **Step 2: Modificar formGroup**

```ts
// register.component.ts
protected readonly form = this.fb.nonNullable.group({
  firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
  lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
  dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
  email: ['', [Validators.email]],
  password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
  // ... resto del form
});

submit() {
  if (this.form.invalid) return;
  const v = this.form.getRawValue();
  this.authService.register({
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    dni: v.dni,
    email: v.email,
    password: v.password,
    // ...
  }).subscribe(...);
}
```

- [ ] **Step 3: Template — reemplazar input único por dos inputs**

```html
<!-- register.component.html -->
<div class="form-row">
  <div class="form-field">
    <label for="firstName">Nombre *</label>
    <input
      id="firstName"
      pInputText
      formControlName="firstName"
      autocomplete="given-name"
      placeholder="Tu nombre" />
    @if (form.controls.firstName.invalid && form.controls.firstName.touched) {
      <small class="form-error">Ingresá tu nombre (mínimo 2 caracteres).</small>
    }
  </div>

  <div class="form-field">
    <label for="lastName">Apellido *</label>
    <input
      id="lastName"
      pInputText
      formControlName="lastName"
      autocomplete="family-name"
      placeholder="Tu apellido" />
    @if (form.controls.lastName.invalid && form.controls.lastName.touched) {
      <small class="form-error">Ingresá tu apellido (mínimo 2 caracteres).</small>
    }
  </div>
</div>

<!-- resto del form (dni, email, password, etc.) sin cambios -->
```

- [ ] **Step 4: Estilo del row**

```scss
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 600px) {
  .form-row { grid-template-columns: 1fr; gap: 0.75rem; }
}
```

- [ ] **Step 5: Smoke**

```bash
npm start
```

`/register` → ver 2 inputs separados → tipear → submit → verifica que el backend recibe `firstName` y `lastName` separados.

- [ ] **Step 6: Verificar el backend espera ese shape**

```bash
grep -rn "RegisterPatientRequest" ../Backend/src/main/java/
```

Esperado: el DTO ya tiene `firstName` y `lastName` separados (Spec C lo armó así). Si por alguna razón hay un `fullName` legacy, mantener compat o coordinar.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/main/auth/register/register.component.*
git commit -m "feat(portal): register splits nombre/apellido into separate inputs"
```

---

# Task 3: Sticky footer wizard mobile refine

**Files:**
- Modify: `src/app/features/main/turnos/sacar/sacar-turno.component.scss`

- [ ] **Step 1: Inspeccionar el state actual**

```bash
grep -n "sticky\|safe-area\|ds-safe-bottom\|padding-bottom" src/app/features/main/turnos/sacar/sacar-turno.component.scss
```

- [ ] **Step 2: Smoke mobile actual**

```bash
npm start
```

DevTools mobile (iPhone 13 viewport + Android Pixel viewport). Recorrer wizard 1-5 steps y validar visualmente que no hay gap raro debajo del sticky footer.

- [ ] **Step 3: Si hay gap o problema visible, ajustar CSS**

Estado actual conocido del smoke C: `padding-bottom: max(var(--space-3), var(--ds-safe-bottom))`. Si el gap aparece en Android (donde safe-area = 0), el `max()` ya cubre — verificar que la regla esté aplicada al elemento correcto.

Posibles ajustes:

```scss
.sticky-footer {
  position: sticky;
  bottom: 0;
  background: var(--surface-card);
  border-top: 1px solid var(--surface-border);
  padding: var(--space-3);
  padding-bottom: max(var(--space-3), var(--ds-safe-bottom, 0px));
  z-index: 10;
}

/* Si el footer se ve "flotando" por debajo del contenido en algunos browsers: */
.wizard-content { padding-bottom: 0; }
```

- [ ] **Step 4: Verificar también en device real si es posible**

Pre-condición: el equipo de desarrollo tiene un device físico para probar. Si no, queda como verificación virtual con DevTools.

- [ ] **Step 5: Commit (si hubo cambios)**

```bash
git add src/app/features/main/turnos/sacar/sacar-turno.component.scss
git commit -m "fix(portal): sticky footer mobile padding refinement"
```

Si no hubo cambios necesarios (porque el CSS actual ya está OK), saltar el commit y anotar en el PR description que se verificó y no hubo bugs.

---

# Task 4: Cableo de `Sede.telefono` y `.horario`

**Files:**
- Modify: `src/app/core/services/sucursal-public.service.ts`
- Modify: `src/app/features/main/turnos/sacar/steps/step-sede/step-sede.component.{ts,html}` (verificar path real)

- [ ] **Step 1: Verificar el modelo `Sede`**

```bash
grep -rn "interface Sede" src/app/
```

- [ ] **Step 2: Adaptar `SucursalPublicService` para mapear phone + schedules**

```ts
// sucursal-public.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

interface BackendPublicSchedule {
  dayFrom: string;
  dayTo: string;
  fromTime: string;
  toTime: string;
}

interface BackendPublicBranch {
  id: number;
  code: string;
  description: string;
  address: { street?: string; streetNumber?: string; city?: string };
  phone?: string;            // NEW — rama 4 backend lo expone (si entra)
  schedules?: BackendPublicSchedule[];  // NEW — idem
}

@Injectable({ providedIn: 'root' })
export class SucursalPublicService {
  private http = inject(HttpClient);

  listBySlug(slug: string): Observable<Sede[]> {
    return this.http.get<BackendPublicBranch[]>(`/api/v1/sucursales/public?slug=${slug}`).pipe(
      map(branches => branches.map(b => this.toSede(b))),
    );
  }

  private toSede(b: BackendPublicBranch): Sede {
    return {
      id: b.id,
      code: b.code,
      nombre: b.description,
      direccion: this.formatAddress(b.address),
      telefono: b.phone ?? '',
      horario: this.formatSchedules(b.schedules ?? []),
    };
  }

  private formatAddress(a: BackendPublicBranch['address']): string {
    if (!a) return '';
    return [a.street, a.streetNumber, a.city].filter(Boolean).join(' ');
  }

  private formatSchedules(schedules: BackendPublicSchedule[]): string {
    if (schedules.length === 0) return '';
    // Ejemplo: "Lun a Vie 09:00 — 17:00, Sáb 09:00 — 13:00"
    return schedules.map(s => {
      const days = this.dayRangeLabel(s.dayFrom, s.dayTo);
      return `${days} ${s.fromTime} — ${s.toTime}`;
    }).join(', ');
  }

  private dayRangeLabel(from: string, to: string): string {
    const SHORT: Record<string, string> = {
      MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Mié', THURSDAY: 'Jue',
      FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
    };
    return from === to ? SHORT[from] : `${SHORT[from]} a ${SHORT[to]}`;
  }
}
```

- [ ] **Step 3: Adaptar template del step-sede si necesario**

```html
<!-- step-sede.component.html — fragmento -->
<div class="sede-card" [class.selected]="isSelected(sede.id)" (click)="select(sede.id)">
  <h3>{{ sede.nombre }}</h3>
  <p class="dir">{{ sede.direccion }}</p>
  @if (sede.telefono) {
    <p class="tel"><i class="pi pi-phone"></i> {{ sede.telefono }}</p>
  }
  @if (sede.horario) {
    <p class="horario"><i class="pi pi-clock"></i> {{ sede.horario }}</p>
  }
</div>
```

Si los campos son empty string, no se muestran (el `@if` los oculta).

- [ ] **Step 4: Smoke**

Si rama 4 NO mergeada todavía: el portal sigue funcionando con phone/horario vacíos (sin crash).

Si rama 4 mergeada: los campos aparecen poblados con datos reales.

```bash
npm start
```

`/turnos/sacar` → step Sede → verificar que las cards muestran telefono/horario si están, o los ocultan si no.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/sucursal-public.service.ts src/app/features/main/turnos/sacar/steps/step-sede/
git commit -m "feat(portal): wire Sede.telefono and Sede.horario with safe empty fallback"
```

---

# Task 5: Smoke completo + push

- [ ] **Step 1: Run dev server**

```bash
npm start
```

- [ ] **Step 2: Smoke según §11.3 del spec**

1. `/familia` → cards minimal sin avatar.
2. `/register` → 2 inputs separados firstName/lastName → registrar → success.
3. Mobile viewport (iPhone + Android): wizard sacar-turno → no hay gap visible.
4. Step Sede del wizard: si rama 4 mergeada → ver teléfono y horario reales. Si no: vacío sin crash.

- [ ] **Step 3: Run tests + tsc**

```bash
npm test
npx tsc --noEmit
```

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/turnos-ux-polish
gh pr create --title "feat(portal): UX polish pendientes — family card, register, sede" --body "..."
```

PR body: link al spec + checklist del smoke + screenshots mobile.

---

## Estado final esperado

- 5 tasks completadas.
- Branch `feat/turnos-ux-polish` con ~5-7 commits.
- PR abierto.
- Develop sin tocar.
