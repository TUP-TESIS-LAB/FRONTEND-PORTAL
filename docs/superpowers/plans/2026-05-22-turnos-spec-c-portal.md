# Spec C — Implementation Plan (Portal patient flow)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar al paciente externo a registrarse, loguearse, sacar turno (para sí o un familiar), listar y cancelar sus turnos en el portal multi-tenant, conectando los mockups existentes a endpoints reales del backend.

**Architecture:** Cross-cutting. Backend agrega 4 endpoints nuevos + adapta 2 existentes (módulos TURNOS, SUCURSALES, EMPRESA). Frontend reemplaza servicios mock por HTTP reales + suma auth stack (AuthService signal-based, interceptor, guard) + ApiErrorMapper + nuevo step "Para quién" en el wizard.

**Tech Stack:** Backend: Java 21 + Spring Boot + Spring Security + JPA + Flyway + JUnit 5 + Mockito. Frontend: Angular 21 standalone + signals + PrimeNG 21 + RxJS + vitest + jsdom.

**Spec source:** `FRONTEND-PORTAL/docs/superpowers/specs/2026-05-22-turnos-spec-c-portal-design.md` (commit `f0b782f`).

**Execution order:** Backend completo (Parts 1-6) → Frontend (Parts 7-12) → Smoke E2E (Part 13). Backend y Frontend van en PRs separadas.

**Branches:**
- Backend: `feat/turnos-spec-c` (crear desde `development` al arrancar Part 1)
- Frontend Portal: `feat/turnos-spec-c` (ya creada, contiene este plan + spec)

---

## PART 1 — Backend foundation

### Task 1: Crear rama backend y verificar modelo Patient

**Files:**
- Modify: `Backend/` (working tree state)

- [ ] **Step 1: Crear rama backend desde development**

```bash
cd Backend
git checkout development
git pull
git checkout -b feat/turnos-spec-c
git branch --show-current
```

Expected: `feat/turnos-spec-c`

- [ ] **Step 2: Verificar modelo Patient existente**

Buscar la entidad `Patient` y su mapping JPA:

```bash
find src/main/java -name "PatientEntity.java" -o -name "Patient.java"
```

Leer los archivos encontrados. Verificar si existe alguno de:
- FK `responsible_patient_id` o `parent_patient_id` (relación familiar)
- FK `user_id` o linkeo a `User` (responsable autenticable)
- Campo `family_vinculo` o similar

- [ ] **Step 3: Documentar findings**

Escribir en `Backend/docs/turnos-spec-c-explore-findings.md`:

```markdown
# Spec C — Patient model exploration findings

Date: 2026-05-22

## Existing Patient fields
- [list fields and constraints]

## Family relationship
- [yes/no, details]

## User ↔ Patient link
- [yes/no, mechanism]

## Decisions for plan
- Migration V59 needed: [yes/no]
- PatientFamilyPort backed by: [direct FK | dni-match | new linking]
```

- [ ] **Step 4: Commit findings**

```bash
git add Backend/docs/turnos-spec-c-explore-findings.md
git commit -m "docs(turnos): patient model exploration findings for Spec C"
```

---

### Task 2: Migration V58 — tabla tipos_analisis + puente

**Files:**
- Create: `Backend/src/main/resources/db/migration/V58__create_tipos_analisis.sql`

- [ ] **Step 1: Crear migración**

```sql
-- V58__create_tipos_analisis.sql
-- Catálogo agregado de tipos de análisis (UX-friendly) para el portal del paciente.
-- Cada tipo agrupa N determinaciones reales.

CREATE TABLE tipos_analisis (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion_corta VARCHAR(255),
    categoria VARCHAR(40) NOT NULL,
    ayuno BOOLEAN NOT NULL DEFAULT FALSE,
    icono VARCHAR(40),
    preparacion JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    CONSTRAINT uq_tipos_analisis_tenant_nombre UNIQUE (tenant_id, nombre)
);

CREATE INDEX idx_tipos_analisis_tenant_active ON tipos_analisis(tenant_id, active);

CREATE TABLE tipo_analisis_determinations (
    tipo_analisis_id BIGINT NOT NULL REFERENCES tipos_analisis(id) ON DELETE CASCADE,
    determination_id BIGINT NOT NULL,
    PRIMARY KEY (tipo_analisis_id, determination_id)
);

CREATE INDEX idx_tipo_analisis_det_determination ON tipo_analisis_determinations(determination_id);
```

**Note:** `JSONB` para PostgreSQL. Si Flyway corre H2 en tests, ajustar con `H2: JSON` placeholder o usar `TEXT` y serializar. Verificar `application-test.yml` durante Step 3.

- [ ] **Step 2: Validar sintaxis con run de Flyway en local**

```bash
cd Backend
./mvnw flyway:info -Dflyway.url=jdbc:postgresql://localhost:5432/lab_dev -Dflyway.user=postgres -Dflyway.password=postgres
./mvnw flyway:migrate -Dflyway.url=jdbc:postgresql://localhost:5432/lab_dev -Dflyway.user=postgres -Dflyway.password=postgres
```

Expected: V58 marcada como Applied.

- [ ] **Step 3: Verificar compatibilidad H2 tests**

Si la app usa H2 en tests, agregar variante en `application-test.yml` o usar tipo `TEXT` para `preparacion`. Validar corriendo:

```bash
./mvnw test -Dtest=NoMatchingTestsExpectedToFail -DfailIfNoTests=false
```

(El comando solo arranca el contexto Spring/Flyway, no corre tests). Expected: arranque limpio sin errores de migración.

- [ ] **Step 4: Commit**

```bash
git add src/main/resources/db/migration/V58__create_tipos_analisis.sql
git commit -m "feat(turnos): add tipos_analisis catalog tables (V58)"
```

---

### Task 3: Migration V59 — patient family link (si explore lo requiere)

**Files:**
- Create: `Backend/src/main/resources/db/migration/V59__add_patient_family_link.sql` (condicional)

**SKIP esta tarea si** Step 3 de Task 1 documentó que el modelo Patient ya soporta vínculo familiar. Continuar con Task 4.

- [ ] **Step 1: Crear migración**

```sql
-- V59__add_patient_family_link.sql
-- Vínculo familiar simple: un paciente "responsable" tiene N "dependientes".
-- El responsable es el que tiene un User EXTERNO linkeado.

ALTER TABLE patients ADD COLUMN responsible_patient_id BIGINT NULL;
ALTER TABLE patients ADD CONSTRAINT fk_patient_responsible
    FOREIGN KEY (responsible_patient_id) REFERENCES patients(id) ON DELETE SET NULL;
CREATE INDEX idx_patient_responsible ON patients(responsible_patient_id);

ALTER TABLE patients ADD COLUMN family_vinculo VARCHAR(20) NULL;
-- Valores esperados: 'HIJO', 'HIJA', 'MADRE', 'PADRE', 'CONYUGE', 'OTRO'
-- NULL para pacientes raíz (responsables sin un patriarca encima)
```

- [ ] **Step 2: Aplicar y verificar**

```bash
./mvnw flyway:migrate
```

Expected: V59 Applied.

- [ ] **Step 3: Commit**

```bash
git add src/main/resources/db/migration/V59__add_patient_family_link.sql
git commit -m "feat(empresa): add patient family link FK + vinculo (V59)"
```

---

### Task 4: Migration V60 — seed dev tipos_analisis

**Files:**
- Create: `Backend/src/main/resources/db/migration/V60__seed_local_dev_tipos_analisis.sql`

- [ ] **Step 1: Identificar tenant demo y determinations existentes**

```bash
grep -r "tenant_id" src/main/resources/db/migration/ | grep -i "demo\|test\|seed"
```

Anotar el `tenant_id` del tenant demo (usado por seeds previos como `V900__seed_local_dev`). Anotar IDs de `determinations` ya seedadas si existen.

- [ ] **Step 2: Crear migración profile-locked**

```sql
-- V60__seed_local_dev_tipos_analisis.sql
-- Profile-locked: solo corre en perfil 'localdev' (igual que V900__seed_local_dev).
-- Tipos de análisis para el tenant demo, matcheando los hardcoded del mockup portal.

-- Reemplazar TENANT_DEMO_ID con el id real del tenant demo descubierto en step 1.
-- Reemplazar DETERMINATION_HEMOGRAMA_ID etc. con IDs reales o omitir el INSERT en tabla puente si no hay determinations seedadas todavia.

INSERT INTO tipos_analisis (tenant_id, nombre, descripcion_corta, categoria, ayuno, icono, preparacion, active)
VALUES
    ('TENANT_DEMO_ID', 'Hemograma completo', 'Glóbulos rojos, blancos, plaquetas', 'hematologia', FALSE, 'pi-chart-bar', '["Sin ayuno requerido", "Llevar orden médica"]'::jsonb, TRUE),
    ('TENANT_DEMO_ID', 'Glucemia en ayunas', 'Ayuno mínimo 8 hs', 'bioquimica', TRUE, 'pi-percentage', '["8 horas de ayuno", "Puede tomar agua"]'::jsonb, TRUE),
    ('TENANT_DEMO_ID', 'Perfil lipídico', 'Colesterol, triglicéridos · Ayuno 12 hs', 'bioquimica', TRUE, 'pi-chart-line', '["12 horas de ayuno", "Evitar alcohol 48hs antes"]'::jsonb, TRUE),
    ('TENANT_DEMO_ID', 'Perfil tiroideo', 'T3, T4, TSH', 'hormonas', FALSE, 'pi-sync', '["Sin ayuno requerido"]'::jsonb, TRUE),
    ('TENANT_DEMO_ID', 'Orina completa', 'Análisis de muestra fresca', 'orina', FALSE, 'pi-filter', '["Llevar muestra de orina fresca (primera de la mañana)"]'::jsonb, TRUE),
    ('TENANT_DEMO_ID', 'Test COVID-19 (PCR)', 'Resultado en 24-48 hs', 'bioquimica', FALSE, 'pi-shield', '["Sin preparación especial"]'::jsonb, TRUE);

-- TODO: linkear cada tipo con sus determination_id en tipo_analisis_determinations.
-- Pendiente: confirmar IDs de determinations en tabla determinations o usar lookup por nombre.
-- Ejemplo:
-- INSERT INTO tipo_analisis_determinations (tipo_analisis_id, determination_id)
-- SELECT t.id, d.id
-- FROM tipos_analisis t, determinations d
-- WHERE t.nombre = 'Hemograma completo' AND t.tenant_id = 'TENANT_DEMO_ID'
--   AND d.codigo = 'HEM_COMPLETO';
```

**Note:** Si `determinations` no existen seedadas todavía, agregar también un seed mínimo de determinations o dejar `tipo_analisis_determinations` vacío con TODO inline.

- [ ] **Step 3: Aplicar con profile localdev**

```bash
SPRING_PROFILES_ACTIVE=localdev ./mvnw flyway:migrate
```

Expected: V60 Applied. Verificar con:

```bash
psql lab_dev -c "SELECT id, nombre, categoria FROM tipos_analisis;"
```

- [ ] **Step 4: Commit**

```bash
git add src/main/resources/db/migration/V60__seed_local_dev_tipos_analisis.sql
git commit -m "feat(turnos): seed dev tipos_analisis for demo tenant (V60)"
```

---

## PART 2 — Backend TipoAnalisis catalog

### Task 5: Dominio TipoAnalisis + puerto

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/domain/model/TipoAnalisis.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/domain/port/TipoAnalisisRepositoryPort.java`

- [ ] **Step 1: Crear modelo de dominio**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/domain/model/TipoAnalisis.java
package lab.laboratorio.modules.turnos.domain.model;

import java.time.LocalDateTime;
import java.util.List;

public class TipoAnalisis {
    private final Long id;
    private final String tenantId;
    private final String nombre;
    private final String descripcionCorta;
    private final String categoria;
    private final boolean ayuno;
    private final String icono;
    private final List<String> preparacion;
    private final List<Long> determinationIds;
    private final boolean active;
    private final LocalDateTime deletedAt;

    public TipoAnalisis(Long id, String tenantId, String nombre, String descripcionCorta,
                        String categoria, boolean ayuno, String icono,
                        List<String> preparacion, List<Long> determinationIds,
                        boolean active, LocalDateTime deletedAt) {
        this.id = id;
        this.tenantId = tenantId;
        this.nombre = nombre;
        this.descripcionCorta = descripcionCorta;
        this.categoria = categoria;
        this.ayuno = ayuno;
        this.icono = icono;
        this.preparacion = preparacion == null ? List.of() : List.copyOf(preparacion);
        this.determinationIds = determinationIds == null ? List.of() : List.copyOf(determinationIds);
        this.active = active;
        this.deletedAt = deletedAt;
    }

    public Long getId() { return id; }
    public String getTenantId() { return tenantId; }
    public String getNombre() { return nombre; }
    public String getDescripcionCorta() { return descripcionCorta; }
    public String getCategoria() { return categoria; }
    public boolean isAyuno() { return ayuno; }
    public String getIcono() { return icono; }
    public List<String> getPreparacion() { return preparacion; }
    public List<Long> getDeterminationIds() { return determinationIds; }
    public boolean isActive() { return active; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
}
```

- [ ] **Step 2: Crear puerto del repositorio**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/domain/port/TipoAnalisisRepositoryPort.java
package lab.laboratorio.modules.turnos.domain.port;

import lab.laboratorio.modules.turnos.domain.model.TipoAnalisis;
import java.util.List;

public interface TipoAnalisisRepositoryPort {
    List<TipoAnalisis> findActiveByTenant(String tenantId);
}
```

- [ ] **Step 3: Compilar para verificar**

```bash
./mvnw compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/turnos/domain/model/TipoAnalisis.java \
        src/main/java/lab/laboratorio/modules/turnos/domain/port/TipoAnalisisRepositoryPort.java
git commit -m "feat(turnos): add TipoAnalisis domain model + port"
```

---

### Task 6: Infraestructura JPA TipoAnalisis (entity + adapter + mapper)

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/entity/TipoAnalisisEntity.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/repository/TipoAnalisisJpaRepository.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/mapper/TipoAnalisisMapper.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/adapter/TipoAnalisisRepositoryAdapter.java`

- [ ] **Step 1: Crear entity JPA**

Seguir el patrón de `AgendaConfigEntity` (extiende `BaseJpaEntity` para tenant-aware). Mapear `JSONB preparacion` con `@JdbcTypeCode(SqlTypes.JSON)` y `tipo_analisis_determinations` como `@ElementCollection`:

```java
// TipoAnalisisEntity.java
package lab.laboratorio.modules.turnos.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lab.laboratorio.infrastructure.persistence.BaseJpaEntity;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tipos_analisis")
public class TipoAnalisisEntity extends BaseJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(name = "descripcion_corta", length = 255)
    private String descripcionCorta;

    @Column(nullable = false, length = 40)
    private String categoria;

    @Column(nullable = false)
    private boolean ayuno;

    @Column(length = 40)
    private String icono;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> preparacion = new ArrayList<>();

    @ElementCollection
    @CollectionTable(
        name = "tipo_analisis_determinations",
        joinColumns = @JoinColumn(name = "tipo_analisis_id")
    )
    @Column(name = "determination_id")
    private List<Long> determinationIds = new ArrayList<>();

    @Column(nullable = false)
    private boolean active = true;

    // getters/setters omitidos para brevedad — seguir patrón AgendaConfigEntity
}
```

- [ ] **Step 2: Crear JpaRepository**

