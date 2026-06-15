# Portal del Paciente — Recuperar/Cambiar contraseña, Reprogramar turno y Perfil real — Spec de diseño

**Fecha:** 2026-06-15
**Repos:** `Backend` (Spring Boot, hexagonal) + `FRONTEND-PORTAL` (Angular 21 standalone)
**Estado base:** `origin/development` en ambos (al día al 2026-06-15)

## Objetivo

Cablear de forma **real** (sin mocks/stubs) cuatro funcionalidades del Portal del Paciente que hoy están ausentes o simuladas, aprovechando lo que el backend ya expone y agregando los cambios mínimos de back que falten:

- **A.** Recuperar contraseña (flujo olvidé → email → reset por token).
- **B.** Cambiar contraseña estando logueado (dentro de Perfil).
- **C.** Reprogramar turno (hoy es un stub con toast "disponible pronto").
- **D.** Ver y editar el perfil del paciente (hoy `USER_MOCK`).

## Fuera de alcance (YAGNI / spec aparte)

- **Estudios y resultados del paciente** (hoy 100% mock): requiere endpoints scoped al paciente con validación de pertenencia + descarga de PDF. Es un esfuerzo de backend grande → **spec propio**.
- Agregar/editar familiares (admin-only en back), prescripciones, notificaciones y PWA.
- Reescritura NgRx de peticiones **existentes** del portal (turnos actuales llaman al service directo). La regla NgRx aplica a lo **nuevo** y a lo que se modifique a pedido; ver más abajo en C.

## Regla inviolable del repo (CLAUDE.md de FRONTEND-PORTAL)

**Toda petición nueva al backend pasa por la store NgRx** siguiendo la skill `ngrx-backend-request`: componente despacha action → effect llama al service → action Success/Failure → reducer → selector → `selectSignal`. Prohibido subscribirse al service desde el componente, `toSignal`/`resource()`/`async` sobre observables de la API. Cada feature de este spec lleva su **slice** (actions/effects/reducer/selectors/state) con el logging obligatorio de store/routing.

## Resolución del tenant (transversal a A)

El portal solo conoce el **slug** del tenant (`TenantService.config()?.id`); no el id numérico. Los endpoints públicos de password resuelven el tenant por header **`X-Tenant-Id` numérico** vía `AnonymousTenantFilter` (`TenantContext.requireTenantId()`).

**Decisión de diseño:** extender `AnonymousTenantFilter` para aceptar además un header **`X-Tenant-Slug`** y resolver slug→id (reusando el repositorio/servicio de tenant que ya usan `login-patient` y el white-label). Si vienen ambos headers, `X-Tenant-Id` tiene prioridad; el comportamiento actual no cambia. El portal manda `X-Tenant-Slug: <config().id>` en los 3 requests de password. Así el portal sigue siendo slug-only y no se expone el id interno.

---

## A. Recuperar contraseña

### Backend (ya existe — sin cambios salvo el filtro de tenant)
`Backend/.../modules/empresa/presentation/controller/AuthController.java` (públicos, `permitAll`):

| Verbo | Path | DTO request |
|---|---|---|
| POST | `/api/v1/auth/password/forgot` | `ResetPasswordRequest { email }` |
| POST | `/api/v1/auth/password/validate-token` | `TokenRequest { token }` |
| POST | `/api/v1/auth/password/reset` | `NewPasswordRequest { token, newPassword (min 8) }` |

Email implementado real (`SpringMailNotificationAdapter`, template HTML, token con expiración 60 min). Requiere SMTP configurado por tenant (si no, `SmtpNotConfiguredException`).

Único cambio backend: `AnonymousTenantFilter` acepta `X-Tenant-Slug` (ver sección transversal).

### Frontend
- **Rutas públicas nuevas** en `app.routes.ts` (fuera del `authGuard`, junto a `login`/`register`):
  - `/forgot-password` → `ForgotPasswordComponent`
  - `/reset-password` → `ResetPasswordComponent` (lee `?token=` de la query).
- **Store slice** `password-recovery` (`core/auth/store/` o `features/auth/store/`): actions `requestReset`/`Success`/`Failure`, `validateToken`/`…`, `resetPassword`/`…`; effects que llaman al service; reducer con flags `submitting`/`sent`/`tokenValid`/`error`.
- **Service** `PasswordRecoveryService` (HttpClient): los 3 POST, agregando el header `X-Tenant-Slug: tenant.config()?.id`. Agregar estos paths a `SKIP_PATTERNS` del `authInterceptor` (no llevan Bearer).
- **UX**:
  - `ForgotPasswordComponent`: input email → despacha `requestReset` → pantalla de confirmación "Si el email existe, te enviamos un enlace" (mensaje neutro, no revela si el email existe).
  - `ResetPasswordComponent`: al entrar, despacha `validateToken`; si inválido/expirado, muestra error + link a `/forgot-password`. Si válido, form `newPassword` + `repetir` (regla mínima 8, alineada al back) → `resetPassword` → éxito → redirige a `/login` con toast.
  - `login.component.html`: reemplazar el link muerto `¿Olvidaste tu contraseña?` (hoy `preventDefault()`) por `routerLink="/forgot-password"`.

