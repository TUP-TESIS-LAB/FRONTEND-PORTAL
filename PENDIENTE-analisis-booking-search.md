# Pendiente — rama `feat/analisis-booking-search`

> Repos: **FRONTEND-PORTAL** (esta rama) + **Backend** (misma rama, mismo nombre).
> Ambas ramas están commiteadas y compilando limpio (build + tests OK). Nada roto, nada a medio escribir.

## Hecho en esta rama

- Portal: el paso "Tipo de análisis" de sacar turno pasó de un catálogo curado
  fijo de 6 ítems sin buscador (`TipoAnalisis`) a **búsqueda real contra el
  mismo catálogo que usa atención** (`analysis_catalog`), vía un endpoint
  nuevo patient-safe en el backend.
- Backend: `AnalysisBookingQueryController` (`/api/v1/analitica/analysis/booking`),
  reutiliza `SearchTenantAnalysisUseCase`/`GetTenantAnalysisDetailUseCase` de
  atención pero con DTOs propios (sin shortCode/nbuCode/cantidadUb — esos
  campos no le corresponden al paciente) y rol `EXTERNO` habilitado. Sin
  query, devuelve una muestra acotada de 8 (no vacío, no el catálogo entero).
- NgRx (`turnos` store): `searchAnalisis` (debounce 250ms + switchMap),
  `selectAnalisis`/`deselectAnalisis` (mergeMap — cada selección se resuelve
  independiente, no se cancelan entre sí), `computeAyuno` (switchMap, llama
  a `/api/v1/analitica/preparation/compute`, el mismo que usa atención).
- La selección persiste en el store (`analisisDetails`) aunque una búsqueda
  nueva reemplace `analisisResults` — el paciente puede buscar "creatinina",
  elegirla, buscar "hemograma" sin perder la primera selección.
- Fix: ícono "biotech" colisionaba visualmente con la lupa del buscador
  (ambos `pi-search`) → reasignado a `pi-microchip`.
- Fix: `@Output() select`/`deselect` colisionaban con el evento nativo del
  DOM `select` (se dispara al seleccionar texto en el `<input>` de búsqueda
  interno) → renombrados a `analysisSelect`/`analysisDeselect`. Esto rompía
  selecciones reales bajo Playwright/ciertas interacciones de usuario.
- Validado end-to-end con Playwright contra el backend real: búsqueda,
  selección, deselección, reserva efectiva (`POST /appointments` → 201),
  visible en "Mis turnos". Scripts en `e2e-visual/flow-*.cjs` de este repo.

## Pendiente (encontrado en la auditoría de UX con Playwright, sin implementar)

1. **🔴 Falla silenciosa en la búsqueda.** Si `GET .../analysis/booking` falla
   (network error, 500), la UI hoy muestra el mismo "No encontramos análisis"
   que un resultado vacío real — el paciente no puede distinguir "no existe"
   de "se rompió, probá de nuevo". Mismo problema al fallar `selectAnalisis`
   (la card se libera sin avisar por qué).
   - Arreglo: agregar `@Input() searchError` a `AnalysisCardGridComponent`,
     un empty-state distinto ("No pudimos buscar análisis" + botón
     Reintentar), wireado a `selectAnalisisSearchError` del store. Para el
     detalle, un toast en `sacar-turno.component.ts` cuando
     `analisisDetailError` cambia (o `selectAnalisisFailure` vía effect).

2. **🟡 Sin lista visible de seleccionados.** Solo hay un contador de texto
   ("5 análisis seleccionados"). Si el paciente quiere revisar o sacar uno
   puntual, tiene que volver a buscarlo por nombre exacto.
   - Arreglo: `AnalysisCardGridComponent` necesita un `@Input() selected:
     AnalysisBooking[]` (no solo ids) para poder listar nombres + botón "x"
     de sacar cada uno, sin depender de que siga en `items()`.

3. **🟢 Precarga de "algunos estudios" en vez de arrancar vacío** (pedido
   explícito del usuario, no era un gap encontrado). Sin buscar, hoy el
   backend ya devuelve una muestra acotada (8, ver arriba — ESO YA ESTÁ
   HECHO en el commit de Backend). Falta el lado frontend:
   - Portal: al entrar al paso "Tipo de análisis", despachar
     `searchAnalisis({ q: '' })` una vez (en `ngOnInit` o al llegar al paso).
   - `onAnalisisSearchChange` ya no debería tratar el string vacío como
     "limpiar" (acción `clearAnalisisSearch`) — ahora un query vacío es una
     búsqueda válida (la precarga). Simplemente despachar siempre
     `searchAnalisis({ q })`, incluso vacío.
   - En el grid, agregar un label sutil quo distinga "Algunos análisis
     disponibles — buscá para ver más" (cuando el search box está vacío) de
     los resultados de una búsqueda real, para que quede claro que no es
     "todo el catálogo".

   Un intento de implementación de 1/2/3 se hizo y se revirtió en esta misma
   sesión para no dejar código a medio escribir en el commit — quedó
   documentado acá en vez de en el diff. El diseño de arriba ya está
   pensado, falta ejecutarlo.

## Gap conocido de antes, NO relacionado a esta rama (turnos ya reservados)

"Mis turnos" muestra **"Sin estudios asociadas"** para turnos reservados con
este catálogo nuevo, porque `appointment.service.ts` arma las etiquetas a
partir del catálogo curado viejo (`TipoAnalisisService`), que no tiene
mapeo para los `determinationId`s del catálogo real. El turno en sí se
guarda bien (datos correctos, procesable en el laboratorio) — es solo
un problema de visualización del historial. Necesita: o bien un endpoint de
reverse-lookup (determinationId → análisis) en el backend, o guardar el
`analysisCatalogId` directamente en el appointment en vez de reconstruirlo
después. No evaluado en profundidad, es una tarea aparte.
