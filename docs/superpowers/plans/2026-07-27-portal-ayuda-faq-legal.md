# Centro de ayuda (FAQ) + accesos a Términos y Condiciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar al portal del paciente una pantalla `/ayuda` con 12 preguntas frecuentes en acordeón (accesible logueado y deslogueado), y hacer alcanzable la página de Términos y Condiciones que hoy solo se llega desde el checkbox del registro.

**Architecture:** Todo el contenido es estático en el bundle — cero llamadas al backend, cero store NgRx. `ayuda.content.ts` guarda los datos (4 categorías × 3 preguntas, texto plano); `AyudaComponent` solo filtra categorías según sesión y arma el chrome (topbar pública vs. header del shell). La misma URL `/ayuda` sirve las dos experiencias vía una `CanMatchFn` que declina el match cuando hay sesión, dejando que el router caiga en la ruta hija del shell.

**Tech Stack:** Angular 21 standalone + signals, PrimeNG 21 (`p-accordion`), SCSS con tokens del DS, vitest.

**Spec:** `docs/superpowers/specs/2026-07-27-portal-ayuda-faq-legal-design.md`

## Global Constraints

- **Repo:** solo `FRONTEND-PORTAL`. Rama `feat/portal-ayuda-faq` (ya creada, con la spec commitada). Cero cambios en `Backend` y `FRONTEND-LABORATORIO`.
- **Sin backend:** ninguna tarea agrega HTTP, service, action, effect, reducer ni selector. La regla NgRx de `CLAUDE.md` no aplica porque no hay dato remoto.
- **Respuestas en texto plano:** ninguna `answer` puede contener HTML. Prohibido `DomSanitizer`, `bypassSecurityTrustHtml` e `[innerHTML]`. Se renderiza con interpolación `{{ }}`.
- **Sin hex hardcodeados en SCSS:** solo `var(--brand-*)`, `var(--ds-*)`, `var(--space-*)`. Rompe el white-label multi-tenant.
- **Sin íconos decorativos:** nada de `pi-*` en títulos de categoría ni en las preguntas. El único ícono nuevo es `pi-question-circle` del ítem de navegación, que es funcional.
- **Runner de tests:** `npm test` → `vitest run`. `vitest.config.ts` **no tiene plugin de Angular**: los componentes con `templateUrl` NO compilan en test. Los specs testean **la clase**, instanciándola con `runInInjectionContext(injector, () => new XComponent())` y asertando sobre signals/computed. Prohibido `TestBed.createComponent` y `fixture.detectChanges()`. Patrón de referencia: `src/app/features/legal/terminos-y-condiciones/terminos-y-condiciones.component.spec.ts`.
- **Español rioplatense** en todo el texto de UI (vos, tocá, ingresá), consistente con el resto del portal.
- **Commits:** uno por tarea, mensaje en español, sin `Co-Authored-By` (lo agrega quien cierre la rama).

---

### Task 1: Contenido del FAQ

**Files:**
- Create: `src/app/features/ayuda/ayuda.content.ts`
- Test: `src/app/features/ayuda/ayuda.content.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `FaqItem { question: string; answer: string }`, `FaqCategory { id: FaqCategoryId; title: string; publicVisible: boolean; items: FaqItem[] }`, `type FaqCategoryId = 'cuenta' | 'turnos' | 'estudios' | 'familia'`, y la constante `FAQ_CATEGORIES: FaqCategory[]`. La Task 2 importa `FAQ_CATEGORIES` y `FaqCategory`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/features/ayuda/ayuda.content.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FAQ_CATEGORIES } from './ayuda.content';

describe('FAQ_CATEGORIES', () => {
  it('tiene 4 categorías con 3 preguntas cada una', () => {
    expect(FAQ_CATEGORIES).toHaveLength(4);
    for (const cat of FAQ_CATEGORIES) {
      expect(cat.items).toHaveLength(3);
    }
  });

  it('expone solo la categoría de cuenta al usuario deslogueado', () => {
    const publicas = FAQ_CATEGORIES.filter(c => c.publicVisible);
    expect(publicas.map(c => c.id)).toEqual(['cuenta']);
  });

  it('usa ids únicos', () => {
    const ids = FAQ_CATEGORIES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // El repo de referencia (2025-P4-FE/patient-portal) guardaba las respuestas con
  // <b style="..."> y las inyectaba con bypassSecurityTrustHtml + [innerHTML].
  // Acá se renderizan con interpolación: si vuelve el HTML, el texto se vería crudo.
  it('guarda las respuestas como texto plano, sin HTML', () => {
    for (const cat of FAQ_CATEGORIES) {
      for (const item of cat.items) {
        expect(item.answer).not.toMatch(/[<>]/);
        expect(item.question).not.toMatch(/[<>]/);
      }
    }
  });

  it('cierra cada pregunta con signo de interrogación o punto', () => {
    for (const cat of FAQ_CATEGORIES) {
      for (const item of cat.items) {
        expect(item.question.trim()).toMatch(/[?.]$/);
        expect(item.answer.trim().length).toBeGreaterThan(40);
      }
    }
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- ayuda.content`
Expected: FAIL — `Failed to resolve import "./ayuda.content"`.

