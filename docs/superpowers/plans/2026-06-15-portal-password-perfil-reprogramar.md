# Portal — Recuperar/Cambiar contraseña, Reprogramar turno y Perfil real — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `FRONTEND-PORTAL/docs/superpowers/specs/2026-06-15-portal-password-perfil-reprogramar-design.md`

**Goal:** Cablear de forma real 4 funcionalidades del Portal del Paciente (recuperar contraseña, cambiar contraseña logueado, reprogramar turno, ver/editar perfil) agregando los cambios mínimos de backend que falten.

**Architecture:** Cross-stack. Backend Spring Boot hexagonal (`Backend`, rama nueva off `origin/development`, JDK 21). Frontend Angular 21 standalone (`FRONTEND-PORTAL`, rama nueva off `origin/development`). Toda petición nueva del portal pasa por **NgRx store** (regla del CLAUDE.md). Las 4 partes son **independientes** y mapean a **1 PR de back + 1 PR de front por parte** (8 PRs). Orden recomendado por dependencia back→front: A → B → C → D (D depende del slice de Perfil creado en B).

**Tech Stack:** Java 21 / Spring Boot 4 / Hibernate / JPA / Flyway / JUnit 5 + Mockito + MockMvc (H2 en `@ActiveProfiles("test")`). Angular 21 standalone + signals + NgRx clásico + PrimeNG + Vitest (jsdom + HttpTestingController).

**Comandos de test:**
- Backend (desde `Backend/`): `mvnw.cmd test -Dtest=<Clase>`
- Frontend (desde `FRONTEND-PORTAL/`): todo → `npm test`; un archivo → `npx vitest run <ruta-spec>`

**Worktrees (crear en ejecución):**
- Back: `git -C Backend worktree add -b feat/portal-auth-perfil-be .worktrees/portal-be origin/development`
- Front: `git -C FRONTEND-PORTAL worktree add -b feat/portal-auth-perfil-fe .worktrees/portal-fe origin/development` + `npm ci`

(Si preferís una rama por parte, crear cuatro pares de ramas con el sufijo de cada parte. El plan agrupa commits por tarea; la separación en PRs se decide al finalizar cada parte.)

**Regla NgRx (resumen del CLAUDE.md):** componente despacha action → effect llama al service → action Success/Failure → reducer → selector → `selectSignal`. Estructura por slice en `features/<f>/store/`: `<f>.state.ts`, `<f>.actions.ts`, `<f>.effects.ts`, `<f>.reducer.ts`, `<f>.selectors.ts`. Naming de actions `[Source] Event`. Operators: load→`switchMap`, create/update→`concatMap`, submit único→`exhaustMap`. El error siempre es `HttpErrorResponse` y se guarda completo en el state. El logger meta-reducer ya existe (`src/app/store/logger.meta-reducer.ts`) y se registra en `app.config.ts`.

---

# PARTE A — Recuperar contraseña (1 PR back + 1 PR front)

El backend ya expone `POST /api/v1/auth/password/forgot|reset|validate-token` (públicos, email SMTP real). El único cambio de back es que el `AnonymousTenantFilter` acepte el header `X-Tenant-Slug` (el portal solo conoce el slug, no el id numérico).

## Task A1 (BE): `AnonymousTenantFilter` acepta `X-Tenant-Slug`

**Files:**
- Modify: `Backend/src/main/java/lab/laboratorio/infrastructure/tenancy/AnonymousTenantFilter.java`
- Modify: `Backend/src/main/java/lab/laboratorio/infrastructure/config/SecurityConfig.java`
- Test: `Backend/src/test/java/lab/laboratorio/infrastructure/tenancy/AnonymousTenantFilterTest.java`

- [ ] **Step 1: Escribir el test que falla**

Reemplazar/crear `AnonymousTenantFilterTest` con casos para slug. Usa `MockHttpServletRequest/Response` y un `FilterChain` que captura el `TenantContext` activo durante el chain.

```java
package lab.laboratorio.infrastructure.tenancy;

import lab.laboratorio.modules.empresa.domain.port.TenantSlugResolverPort;
import lab.laboratorio.modules.saasadmin.domain.exception.TenantNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class AnonymousTenantFilterTest {

    private final TenantSlugResolverPort resolver = mock(TenantSlugResolverPort.class);
    private final AnonymousTenantFilter filter = new AnonymousTenantFilter(resolver);

    @Test
    void resolvesTenantFromSlugHeaderWhenIdAbsent() throws Exception {
        when(resolver.resolveActive("demo")).thenReturn(7L);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/password/forgot");
        req.addHeader("X-Tenant-Slug", "demo");
        MockHttpServletResponse res = new MockHttpServletResponse();
        AtomicReference<Long> seen = new AtomicReference<>();

        filter.doFilter(req, res, (rq, rs) -> seen.set(TenantContext.getTenantId().orElse(null)));

        assertThat(seen.get()).isEqualTo(7L);
        assertThat(TenantContext.getTenantId()).isEmpty(); // cleared after chain
    }

    @Test
    void numericIdHeaderTakesPriorityOverSlug() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/password/forgot");
        req.addHeader("X-Tenant-Id", "3");
        req.addHeader("X-Tenant-Slug", "demo");
        MockHttpServletResponse res = new MockHttpServletResponse();
        AtomicReference<Long> seen = new AtomicReference<>();

        filter.doFilter(req, res, (rq, rs) -> seen.set(TenantContext.getTenantId().orElse(null)));

        assertThat(seen.get()).isEqualTo(3L);
        verifyNoInteractions(resolver);
    }

    @Test
    void unknownSlugReturns400() throws Exception {
        when(resolver.resolveActive("nope")).thenThrow(new TenantNotFoundException("nope"));
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/password/forgot");
        req.addHeader("X-Tenant-Slug", "nope");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, (rq, rs) -> {});

        assertThat(res.getStatus()).isEqualTo(400);
    }

    @Test
    void missingBothHeadersReturns400() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/password/forgot");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, (rq, rs) -> {});

        assertThat(res.getStatus()).isEqualTo(400);
    }
}
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `mvnw.cmd test -Dtest=AnonymousTenantFilterTest`
Expected: FAIL de compilación — el constructor `AnonymousTenantFilter(TenantSlugResolverPort)` aún no existe.

- [ ] **Step 3: Implementar el filtro**

Reemplazar la clase para inyectar el resolver y agregar la resolución por slug. Mantiene intactos los early-returns y la prioridad de `X-Tenant-Id`.

```java
package lab.laboratorio.infrastructure.tenancy;

import java.io.IOException;
import java.util.Set;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lab.laboratorio.modules.empresa.domain.port.TenantSlugResolverPort;
import lab.laboratorio.modules.saasadmin.domain.exception.TenantNotFoundException;
import org.springframework.web.filter.OncePerRequestFilter;

public class AnonymousTenantFilter extends OncePerRequestFilter {

    private static final String TENANT_HEADER = "X-Tenant-Id";
    private static final String TENANT_SLUG_HEADER = "X-Tenant-Slug";
    private static final String AUTH_PATH_PREFIX = "/api/v1/auth/";
    private static final String INTERNAL_AUTH_PREFIX = "/api/v1/auth/internal/";

    private static final Set<String> AUTHENTICATED_AUTH_PATHS = Set.of(
            "/api/v1/auth/email/resend",
            "/api/v1/auth/first-login/set-password",
            "/api/v1/auth/first-login/generate-token"
    );

    private static final Set<String> SELF_RESOLVING_AUTH_PATHS = Set.of(
            "/api/v1/auth/register-patient",
            "/api/v1/auth/login-patient"
    );

    private final TenantSlugResolverPort tenantSlugResolver;

    public AnonymousTenantFilter(TenantSlugResolverPort tenantSlugResolver) {
        this.tenantSlugResolver = tenantSlugResolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        if (!request.getRequestURI().startsWith(AUTH_PATH_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }
        if (request.getRequestURI().startsWith(INTERNAL_AUTH_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }
        if (AUTHENTICATED_AUTH_PATHS.contains(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }
        if (SELF_RESOLVING_AUTH_PATHS.contains(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        Long tenantId = resolveTenantId(request, response);
        if (tenantId == null) {
            return; // a 400 ya fue escrito
        }

        TenantContext.setTenantId(tenantId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    /** Devuelve el tenantId o null (habiendo escrito un 400) si no se pudo resolver. */
    private Long resolveTenantId(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String idHeader = request.getHeader(TENANT_HEADER);
        if (idHeader != null && !idHeader.isBlank()) {
            try {
                return Long.parseLong(idHeader.trim());
            } catch (NumberFormatException e) {
                sendBadRequest(response, "X-Tenant-Id must be a valid numeric tenant identifier");
                return null;
            }
        }

        String slugHeader = request.getHeader(TENANT_SLUG_HEADER);
        if (slugHeader != null && !slugHeader.isBlank()) {
            try {
                return tenantSlugResolver.resolveActive(slugHeader.trim());
            } catch (TenantNotFoundException e) {
                sendBadRequest(response, "Unknown or inactive tenant slug");
                return null;
            }
        }

        sendBadRequest(response, "X-Tenant-Id or X-Tenant-Slug header is required for anonymous auth endpoints");
        return null;
    }

    private void sendBadRequest(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
```

- [ ] **Step 4: Cablear el resolver en SecurityConfig**

En `SecurityConfig`, inyectar `TenantSlugResolverPort` y pasarlo al filtro. Cambiar la línea `.addFilterBefore(new AnonymousTenantFilter(), ...)`:

```java
// Agregar el campo (junto a jwtTenantResolver) y al constructor generado por @RequiredArgsConstructor:
private final lab.laboratorio.modules.empresa.domain.port.TenantSlugResolverPort tenantSlugResolver;

// ...dentro de securityFilterChain, reemplazar:
.addFilterBefore(new AnonymousTenantFilter(tenantSlugResolver), BearerTokenAuthenticationFilter.class)
```

Si `SecurityConfig` no usa `@RequiredArgsConstructor`, agregar el parámetro al constructor existente y asignarlo. (Confirmar la forma del constructor actual al editar.)

- [ ] **Step 5: Correr el test y verlo pasar**

Run: `mvnw.cmd test -Dtest=AnonymousTenantFilterTest`
Expected: PASS (4 tests).

- [ ] **Step 6: Smoke de regresión del arranque**

Run: `mvnw.cmd test -Dtest=AuthControllerTest`
Expected: PASS (el contexto Spring levanta con el filtro cableado; los tests de password con `X-Tenant-Id` siguen verdes).

- [ ] **Step 7: Commit**

```bash
git add Backend/src/main/java/lab/laboratorio/infrastructure/tenancy/AnonymousTenantFilter.java \
        Backend/src/main/java/lab/laboratorio/infrastructure/config/SecurityConfig.java \
        Backend/src/test/java/lab/laboratorio/infrastructure/tenancy/AnonymousTenantFilterTest.java
git commit -m "feat(tenancy): AnonymousTenantFilter resuelve tenant por X-Tenant-Slug"
```

## Task A2 (FE): `PasswordRecoveryService` + slice NgRx

**Files:**
- Create: `FRONTEND-PORTAL/src/app/features/auth/password-recovery/services/password-recovery.service.ts`
- Create: `FRONTEND-PORTAL/src/app/features/auth/password-recovery/store/password-recovery.state.ts`
- Create: `.../store/password-recovery.actions.ts`
- Create: `.../store/password-recovery.effects.ts`
- Create: `.../store/password-recovery.reducer.ts`
- Create: `.../store/password-recovery.selectors.ts`
- Modify: `FRONTEND-PORTAL/src/app/core/auth/auth.interceptor.ts` (SKIP_PATTERNS)
- Test: `.../services/password-recovery.service.spec.ts`, `.../store/password-recovery.effects.spec.ts`

- [ ] **Step 1: Escribir el test del service (falla)**

`password-recovery.service.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PasswordRecoveryService } from './password-recovery.service';
import { TenantService } from '../../../../core/tenant/tenant.service';

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TenantService, useValue: { config: () => ({ id: 'demo' }) } },
        PasswordRecoveryService,
      ],
    });
    service = TestBed.inject(PasswordRecoveryService);
    http = TestBed.inject(HttpTestingController);
  });

  it('forgot posts email + X-Tenant-Slug header', () => {
    service.forgot('a@a.com').subscribe();
    const req = http.expectOne('/api/v1/auth/password/forgot');
    expect(req.request.body).toEqual({ email: 'a@a.com' });
    expect(req.request.headers.get('X-Tenant-Slug')).toBe('demo');
    req.flush(null);
  });

  it('validateToken posts token', () => {
    service.validateToken('tok').subscribe();
    const req = http.expectOne('/api/v1/auth/password/validate-token');
    expect(req.request.body).toEqual({ token: 'tok' });
    expect(req.request.headers.get('X-Tenant-Slug')).toBe('demo');
    req.flush(null);
  });

  it('reset posts token + newPassword', () => {
    service.reset('tok', 'Password123').subscribe();
    const req = http.expectOne('/api/v1/auth/password/reset');
    expect(req.request.body).toEqual({ token: 'tok', newPassword: 'Password123' });
    req.flush(null);
  });
});
```

- [ ] **Step 2: Correr y verlo fallar**

Run: `npx vitest run src/app/features/auth/password-recovery/services/password-recovery.service.spec.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar el service**

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TenantService } from '../../../../core/tenant/tenant.service';

