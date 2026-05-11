# Catálogo de Componentes

Stack: Angular 17+ standalone, PrimeNG v17, SCSS con tokens de `tokens.md`.
**Convención de prefijos:** clases `.ui-*`, variables fijas `--ds-*`, variables de marca `--brand-*`.
Todo componente debe ser adaptativo: funcionar en mobile y desktop sin cambios estructurales.

---

## Servicio de breakpoint (helper común)

```typescript
// breakpoint.service.ts
import { Injectable, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';

@Injectable({ providedIn: 'root' })
export class BreakpointService {
  isMobile = signal(false);
  isDesktop = signal(false);

  constructor(private bp: BreakpointObserver) {
    this.bp.observe(['(max-width: 767px)']).subscribe(r => this.isMobile.set(r.matches));
    this.bp.observe(['(min-width: 1024px)']).subscribe(r => this.isDesktop.set(r.matches));
  }
}
```

Uso en componente:
```typescript
constructor(public bp: BreakpointService) {}
// En template: @if (bp.isMobile()) { ... } @else { ... }
```

---

## Topbar Admin

```html
<header class="ui-topbar">
  <div class="ui-topbar__left">
    <p-button icon="pi pi-bars" [rounded]="true" [text]="true"
              styleClass="ui-show-mobile-tablet"
              ariaLabel="Abrir menú"
              (onClick)="menuToggle.emit()" />
    <span class="ui-topbar__title">{{ pageTitle }}</span>
  </div>
  <div class="ui-topbar__right">
    <p-button icon="pi pi-bell" [rounded]="true" [text]="true"
              [badge]="unreadCount > 0 ? unreadCount.toString() : null"
              ariaLabel="Notificaciones" />
    <p-avatar [label]="userInitials" shape="circle" />
    <p-menu #menu [model]="userMenuItems" [popup]="true" />
    <p-button icon="pi pi-chevron-down" [text]="true"
              ariaLabel="Menú de usuario"
              (onClick)="menu.toggle($event)" />
  </div>
</header>
```

```scss
.ui-show-mobile-tablet {
  @include desktop-up { display: none; }
}
```

---

## Topbar Paciente (mobile-first)

```html
<header class="ui-topbar ui-topbar--patient">
  <div class="ui-topbar__left">
    <img class="ui-tenant-logo" alt="Logo" />
    <nav class="ui-show-desktop ui-topbar__nav">
      <a routerLink="/paciente" routerLinkActive="active">Inicio</a>
      <a routerLink="/paciente/turnos" routerLinkActive="active">Turnos</a>
      <a routerLink="/paciente/estudios" routerLinkActive="active">Estudios</a>
      <a routerLink="/paciente/perfil" routerLinkActive="active">Perfil</a>
    </nav>
  </div>
  <div class="ui-topbar__right">
    <p-avatar [label]="userInitials" shape="circle" />
  </div>
</header>
```

```scss
.ui-tenant-logo {
  // El logo se inyecta como background-image desde la variable de marca
  // para que sea reemplazable por tenant sin tocar HTML
  width: 120px;
  height: 32px;
  background-image: var(--brand-logo);
  background-repeat: no-repeat;
  background-size: contain;
  background-position: left center;
}

// Versión white para fondos oscuros (sidebar)
.ui-tenant-logo--white {
  background-image: var(--brand-logo-white);
}
```

**Nota:** alternativa con `<img [src]>` si se prefiere DOM accesible:
```html
<img class="ui-tenant-logo-img" [src]="brandLogoUrl" alt="Logo" />
```
Donde `brandLogoUrl` viene de un `BrandService` que lee la config del tenant.

---

## Sidebar (desktop, admin y paciente)

El sidebar es el mismo componente para ambos portales. Solo cambia la configuración de `navGroups` y la información del footer.

```typescript
// model
interface NavGroup {
  label: string;       // 'Principal', 'Cuenta'
  items: NavItem[];
}
interface NavItem {
  id: string;
  icon: string;        // 'pi-home', 'pi-calendar'
  label: string;
  route: string;
  badge?: number;      // notificaciones / contadores
}
```

```html
<nav class="ui-sidebar">
  <!-- Header: marca + identidad del portal -->
  <div class="ui-sidebar__header">
    <div class="ui-sidebar__logo-mark">{{ tenantInitials }}</div>
    <div class="ui-sidebar__logo-text">
      <strong>{{ tenantName }}</strong>
      <span>{{ portalName }}</span>
    </div>
  </div>

  <!-- Nav: grupos con label + items -->
  <div class="ui-sidebar__nav" aria-label="Navegación principal">
    @for (group of navGroups; track group.label) {
      <div class="ui-sidebar__group-label">{{ group.label }}</div>
      @for (item of group.items; track item.id) {
        <a class="ui-nav-item"
           [routerLink]="item.route"
           routerLinkActive="active"
           [attr.aria-current]="isActive(item) ? 'page' : null">
          <i [class]="'pi ' + item.icon"></i>
          <span>{{ item.label }}</span>
          @if (item.badge) {
            <span class="ui-nav-item__badge">{{ item.badge }}</span>
          }
        </a>
      }
    }
  </div>

  <!-- Footer: usuario logueado + acción de salir -->
  <div class="ui-sidebar__footer">
    <div class="ui-sidebar__footer-avatar">{{ user.iniciales }}</div>
    <div class="ui-sidebar__footer-name">
      <strong>{{ user.nombre }} {{ user.apellido }}</strong>
      <span>{{ user.dni }}</span>
    </div>
    <button type="button" class="ui-sidebar__footer-action"
            (click)="logout()" aria-label="Cerrar sesión">
      <i class="pi pi-sign-out"></i>
    </button>
  </div>
</nav>
```