- [ ] **Step 3: Escribir el contenido**

Crear `src/app/features/ayuda/ayuda.content.ts`:

```ts
// Contenido del centro de ayuda del portal del paciente.
//
// FUENTE A SINCRONIZAR: Backend/src/main/resources/rag/portal.md — es la base de
// conocimiento del asistente de ayuda (KAN-173) y describe los mismos flujos, pero
// escrita para el staff del laboratorio ("cómo el paciente hace X"). Acá la voz está
// invertida a segunda persona, dirigida al paciente.
//
// Si cambia un flujo del portal (nombres de botones, estados, cantidad de pasos),
// hay que actualizar los dos lados.
//
// Las respuestas son TEXTO PLANO a propósito: se renderizan con interpolación, no
// con [innerHTML]. No agregar HTML acá.

export type FaqCategoryId = 'cuenta' | 'turnos' | 'estudios' | 'familia';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: FaqCategoryId;
  title: string;
  /** Visible sin iniciar sesión. Solo 'cuenta': el resto describe pantallas
   *  a las que el usuario deslogueado no puede llegar. */
  publicVisible: boolean;
  items: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'cuenta',
    title: 'Cuenta y acceso',
    publicVisible: true,
    items: [
      {
        question: '¿Cómo entro al portal?',
        answer:
          'Ingresás con tu DNI (7 u 8 dígitos, sin puntos) y tu contraseña. Si todavía no ' +
          'tenés cuenta, tocá "Crear cuenta" en la pantalla de inicio de sesión y completá ' +
          'nombre, apellido, DNI, email y una contraseña de al menos 8 caracteres, con una ' +
          'mayúscula y un número.',
      },
      {
        question: 'Olvidé mi contraseña, ¿cómo la recupero?',
        answer:
          'En el inicio de sesión tocá "¿Olvidaste tu contraseña?", ingresá el email de tu ' +
          'cuenta y tocá "Enviar enlace". Te llega un mail con un enlace para elegir una ' +
          'contraseña nueva; si no lo ves, revisá la carpeta de spam. El enlace vence: si te ' +
          'avisa que es inválido o venció, pedí uno nuevo desde la misma pantalla.',
      },
      {
        question: 'El laboratorio me mandó un código por email, ¿qué hago con eso?',
        answer:
          'Es un código de primer acceso: significa que el laboratorio ya cargó tus datos y ' +
          'solo falta que elijas tu contraseña. Entrá a la pantalla de primer acceso, ingresá ' +
          'el código, escribí tu contraseña nueva (mínimo 8 caracteres), repetila y tocá ' +
          '"Crear contraseña".',
      },
    ],
  },
  {
    id: 'turnos',
    title: 'Turnos',
    publicVisible: false,
    items: [
      {
        question: '¿Cómo saco un turno?',
        answer:
          'Tocá "Sacar turno" y seguí los pasos: para quién es el turno, qué análisis ' +
          'necesitás, en qué sede, y qué día y horario. Al final ves un resumen y confirmás. ' +
          'Tené en cuenta que la fecha más cercana que podés reservar es de 2 días en adelante.',
      },
      {
        question: '¿Puedo cambiar o cancelar un turno que ya saqué?',
        answer:
          'Sí. Entrá a "Turnos", tocá el turno para abrir su detalle y ahí tenés "Reprogramar" ' +
          '(elegís nueva fecha y horario) o "Cancelar turno". La nueva fecha también tiene que ' +
          'ser de 2 días en adelante.',
      },
      {
        question: '¿Cómo sé si tengo que ir en ayunas?',
        answer:
          'La preparación aparece dos veces: en el resumen antes de confirmar el turno, y en ' +
          'el detalle del turno una vez sacado. Ahí te indica si requiere ayuno y con cuántos ' +
          'minutos de anticipación conviene que llegues.',
      },
    ],
  },
  {
    id: 'estudios',
    title: 'Estudios y resultados',
    publicVisible: false,
    items: [
      {
        question: '¿Cuándo puedo ver mis resultados?',
        answer:
          'En "Estudios" cada estudio muestra su estado: Disponible si ya podés verlo, o En ' +
          'proceso si el laboratorio todavía lo está trabajando. Los resultados que no abriste ' +
          'aparecen marcados como NUEVO.',
      },
      {
        question: '¿Cómo descargo el informe en PDF?',
        answer:
          'En "Estudios", en el estudio que diga Disponible, tocá el botón de descarga: el ' +
          'informe se abre en una pestaña nueva y desde ahí lo guardás o lo imprimís. Si el ' +
          'estudio todavía está en proceso, la descarga no está habilitada.',
      },
      {
        question: 'No encuentro un estudio en la lista.',
        answer:
          'Por defecto la lista muestra el último mes. Si el estudio es más viejo, ampliá el ' +
          'rango de fechas en los filtros. Y si gestionás a más de una persona, revisá que el ' +
          'filtro de paciente esté en la persona correcta.',
      },
    ],
  },
  {
    id: 'familia',
    title: 'Mi familia',
    publicVisible: false,
    items: [
      {
        question: '¿Puedo sacar turnos para mi hijo/a u otro familiar?',
        answer:
          'Sí, siempre que la persona esté en tu grupo familiar. Una vez agregada, cuando ' +
          'saques un turno el primer paso te deja elegir para quién es.',
      },
      {
        question: '¿Cómo agrego a alguien a mi grupo familiar?',
        answer:
          'Entrá a "Mi familia" y tocá "Agregar familiar" (en el celular, el botón +). ' +
          'Completá nombre, apellido, DNI y parentesco; la fecha de nacimiento y el género son ' +
          'opcionales. Queda cargado como pendiente de verificación hasta que el laboratorio ' +
          'lo confirme.',
      },
      {
        question: 'Gestiono los turnos de otras personas, pero yo no soy paciente. ¿Puedo atenderme?',
        answer:
          'Sí. Entrá a "Mi perfil": si tu cuenta administra a otras personas pero vos todavía ' +
          'no sos paciente, aparece el botón "Darme de alta como paciente". Al tocarlo quedás ' +
          'registrado y podés sacar tus propios turnos y ver tus estudios.',
      },
    ],
  },
];
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- ayuda.content`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/ayuda/ayuda.content.ts src/app/features/ayuda/ayuda.content.spec.ts
git commit -m "Contenido del centro de ayuda: 12 preguntas frecuentes del portal"
```

---

### Task 2: AyudaComponent

**Files:**
- Create: `src/app/features/ayuda/ayuda.component.ts`
- Create: `src/app/features/ayuda/ayuda.component.html`
- Create: `src/app/features/ayuda/ayuda.component.scss`
- Test: `src/app/features/ayuda/ayuda.component.spec.ts`

**Interfaces:**
- Consumes: `FAQ_CATEGORIES`, `FaqCategory` de `./ayuda.content` (Task 1); `AuthService.isAuthenticated` (signal `computed<boolean>`, ya existe en `core/auth/auth.service.ts`); `TenantService.config` (signal `TenantConfig | null`); `PublicTopbarComponent` (selector `app-public-topbar`, en `features/auth/ui/public-topbar/`); `PageHeaderComponent` (selector `ui-page-header`, inputs `title` requerido y `subtitle` opcional, en `shared/ui/layout/page-header/`).
- Produces: `AyudaComponent` con `readonly categories: Signal<FaqCategory[]>`, `readonly isAuthenticated: Signal<boolean>`, `readonly contact: Signal<{ helpPhone?: string; helpEmail?: string }>`. La Task 3 lo carga por ruta.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/features/ayuda/ayuda.component.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { AyudaComponent } from './ayuda.component';
import { AuthService } from '../../core/auth/auth.service';
import { TenantService } from '../../core/tenant/tenant.service';

function build(opts: { logueado: boolean; tenantConfig?: unknown }) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { isAuthenticated: signal(opts.logueado) } },
      { provide: TenantService, useValue: { config: signal(opts.tenantConfig ?? null) } },
    ],
  });
  const injector = TestBed.inject(Injector);
  return runInInjectionContext(injector, () => new AyudaComponent());
}

describe('AyudaComponent', () => {
  it('deslogueado muestra solo Cuenta y acceso', () => {
    const cmp = build({ logueado: false });
    expect(cmp.categories().map(c => c.id)).toEqual(['cuenta']);
    expect(cmp.categories()[0].items).toHaveLength(3);
  });

  it('logueado muestra las 4 categorías y las 12 preguntas', () => {
    const cmp = build({ logueado: true });
    expect(cmp.categories()).toHaveLength(4);
    const total = cmp.categories().reduce((n, c) => n + c.items.length, 0);
    expect(total).toBe(12);
  });

  it('expone el contacto del tenant cuando está configurado', () => {
    const cmp = build({
      logueado: true,
      tenantConfig: {
        id: 'lab-demo', shortName: 'LD', fullName: 'Laboratorio Demo',
        contact: { helpPhone: '381 000 0000', helpEmail: 'contacto@labdemo.test' },
      },
    });
    expect(cmp.contact().helpPhone).toBe('381 000 0000');
    expect(cmp.contact().helpEmail).toBe('contacto@labdemo.test');
  });

  it('no rompe si el tenant todavía no cargó', () => {
    const cmp = build({ logueado: false, tenantConfig: null });
    expect(cmp.contact().helpPhone).toBeUndefined();
    expect(cmp.contact().helpEmail).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- ayuda.component`