@Injectable({ providedIn: 'root' })
export class PasswordRecoveryService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantService);

  private slugHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Tenant-Slug': this.tenant.config()?.id ?? '' });
  }

  forgot(email: string): Observable<void> {
    return this.http.post<void>('/api/v1/auth/password/forgot', { email }, { headers: this.slugHeaders() });
  }

  validateToken(token: string): Observable<void> {
    return this.http.post<void>('/api/v1/auth/password/validate-token', { token }, { headers: this.slugHeaders() });
  }

  reset(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>('/api/v1/auth/password/reset', { token, newPassword }, { headers: this.slugHeaders() });
  }
}
```

- [ ] **Step 4: Agregar el path a SKIP_PATTERNS del interceptor**

En `src/app/core/auth/auth.interceptor.ts`, agregar `'/auth/password'` al array:

```typescript
const SKIP_PATTERNS = ['/auth/login-patient', '/auth/register-patient', '/auth/password', '/sucursales/public', '/tenants/'];
```

- [ ] **Step 5: Crear el slice (state/actions/reducer/selectors)**

`password-recovery.state.ts`:

```typescript
import { HttpErrorResponse } from '@angular/common/http';

export interface PasswordRecoveryState {
  submitting: boolean;
  emailSent: boolean;
  tokenStatus: 'idle' | 'checking' | 'valid' | 'invalid';
  resetDone: boolean;
  error: HttpErrorResponse | null;
}

export const initialPasswordRecoveryState: PasswordRecoveryState = {
  submitting: false,
  emailSent: false,
  tokenStatus: 'idle',
  resetDone: false,
  error: null,
};
```

`password-recovery.actions.ts`:

```typescript
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';

export const requestReset = createAction('[Forgot Page] Request Reset', props<{ email: string }>());
export const requestResetSuccess = createAction('[Password API] Request Reset Success');
export const requestResetFailure = createAction('[Password API] Request Reset Failure', props<{ error: HttpErrorResponse }>());

export const validateToken = createAction('[Reset Page] Validate Token', props<{ token: string }>());
export const validateTokenSuccess = createAction('[Password API] Validate Token Success');
export const validateTokenFailure = createAction('[Password API] Validate Token Failure', props<{ error: HttpErrorResponse }>());

export const resetPassword = createAction('[Reset Page] Reset Password', props<{ token: string; newPassword: string }>());
export const resetPasswordSuccess = createAction('[Password API] Reset Password Success');
export const resetPasswordFailure = createAction('[Password API] Reset Password Failure', props<{ error: HttpErrorResponse }>());
```

`password-recovery.reducer.ts`:

```typescript
import { createReducer, on } from '@ngrx/store';
import { initialPasswordRecoveryState } from './password-recovery.state';
import * as A from './password-recovery.actions';

export const passwordRecoveryReducer = createReducer(
  initialPasswordRecoveryState,
  on(A.requestReset, s => ({ ...s, submitting: true, error: null })),
  on(A.requestResetSuccess, s => ({ ...s, submitting: false, emailSent: true })),
  on(A.requestResetFailure, (s, { error }) => ({ ...s, submitting: false, error })),

  on(A.validateToken, s => ({ ...s, tokenStatus: 'checking' as const, error: null })),
  on(A.validateTokenSuccess, s => ({ ...s, tokenStatus: 'valid' as const })),
  on(A.validateTokenFailure, (s, { error }) => ({ ...s, tokenStatus: 'invalid' as const, error })),

  on(A.resetPassword, s => ({ ...s, submitting: true, error: null })),
  on(A.resetPasswordSuccess, s => ({ ...s, submitting: false, resetDone: true })),
  on(A.resetPasswordFailure, (s, { error }) => ({ ...s, submitting: false, error })),
);
```

`password-recovery.selectors.ts`:

```typescript
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PasswordRecoveryState } from './password-recovery.state';

export const selectPasswordRecovery = createFeatureSelector<PasswordRecoveryState>('passwordRecovery');
export const selectSubmitting = createSelector(selectPasswordRecovery, s => s.submitting);
export const selectEmailSent = createSelector(selectPasswordRecovery, s => s.emailSent);
export const selectTokenStatus = createSelector(selectPasswordRecovery, s => s.tokenStatus);
export const selectResetDone = createSelector(selectPasswordRecovery, s => s.resetDone);
export const selectError = createSelector(selectPasswordRecovery, s => s.error);
```

- [ ] **Step 6: Escribir el test de effects (falla)**

`password-recovery.effects.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { PasswordRecoveryEffects } from './password-recovery.effects';
import { PasswordRecoveryService } from '../services/password-recovery.service';
import * as A from './password-recovery.actions';

function setup(svc: Partial<PasswordRecoveryService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1);
  actions$.next(action);
  TestBed.configureTestingModule({
    providers: [
      PasswordRecoveryEffects,
      provideMockActions(() => actions$),
      { provide: PasswordRecoveryService, useValue: svc },
    ],
  });
  return TestBed.inject(PasswordRecoveryEffects);
}

describe('PasswordRecoveryEffects', () => {
  it('requestReset → success', (done) => {
    const eff = setup({ forgot: () => of(void 0) }, A.requestReset({ email: 'a@a' }));
    eff.requestReset$.subscribe(a => { expect(a).toEqual(A.requestResetSuccess()); done(); });
  });

  it('requestReset → failure', (done) => {
    const err = new HttpErrorResponse({ status: 500 });
    const eff = setup({ forgot: () => throwError(() => err) }, A.requestReset({ email: 'a@a' }));
    eff.requestReset$.subscribe(a => { expect(a).toEqual(A.requestResetFailure({ error: err })); done(); });
  });

  it('resetPassword → success', (done) => {
    const eff = setup({ reset: () => of(void 0) }, A.resetPassword({ token: 't', newPassword: 'Password123' }));
    eff.resetPassword$.subscribe(a => { expect(a).toEqual(A.resetPasswordSuccess()); done(); });
  });
});
```

- [ ] **Step 7: Implementar effects**

`password-recovery.effects.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, switchMap } from 'rxjs';
import { PasswordRecoveryService } from '../services/password-recovery.service';
import * as A from './password-recovery.actions';

@Injectable()
export class PasswordRecoveryEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(PasswordRecoveryService);

  requestReset$ = createEffect(() => this.actions$.pipe(
    ofType(A.requestReset),
    exhaustMap(({ email }) => this.svc.forgot(email).pipe(
      map(() => A.requestResetSuccess()),
      catchError(error => of(A.requestResetFailure({ error }))),
    )),
  ));

  validateToken$ = createEffect(() => this.actions$.pipe(
    ofType(A.validateToken),
    switchMap(({ token }) => this.svc.validateToken(token).pipe(
      map(() => A.validateTokenSuccess()),
      catchError(error => of(A.validateTokenFailure({ error }))),
    )),
  ));

  resetPassword$ = createEffect(() => this.actions$.pipe(
    ofType(A.resetPassword),
    exhaustMap(({ token, newPassword }) => this.svc.reset(token, newPassword).pipe(
      map(() => A.resetPasswordSuccess()),
      catchError(error => of(A.resetPasswordFailure({ error }))),
    )),
  ));
}
```

- [ ] **Step 8: Correr todos los tests de la parte**

Run: `npx vitest run src/app/features/auth/password-recovery`
Expected: PASS (service 3 + effects 3).

- [ ] **Step 9: Commit**

```bash
git add src/app/features/auth/password-recovery src/app/core/auth/auth.interceptor.ts
git commit -m "feat(portal): service + store NgRx de recuperar contraseña"
```

## Task A3 (FE): Componentes Forgot/Reset + rutas + link en login

**Files:**
- Create: `FRONTEND-PORTAL/src/app/features/auth/password-recovery/forgot-password.component.ts` (+ `.html`)
- Create: `.../reset-password.component.ts` (+ `.html`)
- Modify: `FRONTEND-PORTAL/src/app/app.routes.ts`
- Modify: `FRONTEND-PORTAL/src/app/features/auth/login/login.component.html`
- Modify: `FRONTEND-PORTAL/src/app/app.config.ts` (registrar reducer + effects del slice)
- Test: `.../forgot-password.component.spec.ts`

- [ ] **Step 1: Registrar el slice en app.config.ts**

En `app.config.ts`, importar y registrar el feature reducer + effects. Cambiar `provideStore`/`provideEffects`:

```typescript
import { passwordRecoveryReducer } from './features/auth/password-recovery/store/password-recovery.reducer';
import { PasswordRecoveryEffects } from './features/auth/password-recovery/store/password-recovery.effects';
// ...
provideStore({ router: routerReducer, passwordRecovery: passwordRecoveryReducer }, { metaReducers }),
provideEffects(PasswordRecoveryEffects),
```

(Nota: a medida que se agreguen slices en las partes B/C/D, sumar sus reducers a `provideStore` y sus effects a `provideEffects`.)

- [ ] **Step 2: Escribir el test del ForgotPasswordComponent (falla)**

`forgot-password.component.spec.ts` (verifica que el submit despacha la action):

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { initialPasswordRecoveryState } from './store/password-recovery.state';
import * as A from './store/password-recovery.actions';

describe('ForgotPasswordComponent', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideMockStore({ initialState: { passwordRecovery: initialPasswordRecoveryState } })],
    });
    store = TestBed.inject(MockStore);
  });

  it('dispatches requestReset on valid submit', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    const cmp = fixture.componentInstance;
    const spy = vi.spyOn(store, 'dispatch');
    cmp.form.setValue({ email: 'a@a.com' });
    cmp.submit();
    expect(spy).toHaveBeenCalledWith(A.requestReset({ email: 'a@a.com' }));
  });

  it('does not dispatch on invalid email', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    const cmp = fixture.componentInstance;
    const spy = vi.spyOn(store, 'dispatch');
    cmp.form.setValue({ email: 'bad' });
    cmp.submit();
    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Correr y verlo fallar**

Run: `npx vitest run src/app/features/auth/password-recovery/forgot-password.component.spec.ts`
Expected: FAIL (componente no existe).

- [ ] **Step 4: Implementar ForgotPasswordComponent**

`forgot-password.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PublicTopbarComponent } from '../ui/public-topbar/public-topbar.component';
import { TenantService } from '../../../core/tenant/tenant.service';
import * as A from './store/password-recovery.actions';
import { selectEmailSent, selectSubmitting } from './store/password-recovery.selectors';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, FloatLabelModule, PublicTopbarComponent],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  readonly tenant = inject(TenantService);

  readonly submitting = this.store.selectSignal(selectSubmitting);
  readonly emailSent = this.store.selectSignal(selectEmailSent);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.store.dispatch(A.requestReset({ email: this.form.getRawValue().email! }));
  }
}
```

`forgot-password.component.html` (mensaje neutro al enviar, no revela si el email existe):

```html
<app-public-topbar />
<div class="login__card">
  @if (!emailSent()) {
    <h2>Recuperar contraseña</h2>
    <p>Ingresá tu email y te enviaremos un enlace para restablecerla.</p>
    <form (ngSubmit)="submit()">
      <p-floatlabel>
        <input pInputText id="email" type="email" [formControl]="form.controls.email" />
        <label for="email">Email</label>
      </p-floatlabel>
      <p-button type="submit" label="Enviar enlace" [loading]="submitting()" styleClass="w-full" />
    </form>
  } @else {
    <h2>Revisá tu email</h2>
    <p>Si existe una cuenta con ese email, te enviamos un enlace para restablecer la contraseña.</p>
  }
  <a routerLink="/login" class="ui-text-primary">Volver a iniciar sesión</a>
