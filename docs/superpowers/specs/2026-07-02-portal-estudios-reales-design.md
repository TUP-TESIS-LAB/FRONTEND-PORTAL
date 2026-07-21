# Portal Paciente — Estudios reales (des-mockeo + UX detalle/estados de firma) — Design

> **Estado:** Design / análisis. Base para el plan `docs/superpowers/plans/2026-07-02-portal-estudios-reales.md`.
> **Fecha:** 2026-07-02. Análisis en vivo sobre `Backend` (`main` local), `Backend-resultados`, `FRONTEND-PORTAL` (development) y `FRONTEND-LABORATORIO` (development).
> **Decisiones del usuario (2026-07-02):** la firma NO se implementa en el portal — el profesional firma en el admin y el paciente **solo consume** resultados ya firmados. Alcance = **solo portal paciente**: sacar los mocks conectando los GET que ya existen. Prioridad UX: vista de detalle, estados de firma, store NgRx + paciente activo. Sin visor/descarga de PDF (no está lista en el back). Sin tocar admin ni agregar endpoints al backend en esta iteración.

## 1. Objetivo

Reemplazar el feature "Estudios" del portal paciente (hoy 100% mock, sin store) por una implementación real: **store NgRx + filtrado por paciente activo**, cableada al/los **GET reales existentes**, con una **vista de detalle** y **estados de firma** de solo-lectura. El diseño de modelo y UI queda preparado para el contrato "rico" objetivo, degradando de forma elegante los campos que el backend todavía no expone al paciente.

## 2. No-objetivos (explícitos)

- **No** implementar firma en el portal (el paciente no firma; la firma vive en el admin — `FRONTEND-LABORATORIO`).
- **No** visor ni descarga de PDF (el endpoint de bytes del reporte no está listo — solo existe metadata, y es admin-only).
- **No** tocar el portal administrativo ni su flujo de firma.
- **No** agregar/expandir endpoints del backend en esta iteración (se documentan como follow-up).

## 3. Estado actual (los tres lados)

### 3.1 Backend (`Backend` / `Backend-resultados`)
- Módulo **postanalítica/firma completo y funcional**: `PostAnalyticalStudy` (PENDING → PARTIALLY_SIGNED → READY_FOR_SIGNATURE → CLOSED), `PostAnalyticalResult` (PENDING → VALIDATING → VALIDATED → REJECTED → SIGNED), `ResultSignature`/`StudySignature` (`signerEmployeeId`, `signerRegistration`, `signatureTokenRef`, `integrityHash`, `signedAt`), `PatientReport` (PDF en LONGBLOB, `reportHash`). Migraciones V950–V958.
- **Firma = electrónica, NO criptográfica:** imagen PNG base64 en `employees.signature` (V958) embebida en el PDF (OpenPDF) + hash SHA-256 de integridad. `SignatureValidationAdapter` solo verifica que el empleado tenga imagen de firma. Sin X.509/PKCS#12/PDF firmado/TSA. El `token` de firma es un placeholder.
- **Único endpoint accesible al paciente (rol `EXTERNO`):** `GET /api/v1/me/results?patientId=` → `MyResultsController` → `GetMyResultsUseCase` (con **anti-IDOR** correcto: `familyPort.resolveResultPatientIds(user.id)` valida acceso, mismo patrón que KAN-165). Devuelve `List<AnalyticalResultResponse>`.
- **Contrato real hoy — DTO delgado** (`AnalyticalResultResponse.java`): `id, tenantId, protocolId, analysisOrderId, sectionId, patientId, collectionDate, active, version`. **NO trae:** nombre de análisis, categoría, valores, rangos de referencia, estado, firmante, matrícula, fecha de firma, hash, disponibilidad de PDF. Es el **resultado analítico crudo** (pre-postanalítica), no el resultado firmado.
- **Toda la postanalítica** (results/studies/reports/signature/traceability controllers) está `@PreAuthorize hasAnyRole('BIOQUIMICO','ADMINISTRADOR')` → **no accesible al paciente**. `ReportController` devuelve solo metadata (sin bytes) y también es admin-only.

### 3.2 Admin (`FRONTEND-LABORATORIO` development)
- Flujo de firma **completo**: `validacion-protocolos` → `validar-protocolo` → `firmar-estudio-modal` (firma total vs parcial), store `validacion-detalle` (`firmarEstudio$`), `postanalitica-api.service` (`signResult`/`signStudy`, token mock `'ui-confirm'`). Estados alineados con el back. **Fuera de alcance de esta spec** — se documenta solo como origen de los estados que el paciente verá.

### 3.3 Portal paciente (`FRONTEND-PORTAL` development)
- `features/main/estudios/`: `estudios.component.{ts,html,scss}` + `estudio.service.ts` (**mock**, `of(ESTUDIOS_MOCK)`) + `core/models/estudio.model.ts`. **Sin store NgRx** (viola CLAUDE.md; el componente se suscribe directo al service).
- Modelo `Estudio` con `nombre, categoria, estado, fecha, pdf, medicoFirmante, matricula` — pero `medicoFirmante`/`matricula` son labels pasivos, sin datos de firma reales.
- UI: listado (tabla desktop / cards mobile) + filtros (aside desktop / bottom-sheet mobile) + orden. **Sin vista de detalle** (no hay ruta `:id`). "Descargar" hace `window.open(pdf.url)`; "Ver" reusa descargar. No hay visor.
- `ActivePatientService` (`core/active-patient/`) ya existe: `activePatient` (computed → `Familiar | null`, con `.id` = patientId) + `setActive()`. Patrón NgRx real a replicar: **Familia** (`family.{actions,effects,reducer,selectors}.ts` + `family.service.ts` → `GET /api/v1/empresa/patients/me/family`).

