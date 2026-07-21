# Portal Paciente — PWA instalable (manifest + service worker + íconos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-164](https://exequielsantoro.atlassian.net/browse/KAN-164)
> **Origen:** Auditoría del 2026-07-01 (frente PWA, descartado de KAN-163 a pedido del usuario). Depende de que KAN-163 (PR #18) esté mergeado — reusa el `index.html` neutro y el theming dinámico.
> **Rama:** `feat/portal-pwa` (off `development`, después del merge de PR #18).

**Goal:** Que el portal sea una PWA instalable en Android/iOS/desktop: manifest válido, service worker de Angular con caché del app shell, íconos propios (192/512 + maskable + apple-touch-icon), flujo de actualización en español, y sin cachear NUNCA datos del paciente.

**Architecture:** `ng add @angular/pwa` como scaffold (manifest + ngsw-config + provideServiceWorker + wiring de angular.json) y después personalización: íconos neutros del producto (los del scaffold son el logo de Angular), `ngsw-config.json` sin dataGroups para `/api` (datos de salud siempre frescos de red), `UpdateService` sobre `SwUpdate` con toast en español, y branding runtime que ya existe (theme-color dinámico de `TenantService`). El manifest es **estático y neutro** en esta fase (ver Decisión 1).

**Tech Stack:** Angular 21.2 standalone, `@angular/service-worker` + `@angular/pwa` (misma major 21.x), PrimeNG MessageService para el aviso de update, Vitest.

## Decisiones (leer antes de implementar)

**Decisión 1 — Manifest neutro, no por tenant (en esta fase).** El manifest se sirve como archivo estático; el tenant se resuelve en runtime (query param / subdominio). Un manifest por tenant requiere servirlo dinámico (endpoint del backend `/public/tenants/{slug}/manifest.webmanifest` o blob-URL runtime, que tiene soporte irregular). En esta fase: `name: "Portal Paciente"`, `theme_color: #2563EB` (default del DS), íconos neutros del producto. La instalación queda funcional para todos los tenants; el manifest per-tenant queda como follow-up cuando el backend exponga el endpoint (dejar nota en el código). El theme-color del navegador ya es dinámico vía `TenantService.applyTheme()` (meta tag) — eso no cambia.

**Decisión 2 — Cero caché de datos.** `ngsw-config.json` SOLO con `assetGroups` (shell + assets estáticos). Sin `dataGroups`: nada de `/api/**` ni `/public/tenants/**` pasa por el SW cache. Un resultado de laboratorio o un turno viejo servido de caché es inaceptable; offline muestra el shell y los errores de red existentes (KAN-163 ya agregó los handlers).

**Decisión 3 — SW solo en producción.** `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`. En dev el SW molesta (caché fantasma con ng serve).

### Hechos del código (verificados)

- `package.json`: `@angular/core ^21.2.0`; NO está `@angular/service-worker`. `angular.json` sin `"serviceWorker"`.
- `src/index.html` (post KAN-163): sin `<link rel="manifest">`, sin `apple-touch-icon`; theme-color estático `#2563EB` que `TenantService.applyTheme()` pisa en runtime; splash neutro con spinner.
- `public/` contiene `favicon.ico` y `assets/` — el builder copia `public/*` a la raíz del dist (Angular 21 application builder), así que el manifest y los íconos van en `public/`.
- `TenantService.applyTheme()` (`core/tenant/tenant.service.ts`) ya actualiza `meta[name="theme-color"]` y `document.title` por tenant.
- `app.config.ts` usa providers standalone (`provideRouter`, `provideHttpClient`, `provideStore`...) — `provideServiceWorker` se suma ahí.
- El toast global ya existe vía PrimeNG `MessageService` (patrón en `turnos.component.ts`); para un aviso persistente de update usar `sticky: true`.
- No hay tests E2E de PWA; la verificación va por build prod + servidor estático + Playwright (el dev server NO sirve el SW).

---

### Task 1: Scaffold PWA + manifest + íconos propios

**Files:**
- Run: `ng add @angular/pwa` (genera `public/manifest.webmanifest`, `ngsw-config.json`, toca `angular.json`, `package.json`, `index.html`, `app.config.ts`)
- Modify: `public/manifest.webmanifest`
- Create: `public/icons/` (icon-192.png, icon-512.png, icon-maskable-192.png, icon-maskable-512.png, apple-touch-icon.png 180×180)
- Modify: `src/index.html`
- Delete: los `icons/icon-*.png` de Angular que genera el scaffold (logo de Angular — no puede quedar NINGUNO)

- [ ] **Step 1:** Correr `ng add @angular/pwa` y revisar el diff completo que genera (angular.json build prod con `"serviceWorker": "ngsw-config.json"`, provideServiceWorker en app.config, link manifest en index.html).
- [ ] **Step 2:** Generar los íconos propios: SVG fuente neutro del producto (ícono de laboratorio/frasco estilizado sobre fondo `#2563EB`, esquinas y safe-zone maskable del 80%) y rasterizar a PNG con el script `e2e`-style de Playwright (render del SVG en un page.screenshot a 192/512/180). Guardar el SVG fuente en `public/icons/source.svg` para regenerar. Sin marca de ningún tenant (white-label).
- [ ] **Step 3:** `manifest.webmanifest`: `name: "Portal Paciente"`, `short_name: "Portal"`, `description`, `lang: "es"`, `dir: "ltr"`, `display: "standalone"`, `start_url: "/"`, `scope: "/"`, `background_color: "#F7F8FA"` (= `--ds-bg`, consistente con el splash), `theme_color: "#2563EB"`, íconos 192/512 con `purpose: "any"` y los maskable con `purpose: "maskable"`. Comentario-nota (en el plan del repo, JSON no admite comentarios): manifest per-tenant = follow-up backend.
- [ ] **Step 4:** `index.html`: `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` + `<meta name="apple-mobile-web-app-capable" content="yes">` + `<meta name="apple-mobile-web-app-status-bar-style" content="default">`. Verificar que el link del manifest quedó.
- [ ] **Verify:** `npm run build` OK; en el dist están `manifest.webmanifest`, `ngsw-worker.js`, `icons/*`; ningún PNG con el logo de Angular (`ls dist`).

### Task 2: `ngsw-config.json` — solo app shell, nunca datos

**Files:**
- Modify: `ngsw-config.json`

- [ ] **Step 1:** Dejar dos assetGroups: `app` (prefetch: index.html, ngsw-manifest, JS/CSS del build) y `assets` (lazy, updateMode prefetch: `/assets/**`, `/icons/**`, `/*.(svg|png|ico|webmanifest)` y las fuentes de Google si el scaffold las lista — si no, agregar `https://fonts.gstatic.com/**` como recurso externo lazy).
- [ ] **Step 2:** ELIMINAR cualquier `dataGroups` que el scaffold haya generado. Agregar en el plan/README del repo una línea: "Sin dataGroups a propósito: datos de pacientes nunca se cachean" (comentario imposible en JSON — dejarlo en `docs/` o en el commit message).
- [ ] **Step 3:** `navigationUrls`: excluir `/api/**` y `/public/**` (`!/api/**`, `!/public/**`) para que navegaciones al backend no las intercepte el shell.
- [ ] **Verify:** `npm run build`; inspeccionar `dist/**/ngsw.json` generado: sin dataGroups, con los íconos y assets listados.

### Task 3: `UpdateService` — aviso de nueva versión en español

**Files:**
- Create: `src/app/core/pwa/update.service.ts` + `update.service.spec.ts`
- Modify: `src/app/app.config.ts` (provideAppInitializer o inyección en el shell para activarlo)

**Comportamiento:** al detectar `VERSION_READY` (observable `SwUpdate.versionUpdates`), mostrar toast sticky en español: summary "Nueva versión disponible", detail "Hay una actualización del portal. Se aplicará al recargar.", con severidad `info`. Ofrecer recarga: como el toast de PrimeNG no tiene acción por default, usar `MessageService` con `key` propia y un `<p-toast key="pwa">` con template de botón "Actualizar" en el shell (o, más simple y suficiente: `document.location.reload()` tras `activateUpdate()` cuando el usuario toque el toast — elegir lo que menos toque el shell; documentar la elección). Si `SwUpdate.isEnabled === false` (dev), el service no hace nada.

- [ ] **Step 1:** Spec primero (Vitest, sin TestBed.createComponent): mockear `SwUpdate` con un `Subject` de `versionUpdates` y un `MessageService` spy; `VERSION_READY` → se llama `messageService.add` con severidad info, textos en español y `sticky: true`; con `isEnabled=false` → no se suscribe/no emite nada; `activateUpdate` se llama al confirmar.
- [ ] **Step 2:** Implementar el service (`@Injectable({providedIn:'root'})`, `inject(SwUpdate)`, `inject(MessageService)`) y activarlo una sola vez (init en `patient-shell` o `provideAppInitializer` — elegir `provideAppInitializer` para cubrir también las pantallas de auth).
- [ ] **Verify:** `npx vitest run src/app/core/pwa --reporter=dot` verde.

### Task 4: Favicon dinámico por tenant (aprovechando el theming runtime)

**Files:**
- Modify: `src/app/core/tenant/tenant.service.ts` (+ spec existente)

- [ ] **Step 1:** En `applyTheme()`: si `config.logo.mark` existe, apuntar `link[rel="icon"]` al mark del tenant (`type` según extensión); si es null, dejar `favicon.ico` default. Test en `tenant.service.spec.ts`: con mark → href actualizado; con mark null → favicon default intacto.
- [ ] **Verify:** vitest verde; con `?tenant=castillo-chidiak` el favicon cambia al mark del tenant, con lab-demo queda el default.

### Task 5: Verificación E2E de instalabilidad

**Files:**
- Create: script efímero de verificación (en tmp del job o `e2e/` local, NO commitear si el repo no versiona e2e)

- [ ] **Step 1:** `npm run build` + servir `dist/TUP-TESIS-LAB-PORTAL/browser` con un server estático (`npx http-server -p 4310` o `npx serve`). Nota: sin proxy, las llamadas `/api` fallan — alcanza para verificar shell/SW/manifest (los errores de red ya se manejan).
- [ ] **Step 2:** Playwright contra :4310: (a) `link[rel="manifest"]` presente y el fetch devuelve JSON válido con icons 192/512+maskable; (b) `navigator.serviceWorker.ready` resuelve y `getRegistrations().length === 1`; (c) los 5 PNG de íconos devuelven 200 y `naturalWidth` correcto; (d) apple-touch-icon 200; (e) segunda carga con `context.setOffline(true)` → el shell (login) igual renderiza (servido por el SW).
- [ ] **Step 3:** Chequeo manual sugerido al usuario (no automatizable acá): Chrome DevTools → Application → Manifest sin warnings de installability.
- [ ] **Verify:** todos los checks del script en verde; screenshot del shell offline como evidencia.

---

## Verificación final (gate de cierre)

- [ ] `npm test` y `npm run build` verdes.
- [ ] Script de Task 5 completo en verde (manifest válido, SW registrado, íconos 200, shell offline).
- [ ] Grep: ningún ícono/branding de Angular ni de un tenant específico en `public/icons/` ni en el manifest.
- [ ] `ng serve` (dev) sigue funcionando sin SW (isDevMode) y sin errores de consola nuevos.
- [ ] PR contra `development` linkeando el ticket; en el body, nota de las 3 decisiones (manifest neutro, cero dataGroups, SW solo prod) y del follow-up "manifest per-tenant vía backend".

## Out of scope

- Manifest/íconos per-tenant (requiere endpoint backend o blob-manifest — follow-up).
- Push notifications (`SwPush`).
- Splash screens iOS por tamaño de dispositivo (`apple-touch-startup-image`).
- Estrategias offline para datos (`dataGroups`) — excluido a propósito, ver Decisión 2.
