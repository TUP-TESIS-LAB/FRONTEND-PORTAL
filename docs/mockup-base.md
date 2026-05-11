# Portal Paciente — Mockup base aprobado

> Este documento describe el alcance del **mockup aprobado por el cliente** (zip de Claude Design, mayo 2026). Es el punto de partida para implementación. **NO cubre el producto completo** — funcionalidades futuras se documentan a medida que se definen.
>
> Se complementa con la skill `laboratory-ui` (`.claude/skills/laboratory-ui/`), que define el design system. Este archivo describe **qué construir**; la skill describe **cómo construirlo visualmente**.

---

## 1. Multi-tenant

La app es un SaaS multi-tenant. Cada laboratorio cliente tiene su propia URL y su propia configuración visual (paleta + logo + nombre).

### 1.1. Resolución del tenant

Cada laboratorio tiene su **subdominio**:

```
castillo-chidiak.miapp.com  → tenant "castillo-chidiak"
bioquimica-norte.miapp.com  → tenant "bioquimica-norte"
```

**Resolución:** la app extrae el `tenantId` del subdominio al arrancar.

```typescript
// src/app/core/tenant/tenant-resolver.ts
export function resolveTenantIdFromUrl(): string | null {
  const host = window.location.hostname;
  const parts = host.split('.');
  // Asume formato: <tenant>.<dominio>.<tld>
  if (parts.length < 3) return null;
  return parts[0]; // 'castillo-chidiak'
}
```

**Casos especiales:**
- Localhost o sin subdomain → usar tenant default `castillo-chidiak` para desarrollo.
- Tenant inexistente (404 del backend) → mostrar página de error neutral con mensaje "Este laboratorio no está disponible. Verifique la dirección."

### 1.2. Carga del tenant

Al arrancar la app, se hace una petición al backend para obtener la configuración del tenant. **Esto bloquea el bootstrap de Angular** — la app no renderiza hasta tener los colores aplicados (evita flash de colores default).

**Endpoint:**
```
GET /api/tenants/{tenantId}/config
→ 200 OK
{ ...TenantConfig }
```

**Mock para desarrollo (sin backend):** leer desde `assets/tenants/{tenantId}/tenant.config.json`.

### 1.3. Estructura de `TenantConfig`

```typescript
interface TenantConfig {
  id: string;                          // 'castillo-chidiak'
  shortName: string;                   // 'LCC'
  fullName: string;                    // 'Laboratorio Castillo Chidiak'
  tagline?: string;                    // 'Análisis clínicos de confianza'

  logo: {
    color:  string;                    // URL del logo a color
    white:  string;                    // versión para fondos oscuros (sidebar)
    mark:   string;                    // ícono solo (favicon, splash)
  };

  colors: {
    primary:   string;                 // '#1F6E70'
    secondary: string;                 // '#0EA5A4'
    accent:    string;                 // '#F97316'
  };

  contact: {
    helpPhone?: string;                // '0800-555-LCC'
    helpEmail?: string;
    address?:  string;
  };
}
```

### 1.4. Ejemplo: tenant Castillo Chidiak

`assets/tenants/castillo-chidiak/tenant.config.json`:

```json
{
  "id": "castillo-chidiak",
  "shortName": "LCC",
  "fullName": "Laboratorio Castillo Chidiak",
  "tagline": "Análisis clínicos de confianza",
  "logo": {
    "color": "/assets/tenants/castillo-chidiak/logo.svg",
    "white": "/assets/tenants/castillo-chidiak/logo-white.svg",
    "mark":  "/assets/tenants/castillo-chidiak/logo-mark.svg"
  },
  "colors": {
    "primary":   "#1F6E70",
    "secondary": "#2DA89A",
    "accent":    "#F97316"
  },
  "contact": {
    "helpPhone": "0800-555-LCC",
    "address": "Av. Colón 245, Córdoba"
  }
}
```

### 1.5. `TenantService` y `APP_INITIALIZER`

