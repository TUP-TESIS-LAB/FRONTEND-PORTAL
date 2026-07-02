# Portal Paciente — Pase de UX mobile (dialogs, wizard, safe-areas, touch targets) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-166](https://exequielsantoro.atlassian.net/browse/KAN-166)
> **Origen:** Auditoría del 2026-07-01 (frente UX mobile, descartado de KAN-163). Estado re-verificado en vivo el 2026-07-02 sobre `development` (post KAN-163/164/165) con Playwright a 390px — todos los hallazgos siguen presentes salvo los explícitamente descartados abajo.
> **Rama:** `feat/portal-ux-mobile` (off `development`).

**Goal:** Que las pantallas del portal se sientan app-nativas en mobile sin espacios muertos ni elementos táctiles chicos: wizard de turno a pantalla completa (sin banda gris del backdrop), diálogos realmente fullscreen respetando safe-areas, y links/acciones con área táctil de 48px.

**Architecture:** Solo CSS/markup del design system y componentes existentes — sin cambios de lógica ni de datos. Los tokens de safe-area (`--ds-safe-*`) y el mixin `mobile-only` ya existen; el trabajo es corregir selectores/alturas y agregar una utilidad de área táctil reusable.

**Tech Stack:** Angular 21 + PrimeNG 21 (Aura) + SCSS, Vitest. Verificación visual con Playwright a 390px contra el dev server.

### Hechos del código (verificados en vivo el 2026-07-02)

- **Wizard mobile = bottom-sheet drawer**: `sacar-turno.component.html:5-17` renderiza el wizard, en mobile, dentro de `<p-drawer position="bottom" styleClass="ui-bottom-sheet-drawer ui-wizard-sheet">`. `.ui-wizard-sheet` (`src/styles/primeng-overrides.scss:470`) fija `height: 92dvh !important` → el panel deja ~8dvh del mask del drawer (`rgba(0,0,0,0.4)`) visible arriba. En pantalla se ve una **banda gris oscura muerta de ~130px** sobre el header "Nuevo turno". (DOM confirmado: elemento superior = `div.p-drawer-mask.p-overlay-mask`, `body.wizard-open`.) Para un wizard (task full-page, no un peek-sheet) esto es espacio desperdiciado y se ve roto.
- **Dialogs fullscreen que NO aplican (bug de selector)**: `.ui-dialog-fullscreen-mobile` (`src/styles/utilities.scss:263`) está escrito como `.ui-dialog-fullscreen-mobile { .p-dialog { … } }` (clase como **ancestro** de `.p-dialog`). Pero PrimeNG 21 aplica `styleClass` **sobre el propio** `.p-dialog` (DOM confirmado: `div.p-component.p-dialog.ui-dialog-fullscreen-mobile`), así que el selector descendiente nunca matchea y los estilos no se aplican. Resultado: en mobile (390px) el diálogo "Agregar familiar" renderiza como card centrada **359×627 en top 109 / left 16** en vez de fullscreen. Afecta también los 2 diálogos de perfil (`perfil.component.html`: editar contacto y cambiar contraseña, misma `styleClass`).
- **Unidades del dialog**: el bloque usa `width/height: 100vw/100vh !important` (`utilities.scss:266-269`). `100vw` incluye la scrollbar (puede forzar scroll horizontal) y `100vh` ignora el chrome del navegador mobile (contenido cortado bajo la barra de URL). El header ya paddea `--ds-safe-top` y el content `--ds-safe-bottom`.
- **Touch targets de links de auth**: son `<a class="ui-text-primary">` de texto plano. Medido: "¿Olvidaste tu contraseña?" = **16px** de alto (`login.component.html:96`). Mismo patrón en `register` ("términos y condiciones"), `password-recovery/forgot-password` ("Volver al inicio"), `password-recovery/reset-password` ("Pedir un nuevo enlace"), `first-login` ("Volver al inicio de sesión"). El DS exige 48×48 mínimo en mobile.
- **Datepicker desacoplado**: en `agregar-familiar.component.html:53` el `<p-datepicker>` de "Fecha de nacimiento" muestra el input y el botón de calendario como dos cajas separadas (el ícono queda flotando a la derecha, desalineado del input).
- Tokens y mixins disponibles: `--ds-safe-top/right/bottom/left` (`tokens.scss:81-84`), `@mixin mobile-only { @media (max-width: $bp-mobile) }` (`breakpoints.scss:10`), `--ds-touch-target: 48px`.

### Descartados (con evidencia — NO tocar)

- **Triggers de dropdown "35×14"** (flag original de la auditoría): el wrapper real `.p-select` mide **48px** de alto y es todo clickeable; el 14px era el `.p-select-dropdown` (chevron interno). No es un problema.
- **Nombres de familiares en minúscula**: ya resuelto en KAN-163 (`text-transform: capitalize` en `family-card`).
- **Desktop sidebar vs. topbar horizontal** (el DS sugiere topbar para el portal paciente): es un rediseño de layout desktop, fuera del alcance de un pase mobile — dejar para discusión de producto aparte.

---

### Task 1: Wizard de turno a pantalla completa en mobile (sin banda gris)

**Files:** `src/styles/primeng-overrides.scss` (`.ui-wizard-sheet`), verificación en `sacar-turno.component.*`