</div>
```

- [ ] **Step 5: Implementar ResetPasswordComponent**

`reset-password.component.ts` (valida token al entrar; al éxito redirige a login):

```typescript
import { Component, OnInit, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PublicTopbarComponent } from '../ui/public-topbar/public-topbar.component';
import * as A from './store/password-recovery.actions';
import { selectResetDone, selectSubmitting, selectTokenStatus } from './store/password-recovery.selectors';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, PasswordModule, FloatLabelModule, ToastModule, PublicTopbarComponent],
  providers: [MessageService],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly tokenStatus = this.store.selectSignal(selectTokenStatus);
  readonly submitting = this.store.selectSignal(selectSubmitting);
  readonly resetDone = this.store.selectSignal(selectResetDone);

  private token = '';

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    repeat: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      if (this.resetDone()) {
        this.toast.add({ severity: 'success', summary: 'Listo', detail: 'Tu contraseña fue actualizada.', life: 4000 });
        this.router.navigateByUrl('/login');
      }
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.store.dispatch(A.validateToken({ token: this.token }));
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { newPassword, repeat } = this.form.getRawValue();
    if (newPassword !== repeat) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'Las contraseñas no coinciden.', life: 3000 });
      return;
    }
    this.store.dispatch(A.resetPassword({ token: this.token, newPassword: newPassword! }));
  }
}
```

`reset-password.component.html`:

```html
<app-public-topbar />
<p-toast />
<div class="login__card">
  @switch (tokenStatus()) {
    @case ('checking') { <p>Validando enlace…</p> }
    @case ('invalid') {
      <h2>Enlace inválido o expirado</h2>
      <p>Solicitá uno nuevo.</p>
      <a routerLink="/forgot-password" class="ui-text-primary">Recuperar contraseña</a>
    }
    @case ('valid') {
      <h2>Nueva contraseña</h2>
      <form (ngSubmit)="submit()">
        <p-floatlabel>
          <p-password id="np" [formControl]="form.controls.newPassword" [feedback]="true" [toggleMask]="true" />
          <label for="np">Nueva contraseña</label>
        </p-floatlabel>
        <p-floatlabel>
          <p-password id="rp" [formControl]="form.controls.repeat" [feedback]="false" [toggleMask]="true" />
          <label for="rp">Repetir contraseña</label>
        </p-floatlabel>
        <p-button type="submit" label="Guardar" [loading]="submitting()" styleClass="w-full" />
      </form>
    }
  }
</div>
```

- [ ] **Step 6: Agregar rutas públicas**

En `app.routes.ts`, agregar después de la ruta `register` (fuera del `authGuard`):

```typescript
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/password-recovery/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/password-recovery/reset-password.component').then(m => m.ResetPasswordComponent),
  },
```

- [ ] **Step 7: Cablear el link en login**

En `login.component.html`, reemplazar el link muerto:

```html
<div class="login__forgot">
  <a routerLink="/forgot-password" class="ui-text-primary">¿Olvidaste tu contraseña?</a>
</div>
```

(`LoginComponent` ya importa `RouterLink`.)

- [ ] **Step 8: Correr tests + build**

Run: `npx vitest run src/app/features/auth/password-recovery`
Expected: PASS.
Run: `npm test`
Expected: toda la suite verde (sin regresiones).

- [ ] **Step 9: Commit**

```bash
git add src/app/features/auth/password-recovery src/app/app.routes.ts \
        src/app/features/auth/login/login.component.html src/app/app.config.ts
git commit -m "feat(portal): pantallas de recuperar/restablecer contraseña + ruta + link en login"
```

---

# PARTE B — Cambiar contraseña (logueado) (1 PR back + 1 PR front)

## Task B1 (BE): Endurecer ownership en `changePassword`

**Files:**
- Modify: `Backend/src/main/java/lab/laboratorio/modules/empresa/presentation/controller/UserController.java`
- Test: `Backend/src/test/java/lab/laboratorio/modules/empresa/presentation/controller/UserControllerTest.java`

- [ ] **Step 1: Escribir el test (falla)**

Agregar a `UserControllerTest` un caso que un usuario no puede cambiar la contraseña de otro id. El controller obtiene el userId del JWT vía `CurrentUserProvider`. En el test se mockea `CurrentUserProvider` (es `@MockitoBean`).

```java
@Test
@WithMockUser(roles = "EXTERNO")
void changePassword_forbiddenWhenIdIsNotCaller() throws Exception {
    when(currentUserProvider.requireUserId()).thenReturn(500L);
    ChangePasswordRequest body = new ChangePasswordRequest("oldPass12", "newPass12");

    mockMvc.perform(put("/api/v1/user/{id}/password", 999L)
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());

    verifyNoInteractions(changePasswordUseCase);
}

@Test
@WithMockUser(roles = "EXTERNO")
void changePassword_okWhenIdIsCaller() throws Exception {
    when(currentUserProvider.requireUserId()).thenReturn(500L);
    doNothing().when(changePasswordUseCase).execute(eq(500L), anyString(), anyString(), any());
    ChangePasswordRequest body = new ChangePasswordRequest("oldPass12", "newPass12");

    mockMvc.perform(put("/api/v1/user/{id}/password", 500L)
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk());
}
```

Agregar el mock al setup de `UserControllerTest`:

```java
@MockitoBean
private lab.laboratorio.infrastructure.security.CurrentUserProvider currentUserProvider;
```

- [ ] **Step 2: Correr y verlo fallar**

Run: `mvnw.cmd test -Dtest=UserControllerTest#changePassword_forbiddenWhenIdIsNotCaller`
Expected: FAIL (hoy devuelve 200 sin validar ownership).

- [ ] **Step 3: Implementar el guard en el controller**

Inyectar `CurrentUserProvider` en `UserController` (agregar campo `private final CurrentUserProvider currentUserProvider;` — la clase usa `@RequiredArgsConstructor`) y validar:

```java
import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import org.springframework.security.access.AccessDeniedException;

// ...

@PutMapping("/{id}/password")
public ResponseEntity<Void> changePassword(
        @PathVariable Long id,
        @Valid @RequestBody ChangePasswordRequest request) {
    Long callerId = currentUserProvider.requireUserId();
    if (!callerId.equals(id)) {
        throw new AccessDeniedException("No podés cambiar la contraseña de otro usuario.");
    }
    Long tenantId = TenantContext.requireTenantId();
    changePasswordUseCase.execute(id, request.currentPassword(), request.newPassword(), tenantId);
    return ResponseEntity.ok().build();
}
```

(Spring traduce `AccessDeniedException` a 403.)

- [ ] **Step 4: Correr y verlo pasar**

Run: `mvnw.cmd test -Dtest=UserControllerTest`
Expected: PASS (incluyendo los 2 nuevos casos y los previos).

- [ ] **Step 5: Commit**

```bash
git add Backend/src/main/java/lab/laboratorio/modules/empresa/presentation/controller/UserController.java \
        Backend/src/test/java/lab/laboratorio/modules/empresa/presentation/controller/UserControllerTest.java
git commit -m "fix(empresa): changePassword valida que el id sea el del usuario del JWT (403 si no)"
```

## Task B2 (FE): Slice de Perfil con `changePassword` + UI

> Esta tarea crea el slice `perfil` (solo cambio de contraseña). La Parte D lo extiende con load/update del perfil.

**Files:**
- Create: `FRONTEND-PORTAL/src/app/features/main/perfil/store/perfil.state.ts`
- Create: `.../store/perfil.actions.ts`
- Create: `.../store/perfil.effects.ts`
- Create: `.../store/perfil.reducer.ts`
- Create: `.../store/perfil.selectors.ts`
- Modify: `FRONTEND-PORTAL/src/app/features/main/perfil/perfil.service.ts` (agregar `changePassword`)
- Modify: `FRONTEND-PORTAL/src/app/features/main/perfil/perfil.component.ts` (+ `.html`)
- Modify: `FRONTEND-PORTAL/src/app/app.config.ts`
- Test: `.../perfil.service.spec.ts`, `.../store/perfil.effects.spec.ts`

- [ ] **Step 1: Test del service `changePassword` (falla)**

`perfil.service.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PerfilService } from './perfil.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('PerfilService', () => {
  let service: PerfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { userId: () => 500 } },
        PerfilService,
      ],
    });
    service = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });

  it('changePassword PUTs to /user/{id}/password', () => {
    service.changePassword('old12345', 'new12345').subscribe();
    const req = http.expectOne('/api/v1/user/500/password');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentPassword: 'old12345', newPassword: 'new12345' });
    req.flush(null);
  });
});
```

- [ ] **Step 2: Correr y verlo fallar**

Run: `npx vitest run src/app/features/main/perfil/perfil.service.spec.ts`
Expected: FAIL (`changePassword` no existe; el service hoy solo tiene `getPerfil`).

- [ ] **Step 3: Implementar `changePassword` en el service**

En `perfil.service.ts` agregar `HttpClient` + `AuthService` y el método (sin tocar `getPerfil`, que se reemplaza en la Parte D):

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/auth/auth.service';