```typescript
// src/app/core/tenant/tenant.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private http = inject(HttpClient);

  private _config = signal<TenantConfig | null>(null);
  config = this._config.asReadonly();
  isLoaded = computed(() => this._config() !== null);

  async loadTenant(tenantId: string): Promise<void> {
    // En desarrollo: leer desde assets. En producción: leer del backend.
    const url = `/assets/tenants/${tenantId}/tenant.config.json`;
    // const url = `/api/tenants/${tenantId}/config`;

    try {
      const config = await firstValueFrom(
        this.http.get<TenantConfig>(url)
      );
      this._config.set(config);
      this.applyTheme(config);
    } catch (err) {
      throw new Error(`No se pudo cargar el tenant "${tenantId}"`);
    }
  }

  private applyTheme(config: TenantConfig): void {
    const root = document.documentElement;

    // Aplica los 3 colores de marca (la skill se encarga del resto)
    root.style.setProperty('--brand-primary',   config.colors.primary);
    root.style.setProperty('--brand-secondary', config.colors.secondary);
    root.style.setProperty('--brand-accent',    config.colors.accent);

    // Derivar variantes dark/light automáticamente o documentar en config.
    // Para mockup base: usar utility deriveTones() o agregarlas al JSON.

    // Logo
    root.style.setProperty('--brand-logo',       `url('${config.logo.color}')`);
    root.style.setProperty('--brand-logo-white', `url('${config.logo.white}')`);

    // Theme color del PWA
    document.querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', config.colors.primary);
  }
}
```

```typescript
// src/app/app.config.ts
import { ApplicationConfig, APP_INITIALIZER, inject } from '@angular/core';

function initTenantFactory() {
  const tenantSvc = inject(TenantService);
  return async () => {
    const id = resolveTenantIdFromUrl() ?? 'castillo-chidiak';
    await tenantSvc.loadTenant(id);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: () => initTenantFactory,
      multi: true,
    },
    // ...
  ]
};
```

### 1.6. Splash screen

Mientras se carga el tenant (típicamente <1s), se muestra una pantalla de loading directamente en `index.html` — no es un componente Angular porque Angular todavía no arrancó.

```html
<!-- index.html -->
<body>
  <app-root></app-root>

  <!-- Splash visible hasta que Angular toma control -->
  <div id="splash">
    <div class="splash__spinner"></div>
  </div>

  <style>
    #splash {
      position: fixed; inset: 0;
      background: #F7F8FA;
      display: flex; align-items: center; justify-content: center;
      z-index: 9999;
    }
    .splash__spinner {
      width: 40px; height: 40px;
      border: 3px solid #E5E7EB;
      border-top-color: #6B7280;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    /* Cuando Angular arranca, oculta el splash */
    app-root:not(:empty) ~ #splash { display: none; }
  </style>
</body>
```

---

## 2. Modelo de datos

Interfaces TypeScript extraídas del mockup. Todas viven en `src/app/core/models/`.

### 2.1. `User` — paciente logueado

```typescript
export interface User {
  id: number;
  nombre: string;
  apellido: string;
  iniciales: string;            // 'MF'
  dni: string;                  // '32.456.789'
  fechaNac: string;             // '14/05/1988' (formato dd/MM/yyyy)
  edad: number;
  sexo: 'F' | 'M' | 'X';
  ciudad: string;
  email: string;
  telefono: string;
  direccion?: string;

  cobertura: {
    tipo: string;               // 'Obra social' | 'Prepaga' | 'Particular'
    nombre: string;             // 'OSDE 410'
    plan?: string;              // 'Plan Premium'
    afiliado?: string;          // '12345678/01'
    vigente: boolean;
    venceEn?: string;           // '12/2026'
  };

  datosMedicos: {
    grupoSanguineo: string;     // '0+'
    alergias: string[];         // ['Penicilina', 'Polen']
    condiciones: string[];      // ['Tiroides controlada']
    medicacionHabitual: string[];
    cirugiasPrevias: string[];
    ultimaRevision?: string;
    habitos?: {
      fuma: 'No' | 'Sí' | 'Ex';
      alcohol: 'No' | 'Ocasional' | 'Frecuente';
      actividadFisica?: string;
    };
  };

  contactoEmergencia?: {
    nombre: string;
    vinculo: string;
    telefono: string;
  };
}
```

### 2.2. `Turno`