### Tarea Excel relacionada
Fila 19 "Recuperar contraseña" (hoy 20%) → queda real.

---

## B. Cambiar contraseña (logueado)

### Backend (endurecer ownership)
`Backend/.../modules/empresa/presentation/controller/UserController.java`:
`PUT /api/v1/user/{id}/password` con `ChangePasswordRequest { currentPassword (min 8), newPassword (min 8) }`.

**Bug actual:** el endpoint no valida que `{id}` sea el del usuario logueado (cualquier autenticado podría cambiar la contraseña de otro id conocido). **Fix:** en el controller, obtener el userId del JWT (`CurrentUserProvider.requireUserId()`) y rechazar con **403** si `{id} ≠ userId` logueado. Mantener la validación de `currentPassword` del `ChangePasswordUseCase`. (El `currentPassword` correcto sigue siendo requisito.)

### Frontend
- **Service** `ProfileService` (o el mismo de Perfil) método `changePassword(currentPassword, newPassword)` → `PUT /user/{auth.userId()}/password`.
- **Store slice** (puede vivir en el slice de perfil): action `changePassword`/`Success`/`Failure`.
- **UX:** sección/colapsable "Cambiar contraseña" dentro de `perfil.component` (campos: actual, nueva, repetir; valida min 8 y match). Éxito → toast; error de `currentPassword` → mensaje claro.

---

## C. Reprogramar turno

### Backend (1 línea + ownership)
`Backend/.../modules/turnos/presentation/controller/AppointmentController.java`:
`PATCH /api/v1/turnos/appointments/{id}/reschedule` con `RescheduleAppointmentRequest { newScheduledAt: LocalDateTime (@Future) }`.

- Cambiar `@PreAuthorize` de `hasAnyRole('ADMINISTRADOR','RESPONSABLE_SECRETARIA','SECRETARIA')` a **incluir `'EXTERNO'`** (espeja `cancel` y `create`).
- En el use case de reschedule, **validar pertenencia cuando el caller es EXTERNO**: el turno debe ser del paciente logueado (mismo guard de ownership que usa `cancel` para EXTERNO). Verificar en el plan cómo `cancel` resuelve ownership y replicarlo.

### Frontend
- `turnos.component.ts`: reemplazar el stub `onReprogramar` (toast "Próximamente") por flujo real.
- **Selección de nuevo horario:** reusar la lógica de disponibilidad de `sacar-turno` (`AppointmentService.getAvailability()` → `GET /api/v1/turnos/availability`) para mostrar slots y elegir uno; luego `AppointmentService.reschedule(id, { newScheduledAt })` → `PATCH .../reschedule`.
- **NgRx:** `reschedule` es una petición nueva → va por store. Se agrega como acciones del slice de turnos (creando el slice NgRx de turnos si aún no existe, o extendiéndolo). Nota: las peticiones de turnos **existentes** (listar/crear/cancelar) no se reescriben en este spec salvo que se toquen; sí se modela `reschedule` con el patrón obligatorio.
- **UX:** desde la tarjeta del turno, botón "Reprogramar" → diálogo/pantalla con el picker de slots (sede/fecha/hora) precargado con la sede del turno → confirmar → refresca la lista.

### Tarea Excel relacionada
Fila 12 "Reprogramación de turno" (hoy 15%) → queda real.

---

## D. Ver y editar perfil del paciente

### Backend (nuevo: GET + PUT /me/profile)
No existe `/me/profile`. Existe el patrón `/me` para copiar:
- `MeBranchesController` usa `CurrentUserProvider.requireUserId()` + `TenantContext.requireTenantId()`.
- `MyFamilyController` (`/api/v1/empresa/patients/me/family`, `@PreAuthorize hasRole('EXTERNO')`) resuelve el `User` por `(sub, tenantId)` y opera sobre `user.id()`.

**A verificar en el plan (primera tarea, sin código de producción):** cómo se vincula el `User` logueado con su entidad `Patient` (de donde salen cobertura/datos clínicos). La familia opera sobre `user.id()`; el perfil necesita el `Patient` ligado a ese user (¿link `user_patient`? ¿match por dni+tenant?). Definir el camino antes de construir el endpoint.

