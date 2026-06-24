# Arco 2C.2 — Selector de paciente transversal + rewire (portal) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** _(pendiente — crear con `jira-workflow` antes de implementar)_
> **Spec:** `FRONTEND-PORTAL/docs/superpowers/specs/2026-06-23-arco2c2-portal-selector-design.md`
> **Rama:** `feat/arco2c2-portal-selector` (off development).

**Goal:** Un selector de paciente transversal en el shell del portal y un estado global "paciente activo" que gobierna turnos (real), el resumen del dashboard y el filtro de estudios (mock).

**Architecture:** `ActivePatientService` (signal-based, como `AuthService`) reusa `FamilyService.getFamily()` para los accesibles; default = la entrada `vinculo==='Yo'` (PROPIO) o la primera; sin persistencia. Un `patient-selector` en el header del `patient-shell` setea el activo. Turnos/dashboard piden `?mine=true&patientId={activo}` y re-fetchean al cambiar; estudios (mock) filtra por el activo.

**Tech Stack:** Angular 21 standalone + signals, PrimeNG, NgRx (features existentes), vitest (`npm test`).

## Global Constraints

- **`patientId` activo SIEMPRE del estado global** (`ActivePatientService.activePatient()`), nunca hardcodeado.
- **Default = uno mismo** (`vinculo==='Yo'`) si existe; si no, el primer accesible. **Sin persistencia** (recarga = default).
- **No romper el patrón del repo:** servicios signal-based que llaman HTTP existen (`AuthService`, `FamilyService`); el listado de turnos hoy se consume por servicio en el componente (no NgRx) — el rewire mantiene ese patrón.
- **Reusar 2C.1 backend (MERGED):** turnos `GET /api/v1/turnos/appointments?mine=true&patientId=X`; (resultados `/me/results` es 2C.3).
- **Quitar el filtro "familiar" in-screen de turnos** y el dropdown de persona local de estudios — los reemplaza el selector global.
- **Tests: vitest** (`npm test`). Errores/toasts vía `MessageService` (patrón del repo).
- Out of scope (2C.3): perfil-tab, cuenta de gestión + CTA, estudios contra `/me/results`, persistencia.

### Hechos del código (verificados)
- `FamilyService.getFamily(): Observable<Familiar[]>` (cacheado) — `core/family/family.service.ts`. `Familiar` (`core/models/familiar.model.ts`): `{ id /*=patientId*/, userPatientId, status, nombre, apellido, iniciales, edad, vinculo, dni, ... }`; `vinculo==='Yo'` cuando `bond==='PROPIO'`.
- `AuthService` (`core/auth/auth.service.ts`): patrón signal (`private _x = signal(...)` + `readonly x = this._x.asReadonly()` + `computed`), `@Injectable({providedIn:'root'})`.
- `AppointmentService.getMyAppointments(): Observable<{proximos,anteriores}>` (`features/main/turnos/services/appointment.service.ts`) — hoy `GET ...?mine=true` (forkJoin con tipos/sedes/family; el mapper usa `family` para `personaId/personaNombre`). `Turno.personaId` = `Familiar.id`.
- `TurnosComponent` (`features/main/turnos/turnos.component.ts`): `cargarTurnos()` llama `getMyAppointments()` en `ngOnInit`; signals `proximosTurnos/anterioresTurnos/cargando`; `familiarFilter = signal<string[]>([])` (a remover); inyecta `MessageService`.
- `EstudiosComponent` (`features/main/estudios/estudios.component.ts`): `estudiosFiltrados` (computed) filtra por `selectedPersonaId()`; `onPersonaChange(id)`; `getEstudios()`/`getPersonas()` mock. `Estudio.personaId` = `Familiar.id`.
- `DashboardComponent` (`features/main/dashboard/dashboard.component.ts`): `cargarProximoTurno()` llama `getMyAppointments()`.
- `PersonChipsComponent` (`shared/ui/components/person-chips/`, selector `ui-person-chips`): `@Input personas: PersonaChip[]`, `@Input selectedId: number|null`, `@Output selectionChange`. `PersonaChip = { id, nombre, iniciales, avatarColor }`.
- `patient-shell.component.ts/.html` (`shared/ui/shell/patient-shell/`): header `<header class="ui-topbar">`; inyecta `AuthService`; sin `ngOnInit` hoy. Está detrás de `authGuard`.
- Tests: vitest + `TestBed`; servicios con `provideHttpClient()/provideHttpClientTesting()` + `HttpTestingController`; componentes con `provideMockStore`.