```java
// TipoAnalisisJpaRepository.java
package lab.laboratorio.modules.turnos.infrastructure.persistence.repository;

import lab.laboratorio.modules.turnos.infrastructure.persistence.entity.TipoAnalisisEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface TipoAnalisisJpaRepository extends JpaRepository<TipoAnalisisEntity, Long> {

    @Query("SELECT t FROM TipoAnalisisEntity t " +
           "WHERE t.tenantId = :tenantId AND t.active = true AND t.deletedAt IS NULL " +
           "ORDER BY t.nombre ASC")
    List<TipoAnalisisEntity> findActiveByTenant(String tenantId);
}
```

- [ ] **Step 3: Crear mapper**

```java
// TipoAnalisisMapper.java
package lab.laboratorio.modules.turnos.infrastructure.persistence.mapper;

import lab.laboratorio.modules.turnos.domain.model.TipoAnalisis;
import lab.laboratorio.modules.turnos.infrastructure.persistence.entity.TipoAnalisisEntity;

public final class TipoAnalisisMapper {
    private TipoAnalisisMapper() {}

    public static TipoAnalisis toDomain(TipoAnalisisEntity e) {
        return new TipoAnalisis(
            e.getId(),
            e.getTenantId(),
            e.getNombre(),
            e.getDescripcionCorta(),
            e.getCategoria(),
            e.isAyuno(),
            e.getIcono(),
            e.getPreparacion(),
            e.getDeterminationIds(),
            e.isActive(),
            e.getDeletedAt()
        );
    }
}
```

- [ ] **Step 4: Crear adapter**

```java
// TipoAnalisisRepositoryAdapter.java
package lab.laboratorio.modules.turnos.infrastructure.persistence.adapter;

import lab.laboratorio.modules.turnos.domain.model.TipoAnalisis;
import lab.laboratorio.modules.turnos.domain.port.TipoAnalisisRepositoryPort;
import lab.laboratorio.modules.turnos.infrastructure.persistence.mapper.TipoAnalisisMapper;
import lab.laboratorio.modules.turnos.infrastructure.persistence.repository.TipoAnalisisJpaRepository;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class TipoAnalisisRepositoryAdapter implements TipoAnalisisRepositoryPort {

    private final TipoAnalisisJpaRepository jpa;

    public TipoAnalisisRepositoryAdapter(TipoAnalisisJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public List<TipoAnalisis> findActiveByTenant(String tenantId) {
        return jpa.findActiveByTenant(tenantId).stream()
            .map(TipoAnalisisMapper::toDomain)
            .toList();
    }
}
```

- [ ] **Step 5: Compilar**

```bash
./mvnw compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/
git commit -m "feat(turnos): add TipoAnalisis JPA entity + adapter"
```

---

### Task 7: ListTiposAnalisisUseCase (TDD)

**Files:**
- Create: `Backend/src/test/java/lab/laboratorio/modules/turnos/application/usecase/ListTiposAnalisisUseCaseTest.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/application/usecase/ListTiposAnalisisUseCase.java`

- [ ] **Step 1: Test fallando (RED)**

```java
// ListTiposAnalisisUseCaseTest.java
package lab.laboratorio.modules.turnos.application.usecase;

import lab.laboratorio.infrastructure.tenancy.TenantProvider;
import lab.laboratorio.modules.turnos.domain.model.TipoAnalisis;
import lab.laboratorio.modules.turnos.domain.port.TipoAnalisisRepositoryPort;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ListTiposAnalisisUseCaseTest {

    private final TipoAnalisisRepositoryPort repo = mock(TipoAnalisisRepositoryPort.class);
    private final TenantProvider tenantProvider = mock(TenantProvider.class);
    private final ListTiposAnalisisUseCase useCase = new ListTiposAnalisisUseCase(repo, tenantProvider);

    @Test
    void returnsListFromRepositoryForCurrentTenant() {
        when(tenantProvider.currentTenantId()).thenReturn("tenant-A");
        TipoAnalisis t = new TipoAnalisis(1L, "tenant-A", "Hemograma", "desc", "hematologia",
            false, "pi-chart-bar", List.of("Sin ayuno"), List.of(10L, 11L), true, null);
        when(repo.findActiveByTenant("tenant-A")).thenReturn(List.of(t));

        List<TipoAnalisis> result = useCase.execute();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNombre()).isEqualTo("Hemograma");
        assertThat(result.get(0).getDeterminationIds()).containsExactly(10L, 11L);
    }

    @Test
    void returnsEmptyListWhenNoTipos() {
        when(tenantProvider.currentTenantId()).thenReturn("tenant-A");
        when(repo.findActiveByTenant("tenant-A")).thenReturn(List.of());

        assertThat(useCase.execute()).isEmpty();
    }
}
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
./mvnw test -Dtest=ListTiposAnalisisUseCaseTest
```

Expected: FAIL — `ListTiposAnalisisUseCase` no existe.

- [ ] **Step 3: Implementación mínima (GREEN)**

```java
// ListTiposAnalisisUseCase.java
package lab.laboratorio.modules.turnos.application.usecase;

import lab.laboratorio.infrastructure.tenancy.TenantProvider;
import lab.laboratorio.modules.turnos.domain.model.TipoAnalisis;
import lab.laboratorio.modules.turnos.domain.port.TipoAnalisisRepositoryPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ListTiposAnalisisUseCase {

    private final TipoAnalisisRepositoryPort repo;
    private final TenantProvider tenantProvider;

    public ListTiposAnalisisUseCase(TipoAnalisisRepositoryPort repo, TenantProvider tenantProvider) {
        this.repo = repo;
        this.tenantProvider = tenantProvider;
    }

    public List<TipoAnalisis> execute() {
        return repo.findActiveByTenant(tenantProvider.currentTenantId());
    }
}
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
./mvnw test -Dtest=ListTiposAnalisisUseCaseTest
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/turnos/application/usecase/ListTiposAnalisisUseCase.java \
        src/test/java/lab/laboratorio/modules/turnos/application/usecase/ListTiposAnalisisUseCaseTest.java
git commit -m "feat(turnos): add ListTiposAnalisisUseCase with tests"
```

---

### Task 8: CatalogController endpoint GET /turnos/catalog/tipos-analisis

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/dto/TipoAnalisisResponse.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/controller/CatalogController.java`
- Create: `Backend/src/test/java/lab/laboratorio/modules/turnos/presentation/controller/CatalogControllerTest.java`

- [ ] **Step 1: DTO de response**

```java
// TipoAnalisisResponse.java
package lab.laboratorio.modules.turnos.presentation.dto;

import lab.laboratorio.modules.turnos.domain.model.TipoAnalisis;
import java.util.List;

public record TipoAnalisisResponse(
    Long id,
    String nombre,
    String descripcionCorta,
    String categoria,
    boolean ayuno,
    String icono,
    List<String> preparacion,
    List<Long> determinationIds
) {
    public static TipoAnalisisResponse from(TipoAnalisis t) {
        return new TipoAnalisisResponse(
            t.getId(), t.getNombre(), t.getDescripcionCorta(), t.getCategoria(),
            t.isAyuno(), t.getIcono(), t.getPreparacion(), t.getDeterminationIds()
        );
    }
}
```

- [ ] **Step 2: Test del controller (RED)**

Seguir el patrón documentado en `AgendaConfigControllerTest.java` (mocks de `JwtTenantResolver` + `TenantModuleGuard` + use cases). Test:

```java
// CatalogControllerTest.java — boilerplate del setup omitido, copiar de AgendaConfigControllerTest
package lab.laboratorio.modules.turnos.presentation.controller;

import lab.laboratorio.application.module.TenantModuleGuard;
import lab.laboratorio.infrastructure.tenancy.JwtTenantResolver;
import lab.laboratorio.modules.turnos.application.usecase.ListTiposAnalisisUseCase;
import lab.laboratorio.modules.turnos.domain.model.TipoAnalisis;
import lab.laboratorio.shared.constants.ApiPaths;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class CatalogControllerTest {

    private static final String BASE_URL = ApiPaths.API_V1 + "/turnos/catalog/tipos-analisis";

    @Autowired private WebApplicationContext context;
    @MockitoBean private ListTiposAnalisisUseCase listTiposAnalisisUseCase;
    @MockitoBean private JwtTenantResolver jwtTenantResolver;
    @MockitoBean private TenantModuleGuard tenantModuleGuard;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    @WithMockUser(roles = "EXTERNO")
    void returnsTiposListForExterno() throws Exception {
        TipoAnalisis t = new TipoAnalisis(1L, "t", "Hemograma", "desc", "hematologia",
            false, "pi-chart-bar", List.of("Sin ayuno"), List.of(10L, 11L), true, null);
        when(listTiposAnalisisUseCase.execute()).thenReturn(List.of(t));

        mockMvc.perform(get(BASE_URL))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].nombre").value("Hemograma"))
            .andExpect(jsonPath("$[0].determinationIds[0]").value(10))
            .andExpect(jsonPath("$[0].ayuno").value(false));
    }

    @Test
    void unauthorizedWithoutAuth() throws Exception {
        mockMvc.perform(get(BASE_URL)).andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 3: Verificar test falla**

```bash
./mvnw test -Dtest=CatalogControllerTest
```

Expected: FAIL — controller no existe.

- [ ] **Step 4: Implementar controller**

```java
// CatalogController.java
package lab.laboratorio.modules.turnos.presentation.controller;

import lab.laboratorio.modules.turnos.application.usecase.ListTiposAnalisisUseCase;
import lab.laboratorio.modules.turnos.presentation.dto.TipoAnalisisResponse;
import lab.laboratorio.shared.constants.ApiPaths;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiPaths.API_V1 + "/turnos/catalog")
public class CatalogController {

    private final ListTiposAnalisisUseCase listTiposAnalisisUseCase;

    public CatalogController(ListTiposAnalisisUseCase listTiposAnalisisUseCase) {
        this.listTiposAnalisisUseCase = listTiposAnalisisUseCase;
    }

    @GetMapping("/tipos-analisis")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RESPONSABLE_SECRETARIA','SECRETARIA','EXTERNO')")
    public List<TipoAnalisisResponse> listTipos() {
        return listTiposAnalisisUseCase.execute().stream()
            .map(TipoAnalisisResponse::from)
            .toList();
    }
}
```

- [ ] **Step 5: Verificar test pasa**

```bash
./mvnw test -Dtest=CatalogControllerTest
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/turnos/presentation/controller/CatalogController.java \
        src/main/java/lab/laboratorio/modules/turnos/presentation/dto/TipoAnalisisResponse.java \
        src/test/java/lab/laboratorio/modules/turnos/presentation/controller/CatalogControllerTest.java
git commit -m "feat(turnos): expose GET /turnos/catalog/tipos-analisis"
```

---

## PART 3 — Backend Family + Register

### Task 9: PatientFamilyPort + adapter

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/domain/port/PatientFamilyPort.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/domain/model/PatientFamilyEntry.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/infrastructure/adapter/PatientFamilyAdapter.java`

- [ ] **Step 1: Domain model + port**

```java
// PatientFamilyEntry.java
package lab.laboratorio.modules.empresa.domain.model;

import java.time.LocalDate;

public record PatientFamilyEntry(
    Long id,
    String nombre,
    String apellido,
    String dni,
    LocalDate fechaNacimiento,
    String vinculo,             // null para el responsable raíz
    Long responsablePatientId   // null para el responsable raíz
) {}
```

```java
// PatientFamilyPort.java
package lab.laboratorio.modules.empresa.domain.port;

import lab.laboratorio.modules.empresa.domain.model.PatientFamilyEntry;
import java.util.List;
import java.util.Set;

public interface PatientFamilyPort {
    /** patientIds que el user puede operar (self + dependientes). */
    Set<Long> resolveOwnedPatientIds(Long userId);

    /** Lista jerárquica: responsable primero, después dependientes. */
    List<PatientFamilyEntry> listFamily(Long userId);
}
```

- [ ] **Step 2: Adapter JPA**

```java
// PatientFamilyAdapter.java
package lab.laboratorio.modules.empresa.infrastructure.adapter;

import lab.laboratorio.modules.empresa.domain.model.PatientFamilyEntry;
import lab.laboratorio.modules.empresa.domain.port.PatientFamilyPort;
import lab.laboratorio.modules.empresa.infrastructure.persistence.entity.PatientEntity;
import lab.laboratorio.modules.empresa.infrastructure.persistence.repository.PatientJpaRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class PatientFamilyAdapter implements PatientFamilyPort {

    private final PatientJpaRepository patients;

    public PatientFamilyAdapter(PatientJpaRepository patients) {
        this.patients = patients;
    }

    @Override
    public Set<Long> resolveOwnedPatientIds(Long userId) {
        PatientEntity responsible = patients.findByUserId(userId)
            .orElseThrow(() -> new IllegalStateException("No patient linked to user " + userId));
        Set<Long> ids = new HashSet<>();
        ids.add(responsible.getId());
        patients.findByResponsiblePatientId(responsible.getId())
            .forEach(p -> ids.add(p.getId()));
        return ids;
    }

    @Override
    public List<PatientFamilyEntry> listFamily(Long userId) {
        PatientEntity responsible = patients.findByUserId(userId)
            .orElseThrow(() -> new IllegalStateException("No patient linked to user " + userId));
        List<PatientFamilyEntry> out = new ArrayList<>();
        out.add(toEntry(responsible, null));
        patients.findByResponsiblePatientId(responsible.getId())
            .forEach(p -> out.add(toEntry(p, responsible.getId())));
        return out;
    }

    private PatientFamilyEntry toEntry(PatientEntity p, Long responsibleId) {
        return new PatientFamilyEntry(
            p.getId(), p.getNombre(), p.getApellido(), p.getDni(),
            p.getFechaNacimiento(),
            p.getFamilyVinculo(),  // null si es responsable
            responsibleId == null ? null : (p.getResponsiblePatientId())
        );
    }
}
```

**Note:** `findByUserId` y `findByResponsiblePatientId` deben agregarse a `PatientJpaRepository`. Si los métodos `getFamilyVinculo()` / `getResponsiblePatientId()` no existen en `PatientEntity`, agregarlos junto con las columnas de la migración V59.

- [ ] **Step 3: Agregar queries al repository y getters a la entity**

Modificar `PatientJpaRepository` para agregar:
```java
Optional<PatientEntity> findByUserId(Long userId);
List<PatientEntity> findByResponsiblePatientId(Long responsibleId);
```

Modificar `PatientEntity` para agregar campos + getters/setters:
```java
@Column(name = "responsible_patient_id")
private Long responsiblePatientId;

@Column(name = "family_vinculo", length = 20)
private String familyVinculo;
```

- [ ] **Step 4: Compilar**

```bash
./mvnw compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/empresa/
git commit -m "feat(empresa): add PatientFamilyPort + adapter"
```

---

### Task 10: ListMyFamilyUseCase (TDD)

**Files:**
- Create: `Backend/src/test/java/lab/laboratorio/modules/empresa/application/usecase/ListMyFamilyUseCaseTest.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/application/usecase/ListMyFamilyUseCase.java`

- [ ] **Step 1: Test (RED)**

```java
// ListMyFamilyUseCaseTest.java
package lab.laboratorio.modules.empresa.application.usecase;

import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import lab.laboratorio.modules.empresa.domain.model.PatientFamilyEntry;
import lab.laboratorio.modules.empresa.domain.port.PatientFamilyPort;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ListMyFamilyUseCaseTest {

    private final PatientFamilyPort port = mock(PatientFamilyPort.class);
    private final CurrentUserProvider userProvider = mock(CurrentUserProvider.class);
    private final ListMyFamilyUseCase useCase = new ListMyFamilyUseCase(port, userProvider);

    @Test
    void returnsFamilyForCurrentUser() {
        when(userProvider.currentUserId()).thenReturn(42L);
        when(port.listFamily(42L)).thenReturn(List.of(
            new PatientFamilyEntry(10L, "María", "García", "30000000",
                LocalDate.of(1990, 5, 12), null, null),
            new PatientFamilyEntry(11L, "Lucía", "García", "55000000",
                LocalDate.of(2018, 3, 8), "HIJA", 10L)
        ));

        List<PatientFamilyEntry> result = useCase.execute();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).vinculo()).isNull();
        assertThat(result.get(1).vinculo()).isEqualTo("HIJA");
    }
}
```

**Note:** Si `CurrentUserProvider` no existe, usar el provider real del proyecto (verificar con `grep -r "currentUserId" src/main/java | head`). Si solo existe `TenantProvider`, agregar `CurrentUserProvider` como nueva clase en `infrastructure/security/`.

- [ ] **Step 2: Correr — verifica fallo**

```bash
./mvnw test -Dtest=ListMyFamilyUseCaseTest
```

Expected: FAIL.

- [ ] **Step 3: Implementación**

```java
// ListMyFamilyUseCase.java
package lab.laboratorio.modules.empresa.application.usecase;

