# Spec C — PR drafts (ready to open after smoke E2E)

## Backend PR

```bash
gh pr create --base development --head feat/turnos-spec-c --title "feat(turnos): Spec C backend — patient portal endpoints" --body "..."
```

### Body

```
## Summary

- Habilita el flujo del paciente externo (rol EXTERNO) en el backend
- 4 endpoints nuevos: register-patient (público), sucursales/public (público), catalog/tipos-analisis (EXTERNO), patients/me/family (EXTERNO)
- 2 endpoints adaptados: GET /appointments?mine=true y PATCH /cancel abren a EXTERNO con ownership check
- Migraciones V55 (tipos_analisis catalog) + V56 (seed dev localdev-only) — V59 cancelada (users_patients ya cubría el bond familiar)
- Security review pass aplicado: tenant_id predicate agregado a findByPatientIdsOrderByScheduledAtDesc (defense-in-depth)

## Jira

[KAN-28](https://exequielsantoro.atlassian.net/browse/KAN-28)

## Spec

`FRONTEND-PORTAL/docs/superpowers/specs/2026-05-22-turnos-spec-c-portal-design.md` (en el repo del portal)

## Tests

- 540 total / 539 pass / 1 pre-existing fail (AddAnalysisListTransactionTest, no relacionado con Spec C)
- 33 nuevos tests Spec C: 22 use cases + 11 controllers — todos verdes

## Notas

- Required by frontend PR https://github.com/TUP-TESIS-LAB/FRONTEND-PORTAL/pull/new/feat/turnos-spec-c — mergear este primero
- TODO documentados (siguen específicamente fuera de scope): rate-limit en endpoints públicos, integration test cross-tenant, refactor de patrón duplicado "resolve current user → tenantId" (3 use cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Frontend PR

```bash
gh pr create --base development --head feat/turnos-spec-c --title "feat(turnos): Spec C portal — wire patient flow" --body "..."
```

### Body

```
## Summary

- Wire de mockups del portal a backend real
- Auth stack nuevo signal-based (AuthService + AuthInterceptor + authGuard)
- ApiErrorMapper traduce excepciones del backend a mensajes user-friendly
- Wizard /turnos/sacar de 5 pasos: nuevo step 0 "Para quién" + integración con AppointmentService
- Servicios nuevos: TipoAnalisis, SucursalPublic, Family, Appointment
- Mappers: appointmentToTurno con cobertura de los 7 status del backend
- Mock services obsoletos eliminados (TurnoService, SacarTurnoService, FamiliaService)
- Vitest setup nuevo en el portal (config + setup + 23 tests pasando)

## Depende de

PR backend Spec C — debe mergear primero (endpoints reales)

## Jira