// ... (USER_MOCK se mantiene hasta la Parte D)

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getPerfil(): Observable<User> {
    return of(USER_MOCK).pipe(delay(300));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`/api/v1/user/${this.auth.userId()}/password`, { currentPassword, newPassword });
  }
}
```

- [ ] **Step 4: Crear el slice perfil (solo changePassword por ahora)**

`perfil.state.ts`:

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import { User } from '../../../../core/models/user.model';

export interface PerfilState {
  user: User | null;
  loading: boolean;
  saving: boolean;
  passwordChanging: boolean;
  passwordChanged: boolean;
  error: HttpErrorResponse | null;
}

export const initialPerfilState: PerfilState = {
  user: null,
  loading: false,
  saving: false,
  passwordChanging: false,
  passwordChanged: false,
  error: null,
};
```

`perfil.actions.ts` (solo password en esta parte; D agrega load/update):

```typescript
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';

export const changePassword = createAction('[Perfil Page] Change Password', props<{ currentPassword: string; newPassword: string }>());
export const changePasswordSuccess = createAction('[Perfil API] Change Password Success');
export const changePasswordFailure = createAction('[Perfil API] Change Password Failure', props<{ error: HttpErrorResponse }>());
```

`perfil.reducer.ts`:

```typescript
import { createReducer, on } from '@ngrx/store';
import { initialPerfilState } from './perfil.state';
import * as A from './perfil.actions';

export const perfilReducer = createReducer(
  initialPerfilState,
  on(A.changePassword, s => ({ ...s, passwordChanging: true, passwordChanged: false, error: null })),
  on(A.changePasswordSuccess, s => ({ ...s, passwordChanging: false, passwordChanged: true })),
  on(A.changePasswordFailure, (s, { error }) => ({ ...s, passwordChanging: false, error })),
);
```

`perfil.selectors.ts`:

```typescript
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PerfilState } from './perfil.state';

export const selectPerfil = createFeatureSelector<PerfilState>('perfil');
export const selectUser = createSelector(selectPerfil, s => s.user);
export const selectLoading = createSelector(selectPerfil, s => s.loading);
export const selectSaving = createSelector(selectPerfil, s => s.saving);
export const selectPasswordChanging = createSelector(selectPerfil, s => s.passwordChanging);
export const selectPasswordChanged = createSelector(selectPerfil, s => s.passwordChanged);
export const selectError = createSelector(selectPerfil, s => s.error);
```

- [ ] **Step 5: Test de effects (falla)**

`perfil.effects.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { of, throwError, ReplaySubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { PerfilEffects } from './perfil.effects';
import { PerfilService } from '../perfil.service';
import * as A from './perfil.actions';

function setup(svc: Partial<PerfilService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1);
  actions$.next(action);
  TestBed.configureTestingModule({
    providers: [PerfilEffects, provideMockActions(() => actions$), { provide: PerfilService, useValue: svc }],
  });
  return TestBed.inject(PerfilEffects);
}

describe('PerfilEffects (password)', () => {
  it('changePassword → success', (done) => {
    const eff = setup({ changePassword: () => of(void 0) }, A.changePassword({ currentPassword: 'old12345', newPassword: 'new12345' }));
    eff.changePassword$.subscribe(a => { expect(a).toEqual(A.changePasswordSuccess()); done(); });
  });

  it('changePassword → failure', (done) => {
    const err = new HttpErrorResponse({ status: 400 });
    const eff = setup({ changePassword: () => throwError(() => err) }, A.changePassword({ currentPassword: 'x', newPassword: 'y' }));
    eff.changePassword$.subscribe(a => { expect(a).toEqual(A.changePasswordFailure({ error: err })); done(); });
  });
});
```

- [ ] **Step 6: Implementar effects**

`perfil.effects.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, of } from 'rxjs';
import { PerfilService } from '../perfil.service';
import * as A from './perfil.actions';

@Injectable()
export class PerfilEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(PerfilService);

  changePassword$ = createEffect(() => this.actions$.pipe(
    ofType(A.changePassword),
    concatMap(({ currentPassword, newPassword }) => this.svc.changePassword(currentPassword, newPassword).pipe(
      map(() => A.changePasswordSuccess()),
      catchError(error => of(A.changePasswordFailure({ error }))),
    )),
  ));
}
```

- [ ] **Step 7: Registrar slice en app.config.ts**

```typescript
import { perfilReducer } from './features/main/perfil/store/perfil.reducer';
import { PerfilEffects } from './features/main/perfil/store/perfil.effects';
// provideStore({ ..., perfil: perfilReducer }, { metaReducers }),
// provideEffects(PasswordRecoveryEffects, PerfilEffects),
```

- [ ] **Step 8: UI — sección "Cambiar contraseña" en perfil**

En `perfil.component.ts`, inyectar `Store`, agregar el form y reaccionar a `passwordChanged`/`error` con toast. Reemplazar el `onEditar` toast por la apertura de la sección (un signal `mostrarCambioPass`). Mantener `user`/`loading` por ahora vía el slice (la Parte D lo cablea a load real; en esta parte el `user` sigue del mock a través de `getPerfil` si la pantalla lo necesita — no se toca esa lógica acá).

Agregar al componente:

```typescript
import { Store } from '@ngrx/store';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { effect, signal } from '@angular/core';
import * as A from './store/perfil.actions';
import { selectPasswordChanging, selectPasswordChanged, selectError } from './store/perfil.selectors';

// en imports del @Component: ReactiveFormsModule, PasswordModule
// dentro de la clase:
private readonly store = inject(Store);
private readonly fb = inject(FormBuilder);
readonly passwordChanging = this.store.selectSignal(selectPasswordChanging);
readonly mostrarCambioPass = signal(false);

passForm = this.fb.group({
  currentPassword: ['', [Validators.required, Validators.minLength(8)]],
  newPassword: ['', [Validators.required, Validators.minLength(8)]],
});

constructor() {
  effect(() => {
    if (this.store.selectSignal(selectPasswordChanged)()) {
      this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Contraseña actualizada.', life: 4000 });
      this.passForm.reset();
      this.mostrarCambioPass.set(false);
    }
    const err = this.store.selectSignal(selectError)();
    if (err) this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar la contraseña.', life: 4000 });
  });
}

guardarPassword(): void {
  if (this.passForm.invalid) { this.passForm.markAllAsTouched(); return; }
  const { currentPassword, newPassword } = this.passForm.getRawValue();
  this.store.dispatch(A.changePassword({ currentPassword: currentPassword!, newPassword: newPassword! }));
}
```

En `perfil.component.html`, agregar el toggle + form (botón "Cambiar contraseña" abre la sección):

```html
<p-button label="Cambiar contraseña" icon="pi pi-lock" severity="secondary"
          (onClick)="mostrarCambioPass.set(!mostrarCambioPass())" />
@if (mostrarCambioPass()) {
  <form (ngSubmit)="guardarPassword()" class="perfil__pass-form">
    <p-password [formControl]="passForm.controls.currentPassword" [feedback]="false" [toggleMask]="true" placeholder="Contraseña actual" />
    <p-password [formControl]="passForm.controls.newPassword" [feedback]="true" [toggleMask]="true" placeholder="Nueva contraseña" />
    <p-button type="submit" label="Guardar" [loading]="passwordChanging()" />
  </form>
}
```

- [ ] **Step 9: Correr tests + suite**

Run: `npx vitest run src/app/features/main/perfil`
Expected: PASS.
Run: `npm test`
Expected: verde.

- [ ] **Step 10: Commit**

```bash
git add src/app/features/main/perfil src/app/app.config.ts
git commit -m "feat(portal): cambiar contraseña desde Perfil (slice NgRx + UI)"
```

---

# PARTE C — Reprogramar turno (1 PR back + 1 PR front)

## Task C1 (BE): `reschedule` abre a EXTERNO + valida ownership

**Files:**
- Modify: `Backend/.../modules/turnos/presentation/controller/AppointmentController.java`
- Modify: `Backend/.../modules/turnos/application/usecase/RescheduleAppointmentUseCase.java`
- Test: `Backend/.../modules/turnos/application/usecase/RescheduleAppointmentUseCaseTest.java`

- [ ] **Step 1: Escribir el test de ownership del use case (falla)**

`RescheduleAppointmentUseCaseTest.java` (Mockito puro; replica la semántica de `CancelAppointmentUseCase`).

```java
package lab.laboratorio.modules.turnos.application.usecase;

import lab.laboratorio.application.module.TenantModuleGuard;
import lab.laboratorio.domain.port.CurrentRoleProvider;
import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.domain.port.UserSubProvider;
import lab.laboratorio.modules.empresa.domain.model.User;
import lab.laboratorio.modules.empresa.domain.port.PatientFamilyPort;
import lab.laboratorio.modules.empresa.domain.port.UserRepositoryPort;
import lab.laboratorio.modules.turnos.domain.exception.ForbiddenAccessException;
import lab.laboratorio.modules.turnos.domain.model.Appointment;
import lab.laboratorio.modules.turnos.domain.model.AppointmentStatus;
import lab.laboratorio.modules.turnos.domain.port.AppointmentRepositoryPort;
import lab.laboratorio.modules.turnos.domain.port.SlotAvailabilityPort;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.*;

class RescheduleAppointmentUseCaseTest {

    private final TenantModuleGuard moduleGuard = mock(TenantModuleGuard.class);
    private final TenantProvider tenantProvider = mock(TenantProvider.class);
    private final AppointmentRepositoryPort repo = mock(AppointmentRepositoryPort.class);
    private final SlotAvailabilityPort slots = mock(SlotAvailabilityPort.class);
    private final CurrentRoleProvider roleProvider = mock(CurrentRoleProvider.class);
    private final UserSubProvider userSubProvider = mock(UserSubProvider.class);
    private final UserRepositoryPort userRepo = mock(UserRepositoryPort.class);
    private final PatientFamilyPort familyPort = mock(PatientFamilyPort.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);

    private final RescheduleAppointmentUseCase useCase = new RescheduleAppointmentUseCase(
            moduleGuard, tenantProvider, repo, slots, roleProvider, userSubProvider, userRepo, familyPort, events);

    private Appointment appointment(long patientId) {
        Appointment a = Appointment.builder()
                .id(1L).tenantId(1L).patientId(patientId).branchId(2L)
                .scheduledAt(LocalDateTime.now().plusDays(5))
                .status(AppointmentStatus.SCHEDULED).build();
        return a;
    }

    private void commonStubs() {
        when(tenantProvider.currentTenantId()).thenReturn(Optional.of(1L));
        when(repo.findById(1L, 1L)).thenReturn(Optional.of(appointment(77L)));
        when(slots.isSlotAvailable(anyLong(), anyLong(), any())).thenReturn(true);
        when(userSubProvider.currentUserSub()).thenReturn(Optional.of("pat"));
        when(userRepo.findByUsernameAndTenantId("pat", 1L)).thenReturn(Optional.of(
                new User(9L, "P", "P", "pat", "p@p", null, "30", "h", true, true, null, false, null, null, true, null, java.util.List.of(), 1L)));
    }

    @Test
    void externoCannotRescheduleAppointmentNotOwned() {
        commonStubs();
        when(roleProvider.hasRole("EXTERNO")).thenReturn(true);
        when(familyPort.resolveOwnedPatientIds(9L)).thenReturn(Set.of(100L)); // 77 no está

        assertThatThrownBy(() -> useCase.execute(new RescheduleAppointmentUseCase.Input(1L, LocalDateTime.now().plusDays(5))))
                .isInstanceOf(ForbiddenAccessException.class);
        verify(repo, never()).save(any(), anyLong());
    }

    @Test
    void externoCanRescheduleOwnAppointment() {
        commonStubs();
        when(roleProvider.hasRole("EXTERNO")).thenReturn(true);
        when(familyPort.resolveOwnedPatientIds(9L)).thenReturn(Set.of(77L));

        assertThatCode(() -> useCase.execute(new RescheduleAppointmentUseCase.Input(1L, LocalDateTime.now().plusDays(5))))
                .doesNotThrowAnyException();
        verify(repo).save(any(), eq(1L));
    }
}
```

