# Spec C — PR drafts (ready to open after smoke E2E)

## Backend PR

```bash
gh pr create --base development --head feat/turnos-spec-c --title "feat(turnos): Spec C backend — patient portal endpoints" --body "..."
```

### Body

```
## Summary

- Habilita el flujo del paciente externo (rol EXTERNO) en el backend
- 4 endpoints nuevos: register-patient (público), sucursales/public (público), catalog/tipos-analisis (EXTERNO), patients/me/family (EXTERNO)
- 2 endpoints adaptados: GET /appointments?mine=true y PATCH /cancel abren a EXTERNO con ownership check
- Migraciones V55 (tipos_analisis catalog) + V56 (seed dev localdev-only) — V59 cancelada (users_patients ya cubría el bond familiar)
- Security review pass aplicado: tenant_id predicate agregado a findByPatientIdsOrderByScheduledAtDesc (defense-in-depth)

## Jira

[KAN-28](https://exequielsantoro.atlassian.net/browse/KAN-28)

## Spec

`FRONTEND-PORTAL/docs/superpowers/specs/2026-05-22-turnos-spec-c-portal-design.md` (en el repo del portal)

## Tests

- 540 total / 539 pass / 1 pre-existing fail (AddAnalysisListTransactionTest, no relacionado con Spec C)
- 33 nuevos tests Spec C: 22 use cases + 11 controllers — todos verdes

## Notas

- Required by frontend PR https://github.com/TUP-TESIS-LAB/FRONTEND-PORTAL/pull/new/feat/turnos-spec-c — mergear este primero
- TODO documentados (siguen específicamente fuera de scope): rate-limit en endpoints públicos, integration test cross-tenant, refactor de patrón duplicado "resolve current user → tenantId" (3 use cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Frontend PR

```bash
gh pr create --base development --head feat/turnos-spec-c --title "feat(turnos): Spec C portal — wire patient flow" --body "..."
```

### Body

```
## Summary

- Wire de mockups del portal a backend real
- Auth stack nuevo signal-based (AuthService + AuthInterceptor + authGuard)
- ApiErrorMapper traduce excepciones del backend a mensajes user-friendly
- Wizard /turnos/sacar de 5 pasos: nuevo step 0 "Para quién" + integración con AppointmentService
- Servicios nuevos: TipoAnalisis, SucursalPublic, Family, Appointment
- Mappers: appointmentToTurno con cobertura de los 7 status del backend
- Mock services obsoletos eliminados (TurnoService, SacarTurnoService, FamiliaService)
- Vitest setup nuevo en el portal (config + setup + 23 tests pasando)

## Depende de

PR backend Spec C — debe mergear primero (endpoints reales)

## Jira

[KAN-28](https://exequielsantoro.atlassian.net/browse/KAN-28)

## Spec + plan

- `docs/superpowers/specs/2026-05-22-turnos-spec-c-portal-design.md`
- `docs/superpowers/plans/2026-05-22-turnos-spec-c-portal.md`

## Tests

- 23 vitest pasando (ApiErrorMapper x9, AuthService x3, AuthInterceptor x3, appointmentToTurno x8)
- Build limpio (1.79 kB sobre presupuesto inicial bundle, no bloqueante)

## Smoke E2E manual

Pendiente del user — ver `docs/superpowers/specs/2026-05-22-turnos-spec-c-smoke-checklist.md`. Bugs encontrados se anotan acá antes de mergear.

## Notas

- TipoAnalisis.id widened a number|string temporalmente para compatibilidad con mockup; narrow a number cuando se elimine el último usage string del mockup (TODO menor)
- Sede.telefono y .horario quedan undefined — backend no los expone aún (TODO)
- /register: nombreCompleto se splitea en firstName/lastName (primer space) — UX opcional: cambiar form a 2 inputs separados

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## How to open the PRs

Once the user validates the smoke E2E checklist:

```bash
# Backend (do this first)
cd Backend
gh pr create --base development --head feat/turnos-spec-c \
  --title "feat(turnos): Spec C backend — patient portal endpoints" \
  --body "$(cat <<'EOF'
## Summary
...paste body from above...
EOF
)"

# Frontend (after backend PR is open)
cd FRONTEND-PORTAL
gh pr create --base development --head feat/turnos-spec-c \
  --title "feat(turnos): Spec C portal — wire patient flow" \
  --body "$(cat <<'EOF'
## Summary
...paste body from above...
EOF
)"
```

Or open both URLs directly in browser:
- Backend: https://github.com/TUP-TESIS-LAB/Backend/pull/new/feat/turnos-spec-c
- Frontend: https://github.com/TUP-TESIS-LAB/FRONTEND-PORTAL/pull/new/feat/turnos-spec-c