```typescript
export type EstadoTurno =
  | 'pendiente' | 'confirmado' | 'cancelado' | 'completado';

export interface Turno {
  id: number;
  personaId: number;            // a quién pertenece (yo o un familiar)

  // Para el date-stamp visual
  dia: string;                  // '19' (2 dígitos)
  mes: string;                  // 'MAY' (3 letras mayúsculas)
  fechaCompleta: string;        // 'Martes 19 de mayo de 2026'
  hora: string;                 // '08:30'

  tipo: string;                 // 'Hemoglobina glicosilada + Vitamina D'
  estudios: string[];           // ['Hemoglobina glicosilada', 'Vitamina D']
  sede: {
    id: string;
    nombre: string;             // 'Sede Centro'
    direccion: string;          // 'Av. Colón 450, Córdoba'
    telefono?: string;
    horario?: string;
  };

  estado: EstadoTurno;
  estadoLabel: string;          // 'Confirmado'

  preparacion: string[];        // ['8 horas de ayuno', 'Llevar orden firmada']
  llegarMinAntes: number;       // 10
  duracionEstimada?: string;    // '15 min'
  ordenCargada: boolean;
  medicoSolicitante?: string;
}
```

### 2.3. `Estudio`

```typescript
export interface GrupoEstudios {
  grupoFecha: string;           // 'Abril 2026'
  items: Estudio[];
}

export type EstadoEstudio = 'disponible' | 'en-proceso' | 'pendiente';

export interface Estudio {
  id: number;
  personaId: number;
  nombre: string;               // 'Hemograma completo'
  categoria: 'hematologia' | 'bioquimica' | 'hormonas' | 'orina' | 'coagulacion';
  fecha: string;                // '14/04/2026'
  fechaToma?: string;
  fechaCarga?: string;
  estado: EstadoEstudio;
  estadoLabel: string;          // 'Disponible'

  esNuevo?: boolean;            // muestra badge 'NUEVO'

  pdf?: {
    url: string;
    paginas: number;
    tamano: string;             // '184 KB'
  };

  protocolo?: string;
  sede?: string;
  medicoSolicitante?: string;
  medicoFirmante?: string;
  matricula?: string;
}
```

**Nota:** los valores cuantitativos del análisis (hemoglobina X g/dL, etc.) **no se muestran en el portal**. Viven dentro del PDF firmado. El paciente solo ve metadata + descarga.

### 2.4. `Familiar`

```typescript
export type Vinculo = 'Hijo' | 'Hija' | 'Madre' | 'Padre' | 'Cónyuge' | 'Otro';

export interface Familiar {
  id: number;
  nombre: string;
  apellido: string;
  iniciales: string;
  edad: number;
  vinculo: Vinculo;
  dni: string;
  cobertura: string;            // 'OSDE 410'
  proximoTurno?: {
    dia: string;
    fechaResumen: string;       // 'Mié 21 may · 9:00 · Sede Centro'
  };
  totalTurnos: number;
  totalEstudios: number;

  // Color del borde superior de la card. Indica el avatar color del familiar.
  accentColor: 'primary' | 'secondary' | 'accent';
}
```

### 2.5. Catálogos (para wizard de turnos)

```typescript
export interface TipoAnalisis {
  id: string;                   // 'hemograma'
  nombre: string;               // 'Hemograma completo'
  descripcionCorta: string;
  ayuno: boolean;               // requiere ayuno
  categoria: string;
  icono: string;                // 'pi-tag'
}

export interface Sede {
  id: string;                   // 'centro'
  nombre: string;               // 'Sede Centro'
  direccion: string;
  telefono: string;
  horario: string;
  distanciaKm?: number;         // calculada según geolocalización
}

export interface SlotDisponible {
  hora: string;                 // '07:30'
  disponible: boolean;
}
```

---

## 3. Lo que NO está en el mockup

Lista explícita de cosas que el mockup no cubre. **Si Claude las pide, redirigirlo a esta sección y consultarme antes de implementar.**

- Pantalla de **recuperar contraseña** (link visible en login pero sin pantalla)
- Pantalla de **error / 404 / 500**
- Pantalla de **mantenimiento del laboratorio**
- Flujo de **edición de perfil con submit real al backend** (el botón "Editar perfil" existe pero no su pantalla)
- Flujo de **agregar/editar familiar** con form
- **Notificaciones push** (la campana de la topbar es decorativa)
- **Búsqueda global** entre estudios/turnos
- **Configuración de cuenta** (cambiar contraseña, idioma, etc.)
- **Logout** (existe el botón pero el flujo no está definido)
- **Onboarding** del paciente nuevo

