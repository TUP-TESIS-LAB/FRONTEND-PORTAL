# Portal Paciente — Estudios reales (des-mockeo mínimo + store NgRx + paciente activo + descarga de PDF) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-167](https://exequielsantoro.atlassian.net/browse/KAN-167)
> **Backend follow-up (habilita sucursal + PDF):** [KAN-168](https://exequielsantoro.atlassian.net/browse/KAN-168)
> **Spec:** `docs/superpowers/specs/2026-07-02-portal-estudios-reales-design.md`
> **Rama:** `feat/portal-estudios-reales` (off `development`).

**Alcance acordado (2026-07-02):** del estudio solo importan **datos mínimos: fecha + sucursal**. Lo único que realmente importa es **la descarga del PDF firmado**. Con datos mínimos alcanza hasta que el PDF esté disponible. Por lo tanto NO se construye vista de detalle rica ni metadata de firma en esta iteración — se difieren. La **sucursal** y la **descarga de PDF** dependen del endpoint de backend [KAN-168]; hasta que exista, se muestran degradados con honestidad (sucursal "—", botón de descarga deshabilitado con tooltip).

**Goal:** Sacar el mock de Estudios y dejar la base real: store NgRx + filtrado por paciente activo, cableado a `GET /api/v1/me/results`, listado mínimo (fecha + sucursal + identificador de estudio) y **acción de descarga de PDF** lista para conectarse al endpoint de KAN-168.

**Architecture:** Angular 21 standalone + signals + NgRx clásico (sin @ngrx/entity) + PrimeNG. Se replica el patrón del feature **Familia** (`features/main/familia/store/*` + `core/family/family.service.ts`). Datos al componente **siempre** vía `store.selectSignal(...)`.

**Tech Stack:** Vitest (instanciación directa por el issue conocido de `templateUrl`). Verificación E2E con Playwright contra :4300.

### Hechos del código (verificados 2026-07-02)
- `GET /api/v1/me/results?patientId=` (rol EXTERNO, anti-IDOR OK) → `AnalyticalResultResponse`: `{ id, tenantId, protocolId, analysisOrderId, sectionId, patientId, collectionDate, active, version }`. Provee **fecha** (`collectionDate`) e identificadores; **NO** provee sucursal, nombre, estado, firma ni PDF (spec §3.1, §4).
- `ActivePatientService` (`core/active-patient/active-patient.service.ts`): `activePatient()` computed → `Familiar | null` (`.id` = patientId), `setActive(id)`, `init()`.
- Patrón real a copiar: `features/main/familia/store/family.{actions,effects,reducer,selectors}.ts` + `core/family/family.service.ts`.
- Feature actual: `features/main/estudios/estudios.component.{ts,html,scss}`, `estudio.service.ts` (mock `ESTUDIOS_MOCK`/`PERSONAS_MOCK`), `core/models/estudio.model.ts`. Ruta `app.routes.ts` → `/estudios` (lazy).
- **sucursal + descarga de PDF** llegan con [KAN-168] (`GET /me/studies` con fecha+sucursal y `GET /me/studies/{id}/report` bytes PDF).

---

### Task 1: Modelo mínimo + objetivo

**Files:** `src/app/core/models/estudio.model.ts`

- [ ] **Step 1:** Redefinir `Estudio` a lo mínimo real + objetivo diferido. Obligatorio (del GET): `id`, `patientId`, `protocolId`, `fechaToma` (de `collectionDate`); útil: `analysisOrderId`, `sectionId`. **Opcionales** (llegan con KAN-168): `sucursal?`, `nombre?`, `estadoFirma?`, `reporteDisponible?: boolean`, `reporteUrl?`/id para descarga. Quitar los campos ricos que ya no se usan (valores, rangos, firmante/matrícula detallados) o dejarlos opcionales sin uso en UI.
- [ ] **Step 2:** Tipar `AnalyticalResultResponse` (9 campos) + mapper puro `fromAnalyticalResult(dto): Estudio` (sucursal/pdf quedan `undefined`).
- [ ] **Verify:** `npm run build` compila.

### Task 2: Service real (des-mockeo)

**Files:** `estudio.service.ts`

- [ ] **Step 1:** Reemplazar `getEstudios()`/`ESTUDIOS_MOCK` por `getEstudios(patientId: number): Observable<Estudio[]>` → `http.get<AnalyticalResultResponse[]>('/api/v1/me/results', { params: { patientId } })` mapeado con `fromAnalyticalResult`. Eliminar `ESTUDIOS_MOCK`, `PERSONAS_MOCK`, `getPersonas()`.
- [ ] **Step 2:** Dejar el método de descarga preparado pero sin romper: `descargarReporte(estudioId)` que apunte al endpoint de KAN-168 (`GET /me/studies/{id}/report`), invocado solo cuando `reporteDisponible`. Error mapeado a español sin leak (CLAUDE.md #4).
- [ ] **Verify:** unit test del mapper (dto delgado → Estudio con `sucursal`/`reporteDisponible` undefined).

### Task 3: Store NgRx (patrón Familia)

**Files:** `src/app/features/main/estudios/store/estudios.{actions,reducer,effects,selectors}.ts` (+ registro)

- [ ] **Step 1:** `actions`: `loadEstudios({ patientId })`, `loadEstudiosSuccess({ estudios })`, `loadEstudiosFailure({ error })`.
- [ ] **Step 2:** `reducer`: `{ estudios, loading, error }` con las 3 transiciones.
- [ ] **Step 3:** `effects`: `loadEstudios$` (`switchMap` → `svc.getEstudios(patientId)`), `catchError` → failure + toast español. Registrar `provideState`/`provideEffects` como Familia.
- [ ] **Step 4:** `selectors`: `selectEstudios`, `selectEstudiosLoading`, `selectEstudiosError`.
- [ ] **Verify:** tests reducer (3) + effects (success/failure con `provideMockActions`) + selectors. `npm test` verde.

### Task 4: Componente cableado a store + paciente activo + descarga

**Files:** `estudios.component.ts` / `.html` / `.scss`

- [ ] **Step 1:** Inyectar `Store` + `ActivePatientService`. Quitar suscripción directa y selector local de persona. Consumir con `selectSignal`.
- [ ] **Step 2:** `effect()` sobre `activePatient()` → despachar `loadEstudios({ patientId: activePatient()!.id })`; recargar al cambiar de paciente; manejar `null` (empty state).
- [ ] **Step 3:** Template minimalista: por estudio mostrar **fecha** + **sucursal** (o "—" hasta KAN-168) + identificador (p. ej. "Estudio #protocolo"). **Botón Descargar PDF** como acción primaria: habilitado solo si `reporteDisponible`; si no, deshabilitado con tooltip "Disponible próximamente". Mantener tabla desktop / cards mobile y filtros existentes (los que degraden sin dato, ocultarlos o dejarlos por fecha). Empty state honesto.
- [ ] **Verify:** Playwright :4300 (login DNI 30123456 / password) en `/estudios`: lista real por paciente activo (no mock), cambio de paciente recarga, botón Descargar visible-deshabilitado, sin errores de consola, sin scroll horizontal mobile 390px / desktop 1440px.

### Task 5: Limpieza + tests

**Files:** specs, `estudio.service.spec.ts`, imports muertos

- [ ] **Step 1:** Eliminar todo rastro de mock (`ESTUDIOS_MOCK`, `PERSONAS_MOCK`, `getPersonas`, selector local de persona). Actualizar/crear specs.
- [ ] **Step 2:** Smoke test del componente (instanciación directa).
- [ ] **Verify:** `npm test` verde + `npm run build`.

---

## Verificación final (gate de cierre)
- [ ] `npm test` y `npm run build` verdes.
- [ ] Sin mock: grep `ESTUDIOS_MOCK`/`PERSONAS_MOCK` = 0.
- [ ] Playwright (mobile 390 + desktop 1440): listado real mínimo por paciente activo, cambio de paciente recarga, botón Descargar presente (deshabilitado hasta KAN-168), degradado honesto de sucursal, sin scroll horizontal, sin errores de consola.
- [ ] Errores en español sin leak (CLAUDE.md #4).
- [ ] PR contra `development` linkeando KAN-167 (y mencionando KAN-168 como dependencia de sucursal+PDF).

## Diferido / Out of scope
- **Sucursal real + descarga de PDF funcional:** dependen de [KAN-168] (endpoint backend). Acá se dejan cableados/degradados.
- Vista de detalle rica (valores, rangos) y metadata de firma (firmante, matrícula, hash): diferidos — no son necesarios con el alcance mínimo.
- Firma en el portal; cambios en el admin; polling.