Expected: FAIL — `Failed to resolve import "./ayuda.component"`.

- [ ] **Step 3: Escribir el componente**

Crear `src/app/features/ayuda/ayuda.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionPanel,
} from 'primeng/accordion';
import { PublicTopbarComponent } from '../auth/ui/public-topbar/public-topbar.component';
import { PageHeaderComponent } from '../../shared/ui/layout/page-header/page-header.component';
import { AuthService } from '../../core/auth/auth.service';
import { TenantService } from '../../core/tenant/tenant.service';
import { TenantConfig } from '../../core/tenant/tenant-config.model';
import { FAQ_CATEGORIES } from './ayuda.content';

@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [
    RouterLink,
    Accordion,
    AccordionPanel,
    AccordionHeader,
    AccordionContent,
    PublicTopbarComponent,
    PageHeaderComponent,
  ],
  templateUrl: './ayuda.component.html',
  styleUrl: './ayuda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaComponent {
  private readonly auth = inject(AuthService);
  private readonly tenant = inject(TenantService);

  readonly isAuthenticated = this.auth.isAuthenticated;

  // Deslogueado: solo las preguntas de cuenta y acceso. Las de turnos, estudios y
  // familia describen pantallas a las que todavía no puede llegar.
  readonly categories = computed(() =>
    this.isAuthenticated()
      ? FAQ_CATEGORIES
      : FAQ_CATEGORIES.filter(c => c.publicVisible),
  );

  // Tipado explícito: sin él, TS infiere la unión con `{}` y el template no puede
  // leer .helpPhone. Todos los campos de TenantConfig['contact'] son opcionales,
  // así que `{}` es asignable.
  readonly contact = computed<TenantConfig['contact']>(
    () => this.tenant.config()?.contact ?? {},
  );
}
```