---

### Task 1: `ActivePatientService` (estado global signal-based)

**Files:**
- Create: `src/app/core/active-patient/active-patient.service.ts`
- Test: `src/app/core/active-patient/active-patient.service.spec.ts`

**Interfaces:**
- Produces: `ActivePatientService` (`@Injectable({providedIn:'root'})`) con `accessiblePatients: Signal<Familiar[]>`, `activePatient: Signal<Familiar | null>`, `loading: Signal<boolean>`, `setActive(patientId: number): void`, `init(): void`. Default = `vinculo==='Yo'` si existe, si no el primero; `[]`→activo null.

- [ ] **Step 1: Escribir el test (que falle)**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivePatientService } from './active-patient.service';
import { FamilyService } from '../family/family.service';
import { of } from 'rxjs';
import type { Familiar } from '../models/familiar.model';

function fam(id: number, vinculo: Familiar['vinculo']): Familiar {
  return { id, userPatientId: id * 10, status: 'VERIFIED', nombre: 'N'+id, apellido: 'A'+id,
    iniciales: 'N', edad: 30, vinculo, dni: '30'+id, cobertura: '', totalTurnos: 0, totalEstudios: 0, accentColor: 'primary' };
}

describe('ActivePatientService', () => {
  let service: ActivePatientService;
  let familyStub: { getFamily: () => any };

  function setup(list: Familiar[]) {
    familyStub = { getFamily: () => of(list) };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: FamilyService, useValue: familyStub }, ActivePatientService],
    });
    service = TestBed.inject(ActivePatientService);
  }

  it('default = la entrada PROPIO (vinculo Yo) cuando existe', () => {
    setup([fam(2, 'Hijo'), fam(1, 'Yo')]);
    service.init();
    expect(service.activePatient()?.id).toBe(1);
    expect(service.accessiblePatients().length).toBe(2);
  });

  it('default = el primero cuando no hay PROPIO', () => {
    setup([fam(2, 'Hijo'), fam(3, 'Hija')]);
    service.init();
    expect(service.activePatient()?.id).toBe(2);
  });

  it('setActive cambia el activo', () => {
    setup([fam(1, 'Yo'), fam(2, 'Hijo')]);
    service.init();
    service.setActive(2);
    expect(service.activePatient()?.id).toBe(2);
  });

  it('familia vacía → activo null', () => {
    setup([]);
    service.init();
    expect(service.activePatient()).toBeNull();
  });
});
```

- [ ] **Step 2: Correr (rojo)**

Run: `npm test -- --run active-patient.service`
Expected: FAIL (clase inexistente).

- [ ] **Step 3: Implementar el servicio**

```typescript
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
```

- [ ] **Step 4: Correr (verde)**

Run: `npm test -- --run active-patient.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/active-patient/
git commit -m "feat(portal): ActivePatientService (estado global paciente activo) (Arco 2C.2)"
```

---

### Task 2: `patient-selector` en el header del shell

**Files:**
- Create: `src/app/shared/ui/components/patient-selector/patient-selector.component.ts`
- Modify: `src/app/shared/ui/shell/patient-shell/patient-shell.component.ts` (init + import)
- Modify: `src/app/shared/ui/shell/patient-shell/patient-shell.component.html` (header)
- Test: `src/app/shared/ui/components/patient-selector/patient-selector.component.spec.ts`

**Interfaces:**
- Consumes: `ActivePatientService` (Task 1).
- Produces: componente standalone `app-patient-selector` que renderiza el activo + un dropdown de accesibles y llama `setActive` al elegir.

- [ ] **Step 1: Escribir el test (que falle)**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PatientSelectorComponent } from './patient-selector.component';
import { ActivePatientService } from '@core/active-patient/active-patient.service';
import type { Familiar } from '@core/models/familiar.model';

function fam(id: number, vinculo: Familiar['vinculo']): Familiar {
  return { id, userPatientId: id*10, status: 'VERIFIED', nombre: 'N'+id, apellido: 'A'+id,
    iniciales: 'N', edad: 30, vinculo, dni: '30'+id, cobertura: '', totalTurnos: 0, totalEstudios: 0, accentColor: 'primary' };
}

describe('PatientSelectorComponent', () => {
  it('renderiza el activo y al elegir llama setActive', () => {
    const setActive = vi.fn();
    const stub = {
      accessiblePatients: signal([fam(1,'Yo'), fam(2,'Hijo')]),
      activePatient: signal(fam(1,'Yo')),
      setActive,
    };
    TestBed.configureTestingModule({
      imports: [PatientSelectorComponent],
      providers: [{ provide: ActivePatientService, useValue: stub }],
    });
    const fixture = TestBed.createComponent(PatientSelectorComponent);
    fixture.detectChanges();
    fixture.componentInstance.onSelect(2);
    expect(setActive).toHaveBeenCalledWith(2);
  });

  it('con 1 accesible no ofrece dropdown interactivo', () => {
    const stub = { accessiblePatients: signal([fam(1,'Yo')]), activePatient: signal(fam(1,'Yo')), setActive: vi.fn() };
    TestBed.configureTestingModule({ imports: [PatientSelectorComponent], providers: [{ provide: ActivePatientService, useValue: stub }] });
    const fixture = TestBed.createComponent(PatientSelectorComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.hasMultiple()).toBe(false);
  });
});
```