```scss
// Estilos clave (extender los ya definidos en tokens.md para .ui-sidebar)
.ui-sidebar {
  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-5) var(--space-5) var(--space-4);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  &__logo-mark {
    width: 40px;
    height: 40px;
    border-radius: var(--ds-radius-sm);
    background: var(--brand-secondary);
    color: white;
    font-weight: 700;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__logo-text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
    strong { font-size: 14px; color: white; }
    span   { font-size: 11px; color: rgba(255,255,255,0.65);
             text-transform: uppercase; letter-spacing: 0.5px; }
  }

  &__group-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: rgba(255, 255, 255, 0.45);
    padding: var(--space-4) var(--space-5) var(--space-2);
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-5);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  &__footer-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--brand-secondary);
    color: white;
    font-weight: 600;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__footer-name {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    strong { font-size: 13px; color: white; }
    span   { font-size: 11px; color: rgba(255,255,255,0.55); }
  }

  &__footer-action {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.6);
    width: 32px;
    height: 32px;
    border-radius: var(--ds-radius-sm);
    cursor: pointer;

    &:hover {
      background: rgba(255,255,255,0.08);
      color: white;
    }
  }
}

.ui-nav-item {
  position: relative;

  &__badge {
    margin-left: auto;
    background: var(--brand-secondary);
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    min-width: 22px;
    text-align: center;
  }
}
```

**Reglas:**
- Los grupos son opcionales: si solo hay un grupo lógico, podés tener un único `NavGroup` sin label visible.
- Cuando el sidebar se renderiza dentro del `p-drawer` (mobile/tablet en admin, o como menú secundario), tiene exactamente la misma estructura — no se hace una versión mobile distinta.
- En el portal paciente con bottom nav activo, el footer puede ocultar el botón de salir (queda en otra parte de la UI).

---

## Drawer (mobile/tablet)

```html
<p-drawer [(visible)]="drawerOpen" position="left" styleClass="ui-drawer">
  <ng-template pTemplate="headless">
    <ui-sidebar [navGroups]="navGroups" [user]="user"
                (itemClick)="drawerOpen = false" />
  </ng-template>
</p-drawer>
```

---

## Bottom navigation (mobile, paciente)

```html
<nav class="ui-bottom-nav ui-show-mobile">
  <a class="ui-bottom-nav__item" routerLink="/paciente"
     routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
    <i class="pi pi-home"></i>
    <span>Inicio</span>
  </a>
  <a class="ui-bottom-nav__item" routerLink="/paciente/turnos" routerLinkActive="active">
    <i class="pi pi-calendar"></i>
    <span>Turnos</span>
  </a>
  <a class="ui-bottom-nav__item" routerLink="/paciente/estudios" routerLinkActive="active">
    <i class="pi pi-file-edit"></i>
    <span>Estudios</span>
  </a>
  <a class="ui-bottom-nav__item" routerLink="/paciente/perfil" routerLinkActive="active">
    <i class="pi pi-user"></i>
    <span>Perfil</span>
  </a>
</nav>
```

**Reglas:** máximo 4 ítems. Labels cortos (≤8 caracteres). Íconos PrimeIcons consistentes.

---

## Tabla adaptativa (patrón crítico)

Mismo data, dos vistas controladas por CSS. Es uno de los patrones más importantes del DS porque resuelve el caso "lista de entidades" que aparece en todos los features.

```html
<!-- Desktop: p-table -->
<div class="ui-table-desktop">
  <p-table [value]="items" [paginator]="true" [rows]="15"
           [stripedRows]="true" [loading]="loading" styleClass="p-datatable-sm">
    <ng-template pTemplate="header">
      <tr>
        <th pSortableColumn="{key1}">{Columna 1} <p-sortIcon field="{key1}" /></th>
        <th pSortableColumn="{key2}">{Columna 2} <p-sortIcon field="{key2}" /></th>
        <th>{Columna 3}</th>
        <th>Acciones</th>
      </tr>
    </ng-template>
    <ng-template pTemplate="body" let-item>
      <tr>
        <td>{{ item.field1 }}</td>
        <td>
          <div class="flex align-items-center gap-2">
            <p-avatar [label]="item.initials" shape="circle" size="small" />
            <span>{{ item.displayName }}</span>
          </div>
        </td>
        <td>{{ item.field3 }}</td>
        <td>
          <p-button icon="pi pi-eye" [rounded]="true" [text]="true"
                    [routerLink]="['...', item.id]"
                    pTooltip="Ver detalle" ariaLabel="Ver detalle" />
        </td>
      </tr>
    </ng-template>
  </p-table>
</div>

<!-- Mobile: lista de cards -->
<div class="ui-list-mobile">
  @for (item of items; track item.id) {
    <a class="ui-list-card" [routerLink]="['...', item.id]">
      <p-avatar [label]="item.initials" shape="circle" />
      <div class="ui-list-card__info">
        <strong>{{ item.displayName }}</strong>
        <span class="ui-text-muted">{{ item.subtitle }}</span>
      </div>
      <i class="pi pi-chevron-right"></i>
    </a>
  } @empty {
    <div class="ui-empty-state">
      <i class="pi pi-{icono-relevante}"></i>
      <h4>{Mensaje vacío}</h4>
      <p>{Contexto opcional}</p>
    </div>
  }

  @if (loading) {
    @for (i of [1,2,3,4]; track i) {
      <p-skeleton height="72px" styleClass="mb-2" />
    }
  }
</div>
```

```scss
.ui-list-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  margin-bottom: var(--space-2);
  text-decoration: none;
  color: var(--ds-text);
  box-shadow: var(--ds-shadow-sm);
  min-height: var(--ds-touch-target);
  transition: transform 0.15s, box-shadow 0.15s;

  &:active {
    transform: scale(0.98);
    box-shadow: var(--ds-shadow-md);
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    strong { font-size: 14px; }
    span { font-size: 12px; color: var(--ds-text-muted); }
  }

  > i { color: var(--ds-text-muted); }
}
```

---

## Filtros adaptativos (toolbar / drawer)