> Nota: confirmar el orden exacto de campos del record `User` al compilar (ver `User.java`); ajustar el constructor del stub si difiere. La firma `Appointment.builder()` y `canBeRescheduled()` ya existen (ver el use case real).

- [ ] **Step 2: Correr y verlo fallar**

Run: `mvnw.cmd test -Dtest=RescheduleAppointmentUseCaseTest`
Expected: FAIL de compilación — el constructor de 9 args no existe (hoy el use case usa `@RequiredArgsConstructor` con 5 deps).

- [ ] **Step 3: Agregar ownership al use case**

Modificar `RescheduleAppointmentUseCase`: agregar los 4 deps nuevos (final → `@RequiredArgsConstructor` los inyecta), el chequeo de rol y el método `enforceOwnership` (copiado de `CancelAppointmentUseCase`).

```java
// imports nuevos:
import lab.laboratorio.domain.port.CurrentRoleProvider;
import lab.laboratorio.domain.port.UserSubProvider;
import lab.laboratorio.modules.empresa.domain.exception.UserNotFoundException;
import lab.laboratorio.modules.empresa.domain.port.PatientFamilyPort;
import lab.laboratorio.modules.empresa.domain.port.UserRepositoryPort;
import lab.laboratorio.modules.turnos.domain.exception.ForbiddenAccessException;
import java.util.Set;

// campos nuevos (agregar a los existentes; el orden define el constructor para el test):
private final CurrentRoleProvider currentRoleProvider;
private final UserSubProvider userSubProvider;
private final UserRepositoryPort userRepo;
private final PatientFamilyPort familyPort;

// dentro de execute(), después de cargar el appointment y antes de canBeRescheduled():
if (currentRoleProvider.hasRole("EXTERNO")) {
    enforceOwnership(appointment, tenantId);
}

// método nuevo:
private void enforceOwnership(Appointment appointment, Long tenantId) {
    String sub = userSubProvider.currentUserSub()
            .orElseThrow(() -> new UserNotFoundException("anonymous"));
    var user = userRepo.findByUsernameAndTenantId(sub, tenantId)
            .orElseThrow(() -> new UserNotFoundException(sub));
    Set<Long> ownedIds = familyPort.resolveOwnedPatientIds(user.id());
    if (!ownedIds.contains(appointment.getPatientId())) {
        throw new ForbiddenAccessException("appointment-not-owned");
    }
}
```

El orden final de campos (para que el constructor matchee el test): `moduleGuard, tenantProvider, appointmentRepository, slotAvailabilityPort, currentRoleProvider, userSubProvider, userRepo, familyPort, events`. Reordenar la declaración de `events` al final si hace falta.

- [ ] **Step 4: Abrir el endpoint a EXTERNO**

En `AppointmentController.reschedule`, cambiar el `@PreAuthorize`:

```java
@PatchMapping("/{id}/reschedule")
@PreAuthorize("hasAnyRole('ADMINISTRADOR','RESPONSABLE_SECRETARIA','SECRETARIA','EXTERNO')")
public ResponseEntity<Void> reschedule(@PathVariable Long id,
                                       @Valid @RequestBody RescheduleAppointmentRequest request) {
    rescheduleAppointment.execute(new RescheduleAppointmentUseCase.Input(id, request.newScheduledAt()));
    return ResponseEntity.noContent().build();
}
```

- [ ] **Step 5: Correr tests**

Run: `mvnw.cmd test -Dtest=RescheduleAppointmentUseCaseTest`
Expected: PASS (2 tests).
Run: `mvnw.cmd test -Dtest=AppointmentControllerTest`
Expected: PASS (regresión; si no existe, omitir).

- [ ] **Step 6: Commit**

```bash
git add Backend/src/main/java/lab/laboratorio/modules/turnos/
git commit -m "feat(turnos): reschedule habilitado para EXTERNO con validación de ownership"
```

## Task C2 (FE): `AppointmentService.reschedule` + slice turnos

**Files:**
- Modify: `FRONTEND-PORTAL/src/app/features/main/turnos/services/appointment.service.ts`
- Create: `FRONTEND-PORTAL/src/app/features/main/turnos/store/turnos.state.ts` (+ actions/effects/reducer/selectors)
- Modify: `FRONTEND-PORTAL/src/app/app.config.ts`
- Test: `.../services/appointment.service.spec.ts` (nuevo o extendido), `.../store/turnos.effects.spec.ts`

- [ ] **Step 1: Test del método `reschedule` (falla)**

`appointment.service.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppointmentService } from './appointment.service';
import { TipoAnalisisService } from './tipo-analisis.service';
import { SucursalPublicService } from '../../../../core/sucursales/sucursal-public.service';
import { FamilyService } from '../../../../core/family/family.service';
import { of } from 'rxjs';

describe('AppointmentService.reschedule', () => {
  let service: AppointmentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TipoAnalisisService, useValue: { getTipos: () => of([]) } },
        { provide: SucursalPublicService, useValue: { getSedes: () => of([]) } },
        { provide: FamilyService, useValue: { getFamily: () => of([]) } },
        AppointmentService,
      ],
    });
    service = TestBed.inject(AppointmentService);
    http = TestBed.inject(HttpTestingController);
  });

  it('PATCHes newScheduledAt', () => {
    service.reschedule(5, '2026-07-01T09:00:00').subscribe();
    const req = http.expectOne('/api/v1/turnos/appointments/5/reschedule');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ newScheduledAt: '2026-07-01T09:00:00' });
    req.flush(null);
  });
});
```

- [ ] **Step 2: Correr y verlo fallar**

Run: `npx vitest run src/app/features/main/turnos/services/appointment.service.spec.ts`
Expected: FAIL (`reschedule` no existe).

- [ ] **Step 3: Implementar `reschedule` en el service**

Agregar al `AppointmentService`:

```typescript
reschedule(id: number, newScheduledAt: string): Observable<void> {
  return this.http.patch<void>(`/api/v1/turnos/appointments/${id}/reschedule`, { newScheduledAt });
}
```

- [ ] **Step 4: Crear el slice turnos (solo reschedule)**

`turnos.state.ts`:

```typescript
import { HttpErrorResponse } from '@angular/common/http';

export interface TurnosState {
  rescheduling: boolean;
  rescheduledId: number | null;
  error: HttpErrorResponse | null;
}

export const initialTurnosState: TurnosState = {
  rescheduling: false,
  rescheduledId: null,
  error: null,
};
```

`turnos.actions.ts`:

```typescript
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';

export const reschedule = createAction('[Turnos Page] Reschedule', props<{ id: number; newScheduledAt: string }>());
export const rescheduleSuccess = createAction('[Turnos API] Reschedule Success', props<{ id: number }>());
export const rescheduleFailure = createAction('[Turnos API] Reschedule Failure', props<{ error: HttpErrorResponse }>());
```

`turnos.reducer.ts`:

```typescript
import { createReducer, on } from '@ngrx/store';
import { initialTurnosState } from './turnos.state';
import * as A from './turnos.actions';

export const turnosReducer = createReducer(
  initialTurnosState,
  on(A.reschedule, s => ({ ...s, rescheduling: true, rescheduledId: null, error: null })),
  on(A.rescheduleSuccess, (s, { id }) => ({ ...s, rescheduling: false, rescheduledId: id })),
  on(A.rescheduleFailure, (s, { error }) => ({ ...s, rescheduling: false, error })),
);
```

`turnos.selectors.ts`:

```typescript
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TurnosState } from './turnos.state';

export const selectTurnos = createFeatureSelector<TurnosState>('turnos');
export const selectRescheduling = createSelector(selectTurnos, s => s.rescheduling);
export const selectRescheduledId = createSelector(selectTurnos, s => s.rescheduledId);
export const selectRescheduleError = createSelector(selectTurnos, s => s.error);
```

- [ ] **Step 5: Test de effects (falla)**

`turnos.effects.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { of, throwError, ReplaySubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TurnosEffects } from './turnos.effects';
import { AppointmentService } from '../services/appointment.service';
import * as A from './turnos.actions';

function setup(svc: Partial<AppointmentService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1);
  actions$.next(action);
  TestBed.configureTestingModule({
    providers: [TurnosEffects, provideMockActions(() => actions$), { provide: AppointmentService, useValue: svc }],
  });
  return TestBed.inject(TurnosEffects);
}

describe('TurnosEffects', () => {
  it('reschedule → success', (done) => {
    const eff = setup({ reschedule: () => of(void 0) }, A.reschedule({ id: 5, newScheduledAt: '2026-07-01T09:00:00' }));
    eff.reschedule$.subscribe(a => { expect(a).toEqual(A.rescheduleSuccess({ id: 5 })); done(); });
  });

  it('reschedule → failure', (done) => {
    const err = new HttpErrorResponse({ status: 400 });
    const eff = setup({ reschedule: () => throwError(() => err) }, A.reschedule({ id: 5, newScheduledAt: 'x' }));
    eff.reschedule$.subscribe(a => { expect(a).toEqual(A.rescheduleFailure({ error: err })); done(); });
  });
});
```

- [ ] **Step 6: Implementar effects**

`turnos.effects.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, of } from 'rxjs';
import { AppointmentService } from '../services/appointment.service';
import * as A from './turnos.actions';

@Injectable()
export class TurnosEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(AppointmentService);

  reschedule$ = createEffect(() => this.actions$.pipe(
    ofType(A.reschedule),
    concatMap(({ id, newScheduledAt }) => this.svc.reschedule(id, newScheduledAt).pipe(
      map(() => A.rescheduleSuccess({ id })),
      catchError(error => of(A.rescheduleFailure({ error }))),
    )),
  ));
}
```

- [ ] **Step 7: Registrar slice en app.config.ts**

```typescript
import { turnosReducer } from './features/main/turnos/store/turnos.reducer';
import { TurnosEffects } from './features/main/turnos/store/turnos.effects';
// provideStore({ ..., turnos: turnosReducer }, { metaReducers }),
// provideEffects(PasswordRecoveryEffects, PerfilEffects, TurnosEffects),
```

- [ ] **Step 8: Correr tests**

Run: `npx vitest run src/app/features/main/turnos`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/main/turnos/services/appointment.service.ts \
        src/app/features/main/turnos/store src/app/app.config.ts
