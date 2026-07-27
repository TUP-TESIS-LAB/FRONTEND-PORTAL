# Portal Paciente — Centro de ayuda (FAQ) + accesos a Términos y Condiciones — Design

> **Estado:** Design aprobado por el usuario (2026-07-27). Base para el plan `docs/superpowers/plans/2026-07-27-portal-ayuda-faq-legal.md`.
> **Repos:** solo `FRONTEND-PORTAL` (rama `development`). Cero cambios en `Backend` y en `FRONTEND-LABORATORIO`.
> **Origen:** el usuario pidió extraer la lógica del FAQ de `2025-P4-FE/patient-portal` (`src/app/feature/faq/`) y reimplantarla, en versión chica, en el portal externo del paciente de la tesis; y resolver "lo que queda" de Términos y Condiciones.

## 1. Objetivo

Dar al paciente un lugar donde resolver dudas sin llamar al laboratorio, y cerrar el hueco de que **Términos y Condiciones existe pero es inalcanzable** una vez que el paciente entró al portal.

Dos entregables independientes que comparten punto de entrada:

| Slice | Estado hoy | Qué se hace |
|---|---|---|
| **A — Centro de ayuda (`/ayuda`)** | No existe | Pantalla nueva: 12 preguntas frecuentes en acordeón, público + logueado |
| **B — Accesos a T&C** | Página completa y funcional, alcanzable solo desde el checkbox del registro | Links faltantes + arreglo del "Volver" hardcodeado |

## 2. No-objetivos (explícitos)

- **No** se reescribe el contenido legal de `terminos-y-condiciones.content.ts` (~18 KB ya migrados y tenant-izados). Decisión del usuario: "solo hacerlo alcanzable".
- **No** hay buscador en el FAQ. El del repo de referencia (`filterTopics()` + `SearchResult` + snippets de 120 chars) tiene sentido con ~40 preguntas; con 12 que entran en una pantalla es UI muerta.
- **No** hay navegación categoría → detalle (el `currentView: 'categories' | 'details'` del repo de referencia). Con 3 preguntas por categoría, ese segundo nivel es fricción pura.
- **No** hay toggle de dark mode (el repo de referencia lo trae escondido con `[ngStyle]="{'display':'none'}"` y manipulando `document.body` con `Renderer2` — código muerto, no se migra).
- **No** hay llamadas al backend. El contenido es estático en el bundle → **la regla NgRx de `CLAUDE.md` no aplica a este cambio** (no hay dato remoto que cargar).
- **No** se toca el chat RAG del laboratorio (KAN-173): eso vive en `FRONTEND-LABORATORIO` y es para el staff. Acá solo se reusa el **texto** de la base de conocimiento como fuente de contenido.
- **No** hay gateo por módulo del tenant. `TenantConfig` no expone flags de módulos (solo `id`, nombres, `logo`, `colors`, `contact`) — no hay forma de saber si el tenant tiene familia habilitada. Se muestran las 4 categorías siempre (al logueado).

## 3. Qué se extrae del repo de referencia y qué no

Lectura de `2025-P4-FE/patient-portal@develop`, `src/app/feature/faq/faq.component.{ts,html,css}` (~600 líneas de TS, casi todo data).

**Se extrae (la idea):**
- El **modelo de datos**: categorías (`HelpTopic`) + preguntas por categoría (`FaqItem { question, answer }`), separados de la lógica de vista.
- El **acordeón de una pregunta abierta por vez** (`p-accordion [multiple]="false"`).
- El **tono y la forma de las respuestas**: segunda persona, pasos concretos, nombres textuales de los botones de la app.

**No se extrae:**
- `DomSanitizer.bypassSecurityTrustHtml()` sobre respuestas con `<b style="font-weight: bold;">` embebido. Es un vector de XSS innecesario (basta con que alguien meta contenido no controlado en `faqsData`) y las respuestas quedan ilegibles en el fuente. Acá las respuestas son **texto plano**; si una respuesta necesita énfasis, se parte en `{ type: 'paragraph' | 'steps' }` como ya hace `terminos-y-condiciones.content.ts`.
- El manejo de `activeIndex` para abrir una pregunta desde un resultado de búsqueda (no hay búsqueda).
- Los estilos con hex hardcodeados (`#008080`, `#2C2C2C`, `#1F1F1F`) — violan el white-label; acá todo sale de tokens `--brand-*` / `--ds-*`.

## 4. Contenido del FAQ

**Fuente:** `Backend/src/main/resources/rag/portal.md` (la base de conocimiento del asistente de ayuda, KAN-173). Ese archivo describe los flujos reales del portal, pero está escrito **para el staff** ("cómo el paciente hace X"). Acá se **invierte la voz a segunda persona**, dirigida al paciente.

4 categorías × 3 preguntas = **12**.