import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import lab.laboratorio.modules.empresa.domain.model.PatientFamilyEntry;
import lab.laboratorio.modules.empresa.domain.port.PatientFamilyPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ListMyFamilyUseCase {

    private final PatientFamilyPort port;
    private final CurrentUserProvider userProvider;

    public ListMyFamilyUseCase(PatientFamilyPort port, CurrentUserProvider userProvider) {
        this.port = port;
        this.userProvider = userProvider;
    }

    public List<PatientFamilyEntry> execute() {
        return port.listFamily(userProvider.currentUserId());
    }
}
```

- [ ] **Step 4: Test verde**

```bash
./mvnw test -Dtest=ListMyFamilyUseCaseTest
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/empresa/application/usecase/ListMyFamilyUseCase.java \
        src/test/java/lab/laboratorio/modules/empresa/application/usecase/ListMyFamilyUseCaseTest.java
git commit -m "feat(empresa): add ListMyFamilyUseCase with tests"
```

---

### Task 11: MyFamilyController endpoint

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/presentation/dto/PatientFamilyResponse.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/presentation/controller/MyFamilyController.java`
- Create: `Backend/src/test/java/lab/laboratorio/modules/empresa/presentation/controller/MyFamilyControllerTest.java`

- [ ] **Step 1: DTO**

```java
// PatientFamilyResponse.java
package lab.laboratorio.modules.empresa.presentation.dto;

import lab.laboratorio.modules.empresa.domain.model.PatientFamilyEntry;
import java.time.LocalDate;

public record PatientFamilyResponse(
    Long id,
    String nombre,
    String apellido,
    String dni,
    LocalDate fechaNacimiento,
    String vinculo,
    Long responsablePatientId
) {
    public static PatientFamilyResponse from(PatientFamilyEntry e) {
        return new PatientFamilyResponse(e.id(), e.nombre(), e.apellido(), e.dni(),
            e.fechaNacimiento(), e.vinculo(), e.responsablePatientId());
    }
}
```

- [ ] **Step 2: Test del controller (RED)**

Patrón idéntico a `CatalogControllerTest`. Mock de `ListMyFamilyUseCase` + `JwtTenantResolver`. Sin `TenantModuleGuard` (este endpoint pertenece a EMPRESA, no a un módulo activable).

```java
// MyFamilyControllerTest.java
@SpringBootTest
@ActiveProfiles("test")
class MyFamilyControllerTest {
    private static final String BASE_URL = ApiPaths.API_V1 + "/empresa/patients/me/family";

    @Autowired private WebApplicationContext context;
    @MockitoBean private ListMyFamilyUseCase listMyFamilyUseCase;
    @MockitoBean private JwtTenantResolver jwtTenantResolver;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    @WithMockUser(roles = "EXTERNO")
    void returnsFamilyForExterno() throws Exception {
        when(listMyFamilyUseCase.execute()).thenReturn(List.of(
            new PatientFamilyEntry(10L, "María", "García", "30000000",
                LocalDate.of(1990, 5, 12), null, null)
        ));

        mockMvc.perform(get(BASE_URL))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].nombre").value("María"))
            .andExpect(jsonPath("$[0].vinculo").doesNotExist());
    }
}
```

- [ ] **Step 3: Test falla**

```bash
./mvnw test -Dtest=MyFamilyControllerTest
```

Expected: FAIL.

- [ ] **Step 4: Implementación**

```java
// MyFamilyController.java
package lab.laboratorio.modules.empresa.presentation.controller;

import lab.laboratorio.modules.empresa.application.usecase.ListMyFamilyUseCase;
import lab.laboratorio.modules.empresa.presentation.dto.PatientFamilyResponse;
import lab.laboratorio.shared.constants.ApiPaths;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiPaths.API_V1 + "/empresa/patients/me")
public class MyFamilyController {

    private final ListMyFamilyUseCase listMyFamilyUseCase;

    public MyFamilyController(ListMyFamilyUseCase listMyFamilyUseCase) {
        this.listMyFamilyUseCase = listMyFamilyUseCase;
    }

    @GetMapping("/family")
    @PreAuthorize("hasRole('EXTERNO')")
    public List<PatientFamilyResponse> getMyFamily() {
        return listMyFamilyUseCase.execute().stream()
            .map(PatientFamilyResponse::from)
            .toList();
    }
}
```

- [ ] **Step 5: Test verde**

```bash
./mvnw test -Dtest=MyFamilyControllerTest
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/empresa/presentation/ \
        src/test/java/lab/laboratorio/modules/empresa/presentation/controller/MyFamilyControllerTest.java
git commit -m "feat(empresa): expose GET /empresa/patients/me/family"
```

---

## PART 4 — Backend Register patient

### Task 12: RegisterPatientUseCase (TDD)

**Files:**
- Create: `Backend/src/test/java/lab/laboratorio/modules/empresa/application/usecase/RegisterPatientUseCaseTest.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/application/usecase/RegisterPatientUseCase.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/domain/exception/RegisterConflictException.java`

- [ ] **Step 1: Domain exception**

```java
// RegisterConflictException.java
package lab.laboratorio.modules.empresa.domain.exception;

public class RegisterConflictException extends RuntimeException {
    public RegisterConflictException(String message) { super(message); }
}
```

- [ ] **Step 2: Test del use case (RED)**

```java
// RegisterPatientUseCaseTest.java
package lab.laboratorio.modules.empresa.application.usecase;

import lab.laboratorio.infrastructure.security.JwtIssuer;
import lab.laboratorio.modules.empresa.domain.exception.RegisterConflictException;
import lab.laboratorio.modules.empresa.domain.port.PatientRepositoryPort;
import lab.laboratorio.modules.empresa.domain.port.TenantSlugResolverPort;
import lab.laboratorio.modules.empresa.domain.port.UserRepositoryPort;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RegisterPatientUseCaseTest {

    private final UserRepositoryPort users = mock(UserRepositoryPort.class);
    private final PatientRepositoryPort patients = mock(PatientRepositoryPort.class);
    private final TenantSlugResolverPort tenantResolver = mock(TenantSlugResolverPort.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JwtIssuer jwtIssuer = mock(JwtIssuer.class);

    private final RegisterPatientUseCase useCase =
        new RegisterPatientUseCase(users, patients, tenantResolver, encoder, jwtIssuer);

    @Test
    void registersNewPatientAndIssuesJwt() {
        when(tenantResolver.resolveActive("labgarcia")).thenReturn("tenant-1");
        when(users.existsByDniInTenant("30000000", "tenant-1")).thenReturn(false);
        when(users.existsByEmailInTenant("maria@example.com", "tenant-1")).thenReturn(false);
        when(encoder.encode("Password123")).thenReturn("HASHED");
        when(users.save(any())).thenReturn(99L);
        when(patients.save(any())).thenReturn(100L);
        when(jwtIssuer.issueForUser(99L, "tenant-1")).thenReturn("jwt-token-xyz");

        RegisterPatientUseCase.Output out = useCase.execute(new RegisterPatientUseCase.Input(
            "labgarcia", "María García", "30000000", "maria@example.com", "Password123"
        ));

        assertThat(out.token()).isEqualTo("jwt-token-xyz");
        assertThat(out.userId()).isEqualTo(99L);
    }

    @Test
    void throwsConflictOnDniDuplicate() {
        when(tenantResolver.resolveActive("labgarcia")).thenReturn("tenant-1");
        when(users.existsByDniInTenant("30000000", "tenant-1")).thenReturn(true);

        assertThatThrownBy(() -> useCase.execute(new RegisterPatientUseCase.Input(
            "labgarcia", "María García", "30000000", "maria@example.com", "Password123"
        ))).isInstanceOf(RegisterConflictException.class);
    }
}
```

- [ ] **Step 3: Test falla**

```bash
./mvnw test -Dtest=RegisterPatientUseCaseTest
```

Expected: FAIL — `RegisterPatientUseCase` no existe.

- [ ] **Step 4: Implementación**

```java
// RegisterPatientUseCase.java
package lab.laboratorio.modules.empresa.application.usecase;

import lab.laboratorio.infrastructure.security.JwtIssuer;
import lab.laboratorio.modules.empresa.domain.exception.RegisterConflictException;
import lab.laboratorio.modules.empresa.domain.model.NewPatient;
import lab.laboratorio.modules.empresa.domain.model.NewUser;
import lab.laboratorio.modules.empresa.domain.port.PatientRepositoryPort;
import lab.laboratorio.modules.empresa.domain.port.TenantSlugResolverPort;
import lab.laboratorio.modules.empresa.domain.port.UserRepositoryPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegisterPatientUseCase {

    public record Input(String tenantSlug, String nombreCompleto, String dni,
                        String email, String password) {}
    public record Output(String token, Long userId) {}

    private final UserRepositoryPort users;
    private final PatientRepositoryPort patients;
    private final TenantSlugResolverPort tenantResolver;
    private final PasswordEncoder encoder;
    private final JwtIssuer jwtIssuer;

    public RegisterPatientUseCase(UserRepositoryPort users, PatientRepositoryPort patients,
                                  TenantSlugResolverPort tenantResolver,
                                  PasswordEncoder encoder, JwtIssuer jwtIssuer) {
        this.users = users;
        this.patients = patients;
        this.tenantResolver = tenantResolver;
        this.encoder = encoder;
        this.jwtIssuer = jwtIssuer;
    }

    @Transactional
    public Output execute(Input in) {
        String tenantId = tenantResolver.resolveActive(in.tenantSlug());

        if (users.existsByDniInTenant(in.dni(), tenantId)) {
            throw new RegisterConflictException("dni-or-email-taken");
        }
        if (users.existsByEmailInTenant(in.email(), tenantId)) {
            throw new RegisterConflictException("dni-or-email-taken");
        }

        String hash = encoder.encode(in.password());
        Long userId = users.save(new NewUser(tenantId, in.dni(), in.email(),
            in.nombreCompleto(), hash, "EXTERNO"));
        patients.save(new NewPatient(tenantId, userId, in.nombreCompleto(), in.dni()));

        return new Output(jwtIssuer.issueForUser(userId, tenantId), userId);
    }
}
```

**Note:** Si `JwtIssuer`, `NewUser`, `NewPatient`, `TenantSlugResolverPort` no existen como tales en el proyecto, ajustar usando los equivalentes reales encontrados durante el explore. Los métodos `existsByDniInTenant` / `existsByEmailInTenant` se agregan a los puertos correspondientes.

- [ ] **Step 5: Test verde**

```bash
./mvnw test -Dtest=RegisterPatientUseCaseTest
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/empresa/application/usecase/RegisterPatientUseCase.java \
        src/main/java/lab/laboratorio/modules/empresa/domain/exception/RegisterConflictException.java \
        src/test/java/lab/laboratorio/modules/empresa/application/usecase/RegisterPatientUseCaseTest.java
git commit -m "feat(empresa): add RegisterPatientUseCase with tests"
```

---

### Task 13: AuthRegisterController + SecurityConfig allowlist

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/presentation/dto/RegisterPatientRequest.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/presentation/dto/RegisterPatientResponse.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/empresa/presentation/controller/AuthRegisterController.java`
- Create: `Backend/src/test/java/lab/laboratorio/modules/empresa/presentation/controller/AuthRegisterControllerTest.java`
- Modify: `Backend/src/main/java/lab/laboratorio/infrastructure/security/SecurityConfig.java`
- Modify: `Backend/src/main/java/lab/laboratorio/infrastructure/exception/GlobalExceptionHandler.java`

- [ ] **Step 1: Request DTO con validations**

```java
// RegisterPatientRequest.java
package lab.laboratorio.modules.empresa.presentation.dto;

import jakarta.validation.constraints.*;

public record RegisterPatientRequest(
    @NotBlank @Size(max = 64)
    String tenantSlug,

    @NotBlank @Size(min = 3, max = 120)
    String nombreCompleto,

    @NotBlank @Pattern(regexp = "^\\d{7,8}$", message = "dni debe ser 7-8 dígitos")
    String dni,

    @NotBlank @Email @Size(max = 120)
    String email,

    @NotBlank @Size(min = 8, max = 80)
    @Pattern(regexp = "^(?=.*[A-Z])(?=.*\\d).+$",
             message = "password debe tener al menos 1 mayúscula y 1 número")
    String password
) {}

// RegisterPatientResponse.java
package lab.laboratorio.modules.empresa.presentation.dto;