Crear `src/app/features/ayuda/ayuda.component.html`:

```html
@if (!isAuthenticated()) {
  <app-public-topbar />
}

<div class="ayuda-page" [class.ayuda-page--publica]="!isAuthenticated()">
  <div class="ayuda-page__content">

    @if (isAuthenticated()) {
      <ui-page-header
        title="Ayuda"
        subtitle="Preguntas frecuentes sobre el portal." />
    } @else {
      <a routerLink="/login" class="ui-text-primary ui-touch-link ayuda-page__back">
        <i class="pi pi-arrow-left" aria-hidden="true"></i>
        Volver
      </a>
      <header class="ayuda-page__header">
        <h1>Ayuda</h1>
        <p class="ui-text-muted">Preguntas frecuentes sobre el portal.</p>
      </header>
    }

    @for (categoria of categories(); track categoria.id) {
      <section class="ayuda-page__categoria">
        <h2>{{ categoria.title }}</h2>

        <!-- Un acordeón por categoría: abrir una pregunta de Turnos no cierra
             las de Estudios. Sin [value] inicial → todas arrancan cerradas. -->
        <p-accordion>
          @for (item of categoria.items; track item.question) {
            <p-accordion-panel [value]="$index">
              <p-accordion-header>{{ item.question }}</p-accordion-header>
              <p-accordion-content>
                <p class="ayuda-page__respuesta">{{ item.answer }}</p>
              </p-accordion-content>
            </p-accordion-panel>
          }
        </p-accordion>
      </section>
    }

    <footer class="ayuda-page__footer">
      <h2>¿No encontraste lo que buscabas?</h2>

      @if (contact().helpPhone || contact().helpEmail) {
        <p class="ui-text-muted">
          Escribinos o llamanos y te ayudamos.
        </p>
        <ul class="ayuda-page__contacto">
          @if (contact().helpPhone) {
            <li>
              <span class="ui-text-muted">Teléfono</span>
              <a [href]="'tel:' + contact().helpPhone" class="ui-text-primary ui-touch-link">
                {{ contact().helpPhone }}
              </a>
            </li>
          }
          @if (contact().helpEmail) {
            <li>
              <span class="ui-text-muted">Email</span>
              <a [href]="'mailto:' + contact().helpEmail" class="ui-text-primary ui-touch-link">
                {{ contact().helpEmail }}
              </a>
            </li>
          }
        </ul>
      } @else {
        <p class="ui-text-muted">
          Comunicate con el laboratorio y te ayudamos.
        </p>
      }

      <a routerLink="/terminos-y-condiciones"
         class="ui-text-primary ui-touch-link ayuda-page__legal">
        Términos y condiciones
      </a>
    </footer>

  </div>
</div>
```