- [ ] **Step 2: Correr (rojo)**

Run: `npm test -- --run patient-selector`
Expected: FAIL.

- [ ] **Step 3: Implementar el componente**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ActivePatientService } from '@core/active-patient/active-patient.service';

@Component({
  selector: 'app-patient-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SelectModule],
  template: `
    @if (active(); as a) {
      @if (hasMultiple()) {
        <p-select
          [options]="options()"
          [ngModel]="a.id"
          optionLabel="label"
          optionValue="id"
          (onChange)="onSelect($event.value)"
          styleClass="ui-patient-selector"
          [appendTo]="'body'"
          ariaLabel="Seleccionar paciente" />
      } @else {
        <span class="ui-patient-selector__single">{{ a.nombre }} {{ a.apellido }}</span>
      }
    }
  `,
})
export class PatientSelectorComponent {
  private readonly svc = inject(ActivePatientService);
  protected readonly active = this.svc.activePatient;
  protected readonly hasMultiple = computed(() => this.svc.accessiblePatients().length > 1);
  protected readonly options = computed(() =>
    this.svc.accessiblePatients().map(f => ({
      id: f.id,
      label: f.vinculo === 'Yo' ? `${f.nombre} ${f.apellido} (vos)` : `${f.nombre} ${f.apellido} · ${f.vinculo}`,
    })));

  onSelect(id: number): void { this.svc.setActive(id); }
}
```

- [ ] **Step 4: Cablear en el shell**

En `patient-shell.component.ts`: importar `PatientSelectorComponent` y `ActivePatientService`; agregar `ngOnInit` que llama `this.activePatient.init()`:
```typescript
import { PatientSelectorComponent } from '@shared/ui/components/patient-selector/patient-selector.component';
import { ActivePatientService } from '@core/active-patient/active-patient.service';
// en imports del @Component: ...PatientSelectorComponent
// inyección:
private readonly activePatient = inject(ActivePatientService);
ngOnInit(): void { this.activePatient.init(); }
// (implements OnInit)
```
En `patient-shell.component.html`, en el header (`ui-topbar` o el área de header visible en desktop+mobile), agregar `<app-patient-selector />` en un lugar visible en todas las pantallas (junto al topbar; verificar que se vea en desktop — si el `ui-topbar` es solo mobile, ubicarlo también en el header de contenido / el área de usuario del sidebar para desktop). Decisión de implementación: colocarlo en el header de contenido principal visible en ambos breakpoints.

- [ ] **Step 5: Correr (verde)**

Run: `npm test -- --run patient-selector`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/ui/components/patient-selector/ src/app/shared/ui/shell/patient-shell/
git commit -m "feat(portal): patient-selector en el shell + init del activo (Arco 2C.2)"
```

---

### Task 3: Rewire Turnos al paciente activo

