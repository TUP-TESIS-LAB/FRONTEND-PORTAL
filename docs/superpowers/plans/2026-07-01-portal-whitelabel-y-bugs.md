# Portal Paciente — White-label consistente + bugs funcionales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-163](https://exequielsantoro.atlassian.net/browse/KAN-163)
> **Origen:** Auditoría Playwright + código del 2026-07-01 (22 pantallas, desktop + mobile, tenant lab-demo).
> **Rama:** `fix/portal-whitelabel-bugs` (off `development`).

**Goal:** Que el portal muestre SIEMPRE la identidad del tenant activo (logo/iniciales + colores coherentes en auth y shell) y eliminar los bugs funcionales detectados en la auditoría: íconos de análisis vacíos, label "TU PRÓXIMO TURNO" en turnos pasados, subscribes sin manejo de error, interacción muerta en familia, emoji en dashboard, notificaciones mock, y datos vacíos mostrados como "—".

**Architecture:** Sin cambios de arquitectura. Se corrige `TenantService.applyTheme()` (variantes `-dark`), se agrega un fallback de marca (logo → iniciales) compartido entre `public-topbar` y `sidebar`, y mapas de íconos front-side (backend manda nombres de Material Icons; el DS usa PrimeIcons). Todo lo demás son fixes localizados en componentes existentes.

**Tech Stack:** Angular 21 standalone + signals, PrimeNG 21 + PrimeIcons 7, NgRx donde ya existe, Vitest (`npm test`).

## Global Constraints

- **PrimeIcons only** — antes de usar un ícono, verificar que exista en `node_modules/primeicons/raw-svg/`. Prohibido emoji Unicode y nombres de Material Icons en clases.
- **Tokens del DS** — nada de hex hardcodeado; los colores de marca salen de `--brand-*` y los fijos de `--ds-*`. Las clases nunca referencian un tenant (`.ui-*`).
- **Mensajes al usuario:** español, user-friendly, vía `mapApiError()` (`shared/utils/api-error-mapper.ts`) + `MessageService`. Jamás `err.error.message` crudo.
- **Estudios sigue siendo mock** (integración real = arco 2C.3, fuera de scope). Acá solo se arreglan íconos y limpieza; NO cablear `/me/results`.
- **Tests con Vitest** para toda lógica nueva (mapas de íconos, derivación de variantes de color, label de turno-detail). Smoke a nivel página donde se toque template.
- Out of scope (tickets aparte): PWA completa (manifest/SW/íconos instalables/splash dinámico), pase de safe-areas + dialogs fullscreen mobile, touch targets de links de auth, sidebar-vs-topbar del DS, estudios contra backend real.

### Hechos del código (verificados en la auditoría)