git commit -m "feat(portal): service + slice NgRx de reprogramar turno"
```

## Task C3 (FE): UI de reprogramar (reusar picker de slots)

**Files:**
- Modify: `FRONTEND-PORTAL/src/app/features/main/turnos/turnos.component.ts` (+ `.html`)
- Test: `.../turnos.component.spec.ts` (nuevo)

- [ ] **Step 1: Test del componente (falla)**

`turnos.component.spec.ts` — verifica que confirmar la reprogramación despacha la action con el datetime armado.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TurnosComponent } from './turnos.component';
import { initialTurnosState } from './store/turnos.state';
import * as A from './store/turnos.actions';
import { AppointmentService } from './services/appointment.service';
import { of } from 'rxjs';

describe('TurnosComponent reprogramar', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TurnosComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        provideMockStore({ initialState: { turnos: initialTurnosState } }),
        MessageService, ConfirmationService,
        { provide: AppointmentService, useValue: {
            getMyAppointments: () => of({ proximos: [], anteriores: [] }),
            getAvailability: () => of([{ hora: '09:00', disponible: true }]),
        } },
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('confirmReprogramar dispatches reschedule with composed datetime', () => {
    const fixture = TestBed.createComponent(TurnosComponent);
    const cmp = fixture.componentInstance;
    const spy = vi.spyOn(store, 'dispatch');
    cmp.reprogramarTurnoId.set(5);
    cmp.reprogramarFecha.set(new Date(2026, 6, 1)); // 1 jul 2026
    cmp.reprogramarHora.set('09:00');
    cmp.confirmReprogramar();
    expect(spy).toHaveBeenCalledWith(A.reschedule({ id: 5, newScheduledAt: '2026-07-01T09:00:00' }));
  });
});
```

- [ ] **Step 2: Correr y verlo fallar**

Run: `npx vitest run src/app/features/main/turnos/turnos.component.spec.ts`
Expected: FAIL (los signals/método nuevos no existen).

- [ ] **Step 3: Implementar la UI de reprogramar en el componente**

Reemplazar `onReprogramar` (stub) por un flujo con drawer/diálogo que reusa `getAvailability`. Agregar al `TurnosComponent`:

```typescript
import { Store } from '@ngrx/store';
import { toLocalDateTimeString } from '../../../shared/utils/local-datetime';
import * as TA from './store/turnos.actions';
import { selectRescheduledId, selectRescheduleError, selectRescheduling } from './store/turnos.selectors';
import { SlotDisponible } from '../../../core/models/slot-disponible.model';

// inyectar:
private readonly store = inject(Store);
readonly rescheduling = this.store.selectSignal(selectRescheduling);

// estado del flujo de reprogramar:
reprogramarOpen = signal(false);
reprogramarTurnoId = signal<number | null>(null);
reprogramarBranchId = signal<number | null>(null);
reprogramarFecha = signal<Date | null>(null);
reprogramarHora = signal<string | null>(null);
reprogramarSlots = signal<SlotDisponible[]>([]);

constructor() {
  effect(() => {
    if (this.store.selectSignal(selectRescheduledId)() !== null) {
      this.reprogramarOpen.set(false);
      this.reprogramarTurnoId.set(null);
      this.cargarTurnos();
      this.messageService.add({ severity: 'success', summary: 'Turno reprogramado', detail: 'Tu turno fue actualizado.', life: 4000 });
    }
    const err = this.store.selectSignal(selectRescheduleError)();
    if (err) this.messageService.add({ severity: 'error', summary: 'Error', detail: mapApiError(err), life: 4000 });
  });
}

onReprogramar(turno: Turno): void {
  this.reprogramarTurnoId.set(turno.id);
  this.reprogramarBranchId.set(Number(turno.sede.id));
  this.reprogramarFecha.set(null);
  this.reprogramarHora.set(null);
  this.reprogramarSlots.set([]);
  this.reprogramarOpen.set(true);
}

onReprogramarFecha(fecha: Date): void {
  this.reprogramarFecha.set(fecha);
  this.reprogramarHora.set(null);
  const branchId = this.reprogramarBranchId();
  if (branchId != null) {
    this.subs.add(this.appointmentSvc.getAvailability(branchId, fecha).subscribe(slots => this.reprogramarSlots.set(slots)));
  }
}

confirmReprogramar(): void {
  const id = this.reprogramarTurnoId();
  const fecha = this.reprogramarFecha();
  const hora = this.reprogramarHora();
  if (id == null || !fecha || !hora) return;
  const [hh, mm] = hora.split(':').map(Number);
  const dt = new Date(fecha);
  dt.setHours(hh, mm, 0, 0);
  this.store.dispatch(TA.reschedule({ id, newScheduledAt: toLocalDateTimeString(dt) }));
}
```

> El stub viejo `onReprogramar(_turno)` con el toast "Próximamente" se elimina (lo reemplaza el método de arriba). `minBookingDate` para el datepicker: reusar el cálculo de `sacar-turno` (hoy + 2 días).

En `turnos.component.html`, agregar el drawer de reprogramar (reusando `ui-time-slots` y `p-datepicker` como en `sacar-turno`):

```html
<p-drawer [(visible)]="reprogramarOpen" position="right" header="Reprogramar turno" styleClass="reprogramar-drawer">
  <p-datepicker [inline]="true" [minDate]="minBookingDate" (onSelect)="onReprogramarFecha($event)" />
  @if (reprogramarFecha()) {
    <ui-time-slots [slots]="reprogramarSlots()" [selectedHora]="reprogramarHora()"
                   (selectionChange)="reprogramarHora.set($event)" />
  }
  <p-button label="Confirmar reprogramación" [disabled]="!reprogramarHora()" [loading]="rescheduling()"
            (onClick)="confirmReprogramar()" />
</p-drawer>
```

Asegurar imports en el `@Component`: `DrawerModule` (ya está), `DatePickerModule` (ya está), y `TimeSlotsComponent` (agregar). Definir `minBookingDate` en la clase:

```typescript
readonly minBookingDate = (() => { const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(0,0,0,0); return d; })();
```

- [ ] **Step 4: Correr tests + suite**

Run: `npx vitest run src/app/features/main/turnos`
Expected: PASS.
Run: `npm test`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/main/turnos/turnos.component.ts src/app/features/main/turnos/turnos.component.html
git commit -m "feat(portal): UI de reprogramar turno (picker de slots + confirmación)"
```

---

# PARTE D — Ver/Editar perfil real (1 PR back + 1 PR front)

> Reemplaza `USER_MOCK`. El backend no tiene `/me/profile`; se crea reusando el patrón `/me` y el link `users_patients` (owner). Empieza con una tarea de verificación porque el `Patient` tiene sub-entidades (contacts/addresses/coverages).

## Task D0 (BE): Verificación previa (sin código de producción)

- [ ] **Step 1: Confirmar la resolución del paciente "owner" del usuario logueado**

`PatientFamilyPort.resolveOwnedPatientIds(userId)` devuelve self + dependientes. Para el perfil necesitamos el paciente con `is_owner = true`. Verificar en `PatientFamilyAdapter.listFamily` que la entrada con `isOwner == true` es el propio paciente del usuario. Confirmar que existe a lo sumo un owner por usuario.

Run: revisar `Backend/.../empresa/infrastructure/adapter/PatientFamilyAdapter.java` y los datos seed (`migration-local`) para un user EXTERNO con su `users_patients (is_owner=1)`.
Expected: queda claro que el owner patientId se obtiene filtrando `is_owner` en `users_patients`.

- [ ] **Step 2: Identificar el read y el update de Patient reutilizables**

Buscar un use case/port para LEER un `Patient` por id+tenant (con contacts/addresses/coverages) y otro para ACTUALIZAR sus contactos/direcciones. Candidatos: `GetPatientByIdUseCase`, `UpdatePatientUseCase` en `modules/analitica/.../patient/`. 

Run: `grep -rl "class .*Patient.*UseCase" Backend/src/main/java/lab/laboratorio/modules/analitica`
Expected: anotar (a) el port/repositorio para leer el `Patient` completo y (b) el use case o port para actualizar contacto/dirección primarios. **Si no hay un update apto para self-service, el plan crea `UpdateMyContactInfoUseCase` que opera sobre el `PatientJpaRepository` directamente (como hace `PatientFamilyAdapter`).**

- [ ] **Step 3: Decidir el shape del DTO de perfil**

Confirmar, sobre `Patient` (firstName, lastName, dni; `contacts[]` con `contactType`/`contactValue`/`isPrimary`; `addresses[]` con campos; `coverages[]`), qué se muestra y qué se edita. Editable: email y teléfono (Contact primario por tipo) + dirección (Address primaria). Read-only: nombre, apellido, dni, cobertura.
Expected: lista cerrada de campos del `MyProfileResponse` y del `UpdateMyProfileRequest` (ver D2/D3).

## Task D1 (BE): `resolveOwnerPatientId` en PatientFamilyPort/Adapter

**Files:**
- Modify: `Backend/.../empresa/domain/port/PatientFamilyPort.java`
- Modify: `Backend/.../empresa/infrastructure/adapter/PatientFamilyAdapter.java`
- Test: `Backend/.../empresa/infrastructure/adapter/PatientFamilyAdapterTest.java` (nuevo o extendido)

- [ ] **Step 1: Test (falla)** — `resolveOwnerPatientId` devuelve el patientId con `is_owner=true` y VERIFIED.

```java
@Test
void resolveOwnerPatientId_returnsOwnerBond() {
    Long userId = 9L;
    when(tenantProvider.currentTenantId()).thenReturn(Optional.of(1L));
    UserPatientJpaEntity owner = new UserPatientJpaEntity();
    owner.setPatientId(77L); owner.setOwner(true); owner.setStatus(UserPatientStatus.VERIFIED);
    UserPatientJpaEntity dep = new UserPatientJpaEntity();
    dep.setPatientId(78L); dep.setOwner(false); dep.setStatus(UserPatientStatus.VERIFIED);
    when(userPatientRepo.findByUser_IdAndTenantId(9L, 1L)).thenReturn(List.of(dep, owner));

    assertThat(adapter.resolveOwnerPatientId(9L)).contains(77L);
}
```

- [ ] **Step 2: Correr y verlo fallar.** Run: `mvnw.cmd test -Dtest=PatientFamilyAdapterTest`. Expected: FAIL (método no existe).

- [ ] **Step 3: Implementar.** Agregar al port y al adapter:

```java
// PatientFamilyPort.java
java.util.Optional<Long> resolveOwnerPatientId(Long userId);
```

```java
// PatientFamilyAdapter.java
@Override
public java.util.Optional<Long> resolveOwnerPatientId(Long userId) {
    Long tenantId = tenantProvider.currentTenantId().orElseThrow(TenantNotResolvedException::new);
    return userPatientRepo.findByUser_IdAndTenantId(userId, tenantId).stream()
            .filter(up -> UserPatientStatus.VERIFIED.equals(up.getStatus()))
            .filter(UserPatientJpaEntity::isOwner)
            .map(UserPatientJpaEntity::getPatientId)
            .findFirst();
}
```

- [ ] **Step 4: Correr y verlo pasar.** Run: `mvnw.cmd test -Dtest=PatientFamilyAdapterTest`. Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add Backend/src/main/java/lab/laboratorio/modules/empresa/domain/port/PatientFamilyPort.java \
        Backend/src/main/java/lab/laboratorio/modules/empresa/infrastructure/adapter/PatientFamilyAdapter.java \
        Backend/src/test/java/lab/laboratorio/modules/empresa/infrastructure/adapter/PatientFamilyAdapterTest.java
git commit -m "feat(empresa): PatientFamilyPort.resolveOwnerPatientId"
```

