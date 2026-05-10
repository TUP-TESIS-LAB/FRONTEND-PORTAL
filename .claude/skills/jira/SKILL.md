---
name: jira-task-creator
description: Crear issues en Jira (tareas, bugs, historias o épicas) a través del MCP de Atlassian. Usar SIEMPRE que el usuario pida crear, agregar, abrir, registrar, loguear o "meter" cualquier tipo de issue en Jira — frases como "creá una tarea en Jira", "agregá un bug", "meté esto como historia", "abrí un ticket", "anotá esto en Jira", "create a Jira issue", "log a bug". También activarse cuando el usuario describa un problema o feature y mencione Jira/Atlassian aunque no diga explícitamente "tarea" o "ticket". Requiere que el connector MCP de Atlassian esté habilitado.
---

# Jira Task Creator

Crear issues en Jira siguiendo un flujo predecible: inferir lo que ya está en el chat, pedir solo lo crítico que falte, mostrar un resumen estructurado, esperar OK explícito, y recién ahí crear con el MCP de Atlassian.

## Configuración del usuario

Antes de la primera tarea de la conversación, hay que tener la **project key** de Jira (la parte antes del guión en los IDs, ej: `KAN` en `KAN-123`).

**Project key configurada:** `KAN`

Los issues creados por esta skill van siempre al proyecto `KAN` (formato de IDs: `KAN-123`). No preguntar al usuario por el proyecto a menos que él explícitamente diga que quiere usar otro distinto en un pedido puntual.

## Flujo de trabajo

### 1. Inferir antes de preguntar

Al recibir el pedido, primero **mirá el contexto del chat**. Es muy común que el usuario ya haya descrito el problema, el feature o el bug en mensajes anteriores. Extraé de ahí:

- Un título tentativo (corto, accionable, en infinitivo cuando aplique: "Permitir login con Google", "Corregir error en checkout")
- Tipo probable (señales: "no funciona / falla / rompe" → Bug; "como usuario quiero / necesitamos que" → Historia; trabajo técnico interno → Tarea; iniciativa grande con sub-trabajo → Épica)
- Contexto para la descripción
- Criterios de aceptación si están implícitos en lo que el usuario dijo

No le devuelvas al usuario una pila de preguntas si la mitad ya las respondió antes en el chat.

### 2. Pedir solo lo crítico que falte

Lo único que se pide sí o sí cuando no se puede inferir bien:

- **Título** (si ningún resumen razonable se desprende del contexto)
- **Tipo de issue** (Bug / Historia / Tarea / Épica) si hay ambigüedad real

Para todo lo demás (prioridad, asignado, labels), usar defaults razonables y mostrarlos en el resumen para que el usuario edite si quiere. **No bombardear con preguntas campo por campo.**

### 3. Defaults razonables

Cuando el usuario no especifique:

- **Prioridad**: `Medium`. Subir a `High` solo si el contexto sugiere urgencia clara (palabras tipo "urgente", "bloquea", "producción caída", "crítico"). Bajar a `Low` solo si es algo claramente trivial o cosmético.
- **Asignado**: sin asignar. El usuario lo asigna después si quiere.
- **Labels**: ninguno por default. Sugerir 1-3 labels solo si hay términos obvios en el contexto (ej: si habla de la API → `api`; si es de UI → `frontend`; si menciona performance → `performance`). Mostrarlos en el resumen como sugerencia editable.
- **Estado inicial**: el que ponga el workflow del proyecto al crear (típicamente `Por hacer` / `To Do`). **No transicionar después de crear** — Jira ya inicializa el ticket en el status correcto. Si el board del proyecto no muestra los tickets recién creados, eso es un tema de configuración de columnas del board en Jira (Project settings → Board → Columns), no algo que la skill tenga que resolver.
- **Épica padre / story points**: no setear. No preguntar a menos que el usuario los mencione.

### 4. Estructura de la descripción

Usar **siempre** este formato en el campo `description` del issue:

```
## Contexto
[2-4 oraciones explicando el problema/feature/trabajo: qué pasa o qué se quiere lograr, por qué importa, dónde encaja.]

## Criterios de aceptación
- [Criterio verificable 1]
- [Criterio verificable 2]
- [...]
```

**Reglas para los criterios:**
- Cada criterio tiene que ser verificable (alguien que lea esto tiene que poder decir "sí, está hecho" o "no").
- Empezar cada uno con verbo o sujeto concreto, no con "que".
- 2-6 criterios típicamente. Si tenés menos de 2 que sean reales, listá 1 y está bien; no inventés relleno.

