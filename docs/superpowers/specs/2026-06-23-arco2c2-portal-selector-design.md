# Arco 2C.2 — Selector de paciente transversal + rewire (portal)

> **Fecha:** 2026-06-23
> **Repo:** FRONTEND-PORTAL
> **Jira:** _(pendiente — crear con `jira-workflow` antes de implementar)_
> **Parte de:** Arco 2 del roadmap (sección §2.2.4). 2C decompuesto en **2C.1 backend (MERGED) / 2C.2 selector+rewire / 2C.3 cuenta de gestión + CTA + estudios**.
> **Consume:** 2C.1 backend (KAN-133, MERGED): `GET /api/v1/turnos/appointments?mine=true&patientId=X` (autz acceso partido), `GET /api/v1/me/results?patientId=X`. Y `GET /api/v1/empresa/patients/me/family` (uno mismo + dependientes).
> **Rama:** `feat/arco2c2-portal-selector` (off development).

## 1. Contexto y objetivo

Hoy el portal asume **usuario logueado = paciente**: no hay noción de "paciente activo", turnos pide `?mine=true` (mergea todos los accesibles y filtra client-side por familiar), estudios es **mock**, perfil usa `/me/profile` (el del usuario). 2C.2 introduce un **selector de paciente transversal** en el shell y un **estado global "paciente activo"** que gobierna las pantallas de datos.

### Estado actual (verificado)
- **Shell:** `shared/ui/shell/patient-shell/` (sidebar + header + bottom-nav). Auth signal-based (`core/auth/auth.service.ts`: `currentUser` signal).
- **Familia:** `core/family/family.service.ts` → `GET /api/v1/empresa/patients/me/family` → `Familiar[]` (incluye uno mismo, `vinculo='Yo'` cuando `bond=PROPIO`, y dependientes; campos `patientId`, `userPatientId`, `status`, `nombre`, `apellido`, `dni`, `vinculo`).
- **Turnos:** `features/main/turnos/` + `services/appointment.service.ts` `getMyAppointments()` → `GET /api/v1/turnos/appointments?mine=true` (forkJoin con family/tipos/sedes; deriva `personaId` del family list para un filtro de "familiar" client-side).
- **Estudios:** `features/main/estudios/` — `estudio.service.ts` devuelve `ESTUDIOS_MOCK`/`PERSONAS_MOCK` (sin API real); tiene filtro local por persona (`PersonChipsComponent`).
- **Dashboard:** combina `getMyAppointments()` + `getEstudios()` (asumen "me").
- **NgRx:** slices `turnos`, `family`, `perfil`, etc. (clásico). State management mixto: signals (auth) + NgRx (features).

## 2. Decisiones (cerradas en brainstorming 2026-06-23)

1. **Rewire en 2C.2:** Turnos (real, server-side por `patientId`) + dashboard (resumen de turnos) + estudios (sigue mock pero el filtro local lo gobierna el paciente activo). **Perfil queda como está** (usuario logueado); su rediseño a tab es 2C.3.
2. **Default = uno mismo** (PROPIO si el usuario es paciente; si no, el primer dependiente). **Sin persistencia** (cada recarga vuelve al default).
3. **Estado global** vía servicio signal-based (consistente con `AuthService`), no NgRx (el "paciente activo" es transversal y leído por el shell + pantallas).

## 3. Diseño

### 3.1 `ActivePatientService` (estado global, signal-based)
- En `core/` (p.ej. `core/active-patient/active-patient.service.ts`).
- Carga los accesibles desde el family service (reusa `FamilyService.getFamily()` → `Familiar[]`).
- Expone:
  - `accessiblePatients` (signal `Familiar[]`),
  - `activePatient` (signal `Familiar | null`),
  - `loading` (signal),
  - `setActive(patientId: number)`,
  - `init()` (carga family + setea el default).
- **Default:** la entrada con `vinculo==='Yo'` (PROPIO) si existe; si no, la primera. Sin localStorage.
- Se inicializa al entrar al shell autenticado (en `PatientShellComponent` ngOnInit / un resolver/guard ligero).