---

## 4. Pantallas del mockup

5 pantallas principales + 2 públicas (login/register) + wizard de reservar turno.

### Inventario

| Ruta                 | Pantalla        | Acceso  | Estado |
|----------------------|-----------------|---------|--------|
| `/login`             | Login           | Pública | Mockeada |
| `/register`          | Registro        | Pública | Mockeada |
| `/`                  | Inicio          | Privada | Mockeada |
| `/turnos`            | Mis turnos      | Privada | Mockeada |
| `/turnos/sacar`      | Reservar turno  | Privada | Wizard 4 pasos |
| `/estudios`          | Mis estudios    | Privada | Mockeada |
| `/perfil`            | Mi perfil       | Privada | Mockeada |
| `/familia`           | Mi familia      | Privada | Mockeada |

### Sidebar (config para portal paciente)

```typescript
const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'inicio',   icon: 'pi-home',     label: 'Inicio',   route: '/',          exactMatch: true },
      { id: 'estudios', icon: 'pi-file',     label: 'Estudios', route: '/estudios' },
      { id: 'turnos',   icon: 'pi-calendar', label: 'Turnos',   route: '/turnos' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { id: 'perfil',  icon: 'pi-user',  label: 'Mi perfil',  route: '/perfil' },
      { id: 'familia', icon: 'pi-users', label: 'Mi familia', route: '/familia' },
    ],
  },
];
```

### Bottom nav (mobile, paciente)

Solo los 4 ítems principales, sin agrupar:

```
[ Inicio ] [ Estudios ] [ Turnos ] [ Más → drawer ]
```

El ítem "Más" abre el drawer con el sidebar completo (incluye perfil/familia).

---

## 5. Pantalla: Login

### Layout

**Una card centrada sobre fondo con gradient sutil del tenant.** No es split-screen — el zip lo descartó por mantenimiento más simple.

```
┌─────────────────────────────────────────────────┐
│ [LCC] Laboratorio Castillo Chidiak  [← Volver] │  ← topbar pública
├─────────────────────────────────────────────────┤
│                                                 │
│             ┌─────────────────────┐             │
│             │ Hola de nuevo       │             │
│             │ Ingresá con DNI...  │             │
│             │                     │             │
│             │ [Ingresar][Crear]   │  ← tabs     │
│             │                     │             │
│             │  DNI       [____]   │             │
│             │  Contraseña[____]   │             │
│             │                     │             │
│             │  □ Mantener sesión  │             │
│             │                     │             │
│             │  [→ Ingresar    ]   │             │
│             │                     │             │
│             │  ¿Ayuda? 0800-...   │             │
│             └─────────────────────┘             │
│                                                 │
└─────────────────────────────────────────────────┘
   Background: gradient sutil primary-light → bg
```

### Componente: Topbar pública

Variante reducida de la topbar normal. Solo logo del tenant + 1 acción ("Volver al inicio" cuando hay landing pública, o nada).

### Background sutil

```scss
.ui-auth-page {
  min-height: 100vh;
  background: linear-gradient(135deg,
    var(--brand-primary-light) 0%,
    var(--ds-bg) 100%);
  display: flex;
  flex-direction: column;
}

.ui-auth-page__content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}
```

### Card de auth

```scss
.ui-auth-card {
  width: 100%;
  max-width: 440px;
  background: var(--ds-white);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-md);
  padding: var(--space-8);

  @include mobile-only {
    padding: var(--space-6);
  }
}
```

### Form de login (Reactive Forms)

Campos:
- `dni` — required, pattern `^\d{7,8}$`, inputmode numeric
- `password` — required, minLength 6
- `rememberMe` — boolean (asumido como funcionalidad mínima)

```typescript
form = this.fb.group({
  dni:        ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
  password:   ['', [Validators.required, Validators.minLength(6)]],
  rememberMe: [true],
});

onSubmit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }
  // Mock: navega al inicio sin validar credenciales reales.
  // TODO: reemplazar por llamada a AuthService.login()
  this.router.navigate(['/']);
}
```