## Task D2 (BE): `GET /api/v1/me/profile`

**Files:**
- Create: `Backend/.../empresa/presentation/controller/MyProfileController.java`
- Create: `Backend/.../empresa/application/usecase/GetMyProfileUseCase.java`
- Create: `Backend/.../empresa/presentation/dto/response/MyProfileResponse.java`
- Create/identify: port para leer el `Patient` owner (según D0). Si hace falta, crear `OwnerPatientReaderPort` + adapter sobre `PatientJpaRepository`.
- Test: `Backend/.../empresa/presentation/controller/MyProfileControllerTest.java`

- [ ] **Step 1: Definir el DTO de respuesta** (campos confirmados en D0):

```java
package lab.laboratorio.modules.empresa.presentation.dto.response;

public record MyProfileResponse(
        Long patientId,
        String firstName,
        String lastName,
        String dni,
        String email,
        String phone,
        String address,
        String coverageName
) {}
```

- [ ] **Step 2: Test del controller (falla)** — EXTERNO obtiene su perfil; no-EXTERNO → 403.

```java
@Test
@WithMockUser(roles = "EXTERNO")
void getMyProfile_returns200() throws Exception {
    when(getMyProfileUseCase.execute()).thenReturn(new MyProfileResponse(
            77L, "María", "F", "30", "m@m", "351", "Calle 1", "OSDE"));
    mockMvc.perform(get("/api/v1/me/profile"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.firstName").value("María"))
            .andExpect(jsonPath("$.email").value("m@m"));
}

@Test
@WithMockUser(roles = "ADMINISTRADOR")
void getMyProfile_forbiddenForStaff() throws Exception {
    mockMvc.perform(get("/api/v1/me/profile")).andExpect(status().isForbidden());
}
```

- [ ] **Step 3: Correr y verlo fallar.** Run: `mvnw.cmd test -Dtest=MyProfileControllerTest`. Expected: FAIL (clases no existen).

- [ ] **Step 4: Implementar use case** — resuelve user→ownerPatient→Patient y mapea a DTO. Usa el reader confirmado en D0 (aquí se asume un `OwnerPatientReaderPort` que devuelve un objeto con los campos; ajustar a lo hallado).

```java
package lab.laboratorio.modules.empresa.application.usecase;

import lab.laboratorio.domain.exception.TenantNotResolvedException;
import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.domain.port.UserSubProvider;
import lab.laboratorio.modules.empresa.domain.exception.UserNotFoundException;
import lab.laboratorio.modules.empresa.domain.port.PatientFamilyPort;
import lab.laboratorio.modules.empresa.domain.port.UserRepositoryPort;
import lab.laboratorio.modules.empresa.presentation.dto.response.MyProfileResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GetMyProfileUseCase {

    private final UserSubProvider userSubProvider;
    private final TenantProvider tenantProvider;
    private final UserRepositoryPort userRepo;
    private final PatientFamilyPort familyPort;
    private final OwnerPatientReaderPort patientReader; // ver D0/D1: lee Patient por id+tenant

    public GetMyProfileUseCase(UserSubProvider userSubProvider, TenantProvider tenantProvider,
                               UserRepositoryPort userRepo, PatientFamilyPort familyPort,
                               OwnerPatientReaderPort patientReader) {
        this.userSubProvider = userSubProvider;
        this.tenantProvider = tenantProvider;
        this.userRepo = userRepo;
        this.familyPort = familyPort;
        this.patientReader = patientReader;
    }

    @Transactional(readOnly = true)
    public MyProfileResponse execute() {
        String sub = userSubProvider.currentUserSub().orElseThrow(() -> new UserNotFoundException("anonymous"));
        Long tenantId = tenantProvider.currentTenantId().orElseThrow(TenantNotResolvedException::new);
        var user = userRepo.findByUsernameAndTenantId(sub, tenantId).orElseThrow(() -> new UserNotFoundException(sub));
        Long patientId = familyPort.resolveOwnerPatientId(user.id())
                .orElseThrow(() -> new UserNotFoundException("owner-patient"));
        return patientReader.readProfile(patientId, tenantId);
    }
}
```

`OwnerPatientReaderPort` (interfaz) + adapter sobre `PatientJpaRepository` (mapea primary contact/address/coverage a los campos planos del DTO). Implementar el adapter mapeando: `email` = primer Contact con `contactType` email e `isPrimary`; `phone` = primer Contact teléfono primario; `address` = Address primaria formateada; `coverageName` = nombre del plan de la Coverage primaria (resolver el nombre según D0; si requiere join, usar el repo correspondiente).

```java
package lab.laboratorio.modules.empresa.domain.port;

import lab.laboratorio.modules.empresa.presentation.dto.response.MyProfileResponse;

public interface OwnerPatientReaderPort {
    MyProfileResponse readProfile(Long patientId, Long tenantId);
}
```

- [ ] **Step 5: Implementar el controller**

```java
package lab.laboratorio.modules.empresa.presentation.controller;

import lab.laboratorio.modules.empresa.application.usecase.GetMyProfileUseCase;
import lab.laboratorio.modules.empresa.presentation.dto.response.MyProfileResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/profile")
public class MyProfileController {

    private final GetMyProfileUseCase getMyProfileUseCase;

    public MyProfileController(GetMyProfileUseCase getMyProfileUseCase) {
        this.getMyProfileUseCase = getMyProfileUseCase;
    }

    @GetMapping
    @PreAuthorize("hasRole('EXTERNO')")
    public MyProfileResponse getMyProfile() {
        return getMyProfileUseCase.execute();
    }
}
```

- [ ] **Step 6: Correr y verlo pasar.** Run: `mvnw.cmd test -Dtest=MyProfileControllerTest`. Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add Backend/src/main/java/lab/laboratorio/modules/empresa/ Backend/src/test/java/lab/laboratorio/modules/empresa/presentation/controller/MyProfileControllerTest.java
git commit -m "feat(empresa): GET /me/profile (perfil del paciente del JWT)"
```

## Task D3 (BE): `PUT /api/v1/me/profile`

**Files:**
- Modify: `Backend/.../empresa/presentation/controller/MyProfileController.java`
- Create: `Backend/.../empresa/application/usecase/UpdateMyProfileUseCase.java`
- Create: `Backend/.../empresa/presentation/dto/request/UpdateMyProfileRequest.java`
- Modify: `OwnerPatientReaderPort`/adapter → agregar `updateContactInfo(patientId, tenantId, email, phone, address)` (o un port dedicado de update)
- Test: ampliar `MyProfileControllerTest`

- [ ] **Step 1: Definir el request DTO** (solo editables):

```java
package lab.laboratorio.modules.empresa.presentation.dto.request;

import jakarta.validation.constraints.Email;

public record UpdateMyProfileRequest(
        @Email String email,
        String phone,
        String address
) {}
```

- [ ] **Step 2: Test del controller PUT (falla)**

```java
@Test
@WithMockUser(roles = "EXTERNO")
void updateMyProfile_returns200() throws Exception {
    when(updateMyProfileUseCase.execute(any())).thenReturn(new MyProfileResponse(
            77L, "María", "F", "30", "nuevo@m", "999", "Calle 2", "OSDE"));
    UpdateMyProfileRequest body = new UpdateMyProfileRequest("nuevo@m", "999", "Calle 2");
    mockMvc.perform(put("/api/v1/me/profile").with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("nuevo@m"));
}
```

- [ ] **Step 3: Correr y verlo fallar.** Run: `mvnw.cmd test -Dtest=MyProfileControllerTest#updateMyProfile_returns200`. Expected: FAIL.

- [ ] **Step 4: Implementar use case** — resuelve owner patient (igual que GET) y actualiza contacto/dirección primarios; devuelve el perfil actualizado.

```java
package lab.laboratorio.modules.empresa.application.usecase;

import lab.laboratorio.domain.exception.TenantNotResolvedException;
import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.domain.port.UserSubProvider;
import lab.laboratorio.modules.empresa.domain.exception.UserNotFoundException;
import lab.laboratorio.modules.empresa.domain.port.OwnerPatientReaderPort;
import lab.laboratorio.modules.empresa.domain.port.PatientFamilyPort;
import lab.laboratorio.modules.empresa.domain.port.UserRepositoryPort;
import lab.laboratorio.modules.empresa.presentation.dto.response.MyProfileResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UpdateMyProfileUseCase {

    private final UserSubProvider userSubProvider;
    private final TenantProvider tenantProvider;
    private final UserRepositoryPort userRepo;
    private final PatientFamilyPort familyPort;
    private final OwnerPatientReaderPort patientPort;

    public UpdateMyProfileUseCase(UserSubProvider userSubProvider, TenantProvider tenantProvider,
                                  UserRepositoryPort userRepo, PatientFamilyPort familyPort,
                                  OwnerPatientReaderPort patientPort) {
        this.userSubProvider = userSubProvider;
        this.tenantProvider = tenantProvider;
        this.userRepo = userRepo;
        this.familyPort = familyPort;
        this.patientPort = patientPort;
    }

    public record Input(String email, String phone, String address) {}

    @Transactional
    public MyProfileResponse execute(Input in) {
        String sub = userSubProvider.currentUserSub().orElseThrow(() -> new UserNotFoundException("anonymous"));
        Long tenantId = tenantProvider.currentTenantId().orElseThrow(TenantNotResolvedException::new);
        var user = userRepo.findByUsernameAndTenantId(sub, tenantId).orElseThrow(() -> new UserNotFoundException(sub));
        Long patientId = familyPort.resolveOwnerPatientId(user.id()).orElseThrow(() -> new UserNotFoundException("owner-patient"));
        patientPort.updateContactInfo(patientId, tenantId, in.email(), in.phone(), in.address());
        return patientPort.readProfile(patientId, tenantId);
    }
}
```

Agregar al `OwnerPatientReaderPort`:

```java
void updateContactInfo(Long patientId, Long tenantId, String email, String phone, String address);
```

Implementar en el adapter: cargar `PatientJpaEntity`, actualizar/crear el Contact primario de email y de teléfono y la Address primaria, guardar. (Reusar el `UpdatePatientUseCase` identificado en D0 si encaja; si no, manipular las sub-entidades directamente vía `PatientJpaRepository`.)

- [ ] **Step 5: Implementar el endpoint PUT**

```java
@PutMapping
@PreAuthorize("hasRole('EXTERNO')")
public MyProfileResponse updateMyProfile(@Valid @RequestBody UpdateMyProfileRequest request) {
    return updateMyProfileUseCase.execute(
            new UpdateMyProfileUseCase.Input(request.email(), request.phone(), request.address()));
}
```

(Agregar imports `@PutMapping`, `@RequestBody`, `@Valid`, y el campo `updateMyProfileUseCase` al controller.)

- [ ] **Step 6: Correr y verlo pasar.** Run: `mvnw.cmd test -Dtest=MyProfileControllerTest`. Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add Backend/src/main/java/lab/laboratorio/modules/empresa/
git commit -m "feat(empresa): PUT /me/profile (editar contacto/dirección del paciente)"
```

## Task D4 (FE): Perfil real — reemplazar `USER_MOCK` con load por store

**Files:**
- Modify: `FRONTEND-PORTAL/src/app/features/main/perfil/perfil.service.ts`
- Modify: `.../store/perfil.actions.ts`, `.reducer.ts`, `.effects.ts` (agregar load/update)
- Create: `FRONTEND-PORTAL/src/app/core/models/perfil.model.ts` (shape del backend)
- Modify: `.../perfil.component.ts` (usar store en vez de `toSignal(getPerfil)`)
- Test: ampliar `perfil.service.spec.ts` y `perfil.effects.spec.ts`

- [ ] **Step 1: Modelo del perfil real**

`perfil.model.ts`:

```typescript
export interface PerfilPaciente {
  patientId: number;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  address: string;
  coverageName: string;
}