**Files:**
- Modify: `src/app/features/main/turnos/services/appointment.service.ts`
- Modify: `src/app/features/main/turnos/turnos.component.ts` (+ su `.html` si referencia el filtro familiar)
- Test: `src/app/features/main/turnos/turnos.component.spec.ts` + `services/appointment.service.spec.ts` (si existe; si no, crear el del service)

**Interfaces:**
- Consumes: `ActivePatientService.activePatient` (Task 1).
- Produces: `AppointmentService.getMyAppointments(patientId?: number)` — si `patientId` viene, agrega `&patientId={id}` a la URL.

- [ ] **Step 1: Escribir/ajustar el test del service (que falle)**

```typescript
it('getMyAppointments(patientId) pega a ?mine=true&patientId=', () => {
  // setup con HttpTestingController + stubs de tiposSvc/sedeSvc/familySvc devolviendo []
  service.getMyAppointments(7).subscribe();
  const req = httpMock.expectOne(r => r.url.includes('/api/v1/turnos/appointments') && r.url.includes('mine=true') && r.url.includes('patientId=7'));
  req.flush([]);
  // flush de tipos/sedes/family también
});
```
(Si no existe `appointment.service.spec.ts`, crearlo con `provideHttpClient/Testing` y stubs de `TipoAnalisisService`, `SucursalPublicService`, `FamilyService` devolviendo `of([])`.)

- [ ] **Step 2: Correr (rojo)**

Run: `npm test -- --run appointment.service`
Expected: FAIL.

- [ ] **Step 3: Implementar el param en el service**

```typescript
getMyAppointments(patientId?: number): Observable<{ proximos: Turno[]; anteriores: Turno[] }> {
  const url = '/api/v1/turnos/appointments?mine=true' + (patientId != null ? `&patientId=${patientId}` : '');
  return forkJoin({
    ap:     this.http.get<AppointmentResponse[]>(url),
    tipos:  this.tiposSvc.getTipos(),
    sedes:  this.sedeSvc.getSedes(),
    family: this.familySvc.getFamily(),
  }).pipe(/* ...mapeo sin cambios... */);
}
```

- [ ] **Step 4: Rewire del componente (re-fetch por activo, quitar filtro familiar)**

En `TurnosComponent`: inyectar `ActivePatientService`; reemplazar la carga en `ngOnInit` por un `effect` que re-fetchea cuando cambia el activo; `cargarTurnos(patientId)` agrega el param. Quitar `familiarFilter` (signal + cualquier UI/uso en el `.html` y en los `computed` de filtrado).
```typescript
private readonly activePatient = inject(ActivePatientService);
constructor() {
  effect(() => {
    const p = this.activePatient.activePatient();
    if (p) this.cargarTurnos(p.id);
  });
}
private cargarTurnos(patientId: number): void {
  this.cargando.set(true);
  this.subs.add(this.appointmentSvc.getMyAppointments(patientId).subscribe({
    next: ({ proximos, anteriores }) => { this.proximosTurnos.set(proximos); this.anterioresTurnos.set(anteriores); this.cargando.set(false); },
    error: (err) => { this.cargando.set(false); this.messageService.add({ severity:'error', summary:'Error', detail: mapApiError(err), life:4000 }); },
  }));
}
```
(Sacar la llamada a `cargarTurnos()` de `ngOnInit` si el `effect` ya cubre la carga inicial; mantener `showPendingBookingToast()` en `ngOnInit`. Quitar del template el control de filtro por familiar y sus referencias en computeds.)

- [ ] **Step 5: Test del componente**

En `turnos.component.spec.ts`: proveer un stub de `ActivePatientService` con `activePatient: signal(fam(7))`; espiar `appointmentSvc.getMyAppointments` y verificar que se llama con `7`; cambiar la signal → se re-fetchea. Mantener verdes los tests existentes (ajustar el stub de `AppointmentService` para aceptar el arg).

Run: `npm test -- --run turnos.component appointment.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/main/turnos/
git commit -m "feat(portal): turnos siguen al paciente activo (?patientId) (Arco 2C.2)"
```

---

### Task 4: Rewire Dashboard al paciente activo

**Files:**
- Modify: `src/app/features/main/dashboard/dashboard.component.ts`
- Test: `src/app/features/main/dashboard/dashboard.component.spec.ts` (extender/crear)