```html
<!-- Desktop -->
<p-toolbar styleClass="ui-show-desktop mb-4">
  <ng-template pTemplate="left">
    <p-iconField iconPosition="left">
      <p-inputIcon styleClass="pi pi-search" />
      <!-- ngModel OK: filtro de UI sin submit al backend -->
      <input pInputText type="text" [(ngModel)]="searchTerm"
             placeholder="Buscar..." />
    </p-iconField>
  </ng-template>
  <ng-template pTemplate="right">
    <!-- ngModel OK: filtro de UI sin validación -->
    <p-dropdown [options]="filterOptions" [(ngModel)]="selectedFilter"
                placeholder="{Filtro}" [showClear]="true" />
    <p-button label="{Acción primaria}" icon="pi pi-plus" severity="primary" class="ml-2" />
  </ng-template>
</p-toolbar>

<!-- Mobile -->
<div class="ui-mobile-filters ui-show-mobile">
  <p-iconField iconPosition="left" styleClass="ui-search-input">
    <p-inputIcon styleClass="pi pi-search" />
    <input pInputText type="text" [(ngModel)]="searchTerm" placeholder="Buscar..." />
  </p-iconField>
  <p-button icon="pi pi-filter" [rounded]="true" [text]="true"
            (onClick)="filtersDrawer = true" ariaLabel="Filtros"
            [badge]="activeFiltersCount > 0 ? activeFiltersCount.toString() : null" />
</div>

<p-drawer [(visible)]="filtersDrawer" position="bottom" styleClass="ui-drawer-bottom">
  <ng-template pTemplate="headless">
    <div class="ui-filter-sheet">
      <h3>Filtros</h3>
      <p-floatlabel>
        <p-dropdown id="filter1" [options]="filterOptions" [(ngModel)]="selectedFilter"
                    [showClear]="true" styleClass="w-full" />
        <label for="filter1">{Etiqueta filtro}</label>
      </p-floatlabel>
      <!-- más filtros según el feature -->
      <p-button label="Aplicar" severity="primary" styleClass="w-full mt-3"
                (onClick)="filtersDrawer = false" />
    </div>
  </ng-template>
</p-drawer>
```

```scss
.ui-mobile-filters {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  position: sticky;
  top: var(--ds-topbar-h);
  z-index: var(--z-sticky);
  background: var(--ds-bg);
  padding: var(--space-3) 0;

  .ui-search-input { flex: 1; }
}

.ui-filter-sheet {
  padding: var(--space-5) var(--space-4)
           calc(var(--space-5) + var(--ds-safe-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  h3 { margin: 0 0 var(--space-2); }
}
```

---

## Dialog adaptativo

```html
<p-dialog [(visible)]="showDialog"
          [header]="dialogTitle"
          [modal]="true"
          [draggable]="false"
          [resizable]="false"
          [style]="{ width: '520px' }"
          [breakpoints]="{ '768px': '100vw' }"
          styleClass="ui-dialog-fullscreen-mobile">

  <ng-template pTemplate="content">
    <!-- contenido -->
  </ng-template>

  <ng-template pTemplate="footer">
    <p-button label="Cancelar" [text]="true" (onClick)="showDialog = false" />
    <p-button label="Guardar" severity="primary" (onClick)="onSave()" [loading]="saving" />
  </ng-template>
</p-dialog>
```

**Reglas:**
- Desktop ancho estándar: 520px (form simple), 720px (form extenso), 900px (con tabla).
- Mobile siempre full-screen vía `ui-dialog-fullscreen-mobile`.
- Footer: cancelar a la izquierda (`[text]="true"` — NO `severity="text"`, ese valor no existe en v17), acción principal a la derecha.

---

## Formularios (Reactive Forms)

**Todos los formularios usan Reactive Forms.** `ngModel` solo se acepta en filtros de UI sin submit.

### Setup del componente

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DatePickerModule } from 'primeng/datepicker';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, FloatLabelModule,
            DatePickerModule, DropdownModule, ButtonModule],
  template: `...`
})
export class EntityFormComponent {
  private fb = inject(FormBuilder);

  // Estructura genérica del form. Los nombres y validators concretos
  // los define cada feature según su dominio.
  form = this.fb.group({
    nombre:    ['', [Validators.required, Validators.minLength(2)]],
    email:     ['', [Validators.email]],
    telefono:  ['', []],
    fecha:     [null as Date | null, [Validators.required]],
    categoria: [null as number | null, []],
  });

  get f() { return this.form.controls; }

  hasError(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.get(field as string);
    return !!(ctrl?.invalid && (ctrl?.dirty || ctrl?.touched));
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // emit / call service con this.form.getRawValue()
  }
}
```

### Template

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()" class="ui-form-grid">

  <!-- Patrón: input de texto con validación required + minLength -->
  <div class="ui-field">
    <p-floatlabel>
      <input pInputText id="nombre" formControlName="nombre"
             autocomplete="given-name"
             [class.ng-invalid]="hasError('nombre')"
             [class.ng-dirty]="f.nombre.dirty" />
      <label for="nombre">Nombre *</label>
    </p-floatlabel>
    @if (hasError('nombre')) {
      <small class="p-error">
        @if (f.nombre.errors?.['required']) { El nombre es requerido. }
        @if (f.nombre.errors?.['minlength']) { Mínimo 2 caracteres. }
      </small>
    }
  </div>

  <!-- Patrón: input numérico (con inputmode correcto y pattern) -->
  <div class="ui-field">
    <p-floatlabel>
      <input pInputText id="codigo" formControlName="codigo"
             inputmode="numeric" autocomplete="off"
             [class.ng-invalid]="hasError('codigo')" />
      <label for="codigo">Código *</label>
    </p-floatlabel>
    @if (hasError('codigo')) {
      <small class="p-error">
        @if (f.codigo.errors?.['required']) { Campo requerido. }
        @if (f.codigo.errors?.['pattern']) { Formato inválido. }
      </small>
    }
  </div>

  <!-- Patrón: input de email con validator built-in -->
  <div class="ui-field">
    <p-floatlabel>
      <input pInputText type="email" id="email" formControlName="email"
             inputmode="email" autocomplete="email"
             [class.ng-invalid]="hasError('email')" />
      <label for="email">Email</label>
    </p-floatlabel>
    @if (hasError('email')) {
      <small class="p-error">Email inválido.</small>
    }
  </div>

  <!-- Patrón: input de teléfono -->
  <div class="ui-field">
    <p-floatlabel>
      <input pInputText type="tel" id="tel" formControlName="telefono"
             inputmode="tel" autocomplete="tel" />
      <label for="tel">Teléfono</label>
    </p-floatlabel>
  </div>

  <!-- Patrón: date picker con validación -->
  <div class="ui-field">
    <p-floatlabel>
      <p-datePicker id="fecha" formControlName="fecha"
                    dateFormat="dd/mm/yy" [showIcon]="true"
                    styleClass="w-full"
                    [class.ng-invalid]="hasError('fecha')" />
      <label for="fecha">Fecha *</label>
    </p-floatlabel>
    @if (hasError('fecha')) {
      <small class="p-error">La fecha es requerida.</small>
    }
  </div>

  <!-- Patrón: dropdown ocupando ancho completo -->
  <div class="ui-field ui-form-full">
    <p-floatlabel>
      <p-dropdown id="categoria" formControlName="categoria"
                  [options]="opciones" optionLabel="nombre" optionValue="id"
                  [showClear]="true" styleClass="w-full"
                  placeholder=" " />
      <label for="categoria">Categoría</label>
    </p-floatlabel>
  </div>

  <!-- Patrón: footer con cancelar (text) + acción primaria (loading state) -->
  <div class="ui-form-actions ui-form-full">
    <p-button label="Cancelar" [text]="true" type="button" (onClick)="cerrar()" />
    <p-button label="Guardar" severity="primary" type="submit"
              [loading]="saving" [disabled]="form.invalid && form.touched" />
  </div>
</form>
```