**Endpoints nuevos** (`@PreAuthorize hasRole('EXTERNO')`, tenant del JWT):
- `GET /api/v1/me/profile` → DTO de display del perfil del paciente: nombre, apellido, dni, email, celular, dirección, obra social/plan (read-only), y contacto de emergencia **si la entidad lo tiene**.
- `PUT /api/v1/me/profile` → DTO con **solo campos editables**: `email`, `celular/phone`, `direccion/address` (+ contacto de emergencia si existe). Read-only: nombre, apellido, dni, obra social. Validaciones de formato (email, etc.). Resuelve el paciente del JWT (no acepta id por path).

### Frontend
- `perfil.service.ts`: eliminar `of(USER_MOCK)`; `getPerfil()` → `GET /me/profile`; `updatePerfil(payload)` → `PUT /me/profile`.
- **Store slice** `perfil`: `loadProfile`/`Success`/`Failure`, `updateProfile`/`Success`/`Failure` (+ `changePassword` de la feature B).
- **UX:** `perfil.component` muestra datos reales; el botón "Editar" (hoy toast "Próximamente") abre un formulario con los campos editables → guardar → PUT → refresca y toast.

### Tarea Excel relacionada
Fila 16 "Administrar el perfil del paciente" (hoy 60%) → ver+editar real.

---

## Componentes y límites (resumen)

| Unidad | Qué hace | Depende de |
|---|---|---|
| `AnonymousTenantFilter` (back) | Resuelve tenant en públicos por `X-Tenant-Id` o `X-Tenant-Slug` | repo/servicio de tenant |
| `PasswordRecoveryService` + slice (front) | forgot/validate/reset con `X-Tenant-Slug` | TenantService, HttpClient |
| `UserController.changePassword` (back) | Cambia password validando ownership (JWT) | CurrentUserProvider, ChangePasswordUseCase |
| reschedule (back) | Reprograma validando ownership para EXTERNO | use case turnos |
| turnos reschedule (front) | Elige slot y reprograma vía store | AppointmentService, availability |
| `UserPatientProfileController` (back, nuevo) | GET/PUT perfil del paciente del JWT | CurrentUserProvider, mapeo User→Patient |
| `perfil` slice + service (front) | Carga/edita perfil real + cambia password | store, HttpClient |

## Testing

- **Backend (JUnit):**
  - `AnonymousTenantFilter`: resuelve por `X-Tenant-Slug`; prioridad de `X-Tenant-Id`; slug inexistente → comportamiento controlado.
  - `changePassword`: 403 si `{id}` ≠ usuario del JWT; OK si coincide y `currentPassword` válido.
  - `reschedule`: EXTERNO puede reprogramar su turno; EXTERNO no puede reprogramar uno ajeno; staff sigue funcionando.
  - `GET/PUT /me/profile`: resuelve el paciente del JWT; PUT solo toca campos editables; rechaza no-EXTERNO.
- **Frontend (specs de store + componente):** effects/reducers de cada slice (success/failure), y componentes clave (forgot/reset, perfil editar, reprogramar). Confirmar en el plan el runner del portal (`ng test` vs `vitest`) y respetar la convención del repo.

## Estrategia de PRs

Por tópico, **1 PR de Backend + 1 PR de Frontend por feature** (regla del usuario), salvo que se decida consolidar en el plan. Orden sugerido por dependencia back→front:
1. A (filtro tenant + front recuperar) — desbloquea recuperar contraseña.
2. B (endurecer change-password + front).
3. C (reschedule EXTERNO + front).
4. D (GET/PUT me/profile + front), tras verificar el mapeo User→Patient.

Atención a colisiones de versión Flyway si alguna tarea agrega migración (D podría no necesitar): tomar la siguiente versión libre y avisar (ver memoria de colisión Flyway).

## Riesgos / supuestos

- **SMTP por tenant:** recuperar contraseña depende de SMTP configurado en el tenant de prueba; si no está, el back tira `SmtpNotConfiguredException`. Verificar/seedear config SMTP del tenant local antes del smoke de A.
- **Mapeo User→Patient (D):** es el supuesto de mayor riesgo; se valida como primera tarea del plan antes de escribir el endpoint.
- **Ownership de reschedule:** depende de replicar el guard de `cancel`; si `cancel` no valida ownership para EXTERNO, hay que agregarlo en ambos.
- **`X-Tenant-Slug`:** mantiene el portal slug-only; alternativa descartada (exponer id numérico en white-label) por filtrar id interno.