- `core/tenant/tenant.service.ts:90-116` — `applyTheme()` setea `--brand-primary|secondary|accent` y SOLO las variantes `-light` (`lighten()`); **nunca setea `--brand-*-dark`**, que sí consumen componentes (ej. `shared/ui/components/family-card/family-card.component.scss:44` usa `--brand-secondary-dark`) → quedan clavadas en el default teal de `src/styles/tokens.scss` para cualquier tenant.
- `core/tenant/tenant.service.ts:74-88` — `mergeWhiteLabel()`: si el backend trae `lightLogoUrl: null` (caso lab-demo hoy), cae a `base.logo.color` de la config estática.
- `public/assets/tenants/lab-demo/tenant.config.json` — **apunta `logo.color/white/mark` a `/assets/tenants/castillo-chidiak/logo*.svg`** (assets de OTRO tenant). Resultado observado: pantallas de auth con chip teal "LCC" mientras el shell muestra "LD" azul.
- `features/auth/ui/public-topbar/public-topbar.component.html:3-7` — `<img [src]="tenant.config()?.logo?.color">` sin fallback si no hay logo.
- `shared/ui/shell/sidebar/sidebar.component.html:5` — `{{ tenant.shortName }}` como marca; **ignora el logo aunque exista**.
- `src/index.html` — `<meta name="theme-color" content="#1F6E70">` y splash con texto `LCC` + `background: #1F6E70` hardcodeados (marca castillo-chidiak). El meta lo pisa `applyTheme()` en runtime, pero el primer paint y el splash muestran la marca ajena.
- `GET /public/tenants/lab-demo/white-label` (backend local) devuelve `{primaryColor:"#1976D2", secondaryColor:"#424242", lightLogoUrl:null, darkLogoUrl:null}` — el `#424242` gris produce el gradiente sucio del hero (`linear-gradient(--brand-primary → --brand-secondary)`). Es data del seed local, no bug del front.
- `features/main/estudios/estudios.component.ts:42-48` — `CATEGORIA_ICON_MAP` usa `pi pi-flask` (bioquimica) y `pi pi-droplet` (orina), **que NO existen en PrimeIcons 7** (verificado contra `node_modules/primeicons/raw-svg/`) → cuadrados de color vacíos en la tabla/cards de estudios.
- `GET /api/v1/turnos/catalog/tipos-analisis` devuelve `icono` con nombres de **Material Icons** (`monitor_heart`, `bloodtype`, `biotech`); `shared/ui/components/analysis-card-grid/analysis-card-grid.component.html:16` renderiza `'pi ' + tipo.icono` → ningún ícono matchea → paso "Tipo de análisis" del wizard con TODOS los cuadrados vacíos.
- `shared/ui/components/turno-detail/turno-detail.component.html:12` — header hardcodeado `TU PRÓXIMO TURNO`, se muestra igual para turnos pasados (observado con turno del 29/06 siendo 01/07).
- `features/main/turnos/services/appointment.service.ts:67-77` — el split `proximos/anteriores` por `ts >= now` ya existe y es correcto; el bug es solo el label del detail.
- Subscribes sin error handler: `features/main/turnos/sacar/sacar-turno.component.ts:143-152` (availability/slots) y `:173-179` (family), `features/main/estudios/estudios.component.ts:228-232` (`loadingEstudios` queda en true si falla).
- `features/main/familia/familia.component.ts:79-87` — click en familiar → toast "Próximamente" (la ruta `/familia/:id/editar` no existe).
- `features/main/dashboard/dashboard.component.html:2` — emoji `👋` en el h1.
- `features/main/dashboard/dashboard.component.ts:61-95` — 3 notificaciones mock hardcodeadas; el badge de la campana siempre muestra 3.
- Wizard paso 5 (`turno-resumen`): muestra tipo/sede/fecha pero **no muestra "Para quién"** (persona elegida en paso 1); dirección de sede renderiza `—`/línea vacía cuando es null; `turno-detail` idem (`SEDE` con `—`, sección `ESTUDIOS` vacía sin mensaje).
- `features/main/turnos/sacar/steps/step-para-quien/step-para-quien.component.scss:3,14` — `var(--text-muted, #888)`: el token `--text-muted` no existe (es `--ds-text-muted`).
- Componentes muertos: `features/dashboard/dashboard.component.ts` (placeholder legacy, la ruta real usa `features/main/dashboard`) y `features/main/patient-placeholder.component.ts` (sin referencias).
- Nombres de familiares se muestran tal cual vienen ("mateo pillado") en `family-card`, `step-para-quien` y filtros de persona.
- `shared/ui/components/list-card/list-card.component.html:5` — `color: '#fff'` hardcodeado.

---

## Fase A — White-label / theming

### Task A1: Marca del tenant con fallback (logo → iniciales) en auth y shell

**Files:**
- Create: `src/app/shared/ui/components/brand-mark/brand-mark.component.ts` (+ `.html`, `.scss`, `.spec.ts`)
- Modify: `src/app/features/auth/ui/public-topbar/public-topbar.component.html`
- Modify: `src/app/shared/ui/shell/sidebar/sidebar.component.html` (+ `.scss` si hace falta)
- Modify: `public/assets/tenants/lab-demo/tenant.config.json`