### Validación cruzada y validators custom

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function fechaFuturaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return control.value >= hoy ? null : { fechaPasada: true };
  };
}

export function horaDisponibleValidator(ctrl: AbstractControl): ValidationErrors | null {
  const fecha = ctrl.get('fecha')?.value;
  const hora = ctrl.get('hora')?.value;
  if (!fecha || !hora) return null;
  // lógica cross-field
  return null;
}

// Uso
form = this.fb.group({
  fecha: [null, [Validators.required, fechaFuturaValidator()]],
  hora:  [null, [Validators.required]],
}, { validators: horaDisponibleValidator });
```

### Wizard de pasos con FormGroups anidados

```typescript
// Estructura: un FormGroup por paso, validables independientemente.
form = this.fb.group({
  paso1: this.fb.group({
    campoA: [null, Validators.required],
    campoB: [[], [Validators.required, Validators.minLength(1)]],
  }),
  paso2: this.fb.group({
    campoC: [null, Validators.required],
    fecha:  [null, [Validators.required, fechaFuturaValidator()]],
    hora:   [null, Validators.required],
  }),
});

get paso1() { return this.form.get('paso1') as FormGroup; }
get paso2() { return this.form.get('paso2') as FormGroup; }

canProceed(): boolean {
  const pasoActual = this.currentStep === 1 ? this.paso1 : this.paso2;
  return pasoActual.valid;
}

nextStep() {
  const pasoActual = this.currentStep === 1 ? this.paso1 : this.paso2;
  if (pasoActual.invalid) {
    pasoActual.markAllAsTouched();
    return;
  }
  this.currentStep++;
}
```

### Edición de entidad existente

Para editar, hacer `patchValue` con los datos cargados:

```typescript
@Input() set entity(value: TEntity | null) {
  if (value) {
    this.form.patchValue({
      // mapear cada campo de la entidad al control correspondiente
      nombre:    value.nombre,
      email:     value.email,
      telefono:  value.telefono,
      // Para fechas que vienen como string del backend:
      fecha:     value.fecha ? new Date(value.fecha) : null,
      categoria: value.categoriaId,
    });
  } else {
    this.form.reset();
  }
}
```

```scss
.ui-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);

  @include tablet-up {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4) var(--space-5);
  }

  .ui-form-full { grid-column: 1 / -1; }
}

.ui-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);

  .p-error {
    font-size: 12px;
    padding-left: var(--space-1);
  }
}

.ui-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--ds-surface-dark);

  @include mobile-only {
    flex-direction: column-reverse;
    .p-button { width: 100%; }
  }
}
```

### Cuándo usar `ngModel` (única excepción)

```html
<!-- ✅ OK: filtro rápido de búsqueda -->
<input pInputText [(ngModel)]="searchTerm" placeholder="Buscar..." />

<!-- ✅ OK: selector de vista -->
<p-selectButton [options]="personas" [(ngModel)]="personaSeleccionada" />

<!-- ❌ MAL: campo dentro de un formulario que se envía -->
<input pInputText [(ngModel)]="form.nombre" />
```

---

## Card expandible (acordeón)

Patrón para cards que muestran un resumen siempre visible y un detalle expandible. Útil cuando hay listas largas donde solo algunos items requieren ver detalle (resultados de análisis, órdenes, transacciones, etc.).

```html
<div class="ui-collapsible-card" [class.expanded]="expanded">
  <button class="ui-collapsible-card__header" (click)="expanded = !expanded">
    <div>
      <h4>{{ item.title }}</h4>
      <span class="ui-text-muted text-sm">{{ item.subtitle }}</span>
    </div>
    <div class="flex align-items-center gap-2">
      <!-- Tag de estado opcional -->
      <p-tag [value]="item.statusLabel" [styleClass]="'ui-tag-' + item.statusKey" />
      <i class="pi" [class.pi-chevron-down]="!expanded" [class.pi-chevron-up]="expanded"></i>
    </div>
  </button>

  @if (expanded) {
    <div class="ui-collapsible-card__body">
      <!-- contenido detallado del item -->
      <ng-content />

      <!-- Acciones opcionales al final del body -->
      <div class="ui-collapsible-card__actions">
        <p-button label="..." icon="pi pi-..." [text]="true" (onClick)="..." />
      </div>
    </div>
  }
</div>
```

```scss
.ui-collapsible-card {
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  margin-bottom: var(--space-3);
  overflow: hidden;
  box-shadow: var(--ds-shadow-sm);

  &__header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    min-height: var(--ds-touch-target);

    h4 { margin: 0; font-size: 15px; }
  }

  &__body {
    padding: 0 var(--space-4) var(--space-4);
    border-top: 1px solid var(--ds-surface);
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
    flex-wrap: wrap;
  }
}
```

---

## Patrón: Lista de filas con valor + rango

Para mostrar pares parámetro/valor con un rango/referencia opcional y posibilidad de marcar filas como "fuera de rango" (resultados clínicos, métricas con threshold, etc.).

```html
<div class="ui-data-row" [class.ui-data-row--alert]="item.outOfRange">
  <span class="ui-data-row__label">{{ item.label }}</span>
  <span class="ui-data-row__value">
    {{ item.value }} {{ item.unit }}
    @if (item.outOfRange) {
      <i class="pi pi-exclamation-triangle"></i>
    }
  </span>
  <span class="ui-data-row__reference">{{ item.referenceRange }}</span>