**Interfaces:**
- Consumes: `ActivePatientService.activePatient`, `AppointmentService.getMyAppointments(patientId)`.

- [ ] **Step 1: Test (que falle)** — el dashboard pide turnos del paciente activo:
```typescript
it('carga el proximo turno del paciente activo', () => {
  // stub ActivePatientService.activePatient = signal(fam(5)); spy getMyAppointments
  // detectChanges → expect getMyAppointments llamado con 5
});
```

- [ ] **Step 2: Correr (rojo)**

Run: `npm test -- --run dashboard.component`
Expected: FAIL.

- [ ] **Step 3: Implementar** — inyectar `ActivePatientService`; `cargarProximoTurno` usa `this.activePatient.activePatient()?.id`; re-fetch on change vía `effect` (guardar null). La rama de fallback a estudios queda igual (mock).

- [ ] **Step 4: Correr (verde)**

Run: `npm test -- --run dashboard.component`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/main/dashboard/
git commit -m "feat(portal): dashboard sigue al paciente activo (Arco 2C.2)"
```

---

### Task 5: Rewire Estudios (filtro mock por activo)

**Files:**
- Modify: `src/app/features/main/estudios/estudios.component.ts` (+ `.html` para quitar el selector de persona local)
- Test: `src/app/features/main/estudios/estudios.component.spec.ts` (extender/crear)

**Interfaces:**
- Consumes: `ActivePatientService.activePatient`.

- [ ] **Step 1: Test (que falle)** — `estudiosFiltrados` filtra por el paciente activo:
```typescript
it('filtra estudios por el paciente activo', () => {
  // stub ActivePatientService.activePatient = signal(fam(2)); estudios con personaId 1 y 2
  // expect estudiosFiltrados() solo personaId===2
});
```

- [ ] **Step 2: Correr (rojo)**

Run: `npm test -- --run estudios.component`
Expected: FAIL.

- [ ] **Step 3: Implementar** — inyectar `ActivePatientService`; en `estudiosFiltrados` reemplazar el filtro por `selectedPersonaId()` por `const pid = this.activePatient.activePatient()?.id ?? null; if (pid !== null) lista = lista.filter(e => e.personaId === pid);`. Quitar el dropdown/chips de persona local del `.html` y `onPersonaChange`/`selectedPersonaId`/`getPersonas` si quedan sin uso. (El selector global del shell gobierna ahora.)

- [ ] **Step 4: Correr (verde)**

Run: `npm test -- --run estudios.component`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/main/estudios/
git commit -m "feat(portal): estudios filtra por el paciente activo (mock) (Arco 2C.2)"
```

---

### Task 6: Suite + build

- [ ] **Step 1:** `npm test -- --run` — toda la suite verde (anotar fallos pre-existentes ajenos si los hubiera).
- [ ] **Step 2:** `npm run build` — build de producción OK.
- [ ] **Step 3:** Smoke manual: cambiar de paciente en el selector → turnos y dashboard reflejan al elegido; estudios filtra; con 1 solo accesible no hay dropdown.

---

# CIERRE

- [ ] `/sdd-verify` contra el spec de 2C.2 (o verificación manual de cobertura).
- [ ] `superpowers:verification-before-completion`.
- [ ] PR de `feat/arco2c2-portal-selector` → development.
- [ ] Actualizar memoria: 2C.2 cerrado → sigue 2C.3 (perfil-tab + cuenta de gestión + CTA + cablear estudios a /me/results).

---

## Self-Review (cobertura vs spec)

| Requisito del spec (2C.2) | Task |
|---|---|
| §3.1 ActivePatientService (signal, default uno-mismo, sin persist, carga /me/family) | Task 1 |
| §3.2 selector transversal en el shell | Task 2 |
| §3.3 turnos real por patientId + re-fetch + quitar filtro familiar | Task 3 |
| §3.4 dashboard sigue al activo | Task 4 |
| §3.5 estudios mock filtrado por activo (quitar dropdown local) | Task 5 |
| §5 testing + build + smoke | Tasks 1-6 |
| Fuera de alcance (perfil/cuenta gestión/estudios real/persistencia) | respetado (no hay tasks) |