### Footer del card

Texto fijo: `¿Necesitás ayuda? Llamanos al <strong>{tenant.contact.helpPhone}</strong>`. Si no hay `helpPhone`, ocultar.

### Link "Recuperar contraseña"

Solo visual (lleva a `/recuperar` que mostrará "Próximamente" — no implementar la pantalla en el MVP).

### Comportamiento responsive

- Desktop: card centrada, max-width 440px.
- Mobile: card ocupa todo el ancho menos un padding lateral pequeño. Sin gradient en mobile (solo `--ds-bg`) para mejor performance y simpleza visual.

---

## 6. Pantalla: Registro

### Layout

**Misma card de auth que login**, con tab "Crear cuenta" activa. La card cambia su contenido pero la estructura es idéntica.

### Form de registro

Campos:
- `nombreCompleto` — required, minLength 3
- `dni` — required, pattern `^\d{7,8}$`, inputmode numeric
- `email` — required, email
- `password` — required, minLength 8, debe incluir mayúscula y número
- `aceptaTerminos` — required, true

```typescript
form = this.fb.group({
  nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
  dni:            ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
  email:          ['', [Validators.required, Validators.email]],
  password:       ['', [
    Validators.required,
    Validators.minLength(8),
    Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/),
  ]],
  aceptaTerminos: [false, [Validators.requiredTrue]],
});
```

### Hint en password

Debajo del campo password, mostrar siempre: `Usá al menos 8 caracteres con mayúsculas y números.`

### Submit

Mock: navega a `/` (Inicio) simulando alta exitosa.

---

## 7. Pantalla: Inicio

Saludo personal + próximo turno destacado + stats + lista de últimos resultados.

### Componentes (de la skill)

- `ui-page-header` — "Hola, María 👋" + "Esto es lo que pasa con tus estudios y turnos."
- `ui-hero-card` — bloque destacado del próximo turno, con gradient `linear-gradient(135deg, brand-primary, brand-secondary)`
- `ui-stats-grid` — 4 stat cards
- `ui-section` — "Últimos resultados disponibles"

### Hero card del próximo turno

Contenido:
- Etiqueta: "TU PRÓXIMO TURNO" (uppercase, opacity 0.85)
- Fecha + hora: "Mar 19 may · 8:30 hs" (h2 grande)
- Sede + dirección con `pi-map-marker`
- Tags de estudios incluidos (chips claros sobre fondo translúcido)
- Botones secondary: `Cómo prepararme` + `Ver detalle`
- Lado derecho: gota o ilustración decorativa con opacity reducida

### Stat cards (grid)

```
[ Turnos próximos: 2 ]   [ Estudios nuevos: 5 ]
[ Pend. retiro:    1 ]   [ Familiares:      3 ]
```

Cada card con `border-left-color`:
- Turnos próximos → `--brand-secondary`
- Estudios nuevos → `--brand-primary`
- Pend. retiro → `--ds-warning`
- Familiares → `--brand-accent`

### Sección: Recordatorios

Lista vertical de items con bullet point coloreado a la izquierda:
- 🟠 "Para tu turno del martes necesitás **8 horas de ayuno**"
- 🔵 "Lucía tiene resultados nuevos sin abrir."

(Usar `--brand-accent` y `--brand-secondary` como bullets.)

### Sección: Avisos del laboratorio

Card simple con megáfono ícono + texto: "Atención reducida el **25 de mayo** por feriado nacional."

### Sección: Últimos resultados disponibles

Lista de 3-4 estudios recientes (de cualquier persona del grupo familiar). Cada item:
- Ícono de PDF coloreado (color suave del tipo de estudio)
- Nombre + fecha + nombre del familiar
- Tag verde "Disponible"
- Botón "Descargar"

Link "Ver todos →" que lleva a `/estudios`.

### Microcomportamientos

- Click en "Cómo prepararme" → `p-dialog` con detalle de preparación (lista del campo `Turno.preparacion`).
- Click en "Ver detalle" → navega a `/turnos` y selecciona ese turno en el aside.
- Click en "Descargar" → `window.open(estudio.pdf.url, '_blank')`.
- Click en "Sacar turno" (botón superior derecho) → navega a `/turnos/sacar`.

