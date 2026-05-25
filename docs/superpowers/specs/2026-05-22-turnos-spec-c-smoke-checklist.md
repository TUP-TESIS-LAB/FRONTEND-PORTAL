# Spec C — Smoke E2E manual checklist

This is for the user to execute manually after both backend and frontend are ready. It validates end-to-end happy and error paths.

> Backend branch: `feat/turnos-spec-c` (HEAD `7a8f4a7` in Backend repo)
> Frontend branch: `feat/turnos-spec-c` (HEAD `00711ce` in FRONTEND-PORTAL repo)
> Jira: [KAN-28](https://exequielsantoro.atlassian.net/browse/KAN-28)

## Pre-requisites

1. Backend running with `local` profile (carga MySQL local + locations `db/migration-local/` con seeds dev):
   ```bash
   cd Backend
   git checkout feat/turnos-spec-c
   ./mvnw spring-boot:run -Dspring-boot.run.profiles=local
   ```
   Wait for `Started LaboratorioApplication`.

   **Si Flyway falla con checksum mismatch / out-of-order**, tu DB local está desactualizada. Camino más simple:
   ```sql
   -- mysql -u laboratorio -p
   DROP DATABASE laboratorio;
   CREATE DATABASE laboratorio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
   Y reintentar el arranque — Flyway corre todas las migrations limpias incluyendo V55 (tipos), V56 (seed) y V900 (admin@test.com).

2. Frontend running:
   ```bash
   cd FRONTEND-PORTAL
   git checkout feat/turnos-spec-c
   npm start
   ```
   Open `http://localhost:4200`.

3. (Optional) If `tipo_analisis_determinations` is empty, manually link tipos to existing determinations via SQL — otherwise the wizard's POST /appointments may fail with empty determinations. See SQL snippet at the bottom.
   - V56 seed inserts 6 tipos_analisis for tenant_id=1 but leaves `tipo_analisis_determinations` empty.
   - The portal wizard sends `determinationIds: []` which the backend accepts.
   - If appointments require at least one determination, seed the link table manually (see SQL at bottom).

## Smoke checklist

### Registration & login
- [ ] Open the portal at the demo tenant URL (e.g. `http://localhost:4200/?tenant=lab-demo`)
- [ ] Click "Registrarse" → form appears
- [ ] Submit with valid data (DNI nuevo, password con 1 mayúscula + 1 número) → redirect a `/turnos`
- [ ] Logout → re-login con esos credenciales → success

### Sacar turno propio
- [ ] En `/turnos` click "Sacar turno" → wizard step 0 muestra solo "Yo" preseleccionado
- [ ] Avanzar → step 1 (tipos) muestra los 6 tipos de análisis del catálogo
- [ ] Seleccionar 2 tipos → next
- [ ] Step 2 (sede) → seleccionar una sede
- [ ] Step 3 (fecha+hora) → elegir fecha ≥ hoy + 2 días, ver slots, elegir uno
- [ ] Step 4 (confirmar) → confirmar
- [ ] Toast "Turno reservado" + redirect a `/turnos`
- [ ] El nuevo turno aparece en "Próximos"

### Cancelar turno
- [ ] Click "Cancelar" en el card del turno
- [ ] Confirm dialog → "Sí, cancelar"
- [ ] Toast "Turno cancelado" + lista refresca
- [ ] El turno cancelado aparece en "Anteriores" con estado "Cancelado"

### Family (manual seeding required)

Connect to the dev DB and link a dependent to the registered user:

```sql
-- Replace USER_ID with the actual user id from the registered user
-- tenant_id = 1 (Laboratorio Demo, seeded by V900)

-- 1. Crear paciente dependiente
INSERT INTO patients (tenant_id, first_name, last_name, document_number, birth_date,
                      status, created_at, created_by, version)
VALUES (1, 'Lucía', 'Test', '55000001', '2018-03-08', 'ACTIVE', NOW(), 'manual', 0);

-- 2. Vincular al user con bond HIJA
INSERT INTO users_patients (user_id, patient_id, tenant_id, bond, is_owner, status,
                            created_at, created_by, version)
SELECT USER_ID, p.id, 1, 'HIJA', false, 'VERIFIED', NOW(), 'manual', 0
FROM patients p WHERE p.document_number = '55000001' AND p.tenant_id = 1;
```

### Sacar turno para hija
- [ ] Refresh `/familia` → ve la card de Lucía
- [ ] Click "Sacar turno" en card de Lucía
- [ ] Wizard arranca directo en step 1 (tipo) — skipea step 0 porque hay `?personaId=`
- [ ] Completar el flujo → confirmar
- [ ] Lista de turnos: el nuevo turno aparece con `personaNombre = Lucía`

### Security checks (importantes)
- [ ] Token JWT expirado manualmente en localStorage → al refrescar, redirect a `/login` (interceptor 401)
- [ ] Intentar PATCH /appointments/{id_de_otro_user}/cancel con token EXTERNO → 403 (curl test):
  ```bash
  curl -X PATCH http://localhost:8080/api/v1/turnos/appointments/999/cancel \
    -H "Authorization: Bearer <token>" -i
  ```
  Expected: 403 Forbidden

### Browser console
- [ ] No errors rojos en console
- [ ] No warnings críticos (los de "MapStruct unmapped" del backend son OK)

### Network tab
- [ ] Requests autenticadas tienen header `Authorization: Bearer <token>`
- [ ] Requests a `/auth/login`, `/auth/register-patient`, `/sucursales/public` NO tienen header (skip-list del interceptor funciona)

## Si encontrás bugs

Anotalos directamente en el PR description del frontend antes de mergear. Bugs críticos = bloqueantes; bugs menores = nice-to-have/TODO.

## Cleanup (opcional)

```sql
-- Borrar datos seedados manualmente
DELETE FROM users_patients WHERE created_by = 'manual';
DELETE FROM patients WHERE created_by = 'manual';
```

## SQL opcional: vincular tipos_analisis a determinations

Si el backend requiere al menos una determinación por turno y el catalog devuelve `determinationIds: []`:

```sql
-- Primero ver qué determinations existen
SELECT id, name FROM determinations WHERE tenant_id = 1 LIMIT 10;

-- Luego vincular (ajustar determination_id y tipo_analisis_id según los IDs reales)
-- Ejemplo: vincular Hemograma Completo (asumiendo id=1) a determination_id=1
INSERT INTO tipo_analisis_determinations (tipo_analisis_id, determination_id)
SELECT ta.id, d.id
FROM tipos_analisis ta
CROSS JOIN determinations d
WHERE ta.tenant_id = 1 AND d.tenant_id = 1
  AND ta.id NOT IN (SELECT DISTINCT tipo_analisis_id FROM tipo_analisis_determinations)
LIMIT 6; -- vincular las primeras 6 pairs disponibles
```