**Comportamiento de `ui-brand-mark`:** recibe `logoUrl: string | null`, `name: string`, `shortName: string`. Si `logoUrl` es truthy renderiza `<img>` (con `alt` = name y `(error)` que cae al fallback); si no, chip de iniciales `shortName` sobre `--brand-primary` con texto blanco (mismo look que el mark actual del sidebar). Clase `.ui-brand-mark`, sin referencia a tenant.

- [ ] **Step 1:** Test del componente: con `logoUrl` renderiza img; con `null` renderiza chip con `shortName`; con error de carga de img cae al chip.
- [ ] **Step 2:** Implementar `ui-brand-mark` y reemplazar el `<img>` de `public-topbar` y el `logo-mark` del `sidebar` por el componente (sidebar pasa a mostrar el logo real cuando exista).
- [ ] **Step 3:** `lab-demo/tenant.config.json`: eliminar las rutas a `castillo-chidiak/*` — dejar `logo: { color: null, white: null, mark: null }` (el fallback de iniciales cubre el caso sin logo). Revisar `tenant-a` y cualquier otro config que cruce assets de otro tenant.
- [ ] **Step 4:** `TenantService.mergeWhiteLabel()`: contemplar `base.logo.color === null` (tipo `TenantConfig.logo.*: string | null`).
- [ ] **Verify:** `npm test`; login en `http://localhost:4300/login?tenant=lab-demo` muestra chip "LD" azul (no LCC teal); el sidebar logueado muestra la misma marca. Con `?tenant=castillo-chidiak` se ve SU logo en ambos lados.

### Task A2: `applyTheme()` deriva variantes `-dark` (y deja de heredar el teal default)

**Files:**
- Modify: `src/app/core/tenant/tenant.service.ts`
- Test: `src/app/core/tenant/tenant.service.spec.ts`

- [ ] **Step 1:** Test: tras `applyTheme` (exercitado vía `loadTenant` con HTTP mockeado), `documentElement` tiene `--brand-primary-dark`, `--brand-secondary-dark`, `--brand-accent-dark` seteados y ≠ default; `--brand-*-light` sigue presente.
- [ ] **Step 2:** Agregar `darken(hex, ratio)` (mezcla con negro, espejo de `lighten`) y setear las 3 variantes `-dark` en `applyTheme()` (ratio ~0.25, consistente con los defaults de `tokens.scss`).
- [ ] **Step 3:** Grep de `--brand-.*-dark` en `src/` para confirmar que no queda ningún consumidor sin variante runtime.
- [ ] **Verify:** avatares de familia/step-para-quien ya no salen teal con tenant lab-demo (quedan en la gama del secundario del tenant).

### Task A3: `index.html` neutro (sin marca de castillo-chidiak en primer paint)

**Files:**
- Modify: `src/index.html`

- [ ] **Step 1:** `theme-color` inicial → `#2563EB` (default neutro del DS, igual que `tokens.scss`); splash: reemplazar texto `LCC` por un placeholder neutro (sin texto, o spinner sobre `--ds-bg`) y `background` neutro. `applyTheme()` ya lo pisa al cargar el tenant.
- [ ] **Step 2:** Agregar `<meta name="description" content="Portal de pacientes — turnos, resultados y grupo familiar.">`.
- [ ] **Verify:** recarga dura en `/login`: en ningún frame se ve "LCC" ni teal; al cargar aparece la marca del tenant.

### Task A4: Tokens muertos / hardcodes menores

**Files:**
- Modify: `src/app/features/main/turnos/sacar/steps/step-para-quien/step-para-quien.component.scss`
- Modify: `src/app/shared/ui/components/list-card/list-card.component.html`

- [ ] **Step 1:** `var(--text-muted, #888)` → `var(--ds-text-muted)` (2 usos, líneas 3 y 14).
- [ ] **Step 2:** `color: '#fff'` del avatar de list-card → token (`var(--ds-white)` si existe en `tokens.scss`; si no, agregarlo ahí — no hardcodear).
- [ ] **Verify:** grep `--text-muted` y `#fff` en `src/app` sin resultados nuevos; `npm test`.

