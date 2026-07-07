# Plan — Portal paciente: el filtro "Todos" de Estudios no trae los estudios de toda la familia

> **Jira:** [KAN-206](https://exequielsantoro.atlassian.net/browse/KAN-206)
> **Rama:** `fix/portal-estudios-todos-familia` (contra `development`)
> **Fecha:** 2026-07-06

## Problema

En "Mis estudios" del portal del paciente, el filtro de paciente tiene una opción
**"Todos"** (`value: null` en `PatientFilterComponent`). Al seleccionarla, no se
muestran los estudios de toda la familia: la pantalla queda con lo del último
paciente (o vacía). Causa raíz:

1. `estudios.component.ts` — el effect de carga sólo dispara `loadEstudios` cuando
   `selectedPatientId !== null`; con "Todos" (null) **no dispara nada**.
2. El `computed` `estudios` enriquece la persona buscando por el **único**
   `selectedPatientId`; con `null` no matchea y devuelve la lista cruda sin nombre.
3. El store guarda un solo `estudios: Estudio[]` para un solo paciente; nunca
   agrega los resultados de varios miembros ("no hace el JOIN").
4. El backend es por-paciente: `GET /api/v1/me/results?patientId=` exige
   `patientId` (no hay endpoint "familia"). El JOIN debe hacerse en el cliente.
5. **Bug adicional descubierto en el diseño:** el efecto de "siembra" del
   paciente activo usa `selectedPatientId() === null` como guarda, pero ese
   mismo `null` representa "Todos" elegido por el usuario. Si hay paciente
   activo, apenas se selecciona "Todos" el efecto se re-dispara y revierte la
   selección al paciente activo. Se corrige con un flag `seeded` no reactivo
   que sólo permite la siembra una vez.

## Solución (fan-out en el frontend)

Sin tocar backend. Cuando "Todos" está activo, disparar una carga por cada
paciente accesible y **fusionar** los resultados, enriqueciendo la persona
**por fila** (cada `Estudio` ya trae su `patientId`/`personaId` del mapper).

### Cambios

- **`store/estudios.actions.ts`**: agregar `loadEstudiosTodos({ patientIds })` y
  `loadEstudiosTodosSuccess({ estudios })`. La falla reusa `loadEstudiosFailure`.
- **`store/estudios.effects.ts`**: `loadEstudiosTodos$` con `forkJoin` sobre
  `patientIds` → `getEstudios(id)`; `map(lists => lists.flat())`; `switchMap`
  para cancelar si cambia el alcance; `catchError → loadEstudiosFailure`.
  `patientIds` vacío → `loadEstudiosTodosSuccess({ estudios: [] })`.
- **`store/estudios.reducer.ts`**: `loadEstudiosTodos` prende `loading`, limpia
  error, `patientId: null`; `loadEstudiosTodosSuccess` setea `estudios`, apaga
  `loading`. (No se cambia la forma del state: `patientId: null` ya es "todos".)
- **`estudios.component.ts`**:
  - `estudios` computed: enriquecer cada fila por su propio `personaId`
    (mapa `id → familiar`), no por el `selectedPatientId` único. Equivalente
    para el caso de un solo paciente; correcto para "Todos".
  - effect de carga: si `pid === null`, dispatch
    `loadEstudiosTodos({ patientIds: accessiblePatients().map(p => p.id) })`
    (sólo si hay ≥1).

### Tests

- `reducer.spec`: `loadEstudiosTodos` (loading/error), `loadEstudiosTodosSuccess`
  (merge en `estudios`).
- `effects.spec`: `loadEstudiosTodos$` éxito (fusiona 2 pacientes) y error.
- `component.spec`: al seleccionar "Todos" (`selectedPatientId.set(null)`)
  despacha `loadEstudiosTodos` con todos los ids; enriquecimiento por-fila
  asigna la persona correcta a estudios de distinto paciente.

## Verificación

- `npm test` verde (nuevos + existentes).
- `npm run build` OK.
- Manual: en "Todos" aparecen estudios de ≥2 miembros, cada uno con su persona.

## Fuera de alcance

- Endpoint agregado en backend (alternativa descartada; el fan-out resuelve).
- Descarga de PDF / metadata rica (KAN-168, rama aparte).