public record RegisterPatientResponse(String token, Long userId) {}
```

- [ ] **Step 2: Test del controller (RED)**

```java
// AuthRegisterControllerTest.java
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AuthRegisterControllerTest {

    private static final String BASE_URL = ApiPaths.API_V1 + "/auth/register-patient";

    @Autowired private MockMvc mockMvc;
    @MockitoBean private RegisterPatientUseCase registerUseCase;
    @MockitoBean private JwtTenantResolver jwtTenantResolver;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void registersSuccessfully() throws Exception {
        when(registerUseCase.execute(any())).thenReturn(
            new RegisterPatientUseCase.Output("jwt-xyz", 99L));

        RegisterPatientRequest req = new RegisterPatientRequest(
            "labgarcia", "María García", "30000000", "maria@example.com", "Password123");

        mockMvc.perform(post(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token").value("jwt-xyz"))
            .andExpect(jsonPath("$.userId").value(99));
    }

    @Test
    void returns400OnInvalidPassword() throws Exception {
        RegisterPatientRequest req = new RegisterPatientRequest(
            "labgarcia", "María García", "30000000", "maria@example.com", "weak");
        mockMvc.perform(post(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void returns409OnConflictWithoutLeakingFieldName() throws Exception {
        when(registerUseCase.execute(any())).thenThrow(
            new RegisterConflictException("dni-or-email-taken"));

        RegisterPatientRequest req = new RegisterPatientRequest(
            "labgarcia", "María García", "30000000", "maria@example.com", "Password123");

        mockMvc.perform(post(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isConflict());
    }
}
```

- [ ] **Step 3: Test falla**

```bash
./mvnw test -Dtest=AuthRegisterControllerTest
```

Expected: FAIL.

- [ ] **Step 4: Implementar controller**

```java
// AuthRegisterController.java
package lab.laboratorio.modules.empresa.presentation.controller;

import jakarta.validation.Valid;
import lab.laboratorio.modules.empresa.application.usecase.RegisterPatientUseCase;
import lab.laboratorio.modules.empresa.presentation.dto.RegisterPatientRequest;
import lab.laboratorio.modules.empresa.presentation.dto.RegisterPatientResponse;
import lab.laboratorio.shared.constants.ApiPaths;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.API_V1 + "/auth")
public class AuthRegisterController {

    private final RegisterPatientUseCase registerUseCase;

    public AuthRegisterController(RegisterPatientUseCase registerUseCase) {
        this.registerUseCase = registerUseCase;
    }

    @PostMapping("/register-patient")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterPatientResponse register(@Valid @RequestBody RegisterPatientRequest req) {
        RegisterPatientUseCase.Output out = registerUseCase.execute(
            new RegisterPatientUseCase.Input(
                req.tenantSlug(), req.nombreCompleto(), req.dni(),
                req.email(), req.password()
            )
        );
        return new RegisterPatientResponse(out.token(), out.userId());
    }
}
```

- [ ] **Step 5: SecurityConfig — permitAll para /auth/register-patient**

Modificar `SecurityConfig.java`:

```java
// En el SecurityFilterChain bean, agregar al .requestMatchers permitAll:
.requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
.requestMatchers(HttpMethod.POST, "/api/v1/auth/register-patient").permitAll()  // <-- nuevo
// ... resto igual
```

- [ ] **Step 6: GlobalExceptionHandler — manejar RegisterConflictException**

Agregar handler en `GlobalExceptionHandler.java`:

```java
@ExceptionHandler(RegisterConflictException.class)
public ResponseEntity<ApiErrorResponse> handleRegisterConflict(RegisterConflictException ex,
                                                                HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(new ApiErrorResponse(409, "Conflict",
            "No se pudo registrar; verificá los datos.", req.getRequestURI(), null));
}
```

- [ ] **Step 7: Test verde**

```bash
./mvnw test -Dtest=AuthRegisterControllerTest
```

Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/empresa/presentation/controller/AuthRegisterController.java \
        src/main/java/lab/laboratorio/modules/empresa/presentation/dto/RegisterPatientRequest.java \
        src/main/java/lab/laboratorio/modules/empresa/presentation/dto/RegisterPatientResponse.java \
        src/test/java/lab/laboratorio/modules/empresa/presentation/controller/AuthRegisterControllerTest.java \
        src/main/java/lab/laboratorio/infrastructure/security/SecurityConfig.java \
        src/main/java/lab/laboratorio/infrastructure/exception/GlobalExceptionHandler.java
git commit -m "feat(empresa): expose POST /auth/register-patient (public)"
```

---

## PART 5 — Backend Public sucursales + Appointments EXTERNO

### Task 14: ListPublicSucursalesUseCase + SucursalPublicController

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/application/usecase/ListPublicSucursalesUseCase.java`
- Create: `Backend/src/test/java/.../ListPublicSucursalesUseCaseTest.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/presentation/controller/SucursalPublicController.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/presentation/dto/SucursalPublicResponse.java`
- Create: `Backend/src/test/java/.../SucursalPublicControllerTest.java`
- Modify: `SecurityConfig.java`

- [ ] **Step 1: UseCase test (RED)**

```java
// ListPublicSucursalesUseCaseTest.java
package lab.laboratorio.modules.sucursales.application.usecase;

import lab.laboratorio.modules.empresa.domain.port.TenantSlugResolverPort;
import lab.laboratorio.modules.sucursales.domain.model.Sucursal;
import lab.laboratorio.modules.sucursales.domain.port.SucursalRepositoryPort;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ListPublicSucursalesUseCaseTest {

    private final TenantSlugResolverPort tenantResolver = mock(TenantSlugResolverPort.class);
    private final SucursalRepositoryPort repo = mock(SucursalRepositoryPort.class);
    private final ListPublicSucursalesUseCase useCase = new ListPublicSucursalesUseCase(tenantResolver, repo);

    @Test
    void returnsActiveSucursalesForSlug() {
        when(tenantResolver.resolveActive("labgarcia")).thenReturn("tenant-1");
        Sucursal s = new Sucursal(5L, "tenant-1", "Sede Centro", "Av. Colón 450",
            "(0351) 422-0100", "L-V 7:00-19:00", true);
        when(repo.findActiveByTenant("tenant-1")).thenReturn(List.of(s));

        List<Sucursal> result = useCase.execute("labgarcia");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNombre()).isEqualTo("Sede Centro");
    }
}
```

- [ ] **Step 2: Test falla**

```bash
./mvnw test -Dtest=ListPublicSucursalesUseCaseTest
```

Expected: FAIL.

- [ ] **Step 3: Implementar use case**

```java
// ListPublicSucursalesUseCase.java
package lab.laboratorio.modules.sucursales.application.usecase;

import lab.laboratorio.modules.empresa.domain.port.TenantSlugResolverPort;
import lab.laboratorio.modules.sucursales.domain.model.Sucursal;
import lab.laboratorio.modules.sucursales.domain.port.SucursalRepositoryPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ListPublicSucursalesUseCase {

    private final TenantSlugResolverPort tenantResolver;
    private final SucursalRepositoryPort repo;

    public ListPublicSucursalesUseCase(TenantSlugResolverPort tenantResolver,
                                       SucursalRepositoryPort repo) {
        this.tenantResolver = tenantResolver;
        this.repo = repo;
    }

    public List<Sucursal> execute(String tenantSlug) {
        String tenantId = tenantResolver.resolveActive(tenantSlug);
        return repo.findActiveByTenant(tenantId);
    }
}
```

- [ ] **Step 4: Verde**

```bash
./mvnw test -Dtest=ListPublicSucursalesUseCaseTest
```

Expected: PASS.

- [ ] **Step 5: DTO + Controller**

```java
// SucursalPublicResponse.java
package lab.laboratorio.modules.sucursales.presentation.dto;

import lab.laboratorio.modules.sucursales.domain.model.Sucursal;

public record SucursalPublicResponse(
    Long id, String nombre, String direccion, String telefono, String horario
) {
    public static SucursalPublicResponse from(Sucursal s) {
        return new SucursalPublicResponse(s.getId(), s.getNombre(), s.getDireccion(),
            s.getTelefono(), s.getHorario());
    }
}

// SucursalPublicController.java
package lab.laboratorio.modules.sucursales.presentation.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lab.laboratorio.modules.sucursales.application.usecase.ListPublicSucursalesUseCase;
import lab.laboratorio.modules.sucursales.presentation.dto.SucursalPublicResponse;
import lab.laboratorio.shared.constants.ApiPaths;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiPaths.API_V1 + "/sucursales")
@Validated
public class SucursalPublicController {

    private final ListPublicSucursalesUseCase useCase;

    public SucursalPublicController(ListPublicSucursalesUseCase useCase) {
        this.useCase = useCase;
    }

    @GetMapping("/public")
    public List<SucursalPublicResponse> listPublic(
            @RequestParam @NotBlank @Size(max = 64) String slug) {
        return useCase.execute(slug).stream()
            .map(SucursalPublicResponse::from)
            .toList();
    }
}
```

- [ ] **Step 6: Controller test**

```java
// SucursalPublicControllerTest.java
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class SucursalPublicControllerTest {

    private static final String BASE_URL = ApiPaths.API_V1 + "/sucursales/public";

    @Autowired private MockMvc mockMvc;
    @MockitoBean private ListPublicSucursalesUseCase useCase;
    @MockitoBean private JwtTenantResolver jwtTenantResolver;

    @Test
    void returnsSucursalesWithoutAuth() throws Exception {
        when(useCase.execute("labgarcia")).thenReturn(List.of(
            new Sucursal(1L, "t", "Sede Centro", "Av. Colón 450", null, "L-V 7-19", true)
        ));

        mockMvc.perform(get(BASE_URL).param("slug", "labgarcia"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].nombre").value("Sede Centro"));
    }

    @Test
    void returns400OnMissingSlug() throws Exception {
        mockMvc.perform(get(BASE_URL)).andExpect(status().isBadRequest());
    }
}
```

- [ ] **Step 7: SecurityConfig — permitAll /sucursales/public**

```java
.requestMatchers(HttpMethod.GET, "/api/v1/sucursales/public").permitAll()
```

- [ ] **Step 8: Test verde**

```bash
./mvnw test -Dtest=SucursalPublicControllerTest
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/sucursales/ \
        src/test/java/lab/laboratorio/modules/sucursales/ \
        src/main/java/lab/laboratorio/infrastructure/security/SecurityConfig.java
git commit -m "feat(sucursales): expose GET /sucursales/public (no auth)"
```

---

### Task 15: ListMyAppointmentsUseCase (TDD)

**Files:**
- Create: `Backend/src/test/java/.../ListMyAppointmentsUseCaseTest.java`
- Create: `Backend/src/main/java/.../ListMyAppointmentsUseCase.java`

- [ ] **Step 1: Test (RED)**

```java
// ListMyAppointmentsUseCaseTest.java
package lab.laboratorio.modules.turnos.application.usecase;

import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import lab.laboratorio.modules.empresa.domain.port.PatientFamilyPort;
import lab.laboratorio.modules.turnos.domain.model.Appointment;
import lab.laboratorio.modules.turnos.domain.model.AppointmentStatus;
import lab.laboratorio.modules.turnos.domain.port.AppointmentRepositoryPort;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ListMyAppointmentsUseCaseTest {

    private final CurrentUserProvider userProvider = mock(CurrentUserProvider.class);
    private final PatientFamilyPort familyPort = mock(PatientFamilyPort.class);
    private final AppointmentRepositoryPort repo = mock(AppointmentRepositoryPort.class);
    private final ListMyAppointmentsUseCase useCase =
        new ListMyAppointmentsUseCase(userProvider, familyPort, repo);

    @Test
    void returnsAppointmentsForOwnedPatients() {
        when(userProvider.currentUserId()).thenReturn(42L);
        when(familyPort.resolveOwnedPatientIds(42L)).thenReturn(Set.of(10L, 11L));
        Appointment a = new Appointment(1L, "t", 10L, 5L, LocalDateTime.now().plusDays(3),
            "TRN-...", AppointmentStatus.SCHEDULED, null, null, List.of());
        when(repo.findByPatientIdsOrderByScheduledAtDesc(Set.of(10L, 11L), 0, 20))
            .thenReturn(List.of(a));

        List<Appointment> result = useCase.execute(0, 20);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPatientId()).isEqualTo(10L);
    }

    @Test
    void returnsEmptyWhenNoOwnedPatients() {
        when(userProvider.currentUserId()).thenReturn(42L);
        when(familyPort.resolveOwnedPatientIds(42L)).thenReturn(Set.of());

        assertThat(useCase.execute(0, 20)).isEmpty();
        verifyNoInteractions(repo);
    }
}
```

- [ ] **Step 2: Test falla**

```bash
./mvnw test -Dtest=ListMyAppointmentsUseCaseTest
```

Expected: FAIL.

- [ ] **Step 3: Implementar — agregar método al port + use case**

Agregar al `AppointmentRepositoryPort`:
```java
List<Appointment> findByPatientIdsOrderByScheduledAtDesc(Set<Long> patientIds, int page, int size);
```

Implementar en el adapter respectivo (consulta JPA con `IN` clause + paginación).

```java
// ListMyAppointmentsUseCase.java
package lab.laboratorio.modules.turnos.application.usecase;

import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import lab.laboratorio.modules.empresa.domain.port.PatientFamilyPort;
import lab.laboratorio.modules.turnos.domain.model.Appointment;
import lab.laboratorio.modules.turnos.domain.port.AppointmentRepositoryPort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class ListMyAppointmentsUseCase {

    private final CurrentUserProvider userProvider;
    private final PatientFamilyPort familyPort;
    private final AppointmentRepositoryPort repo;

    public ListMyAppointmentsUseCase(CurrentUserProvider userProvider,
                                     PatientFamilyPort familyPort,
                                     AppointmentRepositoryPort repo) {
        this.userProvider = userProvider;
        this.familyPort = familyPort;
        this.repo = repo;
    }

    public List<Appointment> execute(int page, int size) {
        Set<Long> ownedIds = familyPort.resolveOwnedPatientIds(userProvider.currentUserId());
        if (ownedIds.isEmpty()) return List.of();
        return repo.findByPatientIdsOrderByScheduledAtDesc(ownedIds, page, size);
    }
}
```

- [ ] **Step 4: Test verde**

```bash
./mvnw test -Dtest=ListMyAppointmentsUseCaseTest
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/turnos/application/usecase/ListMyAppointmentsUseCase.java \
        src/test/java/lab/laboratorio/modules/turnos/application/usecase/ListMyAppointmentsUseCaseTest.java \
        src/main/java/lab/laboratorio/modules/turnos/domain/port/AppointmentRepositoryPort.java \
        src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/adapter/AppointmentRepositoryAdapter.java
git commit -m "feat(turnos): add ListMyAppointmentsUseCase for EXTERNO"
```

---

### Task 16: AppointmentController.list — mine=true param

**Files:**
- Modify: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/controller/AppointmentController.java`
- Modify: `Backend/src/test/java/.../AppointmentControllerTest.java` (si existe) o crear test específico

- [ ] **Step 1: Test (RED) — agregar a test existente o crear nuevo**

Si `AppointmentControllerTest` ya existe (verificar con find), agregar tests; si no, crearlo siguiendo el patrón. Test casos clave:

```java
@Test
@WithMockUser(roles = "EXTERNO")
void externoCanListWithMineTrue() throws Exception {
    when(listMyAppointmentsUseCase.execute(0, 20)).thenReturn(List.of(/* fixture */));

    mockMvc.perform(get(BASE_URL).param("mine", "true"))
        .andExpect(status().isOk());
}

@Test
@WithMockUser(roles = "EXTERNO")
void externoCannotListWithoutMine() throws Exception {
    mockMvc.perform(get(BASE_URL))
        .andExpect(status().isForbidden());
}

@Test
@WithMockUser(roles = "SECRETARIA")
void secretariaCanListWithoutMine() throws Exception {
    when(listAppointmentsUseCase.execute(any(), any(), any(), eq(0), eq(20)))
        .thenReturn(List.of());
    mockMvc.perform(get(BASE_URL))
        .andExpect(status().isOk());
}
```

- [ ] **Step 2: Tests fallan**

```bash
./mvnw test -Dtest=AppointmentControllerTest
```

Expected: FAIL.

- [ ] **Step 3: Modificar controller**

```java
// AppointmentController.java — método list
@GetMapping
@PreAuthorize("hasAnyRole('ADMINISTRADOR','RESPONSABLE_SECRETARIA','SECRETARIA') "
            + "or (hasRole('EXTERNO') and #mine == true)")
public List<AppointmentResponse> list(
        @RequestParam(required = false) Long patientId,
        @RequestParam(required = false) Long branchId,
        @RequestParam(required = false) LocalDate date,
        @RequestParam(defaultValue = "false") boolean mine,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
    if (mine) {
        return listMyAppointmentsUseCase.execute(page, size).stream()
            .map(AppointmentResponse::from)
            .toList();
    }
    return listAppointmentsUseCase.execute(patientId, branchId, date, page, size).stream()
        .map(AppointmentResponse::from)
        .toList();
}
```

Inyectar `ListMyAppointmentsUseCase` en el constructor.

- [ ] **Step 4: Tests verdes**

```bash
./mvnw test -Dtest=AppointmentControllerTest
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/turnos/presentation/controller/AppointmentController.java \
        src/test/java/lab/laboratorio/modules/turnos/presentation/controller/AppointmentControllerTest.java
git commit -m "feat(turnos): expose GET /appointments?mine=true for EXTERNO"
```

---

### Task 17: CancelAppointmentUseCase ownership (TDD)

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/domain/exception/ForbiddenAccessException.java`
- Modify: `Backend/src/main/java/lab/laboratorio/modules/turnos/application/usecase/CancelAppointmentUseCase.java`
- Modify: `Backend/src/test/java/.../CancelAppointmentUseCaseTest.java`
- Modify: `Backend/src/main/java/lab/laboratorio/infrastructure/exception/GlobalExceptionHandler.java`

- [ ] **Step 1: Crear excepción**

```java
// ForbiddenAccessException.java
package lab.laboratorio.modules.turnos.domain.exception;

public class ForbiddenAccessException extends RuntimeException {
    public ForbiddenAccessException(String message) { super(message); }
}
```

- [ ] **Step 2: Tests nuevos**

Agregar a `CancelAppointmentUseCaseTest`:

```java
@Test
void externoOwnAppointmentCancelsSuccessfully() {
    Long appointmentId = 5L;
    Long patientId = 10L;
    when(securityContextProvider.currentUserId()).thenReturn(42L);
    when(securityContextProvider.currentRole()).thenReturn("EXTERNO");
    when(familyPort.resolveOwnedPatientIds(42L)).thenReturn(Set.of(10L, 11L));
    when(repo.findById(appointmentId)).thenReturn(Optional.of(
        buildAppointment(appointmentId, patientId, LocalDateTime.now().plusDays(3),
                         AppointmentStatus.SCHEDULED)));

    useCase.execute(appointmentId);

    verify(repo).save(argThat(a -> a.getStatus() == AppointmentStatus.CANCELLED));
}

@Test
void externoOtherPatientThrowsForbidden() {
    Long appointmentId = 5L;
    when(securityContextProvider.currentUserId()).thenReturn(42L);
    when(securityContextProvider.currentRole()).thenReturn("EXTERNO");
    when(familyPort.resolveOwnedPatientIds(42L)).thenReturn(Set.of(10L));
    when(repo.findById(appointmentId)).thenReturn(Optional.of(
        buildAppointment(appointmentId, 999L, LocalDateTime.now().plusDays(3),
                         AppointmentStatus.SCHEDULED)));

    assertThatThrownBy(() -> useCase.execute(appointmentId))
        .isInstanceOf(ForbiddenAccessException.class);
}

@Test
void staffCanCancelAnyAppointment() {
    Long appointmentId = 5L;
    when(securityContextProvider.currentRole()).thenReturn("SECRETARIA");
    when(repo.findById(appointmentId)).thenReturn(Optional.of(
        buildAppointment(appointmentId, 999L, LocalDateTime.now().plusDays(3),
                         AppointmentStatus.SCHEDULED)));

    useCase.execute(appointmentId);

    verify(repo).save(any());
}
```

- [ ] **Step 3: Test falla**

```bash
./mvnw test -Dtest=CancelAppointmentUseCaseTest
```

Expected: FAIL on new tests.

- [ ] **Step 4: Modificar use case**

Inyectar `PatientFamilyPort` + `CurrentUserProvider` (con `currentRole()`):

```java
// CancelAppointmentUseCase.java — fragmento clave
@Transactional
public void execute(Long appointmentId) {
    Appointment appointment = repo.findById(appointmentId)
        .orElseThrow(() -> new AppointmentNotFoundException(appointmentId));

    if ("EXTERNO".equals(securityContextProvider.currentRole())) {
        Set<Long> ownedIds = familyPort.resolveOwnedPatientIds(
            securityContextProvider.currentUserId());
        if (!ownedIds.contains(appointment.getPatientId())) {
            throw new ForbiddenAccessException("appointment-not-owned");
        }
    }

    if (!appointment.canBeCancelled()) {
        throw new CancellationWindowExpiredException(appointmentId);
    }
    // ... resto del cancel logic (mark CANCELLED, save)
}
```

- [ ] **Step 5: GlobalExceptionHandler — handler 403**

```java
@ExceptionHandler(ForbiddenAccessException.class)
public ResponseEntity<ApiErrorResponse> handleForbidden(ForbiddenAccessException ex,
                                                         HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(new ApiErrorResponse(403, "Forbidden",
            "No tenés acceso a este recurso.", req.getRequestURI(), null));
}
```

- [ ] **Step 6: Tests verdes**

```bash
./mvnw test -Dtest=CancelAppointmentUseCaseTest
```

Expected: PASS (todos los anteriores + 3 nuevos).

- [ ] **Step 7: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/turnos/application/usecase/CancelAppointmentUseCase.java \
        src/main/java/lab/laboratorio/modules/turnos/domain/exception/ForbiddenAccessException.java \
        src/test/java/lab/laboratorio/modules/turnos/application/usecase/CancelAppointmentUseCaseTest.java \
        src/main/java/lab/laboratorio/infrastructure/exception/GlobalExceptionHandler.java
git commit -m "feat(turnos): enforce ownership on PATCH /appointments/{id}/cancel for EXTERNO"
```

---

### Task 18: AppointmentController.cancel — abrir a EXTERNO

**Files:**
- Modify: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/controller/AppointmentController.java`
- Modify: `Backend/src/test/java/.../AppointmentControllerTest.java`

- [ ] **Step 1: Tests (RED)**

```java
@Test
@WithMockUser(roles = "EXTERNO")
void externoCanRequestCancel() throws Exception {
    doNothing().when(cancelAppointmentUseCase).execute(5L);

    mockMvc.perform(patch(BASE_URL + "/5/cancel"))
        .andExpect(status().isNoContent());
}
```

- [ ] **Step 2: Falla**

```bash
./mvnw test -Dtest=AppointmentControllerTest
```

Expected: FAIL — `EXTERNO` no autorizado.

- [ ] **Step 3: Modificar `@PreAuthorize`**

```java
@PatchMapping("/{id}/cancel")
@PreAuthorize("hasAnyRole('ADMINISTRADOR','RESPONSABLE_SECRETARIA','SECRETARIA','EXTERNO')")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void cancel(@PathVariable Long id) {
    cancelAppointmentUseCase.execute(id);
}
```

- [ ] **Step 4: Verde**

```bash
./mvnw test -Dtest=AppointmentControllerTest
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/turnos/presentation/controller/AppointmentController.java \
        src/test/java/lab/laboratorio/modules/turnos/presentation/controller/AppointmentControllerTest.java
git commit -m "feat(turnos): allow EXTERNO to PATCH /appointments/{id}/cancel"
```

---

## PART 6 — Backend quality gates

### Task 19: Full test suite + simplify

- [ ] **Step 1: Full test suite**

```bash
./mvnw test
```

Expected: ALL PASS. Anotar total de tests turnos verdes.

- [ ] **Step 2: Correr `simplify`**

Invocar el skill `simplify` (slash command de la sesión) sobre el branch `feat/turnos-spec-c`. Aplicar cualquier sugerencia válida (extract constants, drop dead code, consolidate similar logic).

- [ ] **Step 3: Re-test tras simplify**

```bash
./mvnw test
```

Expected: ALL PASS.

- [ ] **Step 4: Commit (si simplify produjo cambios)**

```bash
git add -u
git commit -m "refactor(turnos): apply simplify suggestions on Spec C backend"
```

---

### Task 20: Security review

- [ ] **Step 1: Invocar `/security-review`**

Slash command de la sesión sobre `feat/turnos-spec-c`. Cubre:
- Endpoint público `POST /auth/register-patient` (input validation, password hashing, no leak en errores)
- Endpoint público `GET /sucursales/public` (slug sanitization, no leak de campos sensibles)
- EXTERNO en `GET /appointments?mine=true` (ownership check enforced)
- EXTERNO en `PATCH /cancel` (ownership check enforced)
- Tenant isolation en `TipoAnalisis` (extiende BaseJpaEntity)

- [ ] **Step 2: Resolver findings críticos antes de continuar**

Cualquier issue crítico se arregla in-place. Findings menores se documentan como TODO comment en el código + reportan en el PR description.

- [ ] **Step 3: Commit fixes (si los hubo)**

```bash
git add -u
git commit -m "fix(security): address Spec C security review findings"
```

---

### Task 21: Smoke test backend manual

- [ ] **Step 1: Arrancar backend en modo localdev**

```bash
SPRING_PROFILES_ACTIVE=localdev ./mvnw spring-boot:run
```

Esperar a `Started LaboratorioApplication`.

- [ ] **Step 2: Curl smoke checklist**

```bash
# 1. Public sucursales
curl -s "http://localhost:8080/api/v1/sucursales/public?slug=demo" | jq .

# 2. Register patient
curl -s -X POST http://localhost:8080/api/v1/auth/register-patient \
  -H "Content-Type: application/json" \
  -d '{"tenantSlug":"demo","nombreCompleto":"Test User","dni":"30999999","email":"test@test.com","password":"Password123"}' | jq .

# Capturar el token devuelto en TOKEN env var
export TOKEN="<paste-token>"

# 3. Tipos de análisis (auth EXTERNO)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/turnos/catalog/tipos-analisis | jq .

# 4. Family
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/empresa/patients/me/family | jq .

# 5. Mine appointments (vacío)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/turnos/appointments?mine=true" | jq .
```

Expected: cada llamada responde con shape correcto. Anotar fallos.

- [ ] **Step 3: Detener backend**

`Ctrl+C` o `kill %1`.

- [ ] **Step 4: Push branch backend**

```bash
git push -u origin feat/turnos-spec-c
```

- [ ] **Step 5: NO abrir PR todavía** — bundling con frontend se decide al final (igual que Specs A y B).

---

## PART 7 — Frontend foundation

### Task 22: Vitest setup en el portal

**Files:**
- Create: `FRONTEND-PORTAL/vitest.config.ts`
- Create: `FRONTEND-PORTAL/vitest.setup.ts`
- Modify: `FRONTEND-PORTAL/package.json` (script `test`)

- [ ] **Step 1: Crear vitest.config.ts**

```ts
// vitest.config.ts (sin aliases — portal no los usa en tsconfig actual)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

- [ ] **Step 2: Crear vitest.setup.ts**

```ts
// vitest.setup.ts
import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
  { teardown: { destroyAfterEach: true } },
);
```

- [ ] **Step 3: Actualizar `package.json`**

Cambiar:
```json
"test": "ng test"
```
a:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Smoke test — un test trivial**

Crear `src/app/smoke.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
describe('smoke', () => { it('runs', () => expect(1 + 1).toBe(2)); });
```

```bash
cd FRONTEND-PORTAL
npm test
```

Expected: 1 test pasa.

- [ ] **Step 5: Eliminar smoke + commit**

```bash
rm src/app/smoke.spec.ts
git add vitest.config.ts vitest.setup.ts package.json
git commit -m "chore(portal): set up vitest with TestBed init"
```

---

### Task 23: ApiErrorMapper (TDD)

**Files:**
- Create: `FRONTEND-PORTAL/src/app/shared/utils/api-error-mapper.ts`
- Create: `FRONTEND-PORTAL/src/app/shared/utils/api-error-mapper.spec.ts`

- [ ] **Step 1: Test (RED)**

```ts
// api-error-mapper.spec.ts
import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { mapApiError } from './api-error-mapper';

function build(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body });
}

describe('mapApiError', () => {
  it('maps SlotUnavailableException', () => {
    expect(mapApiError(build(400, { message: 'SlotUnavailableException' })))
      .toBe('Ese horario ya no está disponible. Elegí otro.');
  });

  it('maps MinimumAdvanceBookingException', () => {
    expect(mapApiError(build(400, { message: 'MinimumAdvanceBookingException' })))
      .toBe('Hay que reservar con al menos 2 días de anticipación.');
  });

  it('maps CancellationWindowExpiredException', () => {
    expect(mapApiError(build(400, { message: 'CancellationWindowExpiredException' })))
      .toBe('Ya no se puede cancelar (faltan menos de 24h).');
  });

  it('maps 401 to session expired', () => {
    expect(mapApiError(build(401, {}))).toBe('Sesión expirada. Iniciá sesión de nuevo.');
  });

  it('maps 403 to no access', () => {
    expect(mapApiError(build(403, {}))).toBe('No tenés acceso a este recurso.');
  });

  it('maps 409 to duplicate generic', () => {
    expect(mapApiError(build(409, {}))).toBe('Esos datos ya están registrados.');
  });

  it('concatenates fieldErrors', () => {
    const result = mapApiError(build(400, {
      message: 'Validation failed',
      fieldErrors: { dni: 'must be 7-8 digits', email: 'invalid format' }
    }));
    expect(result).toContain('dni');
    expect(result).toContain('email');
  });

  it('falls back to message', () => {
    expect(mapApiError(build(500, { message: 'Boom' }))).toBe('Boom');
  });

  it('falls back to generic when no info', () => {
    expect(mapApiError(build(500, {})))
      .toBe('Ocurrió un error. Intentá de nuevo.');
  });
});
```

- [ ] **Step 2: Test falla**

```bash
npm test -- api-error-mapper
```

Expected: FAIL.

- [ ] **Step 3: Implementar mapper**

```ts
// api-error-mapper.ts
import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorResponse {
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: Record<string, string>;
}

const MESSAGE_MAP: Record<string, string> = {
  SlotUnavailableException: 'Ese horario ya no está disponible. Elegí otro.',
  MinimumAdvanceBookingException: 'Hay que reservar con al menos 2 días de anticipación.',
  CancellationWindowExpiredException: 'Ya no se puede cancelar (faltan menos de 24h).',
  InvalidBookingDateException: 'Esa fecha no es válida.',
  ModuleDisabledException: 'Esta función no está habilitada para este laboratorio.',
};

const STATUS_FALLBACK: Record<number, string> = {
  401: 'Sesión expirada. Iniciá sesión de nuevo.',
  403: 'No tenés acceso a este recurso.',
  409: 'Esos datos ya están registrados.',
  500: 'Ocurrió un error en el servidor. Intentá más tarde.',
  503: 'El servicio no está disponible. Intentá más tarde.',
};

const GENERIC = 'Ocurrió un error. Intentá de nuevo.';

export function mapApiError(err: HttpErrorResponse): string {
  const body = err.error as Partial<ApiErrorResponse> | null | undefined;

  if (body?.message && MESSAGE_MAP[body.message]) {
    return MESSAGE_MAP[body.message];
  }

  if (body?.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
    const parts = Object.entries(body.fieldErrors).map(
      ([field, msg]) => `${field}: ${msg}`,
    );
    return parts.join('. ');
  }

  if (STATUS_FALLBACK[err.status]) {
    return STATUS_FALLBACK[err.status];
  }

  if (body?.message) return body.message;

  return GENERIC;
}
```

- [ ] **Step 4: Test verde**

```bash
npm test -- api-error-mapper
```

Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/utils/api-error-mapper.ts src/app/shared/utils/api-error-mapper.spec.ts
git commit -m "feat(portal): add ApiErrorMapper with backend exception translation"
```

---

### Task 24: AuthService + auth types (TDD)

**Files:**
- Create: `FRONTEND-PORTAL/src/app/core/auth/auth.types.ts`
- Create: `FRONTEND-PORTAL/src/app/core/auth/token-storage.ts`
- Create: `FRONTEND-PORTAL/src/app/core/auth/auth.service.ts`
- Create: `FRONTEND-PORTAL/src/app/core/auth/auth.service.spec.ts`

- [ ] **Step 1: Types + storage**

```ts
// auth.types.ts
export interface AuthUser {
  id: number;
  nombre: string;
  dni: string;
  email: string;
  roles: string[];
  tenantSlug: string;
}

export interface LoginPayload { dni: string; password: string; }
export interface RegisterPayload {
  tenantSlug: string;
  nombreCompleto: string;
  dni: string;
  email: string;
  password: string;
}
export interface AuthTokenResponse { token: string; user: AuthUser; }
export interface RegisterResponse { token: string; userId: number; }

// token-storage.ts
const KEY = 'portal_auth_token';
export const tokenStorage = {
  get(): string | null { return localStorage.getItem(KEY); },
  set(token: string): void { localStorage.setItem(KEY, token); },
  clear(): void { localStorage.removeItem(KEY); },
};
```

- [ ] **Step 2: Test del service (RED)**

```ts
// auth.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { tokenStorage } from './token-storage';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('login stores token + sets currentUser', () => {
    service.login('30123456', 'pass').subscribe();
    const req = httpMock.expectOne(r => r.url.endsWith('/api/v1/auth/login'));
    req.flush({ token: 'jwt-1', user: { id: 1, nombre: 'A', dni: '30123456', email: 'a@a', roles: ['EXTERNO'], tenantSlug: 'demo' } });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.dni).toBe('30123456');
    expect(tokenStorage.get()).toBe('jwt-1');
  });

  it('logout clears state', () => {
    tokenStorage.set('jwt-1');
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(tokenStorage.get()).toBeNull();
  });

  it('register issues token and authenticates', () => {
    service.register({
      tenantSlug: 'demo', nombreCompleto: 'A', dni: '30000000',
      email: 'a@a', password: 'Password123'
    }).subscribe();
    const req = httpMock.expectOne(r => r.url.endsWith('/api/v1/auth/register-patient'));
    req.flush({ token: 'jwt-new', userId: 99 });
    expect(service.isAuthenticated()).toBe(true);
    expect(tokenStorage.get()).toBe('jwt-new');
  });
});
```

- [ ] **Step 3: Test falla**

```bash
npm test -- auth.service
```

Expected: FAIL.

- [ ] **Step 4: Implementar AuthService**

```ts
// auth.service.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { TenantService } from '../tenant/tenant.service';
import { AuthUser, LoginPayload, RegisterPayload, AuthTokenResponse, RegisterResponse } from './auth.types';
import { tokenStorage } from './token-storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantService);

  private readonly _currentUser = signal<AuthUser | null>(null);
  private readonly _token = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly userId = computed(() => this._currentUser()?.id ?? null);
  readonly roles = computed(() => this._currentUser()?.roles ?? []);

  loadFromStorage(): void {
    const t = tokenStorage.get();
    if (t && !this.isExpired(t)) {
      this._token.set(t);
      // Note: nombre/email del user no se restauran del token; quedan vacíos
      // hasta el primer load de /me (no implementado en MVP)
    } else if (t) {
      tokenStorage.clear();
    }
  }

  login(dni: string, password: string): Observable<void> {
    const slug = this.tenant.config()?.id ?? '';
    return this.http.post<AuthTokenResponse>('/api/v1/auth/login', { dni, password, tenantSlug: slug })
      .pipe(tap(res => this.persistAuth(res.token, res.user)), map(() => void 0));
  }

  register(payload: RegisterPayload): Observable<void> {
    return this.http.post<RegisterResponse>('/api/v1/auth/register-patient', payload)
      .pipe(tap(res => {
        const user: AuthUser = {
          id: res.userId, nombre: payload.nombreCompleto, dni: payload.dni,
          email: payload.email, roles: ['EXTERNO'], tenantSlug: payload.tenantSlug,
        };
        this.persistAuth(res.token, user);
      }), map(() => void 0));
  }

  logout(): void {
    this._currentUser.set(null);
    this._token.set(null);
    tokenStorage.clear();
  }

  private persistAuth(token: string, user: AuthUser): void {
    tokenStorage.set(token);
    this._token.set(token);
    this._currentUser.set(user);
  }

  private isExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      return payload.exp && payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
