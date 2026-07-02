# Portal Paciente — Editar perfil de familiares sin cuenta propia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-165](https://exequielsantoro.atlassian.net/browse/KAN-165)
> **Origen:** Pedido del usuario (2026-07-01): en Mi Perfil, al seleccionar un familiar desaparece "Editar perfil". Decisión de producto tomada: **opción 1 — el titular puede editar email/teléfono/dirección SOLO de familiares que NO tienen cuenta propia del portal** (dependientes). Familiares con cuenta editan lo suyo desde su sesión.
> **Repos:** Backend en `Backend-portal` (rama `feat/portal-editar-familiar` off `origin/development`); Frontend en `FRONTEND-PORTAL` (rama `feat/portal-editar-familiar` off `development`).

**Goal:** Que en Mi Perfil el botón "Editar perfil" aparezca también cuando el seleccionado es un familiar sin cuenta propia, y que el guardado actualice los datos de contacto de ESE paciente. Cambiar contraseña sigue siendo solo del perfil propio.

**Architecture:** Se extiende el contrato existente en vez de crear endpoints nuevos: `PUT /api/v1/me/profile?patientId=X` espeja el `GET` (mismo anti-IDOR vía `resolveResultPatientIds`), más una validación nueva "el paciente no tiene cuenta propia" (fila `users_patients` con `bond=PROPIO` y `status=VERIFIED`, de cualquier user). El listado de familia expone `hasOwnAccount` para que el front decida la visibilidad del botón sin heurísticas.

**Tech Stack:** Spring Boot (Java 24, hexagonal: usecase/port/adapter, Mockito + MockMvc), Angular 21 + NgRx clásico + Vitest.

### Hechos del código (verificados sobre `origin/development` de Backend-portal — la rama local `feat/portal-auth-perfil-be` está vieja, NO basarse en ella)

- `MyProfileController` (`modules/empresa/presentation/controller/`): GET ya acepta `@RequestParam(required=false) Long patientId` y delega en `GetMyProfileUseCase.execute(patientId)`; **PUT no recibe patientId** y llama `UpdateMyProfileUseCase.execute(Input(email, phone, address))`.
- `GetMyProfileUseCase.execute(Long patientId)`: anti-IDOR con `patientFamilyPort.resolveResultPatientIds(user.id()).contains(patientId)` → si no, `ProfileAccessDeniedException` (`modules/empresa/domain/exception/`). Con `patientId == null` usa `resolveOwnerPatientId`. **Este es el patrón a espejar en el update.**
- `UpdateMyProfileUseCase`: resuelve el owner patient y llama `patientReader.updateContactInfo(patientId, tenantId, email, phone, address)` (`OwnerPatientReaderPort`). Actualiza contactos/dirección del **Patient** (no toca el email de login del user) → seguro para editar dependientes.
- `PatientFamilyPort` (dominio): `resolveAppointmentPatientIds`, `resolveResultPatientIds`, `resolveOwnerPatientId`, `listFamily`. El adapter es `PatientFamilyAdapter` (usa `UserPatientJpaRepository.findActiveByUser(userId, tenantId)`).
- "Tiene cuenta propia" = existe `users_patients` con `patient_id = X`, `bond = PROPIO`, `status = VERIFIED` (de cualquier user, activo). El owner (uno mismo) siempre da true por su propio vínculo PROPIO.
- `PatientFamilyResponse` (dto response, en development): `patientId, firstName, lastName, dni, birthDate, bond, isOwner, userPatientId, status` — sin nada de cuenta.
- Tests backend: use cases con `@ExtendWith(MockitoExtension.class)` + `@Mock/@InjectMocks`; controllers con `@SpringBootTest` + MockMvc + `@WithMockUser(roles="EXTERNO")` + `@MockitoBean` (ej. `MyProfileControllerTest`). Build: `mvnw.cmd test`.
- Front: `FamilyService.getFamily()` mapea `PatientFamilyResponse` → `Familiar` (`core/family/family.service.ts`, `core/models/familiar.model.ts`); perfil usa NgRx (`features/main/perfil/store/*`): `updateProfile({payload})` → effect → `PerfilService.updatePerfil(payload)` → `PUT /api/v1/me/profile` (sin patientId; el GET del front ya manda `?patientId`). Botón: `@if (viewingOwn())` en `perfil.component.html:17`; `viewingOwn()` en `perfil.component.ts:65-66`.

---

## Fase BE (Backend-portal, rama off origin/development)

### Task BE1: `hasOwnAccount` en el port + adapter + listado de familia

**Files:** `PatientFamilyPort.java`, `PatientFamilyAdapter.java`, `UserPatientJpaRepository.java`, `PatientFamilyEntry.java`, `ListMyFamilyUseCase.java` (si mapea), `PatientFamilyResponse.java` (+ tests de adapter y controller de familia si existen)