</div>
```

```scss
.ui-data-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  font-size: 14px;
  align-items: center;

  &__label     { font-weight: 500; }
  &__value     { font-weight: 600; color: var(--ds-text); }
  &__reference { font-size: 12px; color: var(--ds-text-muted); }

  &--alert {
    .ui-data-row__value {
      color: var(--ds-danger);
      i { margin-left: var(--space-1); }
    }
  }
}
```

---

## Card con date-stamp (event card)

Patrón para cards que representan eventos con fecha (turnos, citas, recordatorios). El stamp visual de fecha al inicio facilita el escaneo rápido en listas.

```html
<div class="ui-event-card" [class.ui-event-card--urgent]="event.urgent">
  <div class="ui-event-card__date-stamp">
    <span class="ui-event-card__day">{{ event.date | date:'dd' }}</span>
    <span class="ui-event-card__month">{{ event.date | date:'MMM' | uppercase }}</span>
  </div>
  <div class="ui-event-card__info">
    <h4>{{ event.title }}</h4>
    <p><i class="pi pi-clock mr-1"></i>{{ event.time }}</p>
    <p><i class="pi pi-map-marker mr-1"></i>{{ event.location }}</p>
  </div>
  <div class="ui-event-card__status">
    <p-tag [value]="event.statusLabel" [styleClass]="'ui-tag-' + event.statusKey" />
    <!-- Acción contextual opcional según el estado -->
  </div>
</div>
```

```scss
.ui-event-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  margin-bottom: var(--space-3);
  box-shadow: var(--ds-shadow-sm);

  &__date-stamp {
    flex-shrink: 0;
    width: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2);
    background: var(--brand-primary-light);
    border-radius: var(--ds-radius-sm);
    color: var(--brand-primary);
  }

  &__day { font-size: 22px; font-weight: 700; line-height: 1; }
  &__month { font-size: 11px; font-weight: 600; letter-spacing: 0.5px; }

  &__info {
    flex: 1;
    min-width: 0;

    h4 { margin: 0 0 var(--space-1); font-size: 15px; }
    p {
      margin: 0;
      font-size: 13px;
      color: var(--ds-text-muted);
      display: flex;
      align-items: center;
    }
  }

  &__status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  &--urgent {
    border-left: 4px solid var(--brand-accent);
  }
}
```

---

## FAB para acción primaria mobile

```html
<p-button class="ui-fab ui-show-mobile"
          icon="pi pi-plus"
          [rounded]="true"
          severity="primary"
          ariaLabel="Reservar turno"
          (onClick)="reservarTurno()" />

<p-button class="ui-show-desktop" label="Reservar turno"
          icon="pi pi-plus" severity="primary"
          (onClick)="reservarTurno()" />
```

---

## Confirmación destructiva

```html
<p-confirmDialog />
```

```typescript
constructor(private confirm: ConfirmationService, private toast: MessageService) {}

cancelarTurno(turno: Turno) {
  this.confirm.confirm({
    message: `¿Cancelar el turno del ${turno.fecha}?`,
    header: 'Confirmar cancelación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sí, cancelar',
    rejectLabel: 'No',
    acceptButtonStyleClass: 'p-button-danger',
    accept: () => { /* lógica de cancelación */ }
  });
}
```

---

## Toast / notificaciones

```html
<p-toast [position]="bp.isMobile() ? 'top-center' : 'top-right'" />
```

```typescript
this.messageService.add({
  severity: 'success',
  summary: 'Turno creado',
  detail: 'El turno fue registrado correctamente',
  life: 4000
});
```

---

## Skeleton / loading

```html
@if (loading) {
  @for (i of [1,2,3,4,5]; track i) {
    <p-skeleton height="72px" styleClass="mb-2" />
  }
} @else {
  <!-- contenido real -->
}
```

---

## Card horizontal con avatar y acciones

Patrón genérico para mostrar una entidad con identidad visual (avatar/iniciales) + datos resumen + acciones contextuales. Aplica a personas (pacientes, contactos, miembros de familia), pero también a cualquier entidad con un identificador visual.

```html
<div class="ui-entity-card">
  <p-avatar [label]="entity.initials" shape="circle" size="large"
            [style]="{ background: 'var(--brand-secondary)', color: 'white' }" />
  <div class="ui-entity-card__info">
    <h4>{{ entity.title }}</h4>
    <p>{{ entity.subtitle }}</p>
    <p>{{ entity.metadata }}</p>
  </div>
  <div class="ui-entity-card__actions">
    <p-button icon="pi pi-..." [text]="true"
              ariaLabel="..." pTooltip="..." (onClick)="..." />
    <!-- ... más acciones ... -->
  </div>
</div>
```

```scss
.ui-entity-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  box-shadow: var(--ds-shadow-sm);

  &__info {
    flex: 1;
    min-width: 0;
    h4 { margin: 0 0 var(--space-1); font-size: 15px; }
    p { margin: 0; font-size: 13px; color: var(--ds-text-muted); }
  }

  &__actions {
    display: flex;
    gap: var(--space-1);

    // En mobile, dejar visible solo la acción primaria
    // y mover las demás a un menú overflow
    @include mobile-only {
      .p-button:not(:first-child) { display: none; }
    }
  }
}
```

**Diferencia con `ui-list-card`:**
- `ui-list-card`: lista densa, item entero clickeable (navega), sin acciones inline.
- `ui-entity-card`: card más espaciosa, con acciones inline, no navega como un todo.

---

## Campo de dato con ícono (`ui-data-field`)

Muestra un único par etiqueta/valor de forma destacada, con ícono a la izquierda y botón lápiz opcional. Ideal para pantallas de perfil o detalle de entidad donde cada campo merece peso visual propio.

**Cuándo usar `ui-data-field` vs `ui-data-list`:**
- `ui-data-field`: campos individuales destacados con ícono (perfil, detalle de contacto, cobertura). Uso cuando cada campo es importante por sí solo.
- `ui-data-list`: lista densa tabular (`<dl>` con grid label/valor). Uso cuando hay muchos pares compactos y el ícono no agrega valor.

### API

```typescript
// Inputs
@Input({ required: true }) icon!: string;    // PrimeIcons sin 'pi ': 'pi-envelope'
@Input({ required: true }) label!: string;   // 'EMAIL'
@Input({ required: true }) value!: string;   // 'maria@email.com'
@Input() editable = false;                   // muestra botón lápiz
@Input() multiline = false;                  // value con white-space: pre-line

