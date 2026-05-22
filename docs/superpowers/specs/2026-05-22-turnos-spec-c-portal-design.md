# Spec C — Reserva de turnos del paciente externo (portal)

> **Jira:** [KAN-28](https://exequielsantoro.atlassian.net/browse/KAN-28)

**Fecha:** 2026-05-22
**Repos afectados:** `Backend/` (módulos TURNOS, SUCURSALES, EMPRESA) + `FRONTEND-PORTAL/`
**Ramas:** `feat/turnos-spec-c` en ambos
**Predecesores:** Spec A (config agendas) y Spec B (cola + TV) — código completo en ramas `feat/turnos-specs`
**Aprobación de enfoque:** Approach A — adaptación pura del mockup existente

## Cambios post-exploración (2026-05-22)

Task 1 del plan ejecutó la exploración del modelo Patient. Hallazgo clave: **`users_patients` (V7) ya existe con un modelo completo de bond familiar** (`user_id`, `patient_id`, `bond` enum con `PROPIO/MADRE/PADRE/HERMANO/HERMANA/HIJO/HIJA/TUTOR/OTROS`, `is_owner`, `status`). El `PatientFamilyPort` se backa contra esa tabla, NO contra una nueva FK en `patients`. La migración V59 originalmente propuesta queda **cancelada**. La última migración en `development` es V54, por lo que las migraciones de Spec C usan V55 (tipos_analisis) y V56 (seed dev). Las secciones §3.3.1, §3.3.3 y §3.4 reflejan estos ajustes.

---

## 1. Resumen ejecutivo

Spec C cierra el módulo TURNOS habilitando al paciente externo (rol `EXTERNO`) a operar contra el portal multi-tenant: login, registro propio, ver y cancelar sus turnos, y sacar turno para sí mismo o un familiar a su cargo. El portal ya tiene mockup completo de todas las pantallas con servicios mock — Spec C adapta esos servicios a HTTP real y cubre los gaps del backend.

**Alcance MVP (Standard + familia + register):**
- Crear turno (self o familiar)
- Listar mis turnos + de familiares
- Cancelar propio (dentro de ventana de 24h ya validada por backend)
- Login EXTERNO con DNI + password + tenantSlug
- Register de paciente nuevo (auto-login, sin email verification)
- Selección de familiar en wizard como paso 1 nuevo

**No-MVP (explícitos como TODO):**
- Reprogramar turno por paciente (UI ya muestra "Próximamente")
- Agregar familiar desde portal (UI ya muestra "Próximamente")
- Email verification post-register
- Upload de orden médica
- Pago / cobertura / obra social
- Notificaciones email / SMS / recordatorios
- Backoffice de catálogo de tipos de análisis (CRUD en LABORATORIO)

---

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND-PORTAL (Angular 17+ standalone, signals, PrimeNG)     │
│                                                                  │
│  Auth stack (NEW)         Catalog services (NEW)                │
│  ├ AuthService            ├ TipoAnalisisService                 │
│  ├ AuthInterceptor        ├ SucursalPublicService               │
│  ├ authGuard              ├ FamilyService                       │
│  └ ApiErrorMapper         └ AppointmentService (replaces        │
│                              TurnoService + SacarTurnoService)  │
│                                                                  │
│  Componentes adaptados                                          │
│  ├ /login          → wire AuthService.login                     │
│  ├ /register       → wire AuthService.register                  │
│  ├ /turnos         → wire AppointmentService.getMyAppointments  │
│  ├ /turnos/sacar   → wizard 5 pasos (nuevo step "Para quién")   │
│  └ /familia        → wire FamilyService.list (CRUD = TODO)      │
└─────────────────────────────────────────────────────────────────┘
                            ↕ HTTP
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — endpoints                                             │
│                                                                  │
│  Existentes (wire-only)     Adaptados (abrir EXTERNO)           │
│  ├ POST /auth/login         ├ GET /appointments?mine=true       │
│  ├ POST /appointments       └ PATCH /appointments/{id}/cancel   │
│  ├ GET  /availability                                            │
│  └ GET  /appointments/{id}                                      │
│                                                                  │
│  Nuevos (Spec C los crea)                                       │
│  ├ POST /auth/register-patient            (público)             │
│  ├ GET  /sucursales/public?slug=X         (público)             │
│  ├ GET  /turnos/catalog/tipos-analisis    (EXTERNO)             │
│  └ GET  /empresa/patients/me/family       (EXTERNO)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend — cambios detallados

### 3.1 Módulo TURNOS

#### 3.1.1 Nueva entidad `TipoAnalisis` (catalog)

Catálogo agregado UX-friendly que el portal expone como "tipo de análisis" (Hemograma, Perfil lipídico, etc.). Cada tipo agrupa N determinaciones reales del laboratorio.

**Tabla `tipos_analisis`** (Flyway `V58__create_tipos_analisis.sql`):
```
id BIGSERIAL PK
tenant_id VARCHAR NOT NULL                  -- BaseJpaEntity
nombre VARCHAR(120) NOT NULL
descripcion_corta VARCHAR(255)
categoria VARCHAR(40) NOT NULL              -- 'hematologia' | 'bioquimica' | 'hormonas' | 'orina' | etc.
ayuno BOOLEAN NOT NULL DEFAULT FALSE
icono VARCHAR(40)                            -- 'pi-chart-bar', clase PrimeIcons del mockup
preparacion JSONB                            -- array de strings con instrucciones de preparación
active BOOLEAN NOT NULL DEFAULT TRUE
deleted_at TIMESTAMP
created_at TIMESTAMP NOT NULL DEFAULT NOW()
updated_at TIMESTAMP
UNIQUE (tenant_id, nombre)
```

**Tabla puente `tipo_analisis_determinations`** (M:N, misma migración):
```
tipo_analisis_id BIGINT FK NOT NULL
determination_id BIGINT FK NOT NULL
PRIMARY KEY (tipo_analisis_id, determination_id)
```

**Seed dev** (Flyway `V60__seed_local_dev_tipos_analisis.sql`, profile-locked igual al seed admin@test.com):
- 6 tipos para el tenant demo, matchea los hardcoded del mockup (`SacarTurnoService.TIPOS_ANALISIS_MOCK`)
- Cada tipo con 1-4 determinations linked (asume que hay seeds previos de determinations — verificar en `/sdd-explore`; si no, agregar seed mínimo)

**Use case `ListTiposAnalisisUseCase`:**
- Input: ninguno (tenantId resuelto del JWT)
- Output: `List<TipoAnalisisResponse>` con `{ id, nombre, descripcionCorta, categoria, ayuno, icono, preparacion[], determinationIds[] }`
- Filtra `active=true` y `deletedAt IS NULL`

**Endpoint:** `GET /api/v1/turnos/catalog/tipos-analisis` — auth `EXTERNO` + staff (todos los roles que sacan turno). `TenantModuleGuard.requireEnabled(TURNOS)`.

#### 3.1.2 `AppointmentController.list()` adaptado

**Antes:** roles staff (`ADMINISTRADOR`, `RESPONSABLE_SECRETARIA`, `SECRETARIA`), recibe `patientId/branchId/date/page/size`.

**Después:** agrega `EXTERNO` cuando query param `mine=true`.

```java
@GetMapping
@PreAuthorize("hasAnyRole('ADMINISTRADOR','RESPONSABLE_SECRETARIA','SECRETARIA') "
            + "or (hasRole('EXTERNO') and #mine == true)")
public List<AppointmentResponse> list(
    @RequestParam(required = false) Long patientId,
    @RequestParam(required = false) Long branchId,
    @RequestParam(required = false) LocalDate date,
    @RequestParam(defaultValue = "false") boolean mine,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size) {
  if (mine) {
    return listMyAppointmentsUseCase.execute(page, size);
  }
  return listAppointmentsUseCase.execute(patientId, branchId, date, page, size);
}
```

**`ListMyAppointmentsUseCase` (nuevo):**
- Resuelve `currentUserId()` del JWT
- Llama `PatientFamilyPort.resolveOwnedPatientIds(userId)` → set de patientIds permitidos (self + familiares)
- Devuelve appointments de cualquier `patientId ∈ set` ordenado por `scheduledAt DESC`
- Ignora query params `patientId/branchId/date` cuando `mine=true` (evita IDOR)

#### 3.1.3 `AppointmentController.cancel()` adaptado

**Antes:** roles staff sin EXTERNO.

**Después:** agrega EXTERNO con ownership check.

```java
@PatchMapping("/{id}/cancel")
@PreAuthorize("hasAnyRole('ADMINISTRADOR','RESPONSABLE_SECRETARIA','SECRETARIA','EXTERNO')")
public ResponseEntity<Void> cancel(@PathVariable Long id) {
  cancelAppointmentUseCase.execute(id);
  return ResponseEntity.noContent().build();
}
```

**`CancelAppointmentUseCase` enriquecido:**
- Acepta el `userId` del SecurityContext
- Si rol EXTERNO: valida que `appointment.patientId ∈ PatientFamilyPort.resolveOwnedPatientIds(userId)`. Si no → `ForbiddenAccessException` (nuevo, mapeado 403)
- Si rol staff: comportamiento actual
- Mantiene la ventana de 24h existente

### 3.2 Módulo SUCURSALES

**Nuevo endpoint público `GET /api/v1/sucursales/public?slug={tenantSlug}`:**

- **Sin auth** — registrado en `SecurityConfig.permitAll()` igual que `/public/display/{slug}/{branch}/queue` de Spec B
- Resuelve `tenantId` desde slug via `TenantSlugResolver` (ya existe per memoria de Spec B)
- Filtra `active=true`
- Response shape minimal (NO incluye `BranchTotemConfig` ni otros campos sensibles):
  ```json
  [{ "id": 1, "nombre": "Sede Centro", "direccion": "...", "telefono": "...", "horario": "L-V 7:00-19:00" }]
  ```
- **Implicación security:** documentar en `/security-review` que este endpoint expone datos parciales de sucursales públicamente — es información de marketing, aceptable; pero rate-limit aplicable

### 3.3 Módulo EMPRESA

#### 3.3.1 Modelo `Patient` — vínculo familiar (resuelto por Task 1)

**Resolución post-exploración:** el backend ya tiene una tabla `users_patients` (V7) que modela la relación user ↔ paciente con bond familiar. Estructura existente:

```
users_patients(
    user_id BIGINT NOT NULL FK → users(id),
    patient_id BIGINT NOT NULL,
    bond VARCHAR(20)        -- enum UserPatientBond
                            -- valores: PROPIO, MADRE, PADRE, HERMANO,
                            --         HERMANA, HIJO, HIJA, TUTOR, OTROS
    is_owner BOOLEAN,
    status VARCHAR(20)      -- CREATED | VERIFIED | REJECTED
)
```

**No se agrega ninguna columna a `patients` ni se crea V59.** El `PatientFamilyPort` se backa contra `users_patients` vía `UserPatientJpaRepository.findByUser_IdAndTenantId()` (ya existente). El use case `GetPatientsByUserUseCase` en `modules/empresa` ya implementa parte de la lógica.

**Implicaciones para el frontend (§4):** el enum `UserPatientBond` se mapea al enum `Vinculo` del mockup:
- `PROPIO` → `'Yo'`
- `MADRE` → `'Madre'`, `PADRE` → `'Padre'`
- `HIJO` → `'Hijo'`, `HIJA` → `'Hija'`
- `HERMANO`/`HERMANA` → `'Otro'` (el mockup no distingue hermanos; agregar al enum si UX lo pide)
- `TUTOR`/`OTROS` → `'Otro'`
- El mockup tiene `'Cónyuge'` pero el backend no — queda como TODO mapping si se necesita.

#### 3.3.2 `User ↔ Patient` link (resuelto por Task 1)

Confirmado: existe la tabla `users_patients` con FK `user_id`. El binding es N:M en general pero para el MVP usamos solo el "owner" (el paciente con `is_owner=true` y `bond=PROPIO`) como responsable, y los demás como dependientes.

#### 3.3.3 Nuevo endpoint `GET /api/v1/empresa/patients/me/family`

**Auth:** `EXTERNO`

**Use case `ListMyFamilyUseCase`:**
- Resuelve `currentUserId()` → `User EXTERNO`
- Resuelve el `Patient` responsable linkeado al user
- Devuelve `List<PatientResponse>`: primer item es el responsable (con `vinculo=null`), seguido de todos sus dependientes ordenados por `created_at ASC`

**Response:**
```json
[
  { "id": 10, "nombre": "María", "apellido": "García", "dni": "30123456",
    "fechaNacimiento": "1990-05-12", "vinculo": null, "responsablePatientId": null },
  { "id": 12, "nombre": "Lucía", "apellido": "García", "dni": "55123456",
    "fechaNacimiento": "2018-03-08", "vinculo": "HIJA", "responsablePatientId": 10 }
]
```

**Nuevo puerto `PatientFamilyPort`** (backed by existing `users_patients` via `UserPatientJpaRepository`):
- `resolveOwnedPatientIds(userId): Set<Long>` — usado por TURNOS para ownership checks. Implementación: `userPatientRepo.findByUser_IdAndTenantId(userId, tenantId)` → map a patientIds.
- `listFamily(userId): List<PatientFamilyEntry>` — usado por este endpoint. Implementación: misma query + join con `patients` para traer nombre/dni/fecha_nacimiento.

El existente `GetPatientsByUserUseCase` (`modules/empresa`) ya cubre parte de esto; se puede delegar o adaptar.

**Agregar familiar desde portal: NO en MVP.** El mockup ya muestra toast "Próximamente". El admin del laboratorio carga los dependientes manualmente. **TODO en spec futuro: endpoint `POST /empresa/patients/me/family`.**

#### 3.3.4 Nuevo endpoint `POST /api/v1/auth/register-patient`

**Auth:** público, sin token.

**Request:**
```json
{
  "tenantSlug": "labgarcia",
  "nombreCompleto": "María García",
  "dni": "30123456",
  "email": "maria@example.com",
  "password": "Password123"
}
```

**Validaciones:**
- DNI: 7-8 dígitos, único por tenant
- Email: formato válido + único por tenant
- Password: ≥ 8 chars, al menos 1 mayúscula y 1 número (matchea regex del mockup)
- `tenantSlug`: existe + tenant activo

**Use case `RegisterPatientUseCase`:**
- Transaccional: crea `User(role=EXTERNO)` + `Patient` + linkea
- Hashea password con el mismo encoder que usa staff
- Emite JWT inmediatamente — response: `{ token, user: { id, nombre, dni, email, roles, tenantSlug } }`

**Sin email verification para MVP.** Trade-off: dejamos abierto el endpoint público — riesgo de spam mitigado por rate-limit (a configurar) + captcha pendiente. **TODO en spec futuro: email verification + flow "verificá tu casilla".**

**Security review crítico aquí:**
- Endpoint público escribe en DB → debe tener rate-limit
- Validación estricta de input contra inyección
- Password nunca log
- `tenantSlug` validado antes de cualquier escritura
- No leak de "email ya existe" vs "DNI ya existe" — devolver mensaje genérico ("No se pudo registrar; verificá los datos") con detalle solo en logs

### 3.4 Resumen migraciones Flyway

| Migración | Contenido |
|---|---|
| `V55__create_tipos_analisis.sql` | Tabla `tipos_analisis` + puente `tipo_analisis_determinations` |
| `V56__seed_local_dev_tipos_analisis.sql` | Profile-locked dev — 6 tipos para tenant demo |

**Nota:** la última migración en `development` es V54. V55/V56/V57 viven en la rama `feat/turnos-specs` (Spec B) sin mergear todavía. Si Spec B PR mergea primero, las migraciones de Spec C se renumeran a V58/V59 al resolver el merge conflict. La migración V59 originalmente propuesta para `patients` queda cancelada — `users_patients` (V7) ya cubre el bond familiar.

### 3.5 Security review obligatorio

Backend CLAUDE.md exige `/security-review` en cualquier PR que toque:
- `infrastructure/security/` — sí, agregamos endpoint público `/register-patient`
- Nuevos `@RestController` — sí, 4 nuevos (tipos catalog, sucursales public, family, register-patient)
- Endpoints de auth — sí (`/auth/register-patient`)
- Roles y authorities — sí (abrimos EXTERNO en list + cancel con ownership)

**Flujo:** `/sdd-apply` → `simplify` → `/security-review` → `/sdd-verify` → `verification-before-completion` → `/sdd-archive`.

---

## 4. Frontend portal — cambios detallados

### 4.1 Auth stack (nuevo, en `core/auth/`)

**`AuthService`** (signal-based, sin NgRx):
- State privado: `_currentUser = signal<AuthUser | null>(null)`, `_token = signal<string | null>(null)`
- Computed públicos: `currentUser`, `token`, `isAuthenticated`, `userId`, `patientId`, `roles`
- Métodos:
  - `login(dni, password): Observable<void>` — POST `/auth/login` con `{ dni, password, tenantSlug }` resuelto de `TenantService.config().id`
  - `register(payload): Observable<void>` — POST `/auth/register-patient`, auto-login con el JWT devuelto
  - `logout(): void` — limpia state + `localStorage.removeItem('portal_auth_token')`
  - `loadFromStorage(): void` — corre en bootstrap via `APP_INITIALIZER`; valida que el token no esté expirado parseando el `exp` claim

**`authInterceptor`** (functional, `withInterceptors`):
- Agrega `Authorization: Bearer ${token}` si existe
- Skip-list: `/auth/login`, `/auth/register-patient`, `/sucursales/public`, `/tenants/*` (carga de tenant config)
- En 401 → `authService.logout()` + `router.navigate(['/login'])`

**`authGuard`** (functional `CanActivateFn`):
- Devuelve `true` si `authService.isAuthenticated()`
- Else: `router.navigate(['/login'], { queryParams: { returnUrl: state.url } })`
- Aplicado en `app.routes.ts` al children block del `PatientShellComponent`

**Storage:**
- JWT en `localStorage['portal_auth_token']`. Vida por defecto del backend (sin "remember me" diferenciado — el checkbox del mockup queda como decoración con TODO; el JWT vive lo que diga el backend).

### 4.2 `ApiErrorMapper` (`shared/utils/api-error-mapper.ts`)

Port del patrón de Spec A (`FRONTEND-LABORATORIO/shared/utils/api-error-mapper.ts`).

**Shape esperado:**
```ts
interface ApiErrorResponse {
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: Record<string, string>;
}
```

**Función `mapApiError(err: HttpErrorResponse): string`:**
- Si `err.error` tiene shape `ApiErrorResponse` → mapea por `message` o por status
- Tabla de mapping específica:
  - `SlotUnavailableException` → "Ese horario ya no está disponible. Elegí otro."
  - `MinimumAdvanceBookingException` → "Hay que reservar con al menos 2 días de anticipación."
  - `CancellationWindowExpiredException` → "Ya no se puede cancelar (faltan menos de 24h)."
  - `InvalidBookingDateException` → "Esa fecha no es válida."
  - 401 → "Sesión expirada. Iniciá sesión de nuevo."
  - 403 → "No tenés acceso a este recurso."
  - 409 (duplicate) → "Esos datos ya están registrados."
  - fieldErrors → concatena los mensajes de validación
- Fallback: `err.error?.message ?? "Ocurrió un error. Intentá de nuevo."`

Tests vitest cubren cada caso.

### 4.3 Servicios HTTP nuevos

**`TipoAnalisisService`** (`features/main/turnos/services/`):
- `getTipos(): Observable<TipoAnalisis[]>` — GET `/api/v1/turnos/catalog/tipos-analisis`
- Cache con `shareReplay({ bufferSize: 1, refCount: false })` — vida del proceso
- Modelo `TipoAnalisis` extiende el del mockup agregando `determinationIds: number[]`

**`SucursalPublicService`** (`core/sucursales/`):
- `getSedes(): Observable<Sede[]>` — GET `/api/v1/sucursales/public?slug=${tenantSlug}`
- Cache idem
- Shape compatible con `Sede` del mockup — el campo opcional `distanciaKm` deja de existir o queda `undefined`

**`FamilyService`** (`core/family/`):
- `getFamily(): Observable<Familiar[]>` — GET `/api/v1/empresa/patients/me/family`
- Cache con invalidation manual (`refresh()` method)
- Mapper: convierte `PatientResponse` backend → `Familiar` frontend. Primer ítem siempre tiene `vinculo: 'Yo'` (extender enum `Vinculo`). `iniciales`, `accentColor`, `proximoTurno`, `totalTurnos`, `totalEstudios`, `cobertura` se derivan o quedan placeholders (TODO comments inline).
- `agregar(payload): Observable<never>` → `throwError(() => new Error('Próximamente'))` para mantener el TODO explícito

**`AppointmentService`** (`features/main/turnos/services/`) — reemplaza `TurnoService` + `SacarTurnoService.reservar`:
- `getMyAppointments(): Observable<Turno[]>` — GET `/appointments?mine=true`, mapea response → modelo UI con `appointmentToTurno()`. Split a próximos/anteriores client-side por `scheduledAt`.
- `cancel(id: number): Observable<void>` — PATCH `/appointments/${id}/cancel`
- `book(payload: ReservaPayload): Observable<{ id: number }>` — POST `/appointments` con `{ patientId, branchId, scheduledAt: ISO, comments: null, prescriptionFileUrl: null, determinations: [{ determinationId, orderNumber }] }`. El `orderNumber` es el índice (1, 2, 3...) del orden de selección.
- `getAvailability(branchId: number, date: Date): Observable<SlotDisponible[]>` — GET `/availability?branchId&date=YYYY-MM-DD`

### 4.4 Mapper `appointmentToTurno`

`shared/mappers/appointment-to-turno.mapper.ts`:

```ts
interface MapperContext {
  tiposAnalisis: Map<number, TipoAnalisis>;      // determinationId → tipo
  family: Map<number, Familiar>;                  // patientId → familiar
  sedes: Map<number, Sede>;                       // branchId → sede
}

export function appointmentToTurno(
  ap: AppointmentResponse,
  ctx: MapperContext,
): Turno
```

Comportamiento:
- `personaId/personaNombre/personaIniciales` ← `family.get(ap.patientId)`
- `dia/mes/fechaCompleta/hora` ← formateo de `ap.scheduledAt` con `Intl.DateTimeFormat('es-AR')`
- `tipo` ← join de los nombres de tipos derivados de `ap.determinations[].determinationId` mapeados via `tiposAnalisis`
- `estudios[]` ← idem expandido
- `sede` ← `sedes.get(ap.branchId)`
- `estado/estadoLabel`:
  - `SCHEDULED` → `'pendiente'` / "Pendiente"
  - `CONFIRMED` → `'confirmado'` / "Confirmado"
  - `CANCELLED` → `'cancelado'` / "Cancelado"
  - `COMPLETED` → `'completado'` / "Completado"
  - resto (IN_PROGRESS, NO_SHOW, RESCHEDULED) → `'pendiente'` por defecto + TODO comment
- `preparacion[]` ← merge de `preparacion` de cada tipo elegido (dedup)
- `llegarMinAntes` ← hardcoded `10` (TODO: derivar de config futura)
- `ordenCargada`, `medicoSolicitante`, `duracionEstimada` ← `false/undefined/undefined` con TODO comment

Tests vitest cubren cada estado + cada mapeo + missing data.

### 4.5 Componentes adaptados

| Componente | Cambio |
|---|---|
| `LoginComponent` | `onSubmit()` → `authService.login(dni, password)` con success redirect a `returnUrl` o `/turnos`; error → toast con `mapApiError()`. El campo `rememberMe` queda como decoración con TODO. |
| `RegisterComponent` | `onSubmit()` → `authService.register({ tenantSlug, ...form })`; success → toast "Bienvenido" + redirect a `/turnos`. |
| `TurnosComponent` | Wire `AppointmentService.getMyAppointments()` + mapper. `onCancelar` → `AppointmentService.cancel()` + refresh. `onReprogramar` se queda con toast "Próximamente" (mockup ya lo hace). |
| `SacarTurnoComponent` | Ver sección 4.6. |
| `FamiliaComponent` | Wire `FamilyService.getFamily()`. `onAddFamily` mantiene toast "próximamente". `onSacarTurno` ya navega con `?personaId=X` — no se toca. |

### 4.6 Wizard `SacarTurnoComponent` — paso "Para quién" nuevo

**Nuevo step layout (5 pasos en lugar de 4):**

```
1. Para quién  →  2. Tipo de análisis  →  3. Sede  →  4. Fecha y hora  →  5. Confirmar
```

**Nuevo componente `StepParaQuienComponent`** en `features/main/turnos/sacar/steps/step-para-quien/`:
- Inputs: `family: Signal<Familiar[]>`, `selectedPatientId: Signal<number | null>`
- Output: `selectionChange: EventEmitter<number>`
- Layout: grid 1-3 columnas según breakpoint, cada celda usa `FamilyCardComponent` existente (visual unificado con `/familia`)
- Default: primer ítem ("Yo") preseleccionado
- Empty state: si `family().length === 1` (solo "Yo"), muestra el card único + texto "Si querés sacar turno para un familiar, agregalo en Familia" (link a `/familia`, no acción)

**Comportamiento en `SacarTurnoComponent.ts`:**
- Inyectar `FamilyService` + `ActivatedRoute`
- `family = toSignal(this.familyService.getFamily(), { initialValue: [] })`
- `selectedPatientId = signal<number | null>(null)`
- En `ngOnInit`: leer `route.snapshot.queryParams['personaId']` → si presente, set `selectedPatientId` y `currentStep.set(1)` (skip step 0)
- `canProceed` actualizado: paso 0 requiere `selectedPatientId !== null`
- `onConfirm()` ahora pasa `selectedPatientId` al `AppointmentService.book(...)` como `patientId`

**Mapeo `tipoAnalisisIds` (mockup string ids como 'hemograma') → `determinationIds` (backend number):**
- En el step "Confirmar", el componente resuelve los `determinationIds[]` consolidados desde los tipos elegidos
- Para el MVP, los IDs del mockup ('hemograma', 'glucemia') NO se usan — se reemplazan por los IDs reales devueltos por `TipoAnalisisService` (number)
- `selectedTipoIds: Signal<number[]>` (cambio de tipo: string→number)

### 4.7 Routing

`app.routes.ts`:
- `/login`, `/register`, `/tenant-config` (si existiera): **públicos**, sin guard
- `''` (PatientShellComponent + children): **protegido** con `authGuard`
- `/dashboard`: protegido idem
- `**`: redirect a `''`

`app.config.ts`:
- Registrar `provideHttpClient(withInterceptors([authInterceptor]))`
- `APP_INITIALIZER` que llama `AuthService.loadFromStorage()` antes de bootstrap del router

### 4.8 TenantService — sin cambios en Spec C

El `TenantService` actual carga desde `/assets/tenants/{id}/tenant.config.json`. El backend tiene un endpoint `/tenants/{id}/config` (per spec previo de tenant-smtp-config). **No lo wire-amos en Spec C** — queda como TODO referenciando ese spec. Lo único: el `tenantSlug` para el login/register sale de `TenantService.config()?.id` ya disponible.

---

## 5. Flujos clave (happy paths)

### 5.1 Registro + primer turno

```
1. Patient abre /register
2. Completa form → onSubmit() → AuthService.register({ tenantSlug, nombre, dni, email, password })
3. Backend: RegisterPatientUseCase crea User EXTERNO + Patient + link, devuelve { token, user }
4. AuthService persiste token en localStorage + actualiza signals
5. Redirect a /turnos
6. /turnos llama getMyAppointments + getFamily + tipos (paralelo)
7. Patient click "Sacar turno" → /turnos/sacar (sin queryParam)
8. Step 0 "Para quién": preselect "Yo" → next
9. Step 1 "Tipo": elige 2 tipos → next
10. Step 2 "Sede": elige sede → next
11. Step 3 "Fecha+hora": pick fecha → GET /availability → pick slot → next
12. Step 4 "Confirmar": POST /appointments con { patientId: self, branchId, scheduledAt, determinations: [...] }
13. Toast success + redirect a /turnos → refresh lista
```

### 5.2 Sacar turno para hija (desde Familia)

```
1. Patient logueado en /familia → click "Sacar turno" en card de Lucía
2. Route /turnos/sacar?personaId=12
3. ngOnInit lee queryParam → selectedPatientId = 12 → currentStep = 1 (skipea Step 0)
4. Resto del flujo idéntico a 5.1 desde Step 1
5. POST /appointments con patientId=12 (validado backend: 12 ∈ ownedPatientIds del user)
6. Redirect a /turnos → la lista trae próximamente el turno de Lucía (mine=true incluye familiares)
```

### 5.3 Cancelar turno

```
1. Patient en /turnos → click "Cancelar" en card del turno
2. ConfirmDialog → confirm
3. PATCH /appointments/{id}/cancel
4. Backend: CancelAppointmentUseCase valida ownership (EXTERNO) + ventana 24h → CANCELLED
5. Frontend: toast success + refresh lista
```

### 5.4 Login con returnUrl

```
1. Patient navega a /turnos sin token → authGuard redirect /login?returnUrl=/turnos
2. Patient completa form → AuthService.login(dni, password)
3. Backend: /auth/login con tenantSlug → JWT
4. Redirect a returnUrl (/turnos)
```

---

## 6. Error handling

| Caso | UI |
|---|---|
| 401 cualquier endpoint | AuthInterceptor centraliza: logout + redirect a /login |
| 403 (turno ajeno / módulo deshabilitado) | Toast "No tenés acceso" + redirect a /turnos |
| 400 SlotUnavailable | Toast "Ese horario ya no está disponible" + refresh slots |
| 400 MinimumAdvanceBooking | Toast "Hay que reservar con 2 días de anticipación" + bloquear botón siguiente del DatePicker |
| 400 CancellationWindowExpired | Toast "Faltan menos de 24h, no se puede cancelar" + ocultar botón cancelar |
| 404 turno borrado | Toast + refresh lista |
| 409 register duplicate | Toast genérico "Esos datos ya están registrados" (no diferenciar DNI vs email — security) |
| Network error | Toast "No se pudo conectar. Probá de nuevo." |
| fieldErrors validation | Toast con el primer mensaje + marcar input inválido |

Validaciones cliente-side (defensas duplicadas vs backend):
- DatePicker en wizard: `min = today + 2 días`
- Feriados argentinos: el frontend NO los gestiona (backend lista vacía); el DatePicker no los deshabilita — si el patient elige uno, GET /availability devuelve `[]` y la UI muestra "Sin disponibilidad"
- Botón "Cancelar" oculto si faltan ≤ 24h al turno (calculado client-side desde `scheduledAt`)

---

## 7. Testing strategy

### 7.1 Backend (JUnit 5 + Spring, patrón Spec A)

| Test | Cobertura |
|---|---|
| `RegisterPatientUseCaseTest` | success + dni duplicate + email duplicate + tenant inválido + password weak |
| `ListMyFamilyUseCaseTest` | success self+deps + user sin patient linked |
| `ListMyAppointmentsUseCaseTest` | success con multi-patient + sin appointments |
| `CancelAppointmentUseCaseTest` | EXTERNO own success + EXTERNO ajeno 403 + dentro/fuera ventana 24h |
| `ListTiposAnalisisUseCaseTest` | success + filter active + filter tenant |
| `AuthRegisterControllerTest` | `@WebMvcTest` con mocks de JwtTenantResolver + ModuleGuard |
| `SucursalPublicControllerTest` | `@WebMvcTest` sin auth context |
| `AppointmentControllerOwnershipTest` | integration test: EXTERNO no puede ver turno de otro user |

Cobertura mínima: happy + 1 error de seguridad por endpoint nuevo.

### 7.2 Frontend (vitest, patrón Spec A)

| Test | Cobertura |
|---|---|
| `AuthService.spec.ts` | login/register/logout, persistencia localStorage, expired token detection |
| `AppointmentToTurnoMapper.spec.ts` | cada estado + missing data + multi-tipos + multi-familia |
| `ApiErrorMapper.spec.ts` | cada caso mapeado + fallback genérico |
| `StepParaQuienComponent.spec.ts` | default select, family vacía, queryParam pre-select |
| `AuthInterceptor.spec.ts` | inyecta token, skip rutas públicas, 401 logout |
| `AppointmentService.spec.ts` | book/cancel/getMyAppointments con mocks HTTP |

### 7.3 Manual smoke E2E

Antes del PR:
1. Backend corriendo en local con seed dev
2. Frontend corriendo apuntando al backend
3. Registrarse con DNI nuevo → debe entrar logueado
4. Ver lista vacía de turnos
5. Sacar turno para sí mismo → completar wizard 5 pasos → confirmar
6. Verificar que aparece en lista
7. Cancelar → verificar transición de estado
8. Logout → relogin
9. Probar /familia → ver dependientes (seedados manualmente o con seed adicional)
10. Sacar turno para un familiar desde /familia → verificar `?personaId` en URL + step 0 skipeado
11. Probar acceder a `/turnos/${id_de_otro_user}` directo → debe redirect 403
12. Probar 401 expirando el JWT manualmente en localStorage → debe redirect /login

---

## 8. Quality gates y orden de implementación

### 8.1 Backend (per Backend CLAUDE.md SDD)

```
brainstorming (este spec) → /sdd-explore (verificar Patient model)
  → /sdd-new (spec backend interno) → judgment-day
  → /sdd-apply → simplify → /security-review → /sdd-verify
  → verification-before-completion → /sdd-archive
```

### 8.2 Frontend portal (per pattern Spec A/B)

```
brainstorming (este spec) → writing-plans → subagent-driven-development
  → vitest verde → smoke manual → PR
```

### 8.3 Orden global

1. **Backend primero** — el frontend depende de endpoints reales para no estar wireado a mocks
2. Migraciones Flyway → entities → use cases → controllers → tests (orden SDD)
3. **Frontend después** — bootstrap auth → catalog services → wizard → listado → familia
4. **Smoke manual** con backend + frontend corriendo
5. **PRs separadas** (Backend, Frontend), bundling decidido al final igual que Specs A y B

---

## 9. Pendientes / TODOs explícitos

Lista exhaustiva de cosas que **no** se hacen en Spec C, con comentarios `TODO` en el código:

- **Reprogramar turno por paciente** — UI ya muestra "Próximamente"; backend gap: `PATCH /reschedule` abierto a EXTERNO con ownership
- **Agregar familiar desde portal** — UI ya muestra "Próximamente"; backend gap: `POST /patients/me/family`
- **Email verification post-register** — endpoint actual auto-loguea
- **Captcha en register** — endpoint público sin captcha
- **Rate-limit** — config en `SecurityConfig` (a definir en `/security-review`)
- **Upload de orden médica** — campo `prescriptionFileUrl` queda `null`
- **Notificaciones email/SMS** — sin recordatorios ni confirmaciones por email
- **Cobertura/obra social** — campo `cobertura` del modelo `Familiar` queda placeholder
- **Backoffice catálogo tipos en LABORATORIO** — el seed dev cubre el MVP; CRUD futuro
- **Endpoint `/tenants/{id}/config` wire** — referenciado en spec previo de tenant-smtp-config; en Spec C el TenantService sigue cargando del JSON estático
- **Distancia a sede (`distanciaKm`)** — feature opcional, geolocation no implementada
- **Filtros del listado de turnos (estado, persona)** — el mockup muestra tabs próximos/anteriores; sin filtros adicionales
- **Estados huérfanos del backend (`CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `NO_SHOW`, `RESCHEDULED`)** — el mapper los acepta pero el backend nunca los emite hoy (backend reference §4); mapper queda preparado
- **Tests Playwright E2E automatizados** — solo smoke manual para MVP

---

## 10. Decisiones técnicas y tradeoffs

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Approach A — adaptación pura del mockup | Refactor backend-first (B/C) | Respeta el trabajo de mockup existente; cero re-trabajo UI |
| Catálogo agregado `TipoAnalisis` con M:N a determinations | Frontend hardcoded + `determinations: []` | Permite al laboratorio saber qué pidió el paciente sin sacrificar UX |
| Endpoint público `/sucursales/public` sin auth | Reusar `/sucursales` con EXTERNO | Coincide con patrón Spec B (`/public/display`); no requiere login para ver sedes (marketing) |
| Signal-based AuthService (sin NgRx) | NgRx feature store | Portal no usa NgRx en ningún otro feature; consistencia |
| JWT en localStorage | sessionStorage / httpOnly cookie | localStorage matchea patrón staff existente; httpOnly requiere cambios backend grandes |
| `mine=true` query param vs endpoint separado `/appointments/me` | Endpoint separado | Reusa el controller existente; menos superficie nueva para security review |
| Register sin email verification (TODO) | Verification obligatoria | Scope acotado de tesis; el riesgo está documentado y mitigable con rate-limit |
| Family con FK `responsible_patient_id` jerarquía simple | Tabla puente N:M | Suficiente para MVP; M:N (un dependiente con 2 responsables) no es caso real para el demo |
| Step "Para quién" reusa `FamilyCardComponent` | Componente nuevo dedicado | Sigue el lenguaje visual del mockup (instrucción explícita del user) |

---

## 11. Referencias

- Backend reference TURNOS: `Backend/docs/turnos-backend-reference.md`
- Spec A: `Backend/docs/superpowers/specs/2026-05-21-agenda-config-get-by-id-design.md` + `FRONTEND-LABORATORIO/docs/superpowers/specs/2026-05-19-turnos-config-laboratorio-design.md`
- Spec B: `FRONTEND-LABORATORIO/docs/superpowers/specs/2026-05-20-cola-spec-b-design.md`
- Auth multitenant: `docs/superpowers/specs/2026-05-14-auth-multitenant-internal-design.md`
- Tenant SMTP config (relacionado, no en scope): `docs/superpowers/specs/2026-05-16-tenant-smtp-config-design.md`
- Local dev seed: `docs/superpowers/specs/2026-05-17-local-dev-seed-design.md`
- ApiErrorMapper pattern: `FRONTEND-LABORATORIO/src/app/shared/utils/api-error-mapper.ts`
- Backend CLAUDE.md (SDD workflow obligatorio para backend): `Backend/CLAUDE.md`