### 4.1 Cuenta y acceso (`cuenta`)

1. **¿Cómo entro al portal?**
   Ingresás con tu DNI (7 u 8 dígitos, sin puntos) y tu contraseña. Si todavía no tenés cuenta, tocá "Crear cuenta" en la pantalla de inicio de sesión y completá nombre, apellido, DNI, email y una contraseña de al menos 8 caracteres, con una mayúscula y un número.

2. **Olvidé mi contraseña, ¿cómo la recupero?**
   En el login tocá "¿Olvidaste tu contraseña?", ingresá el email de tu cuenta y tocá "Enviar enlace". Te llega un mail con un enlace para elegir una contraseña nueva — si no lo ves, revisá la carpeta de spam. El enlace vence: si te avisa que es inválido o venció, pedí uno nuevo desde la misma pantalla.

3. **El laboratorio me mandó un código por email, ¿qué hago con eso?**
   Es un código de primer acceso: significa que el laboratorio ya cargó tus datos y solo falta que elijas tu contraseña. Entrá a la pantalla de primer acceso, ingresá el código, escribí tu contraseña nueva (mínimo 8 caracteres), repetila y tocá "Crear contraseña".

### 4.2 Turnos (`turnos`)

4. **¿Cómo saco un turno?**
   Tocá "Sacar turno" y seguí los pasos: para quién es el turno, qué análisis necesitás, en qué sede, y qué día y horario. Al final ves un resumen y confirmás. Tené en cuenta que la fecha más cercana que podés reservar es de **2 días en adelante**.

5. **¿Puedo cambiar o cancelar un turno que ya saqué?**
   Sí. Entrá a "Turnos", tocá el turno para abrir su detalle y ahí tenés "Reprogramar" (elegís nueva fecha y horario) o "Cancelar turno". La nueva fecha también tiene que ser de 2 días en adelante.

6. **¿Cómo sé si tengo que ir en ayunas?**
   La preparación aparece dos veces: en el resumen antes de confirmar el turno, y en el detalle del turno una vez sacado. Ahí te indica si requiere ayuno y con cuántos minutos de anticipación conviene llegar.

### 4.3 Estudios y resultados (`estudios`)

7. **¿Cuándo puedo ver mis resultados?**
   En "Estudios" cada estudio muestra su estado: **Disponible** si ya podés verlo, o **En proceso** si el laboratorio todavía lo está trabajando. Los resultados nuevos aparecen marcados como NUEVO.

8. **¿Cómo descargo el informe en PDF?**
   En "Estudios", en el estudio que diga Disponible, tocá el botón de descarga: el informe se abre en una pestaña nueva y desde ahí lo guardás o lo imprimís. Si el estudio todavía está en proceso, la descarga no está habilitada.

9. **No encuentro un estudio en la lista.**
   Por defecto la lista muestra el último mes. Si el estudio es más viejo, ampliá el rango de fechas en los filtros. Y si gestionás a más de una persona, revisá que el filtro de paciente esté en la persona correcta.

### 4.4 Mi familia (`familia`)

10. **¿Puedo sacar turnos para mi hijo/a u otro familiar?**
    Sí, siempre que la persona esté en tu grupo familiar. Una vez agregada, cuando saques un turno el primer paso te deja elegir para quién es.

11. **¿Cómo agrego a alguien a mi grupo familiar?**
    Entrá a "Mi familia" y tocá "Agregar familiar" (en el celular, el botón +). Completá nombre, apellido, DNI y parentesco — la fecha de nacimiento y el género son opcionales. Queda cargado como **pendiente de verificación** hasta que el laboratorio lo confirme.

12. **Gestiono los turnos de otras personas, pero yo no soy paciente. ¿Puedo atenderme?**
    Sí. Entrá a "Mi perfil": si tu cuenta administra a otras personas pero vos todavía no sos paciente, aparece el botón "Darme de alta como paciente". Al tocarlo quedás registrado y podés sacar tus propios turnos y ver tus estudios.

### 4.5 Regla de mantenimiento

Las respuestas nombran botones y estados textuales de la app ("Sacar turno", "Disponible", "Darme de alta como paciente"). Si un flujo cambia, el FAQ queda desactualizado en silencio. Mitigación: el contenido vive en **un solo archivo** (`ayuda.content.ts`) con un comentario de cabecera que apunta a `Backend/src/main/resources/rag/portal.md` como fuente a sincronizar.

## 5. UX

### 5.1 Una sola pantalla

```
ui-page-header: "Ayuda"  ·  "Preguntas frecuentes sobre el portal."

  Cuenta y acceso
  ┌──────────────────────────────────────────┐
  │ ¿Cómo entro al portal?                 ⌄ │
  ├──────────────────────────────────────────┤
  │ Olvidé mi contraseña, ¿cómo la recupero?⌄│
  └──────────────────────────────────────────┘

  Turnos
  ┌──────────────────────────────────────────┐  ...

  ─────────────────────────────────────────────
  ¿No encontraste lo que buscabas?
  Llamanos al {helpPhone} · {helpEmail}
  Términos y condiciones
```