// Outputs
@Output() edit = new EventEmitter<void>();   // clic en el botón lápiz
```

Si `value` está vacío o es solo espacios, el componente muestra "—" en `--ds-text-disabled`.

### Estructura visual

```
┌──────────────────────────────────────────────────┐
│  [📧]  EMAIL                              [✏️]  │
│        maria.fernandez@email.com                 │
└──────────────────────────────────────────────────┘

[📧] = cuadrado 40×40, bg --ds-surface, icono 18px --ds-text-muted
EMAIL = 11px uppercase 600 --ds-text-muted
valor = 14px 500 --ds-text
[✏️] = p-button [text]="true" severity="primary" 36×36
```

### Uso básico

```html
<!-- Solo lectura -->
<ui-data-field icon="pi-user" label="Nombre completo" [value]="user.nombre" />

<!-- Editable -->
<ui-data-field
  icon="pi-envelope"
  label="Email"
  [value]="user.email"
  [editable]="true"
  (edit)="onEditCampo('email')" />

<!-- Con valor vacío (muestra "—") -->
<ui-data-field icon="pi-map" label="Dirección" [value]="user.direccion || ''" [editable]="true" />

<!-- Valor multilinea -->
<ui-data-field icon="pi-map" label="Dirección" [value]="user.direccion" [multiline]="true" />
```

### Contenedor recomendado: `.ui-field-list`

Agrupa varios `ui-data-field` verticalmente con gap uniforme:

```html
<div class="ui-field-list">
  <ui-data-field icon="pi-envelope" label="Email" [value]="user.email" [editable]="true" (edit)="..." />
  <ui-data-field icon="pi-phone"    label="Teléfono" [value]="user.telefono" [editable]="true" (edit)="..." />

  <h4 class="ui-grupo-titulo">Contacto de emergencia</h4>
  <ui-data-field icon="pi-user" label="Nombre" [value]="user.contactoEmergencia?.nombre || ''" />
</div>
```

### Importación

```typescript
import { DataFieldComponent } from '../../../shared/ui/components/data-field/data-field.component';
```

---

## Tabs (`p-tabs`) — API de selectores

> **⚠️ Trampa frecuente:** los selectores internos de `p-tabs` son **todos lowercase**. La documentación oficial y otros recursos los muestran en camelCase, pero el compilador Angular los rechaza. Usar siempre los nombres en minúsculas.

### Selectores correctos

| Componente  | Selector correcto | ❌ No usar    |
|-------------|-------------------|---------------|
| Tabs        | `p-tabs`          | —             |
| TabList     | `p-tablist`       | `p-tabList`   |
| Tab         | `p-tab`           | —             |
| TabPanels   | `p-tabpanels`     | `p-tabPanels` |
| TabPanel    | `p-tabpanel`      | `p-tabPanel`  |

### Módulo a importar

```typescript
import { TabsModule } from 'primeng/tabs';
// TabsModule exporta: Tabs, TabList, Tab, TabPanels, TabPanel
```

### Uso básico con valor inicial estático

```html
<p-tabs value="primer-tab">
  <p-tablist>
    <p-tab value="primer-tab">Primer tab</p-tab>
    <p-tab value="segundo-tab">Segundo tab</p-tab>
  </p-tablist>

  <p-tabpanels>
    <p-tabpanel value="primer-tab">
      Contenido del primer tab
    </p-tabpanel>
    <p-tabpanel value="segundo-tab">
      Contenido del segundo tab
    </p-tabpanel>
  </p-tabpanels>
</p-tabs>
```

### Binding reactivo (tab activo controlado por el componente)

El input `value` de `p-tabs` es un **model signal** de Angular 17. Para enlazarlo a un signal del componente usar la sintaxis explícita de signal:

```typescript
// En el componente
activeTab = signal('primer-tab');
```

```html
<!-- En el template: leer con () y escribir con .set() -->
<p-tabs [value]="activeTab()" (valueChange)="activeTab.set($event)">
  ...
</p-tabs>
```

> **Nota:** `[(value)]="activeTab"` (two-way binding Angular clásico) **no funciona** con `WritableSignal` — Angular intenta asignar el signal completo, no llamar a `.set()`. Usar siempre la forma explícita `[value]="activeTab()" (valueChange)="activeTab.set($event)"`.

### Responsive — tabs scrolleables en mobile

Cuando los tabs no entran en pantalla, habilitar scroll horizontal con estos estilos:

```scss
// En el componente que usa p-tabs
::ng-deep .p-tablist {
  @include mobile-only {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }
}
```

---

## Wizard multi-paso (con stepper visual)

Patrón para procesos guiados de N pasos. Aplica a cualquier flujo con selecciones secuenciales: reserva de turno (4 pasos), alta de familiar, configuración inicial, etc. La skill define la estructura visual y de Reactive Forms; el contenido de cada paso depende del feature.

### Estructura visual

**Tres regiones fijas:**
1. **Stepper header:** indicador horizontal de pasos. Cada paso muestra un círculo con número (o check si está completado) y un label debajo. Los pasos están conectados por una línea (gris cuando no se llegó, primary cuando se completó).
2. **Step content:** contenido del paso actual. Una sección por paso, mutuamente excluyentes.
3. **Footer fijo:** botón "Volver/Cancelar" a la izquierda, "Continuar/Confirmar" a la derecha. El botón principal se deshabilita si el paso actual no es válido.

### Comportamiento responsive

- **Desktop:** stepper horizontal con todos los pasos visibles, número + label.
- **Mobile:** stepper compacto (solo círculos con número + label del paso actual destacado), o tipografía reducida. Footer siempre full-width.

### Modelo del componente

```typescript
import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface WizardStep {
  id: string;
  label: string;
  formGroup: FormGroup;
}