- [ ] **Step 1:** Cambiar `.ui-wizard-sheet` de `height: 92dvh` a **full-height** (`height: 100dvh !important`, sin el peek). Quitar el `border-radius` superior (a pantalla completa no aplica el look de sheet). Agregar `padding-top: var(--ds-safe-top)` al header interno del wizard (o al contenedor) para no quedar bajo el notch, y respetar `--ds-safe-bottom` en el footer del wizard.
- [ ] **Step 2:** Confirmar que con full-height ya no se ve el `p-drawer-mask` (no queda franja). Si PrimeNG deja igual un gap por el `position="bottom"`, evaluar `top: 0` / `inset: 0` en el panel del drawer del wizard, o —alternativa más limpia— renderizar el wizard mobile como página normal (no drawer) igual que desktop; decidir en implementación según lo que deje el layout sin regresiones del footer sticky.
- [ ] **Verify:** Playwright 390px en `/turnos/sacar`: el header "Nuevo turno" arranca arriba de todo (sin banda gris), el footer (Cancelar/Continuar) queda sobre el safe-area inferior, sin scroll horizontal. Screenshot de evidencia.

### Task 2: Diálogos realmente fullscreen en mobile (fix de selector + dvw/dvh)

**Files:** `src/styles/utilities.scss` (`.ui-dialog-fullscreen-mobile`)

- [ ] **Step 1:** Reescribir el selector para que matchee la clase **sobre** `.p-dialog`: `.p-dialog.ui-dialog-fullscreen-mobile { … }`, con `.p-dialog-header`/`.p-dialog-content` como descendientes. Mantener el `@include mobile-only`.
- [ ] **Step 2:** Cambiar unidades a viewport dinámico: `width: 100dvw` / `height: 100dvh` (y `max-*` acordes), `margin: 0`, `border-radius: 0`. Conservar los paddings de safe-area del header (top) y content (bottom).
- [ ] **Step 3:** Revisar la interacción con `[breakpoints]="{ '768px': '100vw' }"` en los markups (`agregar-familiar.component.html:8`, perfil): si el fix por clase ya cubre mobile, dejar `[breakpoints]` como está o quitarlo si es redundante/conflictivo (decidir con evidencia — que no reintroduzca el centrado).
- [ ] **Verify:** Playwright 390px: el diálogo "Agregar familiar" mide `100dvw × 100dvh` (top 0, left 0), sin cards de fondo visibles ni bottom nav; ídem los 2 diálogos de perfil. En desktop (≥768px) siguen centrados con ancho fijo (sin regresión).

### Task 3: Área táctil de 48px en links de auth

**Files:** `src/styles/utilities.scss` (nueva utilidad `.ui-touch-link`) + los 5 templates de auth (`login`, `register`, `password-recovery/forgot-password`, `password-recovery/reset-password`, `first-login`)

- [ ] **Step 1:** Agregar utilidad `.ui-touch-link` en `utilities.scss`: `display: inline-flex; align-items: center; min-height: var(--ds-touch-target); padding-block: var(--space-2);` (área táctil de 48px sin agrandar el texto). En desktop puede quedar igual (el min-height no molesta) o acotarse con `mobile-only` si se prefiere; mantener el look visual actual.
- [ ] **Step 2:** Aplicar `.ui-touch-link` a los `<a>`/acciones de texto de los 5 componentes de auth (¿Olvidaste tu contraseña?, términos y condiciones, Volver al inicio, Pedir un nuevo enlace, Volver al inicio de sesión). Verificar que no rompan el centrado/inline donde estén dentro de un párrafo.
- [ ] **Verify:** Playwright 390px: cada uno de esos links reporta `height >= 44` (idealmente 48). Sin cambios visuales bruscos en desktop.

### Task 4: Datepicker de "Agregar familiar" — ícono integrado al input

**Files:** `src/app/features/main/familia/agregar-familiar/agregar-familiar.component.html` (+ `.scss` si hace falta), posible ajuste en overrides

- [ ] **Step 1:** Integrar el botón de calendario dentro del campo (usar el `iconDisplay="input"` de `p-datepicker` / `showIcon` inline, o envolver en `p-iconfield`), de modo que el ícono quede pegado al input y no como caja suelta a la derecha. Mantener `[showIcon]` accesible con `ariaLabel`.
- [ ] **Verify:** Playwright 390px dentro del diálogo (ya fullscreen por Task 2): el ícono de calendario queda alineado dentro/junto al input de fecha; abre el calendario y respeta el ancho del diálogo.

---

## Verificación final (gate de cierre)

- [ ] `npm test` y `npm run build` verdes.
- [ ] Pase Playwright 390px sobre las pantallas tocadas: 0 banda gris en el wizard, diálogos a `100dvw×100dvh`, links de auth ≥44px, sin scroll horizontal en ninguna (regresión). Screenshots adjuntos.
- [ ] Chequeo desktop (1440px) de no-regresión: diálogos centrados, wizard con su max-width, links iguales.
- [ ] PR contra `development` linkeando el ticket, con antes/después de wizard y diálogo.

## Out of scope

- Rediseño desktop sidebar → topbar horizontal (discusión de producto aparte).
- Cualquier cambio de lógica, datos o endpoints.
- Bottom-sheets de detalle/reprogramar/filtros de turnos y estudios: son sheets de contenido acotado (height auto / max 92dvh) intencionales — no se tocan.