- Un `p-accordion [multiple]="false"` **por categoría** (no uno global): abrir una pregunta de Turnos no cierra nada de Estudios, y el título de categoría queda como encabezado de sección.
- **Sin íconos por categoría.** Solo texto y jerarquía tipográfica, consistente con la preferencia establecida del proyecto de no usar `pi-*` decorativos en labels. El único ícono nuevo es el del ítem de navegación (`pi-question-circle`), que es funcional.
- **Bloque de cierre**: contacto del tenant (`contact.helpPhone`, `contact.helpEmail`, renderizados solo si existen — igual que hace hoy el footer del login) + link a Términos y condiciones.

### 5.2 Pública y privada, misma ruta

`/ayuda` es una sola URL que sirve dos experiencias:

| | Deslogueado | Logueado |
|---|---|---|
| Chrome | `<app-public-topbar>` + link "Volver" a /login | Dentro del shell: sidebar (desktop) / bottom-nav (mobile) |
| Categorías visibles | Solo **Cuenta y acceso** | Las 4 |

Racional del recorte: quien no entró todavía necesita "cómo recupero mi contraseña"; las respuestas de Turnos/Estudios/Familia describen pantallas a las que no puede llegar.

**Implementación del doble alcance** (Angular 21, `canMatch`):

```ts
// app.routes.ts
{
  path: 'ayuda',
  canMatch: [publicOnlyMatch],          // ← devuelve !auth.isAuthenticated()
  loadComponent: () => import('./features/ayuda/ayuda.component')...
},
...
{
  path: '', canActivate: [authGuard], loadComponent: () => PatientShellComponent,
  children: [
    ...,
    { path: 'ayuda', loadComponent: () => import('./features/ayuda/ayuda.component')... },
  ],
}
```

`canMatch` que devuelve `false` hace que el router **siga evaluando** las rutas siguientes, así que el usuario logueado cae en la ruta hija del shell y conserva la navegación. Es el mecanismo idiomático de Angular para esto; no requiere URLs duplicadas ni redirects.

`publicOnlyMatch` es una `CanMatchFn` nueva en `core/auth/public-only.match.ts` (no un guard de bloqueo: nunca redirige, solo declina el match).

### 5.3 Puntos de entrada

| Superficie | Qué se agrega |
|---|---|
| Sidebar (desktop) | Ítem "Ayuda" (`pi-question-circle`, `/ayuda`) en el grupo **Cuenta**, después de "Mi familia" |
| Bottom sheet "Más" (mobile) | Ítem "Ayuda" antes de "Cerrar sesión" |
| Login y Registro | `<ui-public-footer>` nuevo: "Ayuda · Términos y condiciones" |
| Pie del FAQ | Link "Términos y condiciones" |

El bottom-nav (4 slots: Inicio, Estudios, Turnos, Más) **no se toca** — Ayuda no compite con las secciones principales.

T&C **no recibe ítem propio de navegación**: vive donde el paciente lo busca de verdad, que es la sección de ayuda y el pie de las pantallas públicas.

## 6. Arquitectura

### 6.1 Archivos nuevos

```
src/app/core/auth/
  public-only.match.ts                     ← CanMatchFn: !isAuthenticated()

src/app/features/ayuda/
  ayuda.content.ts                         ← FaqCategory[] (datos, sin lógica)
  ayuda.component.ts                       ← ~40 líneas: filtra categorías por auth
  ayuda.component.html
  ayuda.component.scss
  ayuda.component.spec.ts

src/app/shared/ui/layout/public-footer/
  public-footer.component.ts               ← ui-public-footer (2 links)
  public-footer.component.html
  public-footer.component.scss
```

### 6.2 Contrato de `ayuda.content.ts`

Espeja la forma de `terminos-y-condiciones.content.ts` (tipos + función builder), para que los dos contenidos estáticos del portal se lean igual:

```ts
export interface FaqItem { question: string; answer: string; }
export interface FaqCategory {
  id: 'cuenta' | 'turnos' | 'estudios' | 'familia';
  title: string;
  publicVisible: boolean;      // true solo en 'cuenta'
  items: FaqItem[];
}
export const FAQ_CATEGORIES: FaqCategory[] = [ ... ];
```

`answer` es **string plano** — sin HTML, sin sanitizer. Se renderiza con interpolación (`{{ item.answer }}`), no con `[innerHTML]`.

### 6.3 `AyudaComponent`

Componente standalone, `OnPush`, sin store (no hay dato remoto):