- [ ] Query nueva en `UserPatientJpaRepository`: patientIds con vínculo `PROPIO` + `VERIFIED` activo dentro de un set (`findOwnAccountPatientIds(Collection<Long> patientIds, Long tenantId)` o equivalente `exists` unitario + batch para el listado).
- [ ] `PatientFamilyPort`: `boolean hasOwnAccount(Long patientId)` (para la validación del update) y enriquecer `listFamily` para que cada `PatientFamilyEntry` traiga `hasOwnAccount` (batch: 1 query para toda la familia, no N+1).
- [ ] `PatientFamilyResponse`: campo `hasOwnAccount`. El owner queda `true` por su propio PROPIO.
- [ ] Tests: adapter (PROPIO+VERIFIED → true; PROPIO+CREATED → false; sin PROPIO → false; soft-deleted → false) y serialización del response.

### Task BE2: `PUT /me/profile?patientId=` con validación "sin cuenta propia"

**Files:** `MyProfileController.java`, `UpdateMyProfileUseCase.java`, nueva `FamilyMemberHasAccountException` (o reuso de `ProfileAccessDeniedException` con mensaje distinto — decidir mirando cómo mapea el handler HTTP; el mensaje al usuario lo pone el FRONT, acá solo importa el status), `UpdateMyProfileUseCaseTest`, `MyProfileControllerTest`

- [ ] `UpdateMyProfileUseCase.execute(Long patientId, Input input)` espejando el GET: `null` → owner (comportamiento actual); no-null → (a) anti-IDOR `resolveResultPatientIds(...).contains(patientId)` si no `ProfileAccessDeniedException`; (b) si `patientId != ownerPatientId` y `patientFamilyPort.hasOwnAccount(patientId)` → `ProfileAccessDeniedException` (403; un 403 alcanza — el front decide el copy). Mantener overload `execute(Input)` para no romper llamadas existentes.
- [ ] `MyProfileController` PUT: `@RequestParam(required = false) Long patientId` → pasa al use case.
- [ ] Tests use case: null→owner OK; familiar sin cuenta→actualiza ESE patientId; familiar con cuenta→403; patientId ajeno→403. Test MockMvc del PUT con `?patientId`.
- [ ] `mvnw.cmd test` verde (módulo empresa como mínimo).

## Fase FE (FRONTEND-PORTAL, rama off development)

### Task FE1: `Familiar.tieneCuenta` + botón habilitado para dependientes sin cuenta

**Files:** `core/models/familiar.model.ts`, `core/family/family.service.ts` (+ spec), `features/main/perfil/perfil.component.ts/.html`

- [ ] Mapear `hasOwnAccount` → `Familiar.tieneCuenta: boolean`. **Fallback conservador**: si el backend no manda el campo (`undefined`), tratar como `true` (no mostrar editar) — así el front no rompe contra un backend viejo.
- [ ] `perfil.component`: computed `selectedFamiliar()` y `canEditSelected()` = `viewingOwn() || (familiar VERIFIED && !tieneCuenta)`. Botón "Editar perfil" usa `canEditSelected()`. La sección "Contraseña" queda con `viewingOwn()`.
- [ ] El modal de edición precarga los datos del perfil que se está viendo (ya cargado por el GET con patientId).

### Task FE2: update con patientId por el store

**Files:** `features/main/perfil/store/perfil.actions.ts`, `perfil.effects.ts`, `perfil.service.ts` (+ specs), `perfil.component.ts`

- [ ] `updateProfile` lleva `patientId: number | null` (null = propio). `PerfilService.updatePerfil(payload, patientId)` → `PUT /api/v1/me/profile` + `?patientId=` cuando no es null.
- [ ] Effect pasa el patientId; el success recarga/setea el perfil mostrado (verificar qué hace hoy `updateProfileSuccess` en el reducer — el response del PUT ya es el perfil actualizado del paciente editado, alcanza con lo existente si el reducer pisa `profile`).
- [ ] Error 403 → mensaje del front vía `mapApiError` (agregar mapeo específico si el backend devuelve un código identificable: "No podés editar los datos de este familiar porque tiene su propia cuenta en el portal.").
- [ ] Tests: service (URL con y sin patientId), reducer/effects, y lógica `canEditSelected` del componente.

### Gate de cierre

- [ ] Backend: `mvnw.cmd test` verde; front: `npm test` + `npm run build` verdes.
- [ ] E2E manual con Playwright contra el stack local (requiere backend con los cambios corriendo): con Carlos (30123456), seleccionar "mateo" (dependiente sin cuenta) → botón visible → editar teléfono → GET refleja el cambio; seleccionar un familiar CON cuenta → botón oculto; PUT directo con patientId de familiar con cuenta → 403.
- [ ] PRs contra `development` en ambos repos linkeando el ticket; el PR del front declara dependencia del PR del back.

**Out of scope:** cambiar contraseña/email de login de familiares; edición de nombre/DNI/fecha de nacimiento (datos identitarios — flujo de secretaría); UI de "invitar a crear cuenta".