### Nota A5 (data local, sin código): el gradiente sucio del hero es el seed

`secondaryColor: "#424242"` del white-label de lab-demo es data del seed local del backend. Fix manual de dev (no entra en esta rama):
`UPDATE ... SET secondary_color = '#0EA5A4' WHERE tenant slug = 'lab-demo'` en la tabla de white-label de la DB local (`laboratorio_mysql`). Si se quiere persistir para todos, va como cambio de seed en Backend-portal (repo aparte).

---

## Fase B — Bugs funcionales

### Task B1: Íconos de análisis — mapear a PrimeIcons reales

**Files:**
- Modify: `src/app/features/main/estudios/estudios.component.ts` (CATEGORIA_ICON_MAP)
- Create: `src/app/shared/utils/analysis-icon.ts` (+ `.spec.ts`)
- Modify: `src/app/shared/ui/components/analysis-card-grid/analysis-card-grid.component.html` (y el componente que le pasa `tipo`)

- [ ] **Step 1:** Test de `analysisIcon(icono: string | null, categoria?: string): string`: mapea nombres Material del backend (`bloodtype`, `monitor_heart`, `biotech`, `water_drop`, etc.) → PrimeIcon existente; si no matchea, fallback por categoría; default final `'pi pi-file'`. Cada valor del mapa DEBE existir en `node_modules/primeicons/raw-svg/` (elegir en implementación; candidatos: hematología `pi-heart`, bioquímica `pi-chart-line`, hormonas `pi-sync`, orina `pi-filter`, coagulación `pi-shield`).
- [ ] **Step 2:** Implementar helper + reemplazar en `analysis-card-grid` el `'pi ' + tipo.icono` por el helper.
- [ ] **Step 3:** Corregir `CATEGORIA_ICON_MAP` de estudios (`pi-flask`/`pi-droplet` → íconos existentes, reusando el helper o el mismo mapa).
- [ ] **Verify:** `npm test`; en `/turnos/sacar` paso 2 y en `/estudios` no queda ningún cuadrado vacío (los 6 tipos y las 5 categorías muestran ícono).

### Task B2: `turno-detail` — label según el turno (no siempre "TU PRÓXIMO TURNO")

**Files:**
- Modify: `src/app/shared/ui/components/turno-detail/turno-detail.component.ts` (+ `.html`)
- Test: `turno-detail.component.spec.ts`

- [ ] **Step 1:** Test: turno con fecha futura → header "TU PRÓXIMO TURNO"; turno pasado → "DETALLE DEL TURNO"; sin fecha parseable → "DETALLE DEL TURNO".
- [ ] **Step 2:** Computed sobre el turno seleccionado (`fechaTs` ya viene en el modelo) y binding en el template.
- [ ] **Verify:** en `/turnos`, click en un turno del 29/06 (pasado) no dice "TU PRÓXIMO TURNO".

### Task B3: Error handlers en los 3 subscribes detectados

**Files:**
- Modify: `src/app/features/main/turnos/sacar/sacar-turno.component.ts` (slots `:143-152`, family `:173-179`)
- Modify: `src/app/features/main/estudios/estudios.component.ts` (`:228-232`)
- Tests: specs correspondientes

- [ ] **Step 1:** Tests: forzando error HTTP en cada flujo, el componente (a) apaga su flag de loading, (b) emite toast con `mapApiError(err)`, (c) deja la lista/slots en estado vacío consistente (empty state visible, no skeleton eterno).
- [ ] **Step 2:** Agregar `error:` handler a los 3 subscribes siguiendo el patrón de `turnos.component.ts:203` (mapApiError + MessageService).
- [ ] **Verify:** `npm test`; con backend caído, `/estudios` y el paso fecha/hora muestran mensaje en español y no quedan cargando.