```ts
private readonly auth = inject(AuthService);
readonly tenant = inject(TenantService);
readonly isAuthenticated = this.auth.isAuthenticated;          // computed existente
readonly categories = computed(() =>
  this.isAuthenticated() ? FAQ_CATEGORIES : FAQ_CATEGORIES.filter(c => c.publicVisible));
```

El template alterna el chrome con `@if (isAuthenticated())` entre `ui-page-header` y `app-public-topbar` + "Volver".

### 6.4 Cambios en archivos existentes

| Archivo | Cambio |
|---|---|
| `app.routes.ts` | Ruta pública `ayuda` con `canMatch` + ruta hija `ayuda` en el shell |
| `patient-shell.component.ts` | Ítem "Ayuda" en `navGroups[1].items` y en `moreSheetItems` |
| `login.component.html` / `.ts` | `<ui-public-footer>` al final de la card |
| `register.component.html` / `.ts` | idem |
| `terminos-y-condiciones.component.{ts,html}` | "Volver" deja de apuntar siempre a `/login`: `/` si hay sesión, `/login` si no |

## 7. Slice B — Términos y Condiciones

Todo el trabajo de T&C es de **alcance**, no de contenido:

1. **Alcanzable desde el portal logueado** — vía el pie del FAQ (§5.3). No requiere tocar el guard: `/terminos-y-condiciones` ya es una ruta pública sin `authGuard`, así que sirve a los dos estados.
2. **Alcanzable desde las pantallas públicas** — vía `ui-public-footer` en login y registro (hoy el único acceso es el link dentro del label del checkbox de registro, que se conserva tal cual con su `target="_blank"`).
3. **Arreglo del "Volver"** — hoy `routerLink="/login"` fijo. Si un paciente logueado llega desde el FAQ y toca "Volver", lo saca a la pantalla de login estando logueado (el `authGuard` no lo frena porque `/login` es pública). Pasa a resolverse por estado de sesión.

## 8. Testing

Runner: **vitest** (`npm test` → `vitest run`). `vitest.config.ts` **no tiene plugin de Angular**, así que los componentes con `templateUrl` no compilan en test. La convención establecida del repo (ver `terminos-y-condiciones.component.spec.ts`) es **testear la clase, no el DOM**: se instancia el componente con `runInInjectionContext(injector, () => new XComponent())` y se asserta sobre sus signals/computed. Los specs nuevos siguen exactamente ese patrón — sin `TestBed.createComponent`, sin `fixture.detectChanges()`.

| Test | Qué verifica |
|---|---|
| `ayuda.component.spec.ts` — deslogueado | `cmp.categories()` devuelve 1 categoría (`cuenta`) con sus 3 preguntas |
| `ayuda.component.spec.ts` — logueado | `cmp.categories()` devuelve las 4 categorías y 12 preguntas en total |
| `ayuda.component.spec.ts` — contenido | Ninguna `answer` contiene `<` (garantiza texto plano: no vuelve el HTML del repo de referencia) |
| `ayuda.component.spec.ts` — tenant | No rompe con `config: null` (tenant sin cargar), igual que el spec de T&C |
| `terminos-y-condiciones.component.spec.ts` (existente) | Se extiende: `cmp.backRoute()` es `/` con sesión y `/login` sin sesión |

`public-footer.component.ts` no lleva spec: es un componente de solo template (dos `routerLink` estáticos, sin lógica) y el runner no renderiza templates — un spec ahí no verificaría nada. Queda cubierto por el smoke manual.

El destino del "Volver" de T&C se expone como un **computed `backRoute()`** en la clase (no como un `@if` en el template), justamente para que sea testeable con este runner.

Verificación manual (smoke) al cierre, con backend + portal levantados:
- Deslogueado: login → footer "Ayuda" → 1 categoría → footer "Términos y condiciones" → "Volver" cae en /login.
- Logueado (dni `30123456` / `password`): sidebar → Ayuda → 4 categorías con sidebar visible; mobile → Más → Ayuda; desde el FAQ → T&C → "Volver" cae en el inicio del portal, no en /login.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| El FAQ se desactualiza cuando cambia un flujo | Un solo archivo de contenido + puntero a `rag/portal.md` en la cabecera (§4.5) |
| `p-accordion` sin uso previo en el portal → estilos de PrimeNG v21 chocando con los tokens del DS | Se revisa visualmente en el smoke; overrides acotados al `.scss` del componente, con `--brand-*` / `--ds-*`, sin hex |
| `canMatch` mal ordenado deja la ruta pública ganando siempre | Test de routing implícito en el smoke (logueado en `/ayuda` debe ver el sidebar); el orden de rutas queda documentado en `app.routes.ts` con un comentario |

## 10. Orden de ejecución

Slice A (FAQ) primero — es el que tiene trabajo real y crea el punto de entrada del que cuelga T&C. Slice B (accesos a T&C) después, sobre el FAQ ya en pie.