[KAN-28](https://exequielsantoro.atlassian.net/browse/KAN-28)

## Spec + plan

- `docs/superpowers/specs/2026-05-22-turnos-spec-c-portal-design.md`
- `docs/superpowers/plans/2026-05-22-turnos-spec-c-portal.md`

## Tests

- 23 vitest pasando (ApiErrorMapper x9, AuthService x3, AuthInterceptor x3, appointmentToTurno x8)
- Build limpio (1.79 kB sobre presupuesto inicial bundle, no bloqueante)

## Smoke E2E manual

Pendiente del user — ver `docs/superpowers/specs/2026-05-22-turnos-spec-c-smoke-checklist.md`. Bugs encontrados se anotan acá antes de mergear.

## Notas

- TipoAnalisis.id widened a number|string temporalmente para compatibilidad con mockup; narrow a number cuando se elimine el último usage string del mockup (TODO menor)
- Sede.telefono y .horario quedan undefined — backend no los expone aún (TODO)
- /register: nombreCompleto se splitea en firstName/lastName (primer space) — UX opcional: cambiar form a 2 inputs separados

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## How to open the PRs

Once the user validates the smoke E2E checklist:

```bash
# Backend (do this first)
cd Backend
gh pr create --base development --head feat/turnos-spec-c \
  --title "feat(turnos): Spec C backend — patient portal endpoints" \
  --body "$(cat <<'EOF'
## Summary
...paste body from above...
EOF
)"

# Frontend (after backend PR is open)
cd FRONTEND-PORTAL
gh pr create --base development --head feat/turnos-spec-c \
  --title "feat(turnos): Spec C portal — wire patient flow" \
  --body "$(cat <<'EOF'
## Summary
...paste body from above...
EOF
)"
```

Or open both URLs directly in browser:
- Backend: https://github.com/TUP-TESIS-LAB/Backend/pull/new/feat/turnos-spec-c
- Frontend: https://github.com/TUP-TESIS-LAB/FRONTEND-PORTAL/pull/new/feat/turnos-spec-c

---

## Smoke E2E — 2026-05-24 (contra `feat/turnos-combined`)

**Status: PASSED CON OBSERVACIONES.**

Smoke ejecutado contra **backend combinado A+B+C** (branch nuevo `feat/turnos-combined` con merge de `feat/turnos-specs` + `feat/turnos-spec-c` y renumeración de migraciones V58 / V901). El portal frontend siguió en `feat/turnos-spec-c`.

Para abrir los 3 PRs reales: el backend va desde `feat/turnos-combined` (NO desde `feat/turnos-spec-c` ni `feat/turnos-specs` por separado), porque el merge de C sobre A/B y la renumeración ya están commiteados ahí. Frontend-lab se queda en `feat/turnos-specs`. Portal se queda en `feat/turnos-spec-c`.

### Resultado por flow

| Flow | Status | Notas |
|------|--------|-------|
| Registro paciente externo | ✓ PASS | Auto-login al confirmar (devuelve JWT con `roles: [EXTERNO]`). |
| Login externo | ✗ NO TESTED | `auth.service.ts` pega `/api/v1/auth/login` que no existe en el backend (ver Bug 3 abajo). Bloqueante para el flow logout → re-login. |
| Sacar turno propio + cancelar | ✓ PASS | Wizard 5 steps, confirma, lista, cancela. Status `CANCELLED` en DB. |
| Familia (seed manual) + sacar turno hija | ✓ PASS | Bond `HIJA` resuelto, wizard skipea step `para-quien` por `?personaId=`. |
| Security: PATCH cancel ajeno → 403 | ✓ PASS | Verificado con curl. Token de user A intenta cancelar appointment de user B → `403 "appointment-not-owned"`. |
| Security: JWT expirado → redirect login | ✓ PASS | Interceptor 401 funciona. |
| Browser console + Network | ✓ PASS | Sin errors rojos. Headers `Authorization` correctos. |

### Bugs críticos fixed durante el smoke

Todos commiteados durante la sesión. Forman parte del PR.

#### Backend (`feat/turnos-combined`)

| Commit | Bug | Causa |
|---|---|---|
| `cf49a88` | `register-patient` devolvía 401 "Tenant could not be resolved" | `UserJpaAdapter.save()` no seteaba `tenantId` en la entity; el `TenantEntityListener` @PrePersist tiraba sin contexto. |
| `5f70e08` | Mismo 401, etapa siguiente | `UserPatientJpaAdapter.save()` con el mismo gap. |
| `56abb9d` | Todos los endpoints `/turnos/*` y `/empresa/*` devolvían 403 al user recién registrado | `RegisterPatientUseCase` creaba el User con `List.of()` roles; faltaba asignar el role `EXTERNO`. |
| `7980bc5` | Test que rompió por el constructor nuevo | Wire `RoleRepositoryPort` mock. |
| `33e31e6` | `GET /empresa/patients/me/family` devolvía 500 LazyInitException | `ListMyFamilyUseCase` no era `@Transactional`; el mapper iteraba la colección lazy `userRoles` fuera de sesión. |
| `7a51dce` | Mismo 500 en `GET /turnos/appointments?mine=true` | Movido el `@Transactional(readOnly = true)` al adapter `findByUsernameAndTenantId` para cubrir todos los callers de una vez. |

#### Frontend Portal (`feat/turnos-spec-c`)

| Commit | Bug | Causa |
|---|---|---|
| `af88bca` | 404 en cualquier `/api/*` desde el browser | Faltaba `proxy.conf.json` + referencia en `angular.json`. Sin proxy, el Angular dev server respondía 404 a `/api/*`. |
| `581370b` | Tenant slug `castillo-chidiak` hardcodeado para localhost | `tenant-resolver.ts` no soportaba `?tenant=` y el default no matcheaba el seed del backend (`lab-demo`). Soporta query param + cambia default. |
| `ba01d4d` | Step 0 del wizard mostraba sólo "Yo" (1 sola card) post-registro | Lógica de preselect no auto-skipeaba cuando family.length === 1. |
| `f798ee8` | Step 0 visible en el stepper aunque no se navegue | Refactor: `steps` ahora es computed que omite `para-quien` cuando family <= 1 o vino con `?personaId=`. Switch del template pasa de numeric a string id. |
| `bf46c6d` | Datepicker permitía elegir fechas que el backend rechazaba (400) | UI ahora computa `minBookingDate = today + 2 días` matcheando la regla del backend. |

### Seeds dev agregadas (no van a prod)

Ambas viven en `Backend/src/main/resources/db/migration-local/` y sólo cargan con profile `local`.

| Migración | Qué seedea | Por qué |
|---|---|---|
| `V902__seed_local_dev_branches.sql` | 3 branches (CENTRAL, NORTE, SUR) sin address | El wizard step `sede` necesita branches; no había seed. CRUD de sucursales lab pendiente. |
| `V903__seed_local_dev_agenda_configs.sql` | 1 agenda por branch, lun-vie 9-17, slots 30min, 2 pacientes/slot | `GetAvailableSlotsUseCase` necesita rows en `agenda_configs` para generar slots. CRUD de agendas lab (Spec A) pendiente. |

### Bugs y polish anotados para follow-up (NO bloquean PR)

#### Bloqueante práctico para uso real (Bug 3)

- **Login del portal externo no funciona.** `FRONTEND-PORTAL/src/app/core/auth/auth.service.ts:33` pega `POST /api/v1/auth/login` con body `{ dni, password, tenantSlug }`. El backend NO tiene esa ruta — sólo expone `/api/v1/auth/internal/login` (staff) y `/api/v1/auth/external/login` (toma `{ email, password }` + header `X-Tenant-Id`).
  - Tres mismatches simultáneos: path, identifier (email vs dni), tenant resolution (header vs body).
  - Workaround durante el smoke: registrarse devuelve un JWT que el portal usa directo (auto-login). Si el user hace logout, no puede volver a entrar.
  - Fix correcto: crear `POST /api/v1/auth/login-patient` gemelo de `/register-patient` (toma `{ dni, password, tenantSlug }`, resuelve tenant del slug, lookup user por DNI). O alternativo: que el portal use email + cambie a `/external/login`. Decisión es de spec, no se aplicó en esta sesión por scope.

#### UX polish pendiente

- **Mobile sticky footer del wizard.** Tuvimos 5+ iteraciones sobre el "espacio raro abajo de los botones". El último estado deja el bottom-nav oculto cuando el wizard está abierto y el footer con `max(--space-3, --ds-safe-bottom)` de padding-bottom. Sigue habiendo posible refinamiento (revisar con inspector + screenshots en device real). Está suficiente para el smoke; refactor visual entra en una pasada UX dedicada.
- **Layout step `fecha-hora` feo.** Datepicker + time slots conviven en el step pero la disposición vertical no respeta bien los espacios en mobile. Requiere mockup nuevo. NO se tocó.
- **Family card minimal.** Bajamos a "avatar + nombre + vinculo·edad + 3 acciones" para destrabar el smoke (sin esto los botones quedaban fuera de pantalla en mobile). El user pidió "como tarjetitas, sólo con el nombre" — se puede ir más lejos en una pasada UX, por ejemplo quitar el avatar circular y dejar sólo nombre + chevron de acción.
- **Stats + próximo turno de family card.** Removidos porque el backend no devuelve esos datos en MVP (`totalTurnos` / `totalEstudios` eran mocks). Re-introducirlos cuando los endpoints existan.
- **Cobertura en family meta line.** Idem — backend no la devuelve en MVP, dropeada del render.
- **Tenant switcher (color picker bottom-left).** Removido del `app.ts`. Era un dev helper. Si se necesita seguir alternando tenants en localhost, ya hay `?tenant=<slug>` que respeta el resolver.

#### Negocio / arquitectura

- **Regla "today + 2 días" hardcoded.** Vive en `GetAvailableSlotsUseCase:58` (`MIN_ADVANCE_DAYS = 2`), `CreateAppointmentUseCase:42` y `RescheduleAppointmentUseCase:44`. Tres lugares con el mismo número. Debería ser config (por tenant? por agenda?) y centralizado. NO se tocó.
- **Slot 404 vs 403 ordering.** `PATCH /appointments/{id}/cancel` con id inexistente devuelve 404 antes de chequear ownership. Si en el futuro se quiere que un atacante no pueda probar IDs existentes, debería devolver 403 (o 404 consistente). Defensa actual está bien para MVP.
- **Tenant config duplicado entre front y back.** `tenant.service.ts:33` tiene un `TODO` para reemplazar el JSON estático por `GET /api/tenants/<slug>/config`. El backend ya tiene los datos (`tenant_white_label`). Es deuda heredada de antes del Spec C — la dejamos como está, se anota.
- **`AnonymousTenantFilter` y los paths nuevos.** Spec C agregó `/api/v1/auth/register-patient` a `SELF_RESOLVING_AUTH_PATHS`. Cuando se cree `/login-patient` (ver Bug 3), también hay que sumarlo ahí.

#### Encoding gotcha

- Si seedeás con `docker exec mysql -e "INSERT ... 'Lucía' ..."` sin `--default-character-set=utf8mb4`, los caracteres con tilde se guardan double-encoded (`Lucía` → `LucÃ­a`). Pasar el flag siempre o usar `SET NAMES utf8mb4` antes del INSERT. No aplica a producción (Spring usa el driver MySQL Connector/J que ya configura utf8mb4) — sólo afecta seeds manuales por consola.

### Cómo reproducir el smoke localmente

1. `docker compose up -d` (MySQL + Adminer).
2. `cd Backend && git checkout feat/turnos-combined`
3. Si tenés data vieja: `mysql -u root -proot -e "DROP DATABASE laboratorio; CREATE DATABASE laboratorio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`
4. `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` (carga V900 admin@test.com + V901 tipos_analisis + V902 branches + V903 agendas).
5. `cd FRONTEND-PORTAL && git checkout feat/turnos-spec-c && npm start`
6. Abrir `http://localhost:4200/` — default tenant es `lab-demo`. Registrarse con DNI nuevo + password con mayúscula + número.
7. Sacar turno propio → elegir tipo, sede, fecha **≥ hoy + 2 días, lun-vie**, slot, confirmar.
8. Para probar familia: SQL adjunto al final del checklist 2026-05-22 (con el fix `--default-character-set=utf8mb4` en el cliente). Refrescar `/familia` → sacar turno desde card de Lucía.
9. Security: ver sección "Security checks" del checklist 2026-05-22.

---

## Hallazgos del smoke A — 2026-05-24 (lab frontend contra `feat/turnos-combined`)

Smoke A se arrancó después del smoke C y el fix del Bug 3. Resumen al cierre:

### Fixes aplicados durante el smoke A

- **`feat(turnos)`** (`FRONTEND-LABORATORIO` `feat/turnos-specs`): cableé `StepSucursalComponent` al endpoint real `GET /api/v1/sucursales/branches` (antes tenía 3 branches mockeadas hardcodeadas). Service nuevo `listBranchesForSelector()` en `SucursalesService`. Sin esto, el wizard guardaba con `branchId` de mock → FK violation en backend.
- **`feat(seed)`** (`Backend` `feat/turnos-combined`, V904): activé todos los módulos para tenant 1 en `tenant_modules`. Sin esto, `moduleActiveGuard` del lab redirigía a home cuando intentábamos abrir `/turnos/configuracion`.
- **`fix(turnos)`** template stack (`agenda-branch-section.component.html`): agregué `<span class="p-column-title">` en cada `<td>` para que en viewports angostos (responsive `breakpoint="768px"`) se vean los labels al lado de cada valor. Sin esto sólo se veían datos sueltos.

### Bugs abiertos detectados

**1. `moduleActiveGuard` con race condition contra `loadTenantConfig` (lab)**

`canMatch` corre antes de que el effect `loadTenantConfig` propague la respuesta al NgRx store. `ModuleRegistry.isActive(Turnos)` lee `config?.modules.includes(...)` con `config === null` → guard devuelve UrlTree('/') → wildcard redirige a `/home`. Pasa incluso post-login válido con V904 ya aplicado y endpoint devolviendo `"turnos"` en la respuesta.

Workaround en la sesión: bypass temporal del guard comentando `canMatch` en `app.routes.ts:48` (NO commiteado, queda como working-tree change). Re-habilitar antes del PR.

Fix correcto: convertir `moduleActiveGuard` a async esperando que la config esté cargada (`store.select(selectTenantConfig).pipe(filter(c => c !== null), take(1), map(c => c.modules.includes(key)))`).

**2. Inconsistencia formato `recurring_days_of_week` entre Spec A y Spec B/C en el backend**

- Spec A escribe en formato enum string (`'MONDAY,TUESDAY,...'`) — el frontend lab usa `formatDays` con ese mapping.
- Spec B/C lee en formato numérico ISO (`'1,2,3,4,5'`) — `GetAvailableSlotsUseCase:99` parsea `Integer.parseInt`.
- Mi seed V903 puso formato numérico (para que el portal funcione) → la lista del lab muestra "1 2 3 4 5" en vez de "L M X J V" para esa fila.

Decisión pendiente: estandarizar a uno. Sugerencia: numérico ISO (más estable, sin dependencia de Locale enum). Migrar el writer de Spec A + el formatter del lab.

### UX pendientes anotados

- **Rediseñar el wizard de creación de agendas en el lab** usando el mismo patrón de stepper fluido de 4 pasos del portal (sacar-turno). La UI actual del wizard de agendas se ve mal — pedido del user en el smoke.
- **Add sidebar item para "Configuración de Agendas"** en el lab — no existe item de navegación, el user tuvo que pegar la URL a mano.
- **Mensaje de error "overlapping"**: el backend devuelve "An agenda configuration with overlapping time range and date period already exists for this branch" en inglés. UX del lab debería traducir + dar contexto (qué horario/fecha colisiona).
- **Error handling general del wizard de agendas**: el user reportó al cerrar smoke A que los manejos de error son crudos (mensajes técnicos del backend salen tal cual al toast). Sugerencia: mapper `apiErrorToHumanMessage` que conozca los casos comunes (overlapping, validation, no auth, etc.) y devuelva copys en español. Mismo patrón que `mapApiError` del portal pero más específico para el flow de agendas.

### Smoke A — Resultado final

✓ **PASS** después de los fixes arriba. User pudo:
1. Login admin@test.com / password en lab.
2. Navegar a `/turnos/configuracion` (con bypass temporal del moduleActiveGuard).
3. Ver lista de agendas seedeadas (con labels en stack mode).
4. Eliminar agenda existente con botón 🗑.
5. Crear nueva agenda con horario distinto (no overlapping) → guarda OK → aparece en lista.

---

## Hallazgos del smoke B — 2026-05-24 (cola + TV display)

### Pages implementadas vs stubs

| Page | Estado | Detalle |
|---|---|---|
| `/turnos/recepcion` | ✓ Real (43 líneas) | Lista turnos de hoy, botón "Atender" → atencion-turno |
| `/display/:slug/:branchId` | ✓ Real (115 líneas) | TV pública, polling cada 3s, beep al cambiar el `calledEntry` |
| `/turnos/totem` | ✗ Stub (11 líneas) | Sólo icono `pi-desktop`. Sin flow de DNI + branch + check-in |
| `/turnos/atencion-turno` | ✗ Stub (11 líneas) | Sólo icono. Sin botones para llamar / marcar atendido |

### Fixes aplicados durante el smoke B

- **`fix(lab)`** (`FRONTEND-LABORATORIO`): proxy.conf.json mapeaba sólo `/api` → la TV pegga `/public/display/...` y la dev-server devolvía la SPA HTML, dejando el snapshot null y la TV en estado 'loading' eterno. Agregar `/public` al proxy.
- **`fix(turnos)`** (`FRONTEND-LABORATORIO`): `AppointmentService.listToday` consumía el backend asumiendo fields `appointmentTime` + `patientName` que no existen en la respuesta. Mapear `scheduledAt` → `appointmentTime` y usar `confirmationNumber` como nombre visible temporal.

### UX gaps detectados (anotados para próxima iteración)

- **"Atender" en recepción debería llamar + abrir atención de una**. Hoy el botón redirige a atencion-turno (que es stub). Idealmente el endpoint que dispara desde "Atender" debería:
  1. Crear (si no existe) un `queue_entry` con `has_appointment=true` linkeado al `appointment_id`.
  2. Llamar al paciente (`POST /turnos/queue/{id}/call` — setea `last_called_at`).
  3. Navegar a `/turnos/atencion-turno?queueEntryId=N` donde queda la sesión abierta hasta marcar COMPLETED.

  El flujo actual de "ir a atención, después llamar manual" tiene un click extra que la recepcionista no necesita. La observación es del user durante el smoke B. Requiere: implementar la página atencion-turno (hoy stub) + cablear `onAtender` para hacer ambas acciones.
- **Beep de la TV bloqueado por autoplay policy**: `Audio.play()` requiere interacción previa del user con la tab. La TV moderna fija sin click previo nunca puede sonar. Workaround típico: mostrar un overlay "Click para activar sonido" la primera vez, después el beep va sin trabas. Anotar.
- **Tótem es stub**: hay tabla `branch_totem_config` + endpoints para habilitar/deshabilitar (`POST /sucursales/branches/{id}/totem-config`), pero la página `/turnos/totem` no tiene UI de ingreso de DNI ni check-in. Es la pieza más grande que falta de Spec B.
- **Atención-turno es stub**: necesita UI para llamar al siguiente (otra vez), marcar como atendido, asignar box. Cierra el flow.

### Smoke B — Resultado parcial

✓ **Recepción** PASS (con fixes arriba).
✓ **TV** PASS — muestra entries pending, refresca cada 3s, el entry llamado via curl `POST /turnos/queue/{id}/call` aparece como card grande dentro de los 15s siguientes.
✗ **Tótem** y **Atención-turno** NOT TESTED — son stubs, sin flow para smokear.

Llamado via curl validado con `POST /api/v1/turnos/queue/1/call` (token ADMINISTRADOR): devuelve `{id, lastCalledAt, callCount, status}` y se refleja en la TV.

### Seeds dev nuevas para smoke B

- 5 queue_entries (4 en CENTRAL: A001 PENDING, A002 PENDING, A003 PENDING-called, A004 COMPLETED; 1 en NORTE B001 PENDING).
- 4 appointments con `scheduled_at = CURRENT_DATE` en CENTRAL (TODAY-001..004).

Insertados manualmente via `docker exec mysql` durante la sesión — NO en migration. Si querés que el smoke B sea reproducible from-zero, mover a `V905__seed_local_dev_queue_demo.sql` (o similar). Hoy quedó como data ad-hoc en la DB local.

### Seeds que ya cubren el escenario dev del lab

Por ahora `V902` (3 branches), `V903` (1 agenda por branch lun-vie 9-17) y `V904` (todos los módulos del tenant activos) destraban el smoke A. Si alguien quiere crear NUEVAS agendas en el wizard, tiene que elegir horarios/días que no se superpongan con la seed (ej. 18-22 lun-vie) o eliminar la agenda existente primero.