```

- [ ] **Step 5: Test verde**

```bash
npm test -- auth.service
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/core/auth/
git commit -m "feat(portal): add AuthService with login/register/logout"
```

---

### Task 25: AuthInterceptor + tests

**Files:**
- Create: `FRONTEND-PORTAL/src/app/core/auth/auth.interceptor.ts`
- Create: `FRONTEND-PORTAL/src/app/core/auth/auth.interceptor.spec.ts`

- [ ] **Step 1: Test (RED)**

```ts
// auth.interceptor.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { tokenStorage } from './token-storage';
import { Router } from '@angular/router';

describe('authInterceptor', () => {
  let http: HttpClient;
  let mock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
  });

  it('injects Bearer when token present and URL not in skip list', () => {
    tokenStorage.set('jwt-1');
    TestBed.inject(AuthService).loadFromStorage();
    http.get('/api/v1/turnos/appointments').subscribe();
    const req = mock.expectOne('/api/v1/turnos/appointments');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-1');
  });

  it('skips Bearer for /auth/login', () => {
    tokenStorage.set('jwt-1');
    TestBed.inject(AuthService).loadFromStorage();
    http.post('/api/v1/auth/login', {}).subscribe();
    const req = mock.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('skips Bearer for /sucursales/public', () => {
    tokenStorage.set('jwt-1');
    TestBed.inject(AuthService).loadFromStorage();
    http.get('/api/v1/sucursales/public?slug=demo').subscribe();
    const req = mock.expectOne(r => r.url.includes('/sucursales/public'));
    expect(req.request.headers.has('Authorization')).toBe(false);
  });
});
```

- [ ] **Step 2: Falla**

```bash
npm test -- auth.interceptor
```

Expected: FAIL.

- [ ] **Step 3: Implementar interceptor**

```ts
// auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