### Responsive

- Stats grid: 2x2 en mobile, 1x4 en desktop.
- Hero card: gradient siempre. La gota decorativa se oculta en mobile.
- Recordatorios y avisos van debajo del hero en mobile, a la derecha en desktop (layout 2-col).

---

## 8. Pantalla: Mis turnos

### Layout

Layout 2-col en desktop: lista de turnos a la izquierda, detalle del turno seleccionado a la derecha.
En mobile: solo lista; al tocar un turno, se abre el detalle como ruta `/turnos/:id` (sub-pantalla con header propio).

### Tabs

Tabs sticky arriba:
- `Próximos N` (default activo)
- `Anteriores N`

Cada tab muestra una `p-tabs` con su contenido. El badge muestra la cantidad real.

### Lista de turnos

Cards usando `ui-event-card` (de la skill):
- Date stamp (día grande + mes uppercase)
- Hora destacada
- Sede + dirección
- Tags con los estudios
- Menú overflow (`pi-ellipsis-v`) con: "Reprogramar", "Cancelar turno", "Ver detalle"

### Aside: detalle del turno

Cuando hay un turno seleccionado:
- Header: "Tu próximo turno" + fecha completa + "8:30 hs · llega 10 min antes"
- Mapa placeholder (rectángulo gris con un punto, simula ubicación)
- Datos de la sede (`<dl>`): dirección, teléfono, horario
- Estudios incluidos (chips)
- Caja de preparación (warning naranja) con lista de instrucciones
- Botones: `Reprogramar` (secondary) / `Cancelar turno` (text danger)

Si no hay turno seleccionado, mostrar empty state en el aside: "Seleccioná un turno para ver detalles."

### Microcomportamientos

- Click en card de turno → lo selecciona (se highlight + se actualiza el aside en desktop, navega a sub-pantalla en mobile).
- Click en "Cancelar turno" → `p-confirmDialog` con mensaje "¿Cancelar el turno del {fecha}?". Si confirma → mock que cambia el estado a 'cancelado' y muestra toast de éxito.
- Click en "Reprogramar" → navega a `/turnos/sacar` con el turno actual prefilled (TBD: queda fuera del MVP, mostrar toast "Próximamente").
- Botón "Sacar turno" superior derecho → `/turnos/sacar`.

### Responsive

- Desktop: 2 columnas (lista 60%, aside 40%).
- Mobile: solo lista. Al tocar un turno se navega a sub-ruta con detalle full-screen.

---

## 9. Sub-pantalla: Reservar turno (wizard)

**Usar el patrón "Wizard multi-paso" de la skill (`components.md`).**

4 pasos exactos:

1. **Tipo de análisis** — multi-select de cards de tipos de análisis. Mínimo 1.
2. **Sede** — single-select de cards de sedes (con dirección + distancia).
3. **Fecha y hora** — date picker inline + grilla de slots de hora. Slots tomados se muestran disabled.
4. **Confirmar** — resumen de selección + warning de preparación si aplica + botón "Confirmar turno".

### Datos consumidos

- `TipoAnalisis[]` (catálogo)
- `Sede[]` (catálogo)
- `SlotDisponible[]` filtrado por `sedeId + fecha`

### Embebido

- Desktop: dentro de `p-dialog` con width 720px.
- Mobile: ruta full-screen propia (`/turnos/sacar`).

### Microcomportamientos

- Al confirmar → mock POST → toast "Turno reservado para {fecha} a las {hora}" → cierra el wizard → navega a `/turnos`.
- Si el paciente cierra el wizard a la mitad, descartar selección sin avisar (o mostrar `p-confirmDialog` "¿Salir sin guardar?" — TBD).

---

## 10. Pantalla: Mis estudios

### Layout

Header de página + chips de filtro por persona + tabla adaptativa + aside con filtros avanzados.

### Chips de persona (filtro principal)

Selector horizontal con avatares:
```
[Todos] [M (María yo)] [L (Lucía)] [T (Tomás)] [M (Mamá)]
```
Cada chip con iniciales y color de avatar. Al tocar uno se filtra la lista.

