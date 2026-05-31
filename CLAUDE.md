# CLAUDE.md — FRONTEND-PORTAL

Portal de pacientes (Angular 21). Este archivo define reglas inviolables de cómo trabajar en este repo.

## Regla inviolable: toda petición al backend pasa por la store

Ante **cualquier insinuación de petición al backend** —cargar, traer, listar, obtener, guardar, crear, editar, actualizar o borrar datos remotos; o cuando aparezcan las palabras "endpoint", "API", "fetch", "petición al back", "traer del back", "cargar datos", "guardar"— la implementación **SÍ o SÍ** pasa por la store NgRx siguiendo la skill `ngrx-backend-request`.

Esto aplica **aunque el desarrollador no nombre NgRx, store, action ni effect**. Si describe una operación contra una API en el contexto de Angular, el patrón es obligatorio.

### Prohibido (para datos remotos)

- ❌ Llamar al service directo desde el componente y subscribirse a mano.
- ❌ `toSignal(http.get(...))` para datos remotos.
- ❌ `resource()` para datos remotos.
- ❌ `async` pipe sobre un `Observable` de la API.

El flujo correcto es siempre: componente despacha action → effect llama al service → action Success/Failure → reducer → selector → `selectSignal` en el componente. Ver `ngrx-backend-request/SKILL.md`.

### Logging obligatorio

El logging de store y routing (meta-reducer prev/action/next + router-store) es **parte obligatoria del setup** de la store, no opcional. Detalle en `ngrx-backend-request/SKILL.md`, sección 11.

### Alcance — no retroactivo

Esta regla **no obliga a reescribir en el acto** las peticiones ya existentes (turnos y cualquier otra que hoy llame al service directo). Esas se migran al patrón NgRx en tareas dedicadas, aparte. La regla aplica a **toda petición nueva** y a cualquier petición que se esté modificando a pedido explícito.