### Task B4: Familia — sacar interacción muerta + capitalizar nombres

**Files:**
- Modify: `src/app/features/main/familia/familia.component.ts` (+ `.html`)
- Modify: `src/app/shared/ui/components/family-card/family-card.component.scss` (+ donde aplique: `step-para-quien`, filtros de persona)

- [ ] **Step 1:** Eliminar el handler del click en familiar que tira toast "Próximamente" (`familia.component.ts:79-87`); la card deja de anunciarse clickeable (sin hover de acción, sin `cursor: pointer`), conservando "Quitar" y "Agregar familiar". Si la card es un botón por accesibilidad, quitar el rol.
- [ ] **Step 2:** `text-transform: capitalize` en el nombre de `family-card`, `step-para-quien` y chips/filtros de persona (solo presentación; no tocar data).
- [ ] **Verify:** click en la card de un familiar no produce nada (ni toast); "mateo pillado" se ve "Mateo Pillado".

### Task B5: Dashboard — emoji fuera + notificaciones sin mock

**Files:**
- Modify: `src/app/features/main/dashboard/dashboard.component.html` (+ `.ts`)
- Test: spec del dashboard

- [ ] **Step 1:** Quitar `👋` del h1 (`dashboard.component.html:2`) — sin reemplazo o con `pi-` acorde si el diseño lo pide.
- [ ] **Step 2:** Eliminar el array mock de notificaciones (`dashboard.component.ts:61-95`): campana con badge solo si hay notificaciones (hoy: nunca), panel con empty state "No tenés notificaciones" (estructura `ui-empty-state`). Dejar comentario `// TODO backend notificaciones` como único remanente.
- [ ] **Verify:** dashboard sin emoji; campana sin badge fantasma "3".

### Task B6: Wizard paso 5 + detail — completar "Para quién" y ocultar datos nulos

**Files:**
- Modify: `src/app/shared/ui/components/turno-resumen/turno-resumen.component.*`
- Modify: `src/app/shared/ui/components/turno-detail/turno-detail.component.html`
- Modify: `src/app/shared/ui/components/sede-list/sede-list.component.html`
- Modify: `src/app/features/main/turnos/sacar/sacar-turno.component.*` (pasar la persona al resumen)

- [ ] **Step 1:** `turno-resumen`: agregar fila "PARA QUIÉN" con nombre + vínculo de la persona del paso 1.
- [ ] **Step 2:** Dirección de sede: cuando es null, ocultar la línea entera (nada de `—` ni "Dirección no disponible") en `sede-list`, `turno-resumen` y `turno-detail`.
- [ ] **Step 3:** `turno-detail`: sección `ESTUDIOS` vacía → ocultarla o mostrar "Sin estudios asociados" (texto muted), no un header colgado.
- [ ] **Verify:** wizard completo hasta paso 5: se ve la persona; sin `—` sueltos; detail de turno sin secciones vacías.

### Task B7: Limpieza de componentes muertos

**Files:**
- Delete: `src/app/features/dashboard/` (placeholder legacy sin ruta)
- Delete: `src/app/features/main/patient-placeholder.component.ts`

- [ ] **Step 1:** Grep de referencias (imports/rutas) → cero; borrar ambos.
- [ ] **Verify:** `npm run build` verde; `npm test` verde; navegación completa OK.

---

## Verificación final (gate de cierre)

- [ ] `npm test` y `npm run build` verdes.
- [ ] Re-correr el crawl Playwright de la auditoría (desktop + mobile): 0 emojis, 0 imgs rotas, 0 cuadrados de ícono vacíos, marca consistente auth↔shell, sin "TU PRÓXIMO TURNO" en turnos pasados, sin scroll horizontal (regresión).
- [ ] Grep final: `castillo-chidiak` solo dentro de `assets/tenants/castillo-chidiak/` y su propio SCSS de tenant; `pi pi-flask|pi pi-droplet|--text-muted` sin ocurrencias.
- [ ] PR contra `development` linkeando el ticket de Jira.