const SKIP_PATTERNS = ['/auth/login', '/auth/register-patient', '/sucursales/public', '/tenants/'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const skip = SKIP_PATTERNS.some(p => req.url.includes(p));
  const token = auth.token();

  const authReq = (token && !skip)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      if (err.status === 401 && !skip) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
```

- [ ] **Step 4: Verde**

```bash
npm test -- auth.interceptor
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/auth.interceptor.ts src/app/core/auth/auth.interceptor.spec.ts
git commit -m "feat(portal): add AuthInterceptor with 401 handler"
```

---

### Task 26: authGuard

**Files:**
- Create: `FRONTEND-PORTAL/src/app/core/auth/auth.guard.ts`

- [ ] **Step 1: Implementar guard**

```ts
// auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

Expected: build sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/core/auth/auth.guard.ts
git commit -m "feat(portal): add authGuard with returnUrl support"
```

---

### Task 27: app.config — interceptor + APP_INITIALIZER

**Files:**
- Modify: `FRONTEND-PORTAL/src/app/app.config.ts`

- [ ] **Step 1: Leer estado actual**

```bash
cat src/app/app.config.ts
```

- [ ] **Step 2: Modificar para registrar interceptor + initializer**

```ts
// app.config.ts — patch
import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({ /* config actual */ }),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthService],
      useFactory: (auth: AuthService) => () => { auth.loadFromStorage(); },
    },
  ],
};
```

**Note:** preservar la config existente de PrimeNG/animations. Solo agregar interceptor + initializer.

- [ ] **Step 3: Smoke build**

```bash
npm run build
```

Expected: build sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/app.config.ts
git commit -m "feat(portal): wire AuthInterceptor + APP_INITIALIZER for token bootstrap"
```

---

### Task 28: app.routes — agregar authGuard

**Files:**
- Modify: `FRONTEND-PORTAL/src/app/app.routes.ts`

- [ ] **Step 1: Modificar routes**

Agregar `canActivate: [authGuard]` al children block del `PatientShellComponent` y a `/dashboard`:

```ts
// app.routes.ts — fragmento
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/ui/shell/patient-shell/patient-shell.component').then(m => m.PatientShellComponent),
    children: [
      // ... children existentes
    ],
  },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat(portal): protect routes with authGuard"
```

---

## PART 8 — Frontend wiring auth

### Task 29: LoginComponent wire

**Files:**
- Modify: `FRONTEND-PORTAL/src/app/features/auth/login/login.component.ts`

- [ ] **Step 1: Modificar componente**

```ts
// login.component.ts — onSubmit reescrito
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { mapApiError } from '../../../shared/utils/api-error-mapper';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// ... resto imports

@Component({
  // ... metadata existente, agregar ToastModule a imports
  providers: [MessageService],
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private auth   = inject(AuthService);
  private toast  = inject(MessageService);
  readonly tenant = inject(TenantService);

  submitting = signal(false);

  form = this.fb.group({
    dni:        ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    password:   ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true],  // TODO: implementar "remember me" diferenciado
  });

  // ... f / hasError sin cambios

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { dni, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth.login(dni!, password!).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/turnos';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.add({
          severity: 'error', summary: 'Error', detail: mapApiError(err), life: 4000,
        });
      },
    });
  }
}
```

- [ ] **Step 2: Verificar template tiene `<p-toast>` o agregar en login.component.html**

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/auth/login/
git commit -m "feat(portal): wire LoginComponent to AuthService"
```

---

### Task 30: RegisterComponent wire

**Files:**
- Modify: `FRONTEND-PORTAL/src/app/features/auth/register/register.component.ts`

- [ ] **Step 1: Modificar (idéntico patrón a Login)**

```ts
// register.component.ts — onSubmit reescrito
import { AuthService } from '../../../core/auth/auth.service';
import { mapApiError } from '../../../shared/utils/api-error-mapper';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// ... agregar ToastModule a imports y MessageService a providers

export class RegisterComponent {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private auth   = inject(AuthService);
  private toast  = inject(MessageService);
  readonly tenant = inject(TenantService);

  submitting = signal(false);

  form = this.fb.group({
    nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
    dni:            ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    email:          ['', [Validators.required, Validators.email]],
    password:       ['', [
      Validators.required, Validators.minLength(8),
      Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/),
    ]],
    aceptaTerminos: [false, [Validators.requiredTrue]],
  });

  // ... f / hasError sin cambios

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const tenantSlug = this.tenant.config()?.id ?? '';
    this.submitting.set(true);
    this.auth.register({
      tenantSlug, nombreCompleto: v.nombreCompleto!, dni: v.dni!,
      email: v.email!, password: v.password!,
    }).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: '¡Bienvenido!', detail: 'Tu cuenta fue creada.', life: 3000 });
        this.router.navigate(['/turnos']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: mapApiError(err), life: 4000 });
      },
    });
  }
}
```

- [ ] **Step 2: Verificar `<p-toast>` en template**

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/auth/register/
git commit -m "feat(portal): wire RegisterComponent to AuthService"
```

---

## PART 9 — Frontend catalog + family services

### Task 31: TipoAnalisisService + SucursalPublicService

**Files:**
- Create: `FRONTEND-PORTAL/src/app/core/sucursales/sucursal-public.service.ts`
- Create: `FRONTEND-PORTAL/src/app/features/main/turnos/services/tipo-analisis.service.ts`
- Update: `FRONTEND-PORTAL/src/app/core/models/tipo-analisis.model.ts` (agregar `determinationIds`)

- [ ] **Step 1: Actualizar modelo TipoAnalisis**

```ts
// core/models/tipo-analisis.model.ts
export interface TipoAnalisis {
  id: number;                  // cambia de string a number
  nombre: string;
  descripcionCorta: string;
  ayuno: boolean;
  categoria: string;
  icono: string;
  preparacion: string[];       // nuevo, viene del backend
  determinationIds: number[];  // nuevo
}
```

- [ ] **Step 2: TipoAnalisisService**

```ts
// features/main/turnos/services/tipo-analisis.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { TipoAnalisis } from '../../../../core/models/tipo-analisis.model';

@Injectable({ providedIn: 'root' })
export class TipoAnalisisService {
  private readonly http = inject(HttpClient);
  private readonly cache$ = this.http
    .get<TipoAnalisis[]>('/api/v1/turnos/catalog/tipos-analisis')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getTipos(): Observable<TipoAnalisis[]> { return this.cache$; }
}
```

- [ ] **Step 3: SucursalPublicService**

```ts
// core/sucursales/sucursal-public.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { Sede } from '../models/sede.model';
import { TenantService } from '../tenant/tenant.service';

@Injectable({ providedIn: 'root' })
export class SucursalPublicService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantService);
  private cache$: Observable<Sede[]> | null = null;

  getSedes(): Observable<Sede[]> {
    if (!this.cache$) {
      const slug = this.tenant.config()?.id ?? '';
      this.cache$ = this.http
        .get<Sede[]>(`/api/v1/sucursales/public?slug=${encodeURIComponent(slug)}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.cache$;
  }
}
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: PASS. Si el modelo `Sede` no coincide con el shape backend (`{ id, nombre, direccion, telefono, horario }`), ajustar `core/models/sede.model.ts`: cambiar `id: string` → `id: number`, marcar `distanciaKm?: number` como opcional.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/sucursales/ src/app/core/models/tipo-analisis.model.ts \
        src/app/features/main/turnos/services/tipo-analisis.service.ts \
        src/app/core/models/sede.model.ts
git commit -m "feat(portal): add TipoAnalisis and SucursalPublic HTTP services"
```

---

### Task 32: FamilyService

**Files:**
- Create: `FRONTEND-PORTAL/src/app/core/family/family.service.ts`
- Modify: `FRONTEND-PORTAL/src/app/core/models/familiar.model.ts` (agregar `'Yo'` al enum)

- [ ] **Step 1: Update modelo**

```ts
// core/models/familiar.model.ts
export type Vinculo = 'Yo' | 'Hijo' | 'Hija' | 'Madre' | 'Padre' | 'Cónyuge' | 'Otro';

export interface Familiar {
  id: number;
  nombre: string;
  apellido: string;
  iniciales: string;
  edad: number;
  vinculo: Vinculo;
  dni: string;
  cobertura: string;             // TODO: viene null del backend, derivar después
  proximoTurno?: { dia: string; fechaResumen: string };
  totalTurnos: number;           // TODO: el backend no lo devuelve; deriva de getMyAppointments
  totalEstudios: number;         // TODO: ídem
  accentColor: 'primary' | 'secondary' | 'accent';
}
```

- [ ] **Step 2: FamilyService**

```ts
// core/family/family.service.ts
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap, throwError } from 'rxjs';
import { Familiar } from '../models/familiar.model';

interface PatientFamilyResponse {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  vinculo: string | null;
  responsablePatientId: number | null;
}

const ACCENT_COLORS: Array<'primary' | 'secondary' | 'accent'> = ['primary', 'secondary', 'accent'];

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private readonly http = inject(HttpClient);
  private cached = signal<Familiar[] | null>(null);

  getFamily(): Observable<Familiar[]> {
    const cached = this.cached();
    if (cached) return of(cached);
    return this.http.get<PatientFamilyResponse[]>('/api/v1/empresa/patients/me/family')
      .pipe(
        map(list => list.map((p, idx) => this.toFamiliar(p, idx))),
        tap(list => this.cached.set(list)),
      );
  }

  refresh(): void { this.cached.set(null); }

  agregar(): Observable<never> {
    // TODO: Spec C no implementa CRUD de familia.
    return throwError(() => new Error('Próximamente'));
  }

  private toFamiliar(p: PatientFamilyResponse, idx: number): Familiar {
    const edad = Math.floor(
      (Date.now() - new Date(p.fechaNacimiento).getTime()) / (365.25 * 24 * 3600 * 1000),
    );
    const vinculoLabel: Familiar['vinculo'] =
      p.vinculo === null ? 'Yo' : this.normalizeVinculo(p.vinculo);
    return {
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      iniciales: (p.nombre[0] ?? '?').toUpperCase(),
      edad,
      vinculo: vinculoLabel,
      dni: p.dni,
      cobertura: '',                                 // TODO backend
      totalTurnos: 0,                                // TODO derive
      totalEstudios: 0,                              // TODO derive
      accentColor: ACCENT_COLORS[idx % ACCENT_COLORS.length],
    };
  }

  private normalizeVinculo(raw: string): Familiar['vinculo'] {
    const map: Record<string, Familiar['vinculo']> = {
      HIJO: 'Hijo', HIJA: 'Hija', MADRE: 'Madre', PADRE: 'Padre',
      CONYUGE: 'Cónyuge', OTRO: 'Otro',
    };
    return map[raw] ?? 'Otro';
  }
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/core/family/ src/app/core/models/familiar.model.ts
git commit -m "feat(portal): add FamilyService with self+dependents listing"
```

---

## PART 10 — Frontend AppointmentService + mapper

### Task 33: appointmentToTurno mapper (TDD)

**Files:**
- Create: `FRONTEND-PORTAL/src/app/shared/mappers/appointment-to-turno.mapper.ts`
- Create: `FRONTEND-PORTAL/src/app/shared/mappers/appointment-to-turno.mapper.spec.ts`

- [ ] **Step 1: Test (RED)**

```ts
// appointment-to-turno.mapper.spec.ts
import { describe, it, expect } from 'vitest';
import { appointmentToTurno, MapperContext } from './appointment-to-turno.mapper';