**Para bugs específicamente**, podés expandir el contexto agregando sub-secciones, pero conservando el formato general:

```
## Contexto
[Resumen del bug y dónde se observó.]

**Pasos para reproducir:**
1. ...
2. ...

**Resultado esperado:** ...
**Resultado actual:** ...

## Criterios de aceptación
- [Acá los criterios son: qué tiene que pasar para considerar el bug arreglado]
```

Solo usar este formato extendido si la información de pasos/resultados está disponible. Si no está, mantener el formato simple.

### 5. Mostrar resumen y esperar confirmación

**Siempre** mostrar este resumen antes de crear, formateado claro y escaneable:

```
📋 Voy a crear esta tarea en Jira:

**Proyecto:** KAN
**Tipo:** Historia
**Título:** Permitir login con Google OAuth
**Prioridad:** Medium
**Asignado:** Sin asignar
**Labels:** auth, frontend

**Descripción:**
## Contexto
Los usuarios actualmente solo pueden loguearse con email/password. Agregar OAuth de Google reduce fricción de signup y alinea con lo que ya hacen los principales competidores.

## Criterios de aceptación
- Botón "Continuar con Google" visible en /login y /signup
- Flujo completo OAuth 2.0 con redirect a /dashboard al éxito
- Manejo de error si el usuario cancela el consentimiento
- Cuenta nueva se crea automáticamente si el email no existe

¿La creo así o querés cambiar algo?
```

Esperar respuesta explícita. No crear hasta tener un OK claro ("dale", "creá", "OK", "sí", "go", "perfecto", "listo", etc.).

Si el usuario pide cambios ("cambialo a bug", "subí la prioridad a high", "sacá el label frontend", "agregá un criterio de que X"), aplicarlos, **volver a mostrar el resumen actualizado completo**, y esperar OK de nuevo.

### 6. Crear con el MCP de Atlassian

Una vez confirmado, usar las herramientas del MCP de Atlassian para crear el issue. Si las herramientas del MCP no están disponibles en la conversación, avisarle al usuario:

> Necesito que tengas conectado el connector de Atlassian para poder crear el issue. Lo podés activar desde la configuración de connectors en Claude. Cuando esté listo, decime y lo creo.

Después de crear exitosamente, devolver una confirmación corta con:
- Key del issue creado (ej: `PROJ-1234`)
- Link directo si la respuesta del MCP lo trae
- Nada más — no repetir todo el resumen

Ejemplo:
```
✅ Creado KAN-1234 — "Permitir login con Google OAuth"
🔗 https://tucompany.atlassian.net/browse/KAN-1234
```

Si la creación falla, devolver el error tal como vino del MCP (sin inventar explicaciones) y ofrecer reintentar o ajustar.

## Edge cases

- **Múltiples tareas en un mensaje**: si el usuario pide crear varias ("creá tres tareas: una para X, otra para Y, otra para Z"), tratá cada una por separado en el resumen, numeradas. Esperar un solo OK que cubra todas, y crearlas en secuencia. Devolver al final una lista con las keys creadas.
- **Edición libre del resumen**: aceptar ediciones en lenguaje natural ("cambialo a bug y subí prioridad", "el segundo criterio sacalo"). Aplicar y volver a mostrar.
- **Épicas**: tienden a tener menos criterios de aceptación detallados y más "objetivos de alto nivel". Está bien que en una épica los criterios sean menos granulares.
- **El usuario menciona campos no listados como default** (épica padre, fix version, componentes): incluirlos en el resumen y mandarlos al MCP. No los preguntés proactivamente.
- **El usuario pide un status inicial distinto**: si pide explícitamente algo como "dejalo en En curso" o "marcalo como En revisión directo", crear el ticket y luego transicionarlo al status pedido. Si el status no existe en el workflow, devolver el error del MCP.
- **Idioma del título y descripción**: por default seguir el idioma en que escribe el usuario. Si el equipo usa otro idioma estándar y el usuario lo menciona, respetarlo.

## Tono

Hablar en el idioma del usuario (típicamente español rioplatense). Ser concreto y directo — el resumen tiene que ser rápido de escanear. Nada de "¡Por supuesto! Con mucho gusto te ayudo a crear tu tarea en Jira" — directo al resumen.