### 3.2 Selector transversal en el shell
- Componente nuevo `patient-selector` en el **header** del `patient-shell` (visible en todas las rutas hijas).
- Muestra el `activePatient` (nombre + inicial/avatar + vínculo) y un dropdown con `accessiblePatients`. Al elegir → `activePatientService.setActive(id)`.
- Usa el DS: PrimeNG `Select` o el patrón de `PersonChipsComponent` adaptado a header (decisión de implementación; preferir un dropdown compacto en header por espacio).
- Si hay 0 o 1 accesible: con 1, mostrar el nombre sin dropdown interactivo (o dropdown deshabilitado); con 0, no renderizar (estado de 2C.3).

### 3.3 Rewire — Turnos (real)
- `AppointmentService`: nuevo método `getAppointmentsForPatient(patientId)` → `GET /api/v1/turnos/appointments?mine=true&patientId={id}` (mantener tipos/sedes; ya no hace falta derivar persona del family para filtrar, porque el server scope-a por paciente).
- `TurnosComponent`: leer `activePatientService.activePatient()` y **re-fetch** cuando cambia (effect sobre la signal). **Quitar el filtro de "familiar" in-screen** (lo reemplaza el selector global). Mantener filtros por estado/fecha.
- El reschedule/cancel siguen funcionando (operan por appointmentId; el backend ya valida ownership por acceso partido).

### 3.4 Rewire — Dashboard
- El resumen de próximos turnos del dashboard usa la misma fuente scope-ada al paciente activo (re-fetch on change). La parte de estudios del dashboard sigue mock (ver 3.5).

### 3.5 Rewire — Estudios (mock, filtro por activo)
- `EstudiosComponent`: en vez del dropdown de persona propio, usar el `activePatient` para filtrar la lista mock (filtrado client-side por `personaId` == `activePatient.patientId`, mapeando el mock a la persona activa). El cableado a `/me/results` real es 2C.3.
- Si el mock no tiene datos para el paciente activo, mostrar el empty state existente.

## 4. Errores / estados
- Carga de `/me/family` falla → toast (reusar `NotificationService`/el patrón del repo) y selector vacío; las pantallas muestran su empty/loading.
- Cambiar de paciente activo mientras una pantalla carga → cancelar/re-disparar el fetch (switchMap/effect).

## 5. Testing (vitest / `npm test` — patrón del repo)
- `ActivePatientService`: default = PROPIO si existe, si no el primero; `setActive` cambia la signal; carga desde family.
- `patient-selector`: renderiza el activo + las opciones; elegir dispara `setActive`; con 1 accesible no muestra dropdown interactivo.
- `TurnosComponent`/`AppointmentService`: pide `?patientId={activo}`; re-fetch al cambiar el activo; sin el filtro familiar viejo.
- `EstudiosComponent`: filtra el mock por el paciente activo.
- Suite verde (anotar fallos pre-existentes ajenos del portal si los hubiera).
- **Smoke manual:** cambiar de paciente en el selector → turnos y dashboard reflejan el paciente elegido; estudios filtra.

## 6. Fuera de alcance (2C.3)
- Perfil como tab + del paciente activo (necesita un read por paciente que no existe aún).
- Cuenta de gestión ("no sos paciente") + CTA "Darme de alta como paciente" (consume `/me/register-as-patient`).
- Estudios contra `/me/results` real.
- Persistencia de la selección (localStorage).

## 7. Riesgos
| Riesgo | Mitigación |
|--------|-----------|
| Doble filtrado (selector global + filtro familiar viejo en turnos) | Quitar el filtro familiar in-screen; el server scope-a por patientId. |
| Estudios mock confunde al cambiar de paciente (datos no reales) | Filtrar el mock por el activo; el cableado real es 2C.3 (documentado). |
| Inicialización del activo antes de tener family | `ActivePatientService.init()` en el shell; pantallas reaccionan a la signal (no asumen valor inmediato). |
| Cambio de activo deja requests viejas | `switchMap`/effect que cancela la anterior. |