Crear `src/app/features/ayuda/ayuda.component.scss`:

```scss
.ayuda-page__content {
  max-width: 720px;
  margin: 0 auto;
}

// Deslogueado la pantalla se dibuja sola (sin shell): necesita fondo y padding
// propios, igual que la página de términos y condiciones.
.ayuda-page--publica {
  min-height: 100vh;
  background: var(--ds-bg);

  .ayuda-page__content {
    padding: var(--space-6) var(--space-4) var(--space-12);
  }
}

.ayuda-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
}

.ayuda-page__header {
  margin-bottom: var(--space-6);

  h1 {
    font-size: 1.5rem;
    margin-bottom: var(--space-2);
  }
}

.ayuda-page__categoria {
  margin-bottom: var(--space-8);

  h2 {
    font-size: 1.125rem;
    margin-bottom: var(--space-3);
  }
}

.ayuda-page__respuesta {
  color: var(--ds-text);
  line-height: 1.6;
  margin: 0;
}

.ayuda-page__footer {
  border-top: 1px solid var(--ds-surface);
  padding-top: var(--space-6);

  h2 {
    font-size: 1rem;
    margin-bottom: var(--space-2);
  }
}

.ayuda-page__contacto {
  list-style: none;
  padding: 0;
  margin: var(--space-3) 0 0;

  li {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--ds-touch-target);
  }
}

.ayuda-page__legal {
  display: inline-flex;
  align-items: center;
  min-height: var(--ds-touch-target);
  margin-top: var(--space-4);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- ayuda.component`
Expected: PASS — 4 tests.

- [ ] **Step 5: Verificar que compila**

Run: `npm run build`
Expected: build exitoso. Si `p-accordion` / `p-accordion-panel` no resuelven, revisar los nombres exportados por `primeng/accordion` en la versión instalada (`node_modules/primeng/fesm2022/primeng-accordion.mjs`) y ajustar los imports — **no** volver a la API vieja con `[(activeIndex)]`, que ya no existe.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/ayuda/
git commit -m "Pantalla de ayuda: acordeon de preguntas frecuentes por categoria"
```

---

### Task 3: Ruta `/ayuda` pública y dentro del shell

**Files:**
- Create: `src/app/core/auth/public-only.match.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/core/auth/public-only.match.spec.ts`

**Interfaces:**
- Consumes: `AuthService.isAuthenticated` (signal); `AyudaComponent` (Task 2).
- Produces: `publicOnlyMatch: CanMatchFn`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/core/auth/public-only.match.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { publicOnlyMatch } from './public-only.match';
import { AuthService } from './auth.service';

function run(logueado: boolean): boolean {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: { isAuthenticated: signal(logueado) } }],
  });
  const injector = TestBed.inject(Injector);
  // CanMatchFn recibe (route, segments); acá no los usa, pero hay que pasarlos.
  return runInInjectionContext(
    injector,
    () => publicOnlyMatch({ path: 'ayuda' }, []),
  ) as boolean;
}

describe('publicOnlyMatch', () => {
  it('matchea la ruta pública cuando no hay sesión', () => {
    expect(run(false)).toBe(true);
  });

  // No redirige: devuelve false para que el router siga evaluando y el usuario
  // logueado caiga en la ruta hija del shell (misma URL, con navegación).
  it('declina el match cuando hay sesión', () => {
    expect(run(true)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- public-only`
Expected: FAIL — `Failed to resolve import "./public-only.match"`.

- [ ] **Step 3: Escribir el CanMatchFn**

Crear `src/app/core/auth/public-only.match.ts`:

```ts
import { CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Deja pasar una ruta solo cuando NO hay sesión.
 *
 * A diferencia de un guard de bloqueo, nunca redirige: devolver false hace que el
 * router siga evaluando las rutas siguientes. Así una misma URL (ej. /ayuda) puede
 * resolverse a la versión pública standalone o a la versión dentro del shell del
 * paciente, según haya sesión o no.
 *
 * Requiere que la ruta pública esté declarada ANTES de la ruta '' del shell.
 */
export const publicOnlyMatch: CanMatchFn = () => !inject(AuthService).isAuthenticated();
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- public-only`
Expected: PASS — 2 tests.

- [ ] **Step 5: Registrar las dos rutas**

En `src/app/app.routes.ts`, agregar el import arriba (después de `import { authGuard } ...`):

```ts
import { publicOnlyMatch } from './core/auth/public-only.match';
```

Insertar este bloque **justo después** del objeto de la ruta `terminos-y-condiciones` y **antes** de la ruta `dashboard`:

```ts
  {
    // /ayuda sirve dos experiencias con la misma URL. Esta entrada es la pública
    // (topbar + link Volver). Con sesión, publicOnlyMatch declina y el router cae
    // en la ruta hija 'ayuda' del shell, más abajo. El orden importa.
    path: 'ayuda',
    canMatch: [publicOnlyMatch],
    loadComponent: () =>
      import('./features/ayuda/ayuda.component').then(m => m.AyudaComponent),
  },
```

Y dentro de `children` de la ruta `''` (la del shell), después de la entrada de `estudios`:

```ts
      {
        path: 'ayuda',
        loadComponent: () =>
          import('./features/ayuda/ayuda.component').then(m => m.AyudaComponent),
      },
```

- [ ] **Step 6: Verificar que compila y que la suite sigue verde**

Run: `npm run build && npm test`
Expected: build exitoso, todos los tests en PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/core/auth/public-only.match.ts src/app/core/auth/public-only.match.spec.ts src/app/app.routes.ts
git commit -m "Ruta /ayuda: publica sin sesion, dentro del shell con sesion"
```

---

### Task 4: Entradas de navegación en el portal logueado

**Files:**
- Modify: `src/app/shared/ui/shell/patient-shell/patient-shell.component.ts:107-131`

**Interfaces:**
- Consumes: `NavItem { id, icon, label, route, badge?, exactMatch? }` de `shared/ui/types.ts`; `BottomSheetItem { id, icon, label, route?, action?, destructive? }` de `shared/ui/overlays/bottom-sheet/bottom-sheet.component.ts`. En los dos, `icon` es la clase PrimeIcons **sin** el prefijo `pi ` (ej. `'pi-users'`).
- Produces: nada que consuman otras tareas.

Este cambio es de configuración pura (dos entradas en arrays literales) y no tiene comportamiento testeable con el runner de este repo — se verifica en el build y en el smoke de la Task 6.

- [ ] **Step 1: Agregar "Ayuda" al sidebar**

En `patient-shell.component.ts`, en `navGroups`, dentro del grupo `'Cuenta'`, después del ítem `familia`:

```ts
        { id: 'ayuda',   icon: 'pi-question-circle', label: 'Ayuda',      route: '/ayuda'   },
```

El grupo queda así:

```ts
    {
      label: 'Cuenta',
      items: [
        { id: 'perfil',  icon: 'pi-user',  label: 'Mi perfil',  route: '/perfil'  },
        { id: 'familia', icon: 'pi-users', label: 'Mi familia', route: '/familia' },
        { id: 'ayuda',   icon: 'pi-question-circle', label: 'Ayuda', route: '/ayuda' },
      ],
    },
```

- [ ] **Step 2: Agregar "Ayuda" al bottom sheet "Más"**

En `moreSheetItems`, entre `familia` y `logout`:

```ts
    { id: 'ayuda',   icon: 'pi-question-circle', label: 'Ayuda', route: ['/ayuda'] },
```

El array queda así:

```ts
  moreSheetItems: BottomSheetItem[] = [
    { id: 'perfil',  icon: 'pi-user',     label: 'Mi perfil',      route: ['/perfil']  },
    { id: 'familia', icon: 'pi-users',    label: 'Mi familia',     route: ['/familia'] },
    { id: 'ayuda',   icon: 'pi-question-circle', label: 'Ayuda',   route: ['/ayuda']   },
    { id: 'logout',  icon: 'pi-sign-out', label: 'Cerrar sesión',
      action: () => this.logout(), destructive: true },
  ];
```

**No tocar el bottom-nav** (`mainNavItems` sigue devolviendo `navGroups[0].items`): Ayuda no compite con Inicio / Estudios / Turnos.

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/ui/shell/patient-shell/patient-shell.component.ts
git commit -m "Acceso a Ayuda desde el sidebar y el menu Mas del portal"
```

---