export interface UpdatePerfilPayload {
  email: string;
  phone: string;
  address: string;
}
```

- [ ] **Step 2: Test del service get/update (falla)** — extender `perfil.service.spec.ts`:

```typescript
it('getPerfil GETs /me/profile', () => {
  service.getPerfil().subscribe();
  const req = http.expectOne('/api/v1/me/profile');
  expect(req.request.method).toBe('GET');
  req.flush({ patientId: 77, firstName: 'M', lastName: 'F', dni: '30', email: 'm@m', phone: '1', address: 'a', coverageName: 'OSDE' });
});

it('updatePerfil PUTs /me/profile', () => {
  service.updatePerfil({ email: 'n@n', phone: '9', address: 'b' }).subscribe();
  const req = http.expectOne('/api/v1/me/profile');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual({ email: 'n@n', phone: '9', address: 'b' });
  req.flush({ patientId: 77, firstName: 'M', lastName: 'F', dni: '30', email: 'n@n', phone: '9', address: 'b', coverageName: 'OSDE' });
});
```

- [ ] **Step 3: Correr y verlo fallar.** Run: `npx vitest run src/app/features/main/perfil/perfil.service.spec.ts`. Expected: FAIL.

- [ ] **Step 4: Reemplazar el service** (borrar `USER_MOCK`, `of`, `delay`):

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PerfilPaciente, UpdatePerfilPayload } from '../../../core/models/perfil.model';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getPerfil(): Observable<PerfilPaciente> {
    return this.http.get<PerfilPaciente>('/api/v1/me/profile');
  }

  updatePerfil(payload: UpdatePerfilPayload): Observable<PerfilPaciente> {
    return this.http.put<PerfilPaciente>('/api/v1/me/profile', payload);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`/api/v1/user/${this.auth.userId()}/password`, { currentPassword, newPassword });
  }
}
```

- [ ] **Step 5: Extender el slice perfil** — cambiar `PerfilState.user` a `PerfilPaciente | null` y agregar actions load/update:

`perfil.actions.ts` (agregar):

```typescript
import { PerfilPaciente, UpdatePerfilPayload } from '../../../../core/models/perfil.model';

export const loadProfile = createAction('[Perfil Page] Load Profile');
export const loadProfileSuccess = createAction('[Perfil API] Load Profile Success', props<{ profile: PerfilPaciente }>());
export const loadProfileFailure = createAction('[Perfil API] Load Profile Failure', props<{ error: HttpErrorResponse }>());

export const updateProfile = createAction('[Perfil Page] Update Profile', props<{ payload: UpdatePerfilPayload }>());
export const updateProfileSuccess = createAction('[Perfil API] Update Profile Success', props<{ profile: PerfilPaciente }>());
export const updateProfileFailure = createAction('[Perfil API] Update Profile Failure', props<{ error: HttpErrorResponse }>());
```

`perfil.state.ts` (cambiar el tipo de `user`):

```typescript
import { PerfilPaciente } from '../../../../core/models/perfil.model';
// user: PerfilPaciente | null;
```

`perfil.reducer.ts` (agregar):

```typescript
on(A.loadProfile, s => ({ ...s, loading: true, error: null })),
on(A.loadProfileSuccess, (s, { profile }) => ({ ...s, loading: false, user: profile })),
on(A.loadProfileFailure, (s, { error }) => ({ ...s, loading: false, error })),
on(A.updateProfile, s => ({ ...s, saving: true, error: null })),
on(A.updateProfileSuccess, (s, { profile }) => ({ ...s, saving: false, user: profile })),
on(A.updateProfileFailure, (s, { error }) => ({ ...s, saving: false, error })),
```

`perfil.effects.ts` (agregar load + update):

```typescript
import { switchMap } from 'rxjs';

loadProfile$ = createEffect(() => this.actions$.pipe(
  ofType(A.loadProfile),
  switchMap(() => this.svc.getPerfil().pipe(
    map(profile => A.loadProfileSuccess({ profile })),
    catchError(error => of(A.loadProfileFailure({ error }))),
  )),
));

updateProfile$ = createEffect(() => this.actions$.pipe(
  ofType(A.updateProfile),
  concatMap(({ payload }) => this.svc.updatePerfil(payload).pipe(
    map(profile => A.updateProfileSuccess({ profile })),
    catchError(error => of(A.updateProfileFailure({ error }))),
  )),
));
```

- [ ] **Step 6: Test de effects load/update (falla → pasa)** — agregar a `perfil.effects.spec.ts` casos análogos a los de password usando `getPerfil`/`updatePerfil`. Run: `npx vitest run src/app/features/main/perfil/store/perfil.effects.spec.ts`. Expected: PASS tras Step 5.

- [ ] **Step 7: Cablear el componente al store**

En `perfil.component.ts`, reemplazar `user = toSignal(this.perfilService.getPerfil(), ...)` por el selector del store y despachar `loadProfile` en init:

```typescript
import { OnInit } from '@angular/core';
import { selectUser, selectLoading } from './store/perfil.selectors';
import * as A from './store/perfil.actions';

// quitar PerfilService del componente (lo usa el effect)
readonly user = this.store.selectSignal(selectUser);
readonly loading = this.store.selectSignal(selectLoading);

ngOnInit(): void { this.store.dispatch(A.loadProfile()); }
```

(El template `perfil.component.html` debe mapear a los campos planos de `PerfilPaciente`: `firstName`, `lastName`, `dni`, `email`, `phone`, `address`, `coverageName`. Ajustar los bindings que antes usaban el shape de `User`/`USER_MOCK`. Eliminar referencias a `datosMedicos`/`contactoEmergencia`/`cobertura` anidada que ya no existen — o mostrarlos como "—" si el diseño los conserva.)

- [ ] **Step 8: Correr y verlo pasar.** Run: `npx vitest run src/app/features/main/perfil`. Expected: PASS.

- [ ] **Step 9: Commit.**

```bash
git add src/app/features/main/perfil src/app/core/models/perfil.model.ts
git commit -m "feat(portal): perfil real cableado a GET /me/profile (reemplaza USER_MOCK)"
```

## Task D5 (FE): Formulario de edición de perfil

**Files:**
- Modify: `.../perfil.component.ts` (+ `.html`)
- Test: `.../perfil.component.spec.ts` (nuevo)

- [ ] **Step 1: Test del submit de edición (falla)**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { PerfilComponent } from './perfil.component';
import { initialPerfilState } from './store/perfil.state';
import * as A from './store/perfil.actions';

describe('PerfilComponent editar', () => {
  let store: MockStore;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [provideMockStore({ initialState: { perfil: { ...initialPerfilState, user: {
        patientId: 77, firstName: 'M', lastName: 'F', dni: '30', email: 'm@m', phone: '1', address: 'a', coverageName: 'OSDE' } } } }), MessageService],
    });
    store = TestBed.inject(MockStore);
  });

  it('guardarEdicion dispatches updateProfile', () => {
    const fixture = TestBed.createComponent(PerfilComponent);
    const cmp = fixture.componentInstance;
    const spy = vi.spyOn(store, 'dispatch');
    cmp.abrirEdicion();
    cmp.editForm.setValue({ email: 'n@n', phone: '9', address: 'b' });
    cmp.guardarEdicion();
    expect(spy).toHaveBeenCalledWith(A.updateProfile({ payload: { email: 'n@n', phone: '9', address: 'b' } }));
  });
});
```

- [ ] **Step 2: Correr y verlo fallar.** Run: `npx vitest run src/app/features/main/perfil/perfil.component.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implementar el form de edición** — reemplazar el `onEditar` toast por un form precargado con el `user()` actual:

```typescript
mostrarEdicion = signal(false);
editForm = this.fb.group({
  email: ['', [Validators.email]],
  phone: [''],
  address: [''],
});

abrirEdicion(): void {
  const u = this.user();
  if (u) this.editForm.setValue({ email: u.email ?? '', phone: u.phone ?? '', address: u.address ?? '' });
  this.mostrarEdicion.set(true);
}

guardarEdicion(): void {
  if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
  const { email, phone, address } = this.editForm.getRawValue();
  this.store.dispatch(A.updateProfile({ payload: { email: email!, phone: phone!, address: address! } }));
}
```

En el effect de éxito (`updateProfileSuccess`) el reducer ya actualiza `user`; agregar al `effect()` del constructor un toast cuando `saving` pasa de true a false sin error (o reaccionar a un signal `selectSaving`). Cerrar `mostrarEdicion` al éxito.

En `perfil.component.html`, cambiar el botón "Editar perfil" para llamar `abrirEdicion()` y renderizar el form cuando `mostrarEdicion()`:

```html
<p-button label="Editar perfil" icon="pi pi-pencil" severity="primary" (onClick)="abrirEdicion()" />
@if (mostrarEdicion()) {
  <form (ngSubmit)="guardarEdicion()" class="perfil__edit-form">
    <input pInputText [formControl]="editForm.controls.email" placeholder="Email" />
    <input pInputText [formControl]="editForm.controls.phone" placeholder="Teléfono" />
    <input pInputText [formControl]="editForm.controls.address" placeholder="Dirección" />
    <p-button type="submit" label="Guardar" [loading]="saving()" />
  </form>
}
```

(Agregar `selectSaving` como signal `saving` y `InputTextModule` a imports.)

- [ ] **Step 4: Correr y verlo pasar + suite.** Run: `npx vitest run src/app/features/main/perfil` y luego `npm test`. Expected: verde.

- [ ] **Step 5: Commit.**

```bash
git add src/app/features/main/perfil
git commit -m "feat(portal): edición de perfil (PUT /me/profile) desde la pantalla de Perfil"
```

---

## Verificación final (todas las partes)

- [ ] Backend: `mvnw.cmd test` (suite completa verde en el worktree de back).
- [ ] Frontend: `npm test` (suite completa verde) + `npm run build` (compila sin errores).
- [ ] Smoke manual por feature (con backend local en MySQL 3307 / login de prueba): recuperar contraseña (requiere SMTP del tenant — ver riesgo del spec), cambiar contraseña, reprogramar un turno propio, ver y editar el perfil.
- [ ] Actualizar el Excel de seguimiento: filas 19 (Recuperar contraseña) → real; 12 (Reprogramación) → real; 16 (Perfil) → ver+editar real.

## Notas de cierre

- **PRs:** cada Parte = 1 PR de back + 1 PR de front (8 PRs), o consolidar según prefiera el usuario. Mantener la migración NgRx acotada a lo nuevo (no reescribir turnos/perfil existentes salvo lo tocado aquí).
- **Riesgos heredados del spec:** SMTP por tenant para recuperar contraseña; el mapeo User→Patient (mitigado por D0/D1); ownership de reschedule (cubierto por C1). 
- **Flyway:** ninguna tarea agrega migración; si D requiere una (no previsto), tomar la siguiente versión libre y avisar (memoria de colisión Flyway).