@Component({
  selector: 'ui-turno-wizard',
  standalone: true,
  imports: [ReactiveFormsModule /* + módulos PrimeNG necesarios */],
  templateUrl: './turno-wizard.component.html',
  styleUrl: './turno-wizard.component.scss',
})
export class TurnoWizardComponent {
  private fb = inject(FormBuilder);

  currentStep = signal(0);

  // Un FormGroup por paso, validables independientemente
  form = this.fb.group({
    paso1: this.fb.group({
      tipoAnalisisIds: [[] as string[],
        [Validators.required, Validators.minLength(1)]],
    }),
    paso2: this.fb.group({
      sedeId: [null as string | null, Validators.required],
    }),
    paso3: this.fb.group({
      fecha: [null as Date | null, Validators.required],
      hora:  [null as string | null, Validators.required],
    }),
    paso4: this.fb.group({
      // confirmación: no tiene controles, solo se muestra el resumen
    }),
  });

  steps: WizardStep[] = [
    { id: 'analisis',  label: 'Tipo de análisis', formGroup: this.f('paso1') },
    { id: 'sede',      label: 'Sede',             formGroup: this.f('paso2') },
    { id: 'fechaHora', label: 'Fecha y hora',     formGroup: this.f('paso3') },
    { id: 'confirmar', label: 'Confirmar',        formGroup: this.f('paso4') },
  ];

  isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  canProceed = computed(() => {
    const idx = this.currentStep();
    return this.steps[idx].formGroup.valid;
  });

  isStepCompleted(idx: number): boolean {
    return idx < this.currentStep() && this.steps[idx].formGroup.valid;
  }

  next() {
    const fg = this.steps[this.currentStep()].formGroup;
    if (fg.invalid) {
      fg.markAllAsTouched();
      return;
    }
    if (this.isLastStep()) {
      this.confirm();
    } else {
      this.currentStep.update(s => s + 1);
    }
  }

  back() {
    if (this.currentStep() === 0) {
      this.cancel();
    } else {
      this.currentStep.update(s => s - 1);
    }
  }

  confirm() {
    // Emitir el FormGroup raíz al servicio
    // this.confirmed.emit(this.form.getRawValue());
  }

  cancel() { /* emit close */ }

  private f(key: string) { return this.form.get(key) as FormGroup; }
}
```

### Template

```html
<div class="ui-wizard" [formGroup]="form">

  <!-- Stepper header -->
  <div class="ui-wizard__stepper">
    @for (step of steps; track step.id; let i = $index) {
      <div class="ui-wizard__step"
           [class.ui-wizard__step--active]="currentStep() === i"
           [class.ui-wizard__step--done]="isStepCompleted(i)">
        <div class="ui-wizard__step-circle">
          @if (isStepCompleted(i)) {
            <i class="pi pi-check"></i>
          } @else {
            {{ i + 1 }}
          }
        </div>
        <div class="ui-wizard__step-label">{{ step.label }}</div>
      </div>

      @if (i < steps.length - 1) {
        <div class="ui-wizard__connector"
             [class.ui-wizard__connector--done]="isStepCompleted(i)"></div>
      }
    }
  </div>

  <!-- Step content -->
  <div class="ui-wizard__content">
    @switch (currentStep()) {
      @case (0) {
        <section formGroupName="paso1">
          <h3>Seleccioná el tipo de análisis</h3>
          <p class="ui-text-muted">Podés elegir uno o más estudios.</p>
          <!-- Grid de cards de tipos de análisis con multi-select -->
          <!-- Cada card es un toggle: agrega/quita id al array tipoAnalisisIds -->
        </section>
      }
      @case (1) {
        <section formGroupName="paso2">
          <h3>Elegí la sede</h3>
          <!-- Lista de sedes (ui-list-card o radio cards) -->
          <!-- Setear sedeId al hacer click -->
        </section>
      }
      @case (2) {
        <section formGroupName="paso3">
          <h3>Fecha y horario</h3>
          <p-datePicker formControlName="fecha"
                        [inline]="true" [minDate]="today" />
          <h4>Horarios disponibles</h4>
          <!-- Grilla de slots de hora; los tomados se renderizan disabled -->
        </section>
      }
      @case (3) {
        <section>
          <h3>Confirmá tu turno</h3>
          <!-- Resumen de selección de los pasos anteriores -->
          <!-- Mostrar tipos seleccionados, sede elegida, fecha y hora -->
          <!-- Avisos de preparación (ej: "Requiere ayuno de 8 hs") -->
        </section>
      }
    }
  </div>

  <!-- Footer fijo -->
  <footer class="ui-wizard__footer">
    <p-button [label]="currentStep() === 0 ? 'Cancelar' : 'Volver'"
              icon="pi pi-arrow-left"
              [text]="true"
              type="button"
              (onClick)="back()" />
    <p-button [label]="isLastStep() ? 'Confirmar turno' : 'Continuar'"
              [icon]="isLastStep() ? 'pi pi-check' : 'pi pi-arrow-right'"
              iconPos="right"
              severity="primary"
              type="button"
              [disabled]="!canProceed()"
              (onClick)="next()" />
  </footer>