## 4. La restricción central

**El único GET que el paciente puede consumir hoy devuelve casi nada mostrable.** No hay, para el rol `EXTERNO`, forma de obtener: nombre de análisis, estado del resultado/estudio, datos de firma (firmante/matrícula/fecha/hash), ni el PDF. Es decir:

- **Se puede** hacer real el **listado** (fechas de toma reales, ids reales, agrupables por protocolo) y el **filtrado por paciente activo** (anti-IDOR ya está en el back).
- **NO se puede** poblar hoy, desde el GET existente, la **vista de detalle rica** ni los **estados de firma** — esos datos no viajan al paciente.

Esto genera una tensión con las prioridades UX pedidas (detalle + estados de firma). La spec la resuelve con un enfoque **frontend-first + contrato objetivo documentado**.

## 5. Enfoque

### 5.1 Frontend-first (en alcance ahora)
1. **Store NgRx** para estudios (`load/loadSuccess/loadFailure`, effects, reducer, selectors), replicando el patrón de Familia. Elimina la violación de CLAUDE.md.
2. **Filtrado por paciente activo:** el effect dispara `EstudioService.getResults(patientId)` con `ActivePatientService.activePatient()!.id`; recarga al cambiar de paciente. Se quita el selector local de persona del template (queda el de la topbar/paciente activo).
3. **Service real:** `estudio.service.ts` deja de devolver `ESTUDIOS_MOCK` y pega a `GET /api/v1/me/results?patientId=`, mapeando `AnalyticalResultResponse` → modelo del portal.
4. **Modelo alineado al contrato objetivo** (§5.3): los campos que el back **no** provee hoy (nombre, estado, firma, pdf) quedan **opcionales** y la UI los degrada ("Pendiente", "—", acción deshabilitada con tooltip).
5. **Vista de detalle** (ruta `/estudios/:id` o panel/drawer): muestra lo disponible (fecha de toma, protocolo, sección/área) y **placeholders honestos** para valores/rangos/firma hasta que el back los exponga.
6. **Estados de firma (UI lista):** badges `pendiente / firmado parcial / firmado total` mapeados a los estados del back (`PostAnalyticalResult`/`StudyStatus`), renderizados cuando el dato exista; hoy caen a "pendiente/en proceso" por ausencia de estado en el DTO.
7. **Des-mockeo incremental:** el mock se elimina; si algún dato aún no llega, se muestra estado vacío/pending real, no data falsa.

### 5.2 Backend follow-up (FUERA de alcance — ticket separado)
Para poblar de verdad detalle + estados de firma + PDF, el back necesita un **endpoint de lectura postanalítica orientado al paciente** (rol `EXTERNO`, con el mismo anti-IDOR de `GetMyResultsUseCase`):
- `GET /api/v1/me/studies?patientId=` → estudios del paciente con `studyStatus`, análisis incluidos, y por resultado: `nombre`, `estado`, `signerName`, `signerRegistration`, `signedAt`, `integrityHash`, `reportAvailable`.
- (Más adelante) `GET /api/v1/me/studies/{id}/report` → bytes del PDF firmado (descarga), con control de acceso.
- Alternativa mínima: enriquecer `AnalyticalResultResponse` con nombre/estado/firma. Decisión de arquitectura del back — se abre ticket aparte.

### 5.3 Contrato objetivo del modelo (frontend)
El modelo del portal se diseña hacia esto (campos nuevos opcionales hasta que el back los mande):
```
Estudio {
  id, patientId, protocolId, sectionId
  fechaToma (collectionDate)            // real hoy
  nombre?, categoria?                   // back follow-up
  estadoFirma?: 'pendiente' | 'firmado-parcial' | 'firmado-total'  // back follow-up
  firmante?: { nombre, matricula }, firmadoEl?, hashIntegridad?     // back follow-up
  reporteDisponible?: boolean           // back follow-up (PDF)
}
```

## 6. Riesgos / notas
- **Regresión visual aparente:** al des-mockear con el GET delgado, el listado pierde nombres/estados que el mock inventaba. Es esperado y correcto (data real > data falsa); se comunica con estados vacíos honestos. Mitiga: mapear `sectionId` → etiqueta de área si hay catálogo accesible al paciente; si no, mostrar "Área N".
- **CLAUDE.md #4 (errores en español, sin leak):** los handlers de error del effect/service mapean `HttpErrorResponse` a toast en español, sin exponer internals.
- **CLAUDE.md #5 (refresco):** estudios no es una pantalla de tiempo real; NO se agrega polling salvo pedido explícito.
- **Tests:** reducer + effects + selectors del nuevo store; smoke del componente y del detalle (Vitest, con instanciación directa por el issue conocido de `templateUrl`).

## 7. Entregables de esta iteración
1. Spec (este documento).
2. Plan de implementación frontend (`plans/2026-07-02-portal-estudios-reales.md`) + ticket Jira (regla #1 de CLAUDE.md).
3. (Recomendado, ticket aparte) Backend: endpoint postanalítica orientado al paciente para poblar detalle/estados/PDF — habilita la fase 2 de UX.