### Task 5: Footer público con Ayuda y Términos y condiciones

**Files:**
- Create: `src/app/shared/ui/layout/public-footer/public-footer.component.ts`
- Create: `src/app/shared/ui/layout/public-footer/public-footer.component.html`
- Create: `src/app/shared/ui/layout/public-footer/public-footer.component.scss`
- Modify: `src/app/features/auth/login/login.component.ts` (imports del `@Component`)
- Modify: `src/app/features/auth/login/login.component.html` (final de la card)
- Modify: `src/app/features/auth/register/register.component.ts` (imports del `@Component`)
- Modify: `src/app/features/auth/register/register.component.html` (final de la card)

**Interfaces:**
- Consumes: `RouterLink`.
- Produces: `PublicFooterComponent`, selector `ui-public-footer`, sin inputs.

Componente de solo template (dos `routerLink` estáticos, sin lógica). No lleva spec: el runner no renderiza templates, así que un spec no verificaría nada. Queda cubierto por el smoke de la Task 6.

- [ ] **Step 1: Crear el componente**

`src/app/shared/ui/layout/public-footer/public-footer.component.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Pie de las pantallas públicas (login, registro). Da acceso al centro de ayuda y
 * a los términos y condiciones, que de otro modo solo se alcanzan desde el
 * checkbox del formulario de registro.
 */
@Component({
  selector: 'ui-public-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-footer.component.html',
  styleUrl: './public-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicFooterComponent {}
```

`src/app/shared/ui/layout/public-footer/public-footer.component.html`:

```html
<nav class="ui-public-footer" aria-label="Enlaces de ayuda">
  <a routerLink="/ayuda" class="ui-text-primary ui-touch-link">Ayuda</a>
  <span class="ui-public-footer__sep" aria-hidden="true">·</span>
  <a routerLink="/terminos-y-condiciones" class="ui-text-primary ui-touch-link">
    Términos y condiciones
  </a>
</nav>
```

`src/app/shared/ui/layout/public-footer/public-footer.component.scss`:

```scss
.ui-public-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);

  a {
    display: inline-flex;
    align-items: center;
    min-height: var(--ds-touch-target);
    font-size: 0.875rem;
  }
}

.ui-public-footer__sep {
  color: var(--ds-text-muted);
}
```

- [ ] **Step 2: Sumarlo al login**

En `login.component.ts`, agregar el import:

```ts
import { PublicFooterComponent } from '../../../shared/ui/layout/public-footer/public-footer.component';
```

y `PublicFooterComponent` al array `imports` del `@Component`, después de `PublicTopbarComponent`.

En `login.component.html`, insertar **después** del bloque `@if (tenant.config()?.contact?.helpPhone) { ... }` (el footer con el teléfono) y **antes** del `</div>` que cierra `.ui-auth-card`:

```html
      <ui-public-footer />
```

- [ ] **Step 3: Sumarlo al registro**

En `register.component.ts`, agregar el mismo import y `PublicFooterComponent` al array `imports`.

En `register.component.html`, insertar en la misma posición (después del bloque del teléfono, antes del cierre de la card):

```html
      <ui-public-footer />
```

**No tocar** el link a términos que está dentro del `<label for="aceptaTerminos">`: se conserva tal cual, con su `target="_blank"`.

- [ ] **Step 4: Verificar que compila y que la suite sigue verde**

Run: `npm run build && npm test`
Expected: build exitoso, todos los tests en PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/layout/public-footer/ src/app/features/auth/login/ src/app/features/auth/register/
git commit -m "Footer publico con acceso a Ayuda y Terminos y condiciones"
```

---

### Task 6: "Volver" de Términos y Condiciones según sesión + smoke

**Files:**
- Modify: `src/app/features/legal/terminos-y-condiciones/terminos-y-condiciones.component.ts`
- Modify: `src/app/features/legal/terminos-y-condiciones/terminos-y-condiciones.component.html:5`
- Test: `src/app/features/legal/terminos-y-condiciones/terminos-y-condiciones.component.spec.ts` (extender)

**Interfaces:**
- Consumes: `AuthService.isAuthenticated`; `TenantService.config` (ya usado por el componente).
- Produces: `TerminosYCondicionesComponent.backRoute: Signal<string>`.

El problema: el "Volver" apunta fijo a `/login`. Con la Task 2, un paciente logueado llega a T&C desde el pie del FAQ; al tocar "Volver" lo saca a la pantalla de login estando logueado (`/login` es pública, el `authGuard` no lo frena). Se resuelve con un computed en la clase — no con un `@if` en el template — para que sea testeable con este runner.

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `terminos-y-condiciones.component.spec.ts`, **dentro** del `describe` existente. Ojo: el helper `configure()` que ya está en el archivo solo provee `TenantService`; hay que extenderlo para proveer también `AuthService`.

Reemplazar el helper existente por:

```ts
  function configure(config: unknown, logueado = false) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: TenantService, useValue: { config: signal(config) } },
        { provide: AuthService, useValue: { isAuthenticated: signal(logueado) } },
      ],
    });
    injector = TestBed.inject(Injector);
  }