</div>
```

### Estilos

```scss
.ui-wizard {
  display: flex;
  flex-direction: column;
  background: var(--ds-white);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-sm);
  overflow: hidden;

  // ─── Stepper header ─────────────────────
  &__stepper {
    display: flex;
    align-items: flex-start;
    padding: var(--space-5) var(--space-6);
    background: var(--ds-bg);
    border-bottom: 1px solid var(--ds-surface-dark);
    gap: var(--space-2);

    @include mobile-only {
      padding: var(--space-4);
      gap: var(--space-1);
    }
  }

  &__step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
    min-width: 80px;

    @include mobile-only {
      min-width: 56px;
    }
  }

  &__step-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--ds-surface-dark);
    color: var(--ds-text-muted);
    font-weight: 600;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    @include mobile-only {
      width: 30px;
      height: 30px;
      font-size: 12px;
    }
  }

  &__step-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--ds-text-muted);
    text-align: center;
    line-height: 1.2;

    @include mobile-only {
      font-size: 10px;
    }
  }

  // Estado: paso activo
  &__step--active {
    .ui-wizard__step-circle {
      background: var(--brand-primary);
      color: white;
      box-shadow: 0 0 0 4px var(--brand-primary-light);
    }
    .ui-wizard__step-label {
      color: var(--brand-primary);
      font-weight: 600;
    }
  }

  // Estado: paso completado
  &__step--done {
    .ui-wizard__step-circle {
      background: var(--ds-success);
      color: white;
    }
  }

  // Línea conectora entre pasos
  &__connector {
    flex: 1;
    height: 2px;
    background: var(--ds-surface-dark);
    margin-top: 17px; // alinea con el centro del círculo (36/2 - 1)
    min-width: 16px;
    transition: background 0.2s;

    @include mobile-only {
      margin-top: 14px;
    }

    &--done {
      background: var(--ds-success);
    }
  }

  // ─── Step content ───────────────────────
  &__content {
    flex: 1;
    padding: var(--space-6);
    min-height: 320px;

    @include mobile-only {
      padding: var(--space-4);
    }

    section {
      h3 { margin-top: 0; }
      h4 { margin-top: var(--space-5); }
    }
  }

  // ─── Footer fijo ────────────────────────
  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--ds-surface-dark);
    background: var(--ds-white);

    @include mobile-only {
      padding: var(--space-3) var(--space-4)
               calc(var(--space-3) + var(--ds-safe-bottom));

      flex-direction: row;
      .p-button { flex: 1; }
    }
  }
}
```

### Reglas

- **Cuándo usarlo:** procesos secuenciales con 3+ pasos donde la respuesta a un paso puede afectar las opciones del siguiente.
- **Cuándo NO usarlo:** formularios de 2-3 campos sin dependencia entre sí — usar dialog único.
- Para reservar turno, **siempre** usar este wizard de 4 pasos: `Tipo de análisis → Sede → Fecha y hora → Confirmar`. No alterar el orden.
- En desktop puede embeberse en un `p-dialog` ancho (≥720px). En mobile va full-screen vía `ui-dialog-fullscreen-mobile` o como ruta propia.
- Validar SIEMPRE solo el FormGroup del paso actual antes de avanzar — nunca todo el form.
- El paso de confirmación **no tiene controles editables**: muestra un resumen y permite volver para corregir.

---

## Bottom sheet (mobile)

**Solo mobile.** Para acciones secundarias que no entran en el bottom-nav. No usar para navegación primaria ni para formularios — esos van en el bottom-nav y en `p-dialog` respectivamente.

Ubicación: `src/app/shared/ui/overlays/bottom-sheet/`

### Cuándo usarlo

- Menú de "Más" del bottom-nav: opciones de navegación secundaria (Perfil, Familia, Cerrar sesión).
- Acciones contextuales sobre un item (editar, eliminar, compartir) cuando son 2-4 opciones y no justifican un dialog.
- Nunca en desktop/tablet: el componente tiene `display: none` en `@include desktop-up`.

### API

```typescript
export interface BottomSheetItem {
  id: string;
  icon: string;           // PrimeIcons sin 'pi ': 'pi-user', 'pi-sign-out'
  label: string;
  route?: any[];          // si está presente, navega al hacer click
  action?: () => void;    // si está presente, ejecuta la función
  destructive?: boolean;  // estilo danger (texto e ícono en --ds-danger)
}

// Inputs
@Input() visible = false;
@Input() title?: string;                          // label muted uppercase arriba de la lista
@Input({ required: true }) items!: BottomSheetItem[];

// Outputs
@Output() visibleChange = new EventEmitter<boolean>();   // two-way binding
@Output() itemClick     = new EventEmitter<BottomSheetItem>();
```

### Uso

```html
<ui-bottom-sheet
  [visible]="sheetOpen()"
  (visibleChange)="sheetOpen.set($event)"
  title="Más"
  [items]="sheetItems"
  (itemClick)="onItemClick($event)" />
```

```typescript
sheetOpen  = signal(false);
sheetItems: BottomSheetItem[] = [
  { id: 'perfil',  icon: 'pi-user',     label: 'Mi perfil',    route: ['/perfil'] },
  { id: 'familia', icon: 'pi-users',    label: 'Mi familia',   route: ['/familia'] },
  { id: 'logout',  icon: 'pi-sign-out', label: 'Cerrar sesión',
    action: () => this.logout(), destructive: true },
];
```

### Comportamiento interno

- Usa `p-drawer position="bottom"` con `pTemplate="headless"` para control total del contenido.
- El drawer maneja: animación slide-up (~250ms), backdrop, ESC key y focus-trap.
- Al hacer click en un item: navega (si tiene `route`) o ejecuta `action()`, emite `itemClick` y cierra el sheet via `visibleChange`.
- El backdrop nativo del drawer cierra el sheet sin pasar por `onItemClick`.

### Estructura visual

```
┌─────────────────────────────────┐
│            ─────                │  ← handle (40×4px, --ds-surface-dark)
│  MÁS                            │  ← título (uppercase, muted) — opcional
│  ─────────────────────────      │
│  [ícono]  Mi perfil       ›    │  ← item con route: muestra chevron
│  [ícono]  Mi familia      ›    │
│  ─────────────────────────      │
│  [ícono]  Cerrar sesión        │  ← item destructive: rojo, sin chevron
└─────────────────────────────────┘
   padding-bottom: safe-area-inset-bottom
```

### CSS overrides

Los estilos del container del drawer van en `primeng-overrides.scss` (no en el SCSS del componente) porque `p-drawer` se renderiza como portal al `<body>`:

```scss
.ui-bottom-sheet-drawer {
  height: auto !important;
  border-radius: var(--ds-radius-lg) var(--ds-radius-lg) 0 0 !important;
  padding: 0 !important;
  overflow: hidden;

  .p-drawer-content { padding: 0; }
}
```