### Search + sort

- Input de búsqueda con `pi-search` ("Buscar por nombre de estudio, fecha, persona...")
- Dropdown de orden: "Más recientes" / "Más antiguos"

### Tabla / lista adaptativa

Columnas (desktop):
- Estudio (con ícono coloreado por categoría + badge "NUEVO" si aplica)
- Fecha
- Persona (avatar + nombre)
- Estado (`p-tag` con `ui-tag-{disponible|en-proceso|pendiente}`)
- Acciones (descargar, ver)

Mobile: cada estudio es una `ui-list-card` con la misma info compactada.

### Aside: filtros

Card con:
- **Rango de fechas:** chips rápidos `Último mes` / `3 meses` / `6 meses` / `Año` + 2 inputs de fecha.
- **Tipo de estudio:** checkboxes con count: Hematología (3), Bioquímica (8), Hormonas (4), Orina (2), Coagulación (2).
- **Estado:** checkboxes con dot coloreado: Disponible (5), En proceso (1), Pendiente (1).
- Botón `Aplicar filtros` y `Limpiar`.

Debajo del aside de filtros, un teaser pequeño "Tu próximo estudio" con la misma data del próximo turno.

### Paginación

Mostrar `Mostrando 1-10 de 24 estudios` + pager con páginas.

### Microcomportamientos

- Click en estudio → si tiene PDF disponible, abre el PDF en nueva pestaña. Si está pendiente, no hace nada (cursor en default).
- Click en descargar → `window.open(pdf.url, '_blank')`.
- Filtros: aplican localmente sobre el array (mock); con backend serían query params.

### Responsive

- Desktop: tabla a la izquierda, aside de filtros a la derecha (layout 2-col 70/30).
- Mobile: solo cards. Botón flotante de filtros (FAB con `pi-filter`) abre `p-drawer` desde abajo con los mismos filtros.

---

## 11. Pantalla: Mi perfil

### Layout

2 columnas en desktop: sidebar izquierdo con resumen visual del paciente + cobertura activa + datos críticos. Tabs horizontales a la derecha con los grupos de datos.

### Sidebar izquierdo

- Avatar circular grande con iniciales
- Nombre completo
- DNI
- "{edad} años · {sexo} · {ciudad}"
- Card con cobertura activa (logo + nombre + plan + número + vencimiento + link "Subir credencial")
- Card "Datos críticos": grupo sanguíneo (chip rojo), alergias (chips amarillos)

### Tabs

5 tabs:
- `Datos personales`
- `Contacto`
- `Cobertura`
- `Datos médicos`
- `Preferencias`

Cada tab muestra su contenido en una `ui-data-list` (`<dl>`).

### Datos médicos (más completa)

- **Antecedentes personales:** Hipertensión, Diabetes, Tiroides, Cirugías previas (cada uno: label + valor "No" / "Sí, controlada" / etc.)
- **Medicación habitual:** chips con tags de medicación
- **Alergias conocidas:** chips amarillos
- **Hábitos:** Fuma, Alcohol, Actividad física, Última revisión

### Botón superior

`Editar perfil` (severity primary). Por ahora muestra toast "Próximamente" — no implementar el form de edición en el MVP.

### Banner inferior

`<info shield icon> Mantener esta información actualizada ayuda al laboratorio a interpretar mejor tus resultados.`

### Responsive

- Desktop: sidebar (40%) + tabs content (60%).
- Mobile: stack vertical. Sidebar arriba, tabs debajo. Las tabs pueden ser scrolleables horizontalmente si no entran.

---

## 12. Pantalla: Mi familia

### Layout

Header + stats grid + grid de cards de familiares + card de "Agregar familiar" al final.

### Stats grid

```
[ Personas vinculadas: 3 ]  [ Turnos próximos: 2 ]
[ Estudios disponibles: 4]  [ Pendientes retiro: 1 ]
```

### Cards de familiares

Grid de cards con:
- **Borde superior coloreado** (3-4px, color según `accentColor` del familiar)
- Avatar circular grande (color del avatar = mismo que el border)
- Nombre completo
- Metadata: "{vinculo} · {edad} años · {cobertura}"
- "{N} turno próximo" + "{N} estudios" (con íconos)
- Si tiene próximo turno: caja con "📅 Mié 21 may · 9:00 · Sede Centro"
- Si no: caja vacía con "Sin próximos turnos"
- Botones: `Ver estudios` (outlined) / `Sacar turno` (text) + menú overflow