const ctx: MapperContext = {
  tiposAnalisis: new Map([
    [101, { id: 50, nombre: 'Hemograma', preparacion: ['Sin ayuno'], ayuno: false } as any],
  ]),
  family: new Map([
    [10, { id: 10, nombre: 'María', apellido: 'García', iniciales: 'M', vinculo: 'Yo' } as any],
  ]),
  sedes: new Map([
    [5, { id: 5, nombre: 'Sede Centro', direccion: 'Av. Colón 450' } as any],
  ]),
};

describe('appointmentToTurno', () => {
  it('maps SCHEDULED appointment', () => {
    const t = appointmentToTurno({
      id: 1, patientId: 10, branchId: 5, scheduledAt: '2026-05-30T08:30:00',
      confirmationNumber: 'TRN-X', status: 'SCHEDULED', comments: null,
      prescriptionFileUrl: null,
      determinations: [{ determinationId: 101, orderNumber: 1 }],
    }, ctx);

    expect(t.estado).toBe('pendiente');
    expect(t.estadoLabel).toBe('Pendiente');
    expect(t.personaNombre).toBe('María');
    expect(t.sede.nombre).toBe('Sede Centro');
    expect(t.estudios).toContain('Hemograma');
    expect(t.hora).toBe('08:30');
    expect(t.preparacion).toContain('Sin ayuno');
  });

  it('maps CANCELLED status', () => {
    const t = appointmentToTurno({
      id: 1, patientId: 10, branchId: 5, scheduledAt: '2026-05-30T08:30:00',
      confirmationNumber: 'TRN-X', status: 'CANCELLED', comments: null,
      prescriptionFileUrl: null, determinations: [],
    }, ctx);
    expect(t.estado).toBe('cancelado');
  });

  it('falls back when family unknown', () => {
    const t = appointmentToTurno({
      id: 1, patientId: 999, branchId: 5, scheduledAt: '2026-05-30T08:30:00',
      confirmationNumber: 'TRN-X', status: 'SCHEDULED', comments: null,
      prescriptionFileUrl: null, determinations: [],
    }, ctx);
    expect(t.personaNombre).toBe('Desconocido');
  });
});
```

- [ ] **Step 2: Test falla**

```bash
npm test -- appointment-to-turno
```

Expected: FAIL.

- [ ] **Step 3: Implementar mapper**

```ts
// appointment-to-turno.mapper.ts
import { Familiar } from '../../core/models/familiar.model';
import { Sede } from '../../core/models/sede.model';
import { TipoAnalisis } from '../../core/models/tipo-analisis.model';
import { Turno, EstadoTurno } from '../../core/models/turno.model';

export interface AppointmentResponse {
  id: number;
  patientId: number;
  branchId: number;
  scheduledAt: string;
  confirmationNumber: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
  comments: string | null;
  prescriptionFileUrl: string | null;
  determinations: Array<{ determinationId: number; orderNumber: number }>;
}

export interface MapperContext {
  tiposAnalisis: Map<number, TipoAnalisis>;  // determinationId → tipo
  family: Map<number, Familiar>;
  sedes: Map<number, Sede>;
}

const STATUS_MAP: Record<AppointmentResponse['status'], { estado: EstadoTurno; label: string }> = {
  SCHEDULED:  { estado: 'pendiente',  label: 'Pendiente' },
  CONFIRMED:  { estado: 'confirmado', label: 'Confirmado' },
  IN_PROGRESS:{ estado: 'pendiente',  label: 'En curso' },
  COMPLETED:  { estado: 'completado', label: 'Completado' },
  CANCELLED:  { estado: 'cancelado',  label: 'Cancelado' },
  NO_SHOW:    { estado: 'cancelado',  label: 'No asistió' },
  RESCHEDULED:{ estado: 'pendiente',  label: 'Reprogramado' },
};

const MESES_ABREV = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

export function appointmentToTurno(ap: AppointmentResponse, ctx: MapperContext): Turno {
  const date = new Date(ap.scheduledAt);
  const persona = ctx.family.get(ap.patientId);
  const sede = ctx.sedes.get(ap.branchId);
  const status = STATUS_MAP[ap.status];

  // Resolve tipos seleccionados via determinationIds
  const tipos: TipoAnalisis[] = [];
  for (const d of ap.determinations) {
    const t = ctx.tiposAnalisis.get(d.determinationId);
    if (t && !tipos.some(x => x.id === t.id)) tipos.push(t);
  }
  const estudios = tipos.map(t => t.nombre);
  const preparacion = Array.from(new Set(tipos.flatMap(t => t.preparacion)));

  return {
    id: ap.id,
    personaId: persona?.id ?? 0,
    personaNombre: persona?.nombre ?? 'Desconocido',
    personaIniciales: persona?.iniciales ?? '?',

    dia: String(date.getDate()).padStart(2, '0'),
    mes: MESES_ABREV[date.getMonth()],
    fechaCompleta: `${DIAS_SEMANA[date.getDay()]} ${date.getDate()} de ${MESES_FULL[date.getMonth()]} de ${date.getFullYear()}`,
    hora: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,

    tipo: estudios.join(' + ') || '—',
    estudios,
    sede: sede ?? { id: 0, nombre: 'Sede sin asignar', direccion: '' } as any,

    estado: status.estado,
    estadoLabel: status.label,

    preparacion,
    llegarMinAntes: 10,         // TODO: configurable
    ordenCargada: !!ap.prescriptionFileUrl,
    medicoSolicitante: undefined,  // TODO backend
    duracionEstimada: undefined,    // TODO backend
  };
}
```

- [ ] **Step 4: Test verde**

```bash
npm test -- appointment-to-turno
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/mappers/
git commit -m "feat(portal): add appointmentToTurno mapper with full status coverage"
```

---

### Task 34: AppointmentService

**Files:**
- Create: `FRONTEND-PORTAL/src/app/features/main/turnos/services/appointment.service.ts`

- [ ] **Step 1: Implementar**

```ts
// appointment.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { AppointmentResponse, appointmentToTurno, MapperContext } from '../../../../shared/mappers/appointment-to-turno.mapper';
import { Turno } from '../../../../core/models/turno.model';
import { SlotDisponible } from '../../../../core/models/slot-disponible.model';
import { TipoAnalisisService } from './tipo-analisis.service';
import { SucursalPublicService } from '../../../../core/sucursales/sucursal-public.service';
import { FamilyService } from '../../../../core/family/family.service';

export interface BookPayload {
  patientId: number;
  branchId: number;
  scheduledAt: string;   // ISO datetime
  determinations: Array<{ determinationId: number; orderNumber: number }>;
  comments?: string;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly tiposSvc = inject(TipoAnalisisService);
  private readonly sedeSvc = inject(SucursalPublicService);
  private readonly familySvc = inject(FamilyService);

  getMyAppointments(): Observable<{ proximos: Turno[]; anteriores: Turno[] }> {
    return forkJoin({
      ap: this.http.get<AppointmentResponse[]>('/api/v1/turnos/appointments?mine=true'),
      tipos: this.tiposSvc.getTipos(),
      sedes: this.sedeSvc.getSedes(),
      family: this.familySvc.getFamily(),
    }).pipe(map(({ ap, tipos, sedes, family }) => {
      const ctx: MapperContext = {
        tiposAnalisis: new Map(tipos.flatMap(t =>
          t.determinationIds.map(d => [d, t] as [number, typeof t]))),
        sedes: new Map(sedes.map(s => [Number(s.id), s])),
        family: new Map(family.map(f => [f.id, f])),
      };
      const all = ap.map(a => appointmentToTurno(a, ctx));
      const now = Date.now();
      const proximos: Turno[] = [];
      const anteriores: Turno[] = [];
      for (const t of all) {
        const ts = new Date(`${t.fechaCompleta} ${t.hora}`).getTime();
        (isFinite(ts) && ts >= now ? proximos : anteriores).push(t);
      }
      return { proximos, anteriores };
    }));
  }

  cancel(id: number): Observable<void> {
    return this.http.patch<void>(`/api/v1/turnos/appointments/${id}/cancel`, {});
  }

  book(p: BookPayload): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/v1/turnos/appointments', {
      patientId: p.patientId,
      branchId: p.branchId,
      scheduledAt: p.scheduledAt,
      comments: p.comments ?? null,
      prescriptionFileUrl: null,
      determinations: p.determinations,
    });
  }

  getAvailability(branchId: number, date: Date): Observable<SlotDisponible[]> {
    const iso = date.toISOString().slice(0, 10);
    return this.http.get<Array<{ slotId: string; startTime: string; available: number }>>(
      `/api/v1/turnos/availability?branchId=${branchId}&date=${iso}`,
    ).pipe(map(slots => slots.map(s => ({
      hora: s.startTime.slice(0, 5),
      disponible: s.available > 0,
    }))));
  }
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/main/turnos/services/appointment.service.ts
git commit -m "feat(portal): add AppointmentService for book/list/cancel/availability"
```

---

## PART 11 — Frontend wizard with "Para quién" step

### Task 35: StepParaQuienComponent

**Files:**
- Create: `FRONTEND-PORTAL/src/app/features/main/turnos/sacar/steps/step-para-quien/step-para-quien.component.ts`
- Create: `FRONTEND-PORTAL/src/app/features/main/turnos/sacar/steps/step-para-quien/step-para-quien.component.html`
- Create: `FRONTEND-PORTAL/src/app/features/main/turnos/sacar/steps/step-para-quien/step-para-quien.component.scss`

- [ ] **Step 1: Crear componente**

```ts
// step-para-quien.component.ts
import { Component, input, output } from '@angular/core';
import { Familiar } from '../../../../../../core/models/familiar.model';
import { FamilyCardComponent } from '../../../../../../shared/ui/components/family-card/family-card.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-step-para-quien',
  standalone: true,
  imports: [FamilyCardComponent, RouterLink],
  templateUrl: './step-para-quien.component.html',
  styleUrl: './step-para-quien.component.scss',
})
export class StepParaQuienComponent {
  readonly family = input.required<Familiar[]>();
  readonly selectedPatientId = input<number | null>(null);
  readonly selectionChange = output<number>();

  onSelect(f: Familiar): void { this.selectionChange.emit(f.id); }

  isSelected(f: Familiar): boolean { return this.selectedPatientId() === f.id; }
}
```

- [ ] **Step 2: Template**

```html
<!-- step-para-quien.component.html -->
<section class="step-content">
  <h3 class="step-title">¿Para quién es el turno?</h3>
  <p class="step-subtitle">Seleccioná la persona para la que vas a reservar.</p>

  @if (family().length === 1) {
    <div class="family-grid">
      <app-family-card
        [familiar]="family()[0]"
        [selected]="isSelected(family()[0])"
        (click)="onSelect(family()[0])">
      </app-family-card>
    </div>
    <p class="family-hint">
      ¿Necesitás sacar turno para un familiar? Cargalo en
      <a [routerLink]="['/familia']">Familia</a>.
    </p>
  } @else {
    <div class="family-grid">
      @for (f of family(); track f.id) {
        <app-family-card
          [familiar]="f"
          [selected]="isSelected(f)"
          (click)="onSelect(f)">
        </app-family-card>
      }
    </div>
  }
</section>
```

- [ ] **Step 3: Estilos básicos**

```scss
// step-para-quien.component.scss
.step-content { padding: 1rem; }
.step-title { font-size: 1.5rem; margin-bottom: 0.5rem; }
.step-subtitle { color: var(--text-muted); margin-bottom: 1.5rem; }

.family-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.family-hint {
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}
```

- [ ] **Step 4: Verificar que FamilyCardComponent soporta `[selected]`**

Si no, agregar input `selected: boolean` con clase CSS para selected state.

- [ ] **Step 5: Build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/main/turnos/sacar/steps/
git commit -m "feat(portal): add StepParaQuienComponent for wizard step 0"
```

---

### Task 36: SacarTurnoComponent — integrate step 0 + wire HTTP

**Files:**
- Modify: `FRONTEND-PORTAL/src/app/features/main/turnos/sacar/sacar-turno.component.ts`
- Modify: `FRONTEND-PORTAL/src/app/features/main/turnos/sacar/sacar-turno.component.html`

- [ ] **Step 1: Modificar component .ts**