```

y agregar el import:

```ts
import { AuthService } from '../../../core/auth/auth.service';
```

Después, los dos tests nuevos:

```ts
  it('el "Volver" lleva al login cuando no hay sesión', () => {
    configure({ id: 'lab-demo', shortName: 'LD', fullName: 'Laboratorio Demo', contact: {} }, false);
    const cmp = runInInjectionContext(injector, () => new TerminosYCondicionesComponent());
    expect(cmp.backRoute()).toBe('/login');
  });

  it('el "Volver" lleva al inicio del portal cuando hay sesión', () => {
    configure({ id: 'lab-demo', shortName: 'LD', fullName: 'Laboratorio Demo', contact: {} }, true);
    const cmp = runInInjectionContext(injector, () => new TerminosYCondicionesComponent());
    expect(cmp.backRoute()).toBe('/');
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- terminos`
Expected: FAIL — `cmp.backRoute is not a function`. Los 3 tests que ya existían siguen en PASS.

- [ ] **Step 3: Agregar el computed**

En `terminos-y-condiciones.component.ts`, agregar el import:

```ts
import { AuthService } from '../../../core/auth/auth.service';
```

y dentro de la clase, después de `readonly tenant = inject(TenantService);`:

```ts
  private readonly auth = inject(AuthService);

  // A T&C se llega desde el registro (sin sesión) y desde el pie del centro de
  // ayuda (con sesión). Mandar siempre a /login sacaría del portal a quien ya entró.
  readonly backRoute = computed(() => (this.auth.isAuthenticated() ? '/' : '/login'));
```

- [ ] **Step 4: Usarlo en el template**

En `terminos-y-condiciones.component.html`, línea 5, cambiar:

```html
    <a routerLink="/login" class="ui-text-primary ui-touch-link terms-page__back">
```

por:

```html
    <a [routerLink]="backRoute()" class="ui-text-primary ui-touch-link terms-page__back">
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- terminos`
Expected: PASS — 5 tests (3 viejos + 2 nuevos).

- [ ] **Step 6: Suite completa y build de producción**

Run: `npm test && npm run build`
Expected: todos los tests en PASS, build exitoso.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/legal/terminos-y-condiciones/
git commit -m "Volver de terminos y condiciones respeta la sesion activa"
```

- [ ] **Step 8: Smoke manual**

Levantar backend (MySQL en **3307**, ver `docs/` del repo Backend) y el portal con `npm start`. Recorrer:

1. **Deslogueado** — en `/login`, el pie muestra "Ayuda · Términos y condiciones". Tocar Ayuda → `/ayuda` con topbar del tenant, link "Volver", **una sola** categoría (Cuenta y acceso) con 3 preguntas. Abrir una pregunta: se despliega la respuesta como texto legible (no HTML crudo). Tocar "Términos y condiciones" del pie → T&C; su "Volver" cae en `/login`.
2. **Logueado** (dni `30123456` / `password`) — sidebar → grupo Cuenta → "Ayuda". La pantalla se ve **dentro del shell**, con el sidebar visible y `ui-page-header`. Las **4** categorías, 12 preguntas.
3. **Mobile** (DevTools < 768px, logueado) — bottom-nav sigue con Inicio / Estudios / Turnos / Más; tocar "Más" → el sheet incluye "Ayuda" arriba de "Cerrar sesión". El acordeón se abre bien y los links del pie tienen área táctil cómoda.
4. **Vuelta a T&C con sesión** — desde `/ayuda` logueado, pie → Términos y condiciones → "Volver" cae en el **inicio del portal**, no en `/login`.
5. **Registro** — el checkbox de términos sigue abriendo T&C en pestaña nueva, y el pie del formulario muestra los dos links nuevos.

Anotar cualquier desajuste visual del `p-accordion` (colores de PrimeNG que no respeten los tokens del tenant) y corregirlo en `ayuda.component.scss` con `var(--brand-*)` / `var(--ds-*)`, sin hex.

- [ ] **Step 9: Commit de ajustes del smoke (si hubo)**

```bash
git add -A
git commit -m "Ajustes visuales del acordeon de ayuda tras el smoke"
```