### Card "Agregar familiar"

Card vacía con borde dashed, ícono `+` grande gris, texto "Agregar familiar / Hijos, padres o personas a tu cargo".

### Microcomportamientos

- Click en `Ver estudios` → navega a `/estudios?personaId={id}` (filtro pre-aplicado).
- Click en `Sacar turno` → navega a `/turnos/sacar?personaId={id}` (paciente pre-seleccionado en wizard).
- Click en card de "Agregar familiar" → muestra toast "Próximamente" (TBD para MVP).
- Menú overflow: "Editar", "Quitar vinculación" (toast "Próximamente").

### Responsive

- Desktop: 3 columnas en grid.
- Tablet: 2 columnas.
- Mobile: 1 columna.

---

## 13. Anti-patrones específicos del proyecto

Sumados a los anti-patrones generales de la skill:

- ❌ **Mostrar valores cuantitativos de análisis en pantalla** (hemoglobina X g/dL). Esos viven en el PDF firmado, nunca en la UI.
- ❌ **Permitir editar datos críticos del paciente** (DNI, fecha de nacimiento) sin un flujo verificado. El mockup tiene esos campos como solo lectura.
- ❌ **Mezclar la paleta de un tenant con otro** en cualquier vista. Si la URL es de LCC, todo es LCC.
- ❌ **Renderizar la app antes de tener el tenant cargado**. Esto causa flash de colores. Siempre esperar al `APP_INITIALIZER`.
- ❌ **Hardcodear el nombre o el logo de un tenant** en componentes. Siempre leer del `TenantService.config()`.
- ❌ **Asumir que existe un familiar default**. Algunos pacientes no tienen familiares vinculados — todas las pantallas relacionadas deben manejar el caso vacío.

---

## 14. Tabla resumen: pantalla → componentes

| Pantalla        | De la skill                                                | Nuevos a crear |
|-----------------|------------------------------------------------------------|----------------|
| Login           | `ui-auth-page`, `ui-auth-card`, formulario, topbar pública | `ui-auth-page`, `ui-auth-card`, `ui-public-topbar` |
| Register        | Mismos que Login                                           | (ninguno extra) |
| Inicio          | `ui-page-header`, `ui-hero-card`, `ui-stats-grid`, `ui-stat-card`, `ui-section`, `ui-list-card` | `ui-reminder-list`, `ui-notice-card` |
| Mis turnos      | `ui-event-card`, `p-tabs`, `ui-section`, `ui-empty-state`  | `ui-turno-detail-aside`, `ui-prep-warning` |
| Reservar turno  | `ui-wizard` (skill)                                        | `ui-analysis-card-grid`, `ui-sede-list`, `ui-time-slots` |
| Mis estudios    | `ui-table-adaptive`, `ui-list-card`, `ui-empty-state`, `ui-page-header` | `ui-person-chips`, `ui-filters-aside` |
| Mi perfil       | `ui-section`, `ui-data-list`, `p-tabs`                     | `ui-profile-summary`, `ui-coverage-card`, `ui-medical-flags` |
| Mi familia      | `ui-stats-grid`, `ui-stat-card`                            | `ui-family-card`, `ui-family-grid`, `ui-add-family-card` |

---

## 15. Cómo usar este archivo con Claude CLI

Cada sesión es **un archivo + skill = un objetivo**.

```bash
# Ejemplo de sesión: implementar Mi familia

$ claude
> Leé docs/mockup-base.md secciones 1, 2 y 12.
> Implementá la pantalla "Mi familia" siguiendo la skill laboratory-ui.
> Usá datos mockeados con of(...).pipe(delay(300)) en un FamiliaService.
> Creá los componentes nuevos listados en la tabla de la sección 14
> como standalone components en src/app/shared/ui/components/.
```

No carges todo el archivo en cada sesión: usá las secciones específicas que aplican. Si Claude pide algo de la lista de "lo que NO está en el mockup" (sección 3), responder "fuera de scope".