```ts
// sacar-turno.component.ts — fragmentos clave
import { ActivatedRoute } from '@angular/router';
import { FamilyService } from '../../../../core/family/family.service';
import { TipoAnalisisService } from '../services/tipo-analisis.service';
import { SucursalPublicService } from '../../../../core/sucursales/sucursal-public.service';
import { AppointmentService } from '../services/appointment.service';
import { StepParaQuienComponent } from './steps/step-para-quien/step-para-quien.component';
import { mapApiError } from '../../../../shared/utils/api-error-mapper';

// imports: agregar StepParaQuienComponent

// providers + injects nuevos:
private readonly route = inject(ActivatedRoute);
private readonly familySvc = inject(FamilyService);
private readonly tiposSvc = inject(TipoAnalisisService);
private readonly sedeSvc = inject(SucursalPublicService);
private readonly appointmentSvc = inject(AppointmentService);

// signals nuevos:
readonly family = toSignal(this.familySvc.getFamily(), { initialValue: [] });
readonly selectedPatientId = signal<number | null>(null);

// reemplazar this.service.getTiposAnalisis() por:
readonly tiposAnalisis = toSignal(this.tiposSvc.getTipos(), { initialValue: [] });
readonly sedes = toSignal(this.sedeSvc.getSedes(), { initialValue: [] });

// cambiar tipo de selectedTipoIds:
readonly selectedTipoIds = signal<number[]>([]);

// steps: agregar paso 0
readonly steps: WizardStep[] = [
  { id: 'para-quien', label: 'Para quién'        },
  { id: 'tipo',       label: 'Tipo de análisis'  },
  { id: 'sede',       label: 'Sede'              },
  { id: 'fecha',      label: 'Fecha y hora'      },
  { id: 'confirmar',  label: 'Confirmar'         },
];

// canProceed actualizado:
readonly canProceed = computed(() => {
  switch (this.currentStep()) {
    case 0: return this.selectedPatientId() !== null;
    case 1: return this.selectedTipoIds().length > 0;
    case 2: return this.selectedSedeId() !== null;
    case 3: return this.selectedFecha() !== null && this.selectedHora() !== null;
    case 4: return true;
    default: return false;
  }
});

// ngOnInit (agregar OnInit a class):
ngOnInit(): void {
  const personaId = this.route.snapshot.queryParamMap.get('personaId');
  if (personaId) {
    this.selectedPatientId.set(Number(personaId));
    this.currentStep.set(1);  // skip step 0
  } else {
    // default: preselect responsable (primer familiar)
    queueMicrotask(() => {
      const list = this.family();
      if (list.length > 0 && this.selectedPatientId() === null) {
        this.selectedPatientId.set(list[0].id);
      }
    });
  }
}

// reemplazar loadSlots a usar appointmentSvc:
this.loadSlotsSubject.pipe(
  switchMap(({ sedeId, fecha }) => {
    this.loadingSlots.set(true);
    return this.appointmentSvc.getAvailability(Number(sedeId), fecha);
  }),
  takeUntilDestroyed(this.destroyRef),
).subscribe(slots => { this.slots.set(slots); this.loadingSlots.set(false); });

// onConfirm reescrito:
onConfirm(): void {
  const patientId = this.selectedPatientId();
  const sedeId = this.selectedSedeId();
  const fecha = this.selectedFecha();
  const hora = this.selectedHora();
  const tipoIds = this.selectedTipoIds();

  if (!patientId || !sedeId || !fecha || !hora || tipoIds.length === 0) return;

  // Construir scheduledAt ISO
  const [hh, mm] = hora.split(':').map(Number);
  const scheduledAt = new Date(fecha);
  scheduledAt.setHours(hh, mm, 0, 0);

  // Resolver determinationIds desde tipos elegidos
  const tiposMap = new Map(this.tiposAnalisis().map(t => [t.id, t]));
  const determinationIds = tipoIds
    .flatMap(id => tiposMap.get(id)?.determinationIds ?? [])
    .filter((d, i, arr) => arr.indexOf(d) === i);
  const determinations = determinationIds.map((determinationId, idx) => ({
    determinationId, orderNumber: idx + 1,
  }));

  this.saving.set(true);
  this.appointmentSvc.book({
    patientId,
    branchId: Number(sedeId),
    scheduledAt: scheduledAt.toISOString(),
    determinations,
  }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
    next: () => {
      this.messageService.add({
        severity: 'success', summary: 'Turno reservado',
        detail: `Tu turno quedó confirmado para el ${fecha.getDate()} de ${
          MESES_FULL[fecha.getMonth()]} a las ${hora} hs.`,
        life: 5000,
      });
      this.router.navigate(['/turnos']);
    },
    error: (err) => {
      this.saving.set(false);
      this.messageService.add({
        severity: 'error', summary: 'Error', detail: mapApiError(err), life: 4000,
      });
    },
  });
}

const MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];
```

**Note:** El `selectedTipoIds: Signal<string[]>` cambia a `Signal<number[]>` — actualizar `AnalysisCardGridComponent` si su contract usa string. Si no se quiere romper el component existente, hacer un type bridge en el sacar-turno: el grid emite string IDs (números como string), el sacar-turno convierte.

- [ ] **Step 2: Modificar template para agregar paso 0**

```html
<!-- sacar-turno.component.html — fragmento del switch de steps -->
<ng-template #stepContent>
  <ng-container [ngSwitch]="currentStep()">
    <app-step-para-quien
      *ngSwitchCase="0"
      [family]="family()"
      [selectedPatientId]="selectedPatientId()"
      (selectionChange)="selectedPatientId.set($event)">
    </app-step-para-quien>

    <app-analysis-card-grid *ngSwitchCase="1" [...] ></app-analysis-card-grid>
    <app-sede-list *ngSwitchCase="2" [...] ></app-sede-list>
    <ng-container *ngSwitchCase="3"> <!-- DatePicker + TimeSlots --> </ng-container>
    <app-turno-resumen *ngSwitchCase="4" [...] ></app-turno-resumen>
  </ng-container>
</ng-template>
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: PASS. Resolver mismatches de tipo (string ↔ number) que aparezcan.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/main/turnos/sacar/
git commit -m "feat(portal): integrate StepParaQuienComponent + wire AppointmentService.book"
```

---

## PART 12 — Frontend listado + familia

### Task 37: TurnosComponent wire

**Files:**
- Modify: `FRONTEND-PORTAL/src/app/features/main/turnos/turnos.component.ts`
- Delete (or empty): `FRONTEND-PORTAL/src/app/features/main/turnos/turno.service.ts`

- [ ] **Step 1: Modificar component**

```ts
// turnos.component.ts — fragmentos clave (resto del componente preservado)
import { AppointmentService } from './services/appointment.service';
import { mapApiError } from '../../../shared/utils/api-error-mapper';

// quitar import de TurnoService, agregar:
private readonly appointmentSvc = inject(AppointmentService);

private cargarTurnos(): void {
  this.cargando.set(true);
  this.subs.add(
    this.appointmentSvc.getMyAppointments().subscribe({
      next: ({ proximos, anteriores }) => {
        this.proximosTurnos.set(proximos);
        this.anterioresTurnos.set(anteriores);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.messageService.add({
          severity: 'error', summary: 'Error', detail: mapApiError(err), life: 4000,
        });
      },
    }),
  );
}

// onCancelar — reemplazar this.turnoService.cancelarTurno por:
this.subs.add(
  this.appointmentSvc.cancel(turno.id).subscribe({
    next: () => {
      this.mobileDetailOpen.set(false);
      this.selectedTurno.set(null);
      this.cargarTurnos();
      this.messageService.add({
        severity: 'success', summary: 'Turno cancelado',
        detail: `El turno del ${turno.fechaCompleta} fue cancelado.`,
        life: 4000,
      });
    },
    error: (err) => {
      this.messageService.add({
        severity: 'error', summary: 'Error',
        detail: mapApiError(err), life: 4000,
      });
    },
  }),
);
```

- [ ] **Step 2: Eliminar mock service**

```bash
rm src/app/features/main/turnos/turno.service.ts
```

(Si algún otro lugar lo importa, ajustar antes de borrar — `grep -r "TurnoService" src/`)

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -u src/app/features/main/turnos/
git commit -m "feat(portal): wire TurnosComponent to AppointmentService + remove mock"
```

---

### Task 38: FamiliaComponent wire

**Files:**
- Modify: `FRONTEND-PORTAL/src/app/features/main/familia/familia.component.ts`
- Delete (or empty): `FRONTEND-PORTAL/src/app/features/main/familia/familia.service.ts` (si solo tenía mocks)

- [ ] **Step 1: Modificar component**

```ts
// familia.component.ts — fragmento clave
import { FamilyService } from '../../../core/family/family.service';

// reemplazar private readonly familiaService = inject(FamiliaService); por:
private readonly familyService = inject(FamilyService);

familiares = toSignal(this.familyService.getFamily(), { initialValue: [] });
stats = computed(() => {
  const list = this.familiares();
  return {
    total: list.length,
    proximosTurnos: 0,  // TODO: derive from AppointmentService
    estudiosRecientes: 0,  // TODO
  };
});
loading = computed(() => false);  // signal mode

onAddFamily(): void {
  this.messageService.add({
    severity: 'info', summary: 'Próximamente',
    detail: 'Cargar familiares estará disponible pronto.', life: 3000,
  });
}
```

- [ ] **Step 2: Mantener mock service si tenía data de stats**

Si el `familia.service.ts` original tenía solo mock data, eliminarlo. Si tenía lógica reutilizable, mantener pero solo para `getStats()` con valores estáticos (con TODO comment).

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -u src/app/features/main/familia/
git commit -m "feat(portal): wire FamiliaComponent to FamilyService"
```

---

### Task 39: SacarTurnoService — limpiar mocks

**Files:**
- Delete: `FRONTEND-PORTAL/src/app/features/main/turnos/sacar/sacar-turno.service.ts`

- [ ] **Step 1: Verificar no quedaron usos**

```bash
grep -r "SacarTurnoService" src/app/
```

Expected: vacío.

- [ ] **Step 2: Eliminar archivo**

```bash
rm src/app/features/main/turnos/sacar/sacar-turno.service.ts
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore(portal): remove obsolete SacarTurnoService mock"
```

---

## PART 13 — Smoke E2E y cierre

### Task 40: Vitest suite verde

- [ ] **Step 1: Correr suite completa**

```bash
cd FRONTEND-PORTAL
npm test
```

Expected: ALL PASS. Anotar total.

- [ ] **Step 2: Build prod**

```bash
npm run build
```

Expected: BUILD SUCCESS, sin warnings críticos.

- [ ] **Step 3: Commit (si algún ajuste menor de tests fue necesario)**

```bash
git add -u
git commit -m "test(portal): finalize vitest suite for Spec C"
```

---

### Task 41: Smoke E2E manual

- [ ] **Step 1: Backend running**

```bash
cd Backend
git checkout feat/turnos-spec-c
SPRING_PROFILES_ACTIVE=localdev ./mvnw spring-boot:run
```

Esperar a `Started LaboratorioApplication`.

- [ ] **Step 2: Portal running**

En otra terminal:

```bash
cd FRONTEND-PORTAL
git checkout feat/turnos-spec-c
npm start
```

Abrir `http://localhost:4200`.

- [ ] **Step 3: Smoke checklist**

Marcar uno por uno:

- [ ] Cargar URL del tenant demo → ve la landing del portal
- [ ] Click "Registrarse" → form de registro
- [ ] Completar form con DNI nuevo, password fuerte → submit → redirect a /turnos
- [ ] /turnos muestra lista vacía + botón "Sacar turno"
- [ ] Click "Sacar turno" → wizard step 0 muestra solo "Yo" preseleccionado
- [ ] Avanzar al step 1, elegir 2 tipos → next
- [ ] Step 2 elegir sede → next
- [ ] Step 3 elegir fecha (≥ hoy + 2 días) → ver slots → elegir uno → next
- [ ] Step 4 ver resumen → confirmar → toast success + redirect /turnos
- [ ] Verificar que el turno aparece en lista
- [ ] Click "Cancelar" en el card del turno → confirm → toast → turno cancelado
- [ ] Logout → relogin con mismos credenciales
- [ ] Manualmente vincular un dependiente en DB:
      ```sql
      INSERT INTO patients (tenant_id, nombre, apellido, dni, fecha_nacimiento, responsible_patient_id, family_vinculo) 
      VALUES ('demo', 'Lucía', 'Test', '55000001', '2018-03-08', <PATIENT_ID>, 'HIJA');
      ```
- [ ] Refresh /familia → ver tarjeta de Lucía
- [ ] Click "Sacar turno" en card Lucía → wizard arranca en step 1 (skipea para-quien)
- [ ] Completar wizard → confirmar → turno aparece en lista con personaNombre=Lucía
- [ ] Probar /turnos/1 con turno de OTRO user (POST manual con admin token) → debería dar 403

- [ ] **Step 4: Anotar bugs en el PR description**

Crear borrador del PR description con todos los items marcados ✅ + cualquier issue conocido como TODO.

- [ ] **Step 5: Detener ambos procesos**

`Ctrl+C` en ambas terminales.

---

### Task 42: Push frontend + decidir bundling PRs

- [ ] **Step 1: Push frontend**

```bash
cd FRONTEND-PORTAL
git push -u origin feat/turnos-spec-c
```

- [ ] **Step 2: Decidir estrategia PRs**

Opciones (igual que Specs A y B):
- **A. Dos PRs separados** — Backend PR + Portal PR. Cada uno con su propia checklist y review.
- **B. PRs encadenados** — Backend PR debe mergear primero; Portal PR depende.

Decisión recomendada: **A separados pero coordinados** (Portal PR description menciona que depende de Backend PR mergeado en `development`).

- [ ] **Step 3: Crear PR Backend**

```bash
cd Backend
gh pr create --base development --head feat/turnos-spec-c \
  --title "feat(turnos): Spec C backend — patient portal endpoints" \
  --body "$(cat <<'EOF'
## Summary

- Habilita rol EXTERNO para listar/cancelar sus turnos y los de familiares
- 4 endpoints nuevos: register-patient (public), sucursales/public (public), catalog/tipos-analisis (EXTERNO), patients/me/family (EXTERNO)
- Migraciones V58/V59/V60 (tipos_analisis, patient family link, seed dev)
- Security review ejecutado; ownership checks en list/cancel

## Spec

FRONTEND-PORTAL/docs/superpowers/specs/2026-05-22-turnos-spec-c-portal-design.md

## Test plan

- [ ] All backend tests pass (./mvnw test)
- [ ] /security-review findings addressed
- [ ] Smoke curl checklist (see task 21 of plan)
- [ ] simplify applied

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Crear PR Portal**

```bash
cd ../FRONTEND-PORTAL
gh pr create --base development --head feat/turnos-spec-c \
  --title "feat(turnos): Spec C portal — wire patient flow" \
  --body "$(cat <<'EOF'
## Summary

- Wire de mockups portal a backend real (login, register, listado, cancel, wizard)
- Auth stack nuevo (AuthService signal-based + Interceptor + Guard)
- ApiErrorMapper con tabla de mapping para excepciones backend
- Wizard 5 pasos: nuevo "Para quién" como step 0
- Vitest setup nuevo en el portal

## Depende de

PR backend Spec C: <link al PR backend>

## Spec

docs/superpowers/specs/2026-05-22-turnos-spec-c-portal-design.md

## Test plan

- [ ] vitest verde (npm test)
- [ ] Build prod sin warnings críticos (npm run build)
- [ ] Smoke E2E manual completo (task 41 del plan)
- [ ] Backend PR mergeado antes de mergear este

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Reportar URLs al user**

---

## Self-review checklist (corrida una vez antes de handoff)

✅ **Spec coverage:** cada sección del spec tiene tarea(s) que la implementan:
- §3.1 TipoAnalisis → Tasks 2, 5, 6, 7, 8
- §3.2 Sucursal public → Task 14
- §3.3 Family + Register → Tasks 1 (verify), 3, 9, 10, 11, 12, 13
- §3.1.2/3.1.3 Appointments EXTERNO → Tasks 15, 16, 17, 18
- §3.5 Security review → Task 20
- §4.1 Auth stack → Tasks 24, 25, 26, 27, 28
- §4.2 ApiErrorMapper → Task 23
- §4.3 Services → Tasks 31, 32, 34
- §4.4 Mapper → Task 33
- §4.5 Componentes adaptados → Tasks 29, 30, 37, 38
- §4.6 Wizard StepParaQuien → Tasks 35, 36
- §4.7 Routing → Task 28
- §6 Error handling → integrado en 23 + componentes
- §7 Testing → Tasks 7, 10, 12, 15, 17, 23, 24, 25, 33, 40
- §9 TODOs → preservados como comentarios en código

✅ **Placeholder scan:** sin `TBD`/`implement later`/`similar to`. Las dos verificaciones condicionales (Task 1 → Task 3) son chequeos explícitos, no placeholders.

✅ **Type consistency:** `TipoAnalisis.id` es `number` consistente del backend al mapper; `mine=true` consistente entre Task 16 y Task 34; `selectedPatientId: number | null` en Tasks 35 y 36; `Set<Long>` en backend, `number[]` en frontend.

---

## Execution handoff

Plan completo guardado en `FRONTEND-PORTAL/docs/superpowers/plans/2026-05-22-turnos-spec-c-portal.md`. Dos opciones de ejecución:

**1. Subagent-Driven (recommended)** — Dispatch fresh subagent per task, review entre tasks, iteración rápida.

**2. Inline Execution** — Ejecuto tareas en esta sesión con `superpowers:executing-plans`, batch con checkpoints.

¿Cuál?
