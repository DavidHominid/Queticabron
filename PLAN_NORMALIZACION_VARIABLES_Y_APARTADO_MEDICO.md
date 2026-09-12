# Plan — Normalización de Variables y Rediseño del Apartado Médico
## Words of Hope (Módulo 1)

> Objetivos:
> 1. **Auditar** qué variables/campos existen en BD vs qué ve el usuario en el frontend (especialmente Médico y Expediente).
> 2. **Normalizar** naming, tipos, valores por defecto y eliminar inconsistencias.
> 3. **Rediseñar** la pantalla de `Medico.tsx` para que el doctor vea y **edite** la información general del paciente (modelo Importar Expediente Sección 1) y capture la valoración de la cita (Sección 2).

---

## 1. Auditoría Actual: Datos que Existen vs Datos que se Muestran

### 1.1 Entidad `Paciente`

| Campo (BD: `paciente`) | Tipo | Se Guarda | Se Muestra (Medico) | Se Muestra (Expediente) | Observación |
|-------------------------|------|-----------|---------------------|--------------------------|-------------|
| `id_paciente`           | BIGINT PK | ✅ | ❌ | ❌ | Se usa solo internamente como ID técnico; se expone como `id` string al FE. |
| `numero_expediente`     | TEXT | ✅ | ⚠️ solo en header de ExpedienteHeader | ✅ ExpedienteHeader | No se ve en la pantalla de Médico durante la consulta. |
| `nombre` / `apellido`   | TEXT | ✅ | ✅ (por usuario.nombre en la lista) | ✅ | OK. |
| `fecha_de_nacimiento`   | DATE | ✅ | ❌ (solo se calcula `edad`) | ⚠️ ExpedienteHeader (edad) | El médico no ve la fecha de nacimiento real durante la consulta, solo los años. |
| `sexo`                  | TEXT | ✅ | ❌ | ✅ ExpedienteHeader | No visible en la consulta actual de Médico. |
| `edad` (computado)      | INT | ⚠️ BD no tiene columna; se calcula en `calculateAge` utils.js | ⚠️ | ⚠️ | Calculado al vuelo OK, pero debe validarse zona horaria UTC. |
| `telefono`              | TEXT | ✅ | ❌ | ❌ | **GUARDADO pero NUNCA visible** en el flujo de consulta. |
| `ciudad`                | TEXT DEFAULT 'Puerto Peñasco' | ✅ | ❌ | ❌ | **GUARDADO pero NUNCA visible**. |
| `fecha_registro`        | DATE | ✅ | ❌ | ❌ | Guarda fecha de alta del paciente. No visible. |
| `origen_expediente`     | TEXT (`sistema`\|`captura_fisica`) | ✅ | ❌ | ❌ | Importante: indica si el expediente es histórico físico. No visible. |
| `fecha_captura_digital_paciente` | TIMESTAMPTZ | ✅ | ❌ | ❌ | Fecha en que se digitalizó. No visible. |
| `capturado_por_usuario_id` | BIGINT FK | ✅ | ❌ | ❌ | Quién lo digitalizó. No visible. |
| `observaciones_captura` | JSONB | ✅ | ❌ | ❌ | Notas del capturador. No visible. |
| `eliminado`             | BOOL | ✅ | ❌ | ❌ | Soft delete. OK, solo lo usa Admin. |

**Problemas detectados:**
1. **`telefono` y `ciudad`** guardados sin usarse clínicamente. Son obligatorios en el alta pero el médico los desconoce.
2. **`numero_expediente` y `edad`** son visibles en Expediente, pero cuando el médico abre la consulta no los ve de inmediato (tiene que cambiarse de pestaña).
3. **`fecha_de_nacimiento`, `sexo`** no visibles en el flujo de consulta.

---

### 1.2 Entidad `InformacionMedica` (Tabla BD: `antecedentes` tipo='infomed')

| Campo (JSONB dentro de `descripcion`) | Existe BD | Guardable (ImportarExp) | Visible Medico | Visible ExpedienteMedicalInfo | Observación |
|----------------------------------------|-----------|-------------------------|----------------|-------------------------------|-------------|
| `alergias: string[]`                   | ✅ | ✅ chips | ❌ | ✅ Badges | No visible en Medico.tsx durante consulta → el médico no sabe si es alérgico sin cambiar de tab. |
| `medicamentosActuales: string[]`       | ✅ | ✅ chips | ❌ | ❌ | Guarda pero ExpedienteMedicalInfo NO lo muestra (solo alergias, notas, psicosociales). |
| `antecedentes.enfermedadesCorazon`     | ✅ bool | ✅ checkbox | ❌ | ❌ | Guardado pero NUNCA se muestra en ningún lado. |
| `antecedentes.diabetes`                | ✅ bool | ✅ checkbox | ❌ | ❌ | Ídem. |
| `antecedentes.tuberculosis`            | ✅ bool | ✅ checkbox | ❌ | ❌ | Ídem. |
| `antecedentes.altaPresion`             | ✅ bool | ✅ checkbox | ❌ | ❌ | Ídem. |
| `antecedentes.rinones`                 | ✅ bool | ✅ checkbox | ❌ | ❌ | Ídem. |
| `antecedentes.asma`                    | ✅ bool | ✅ checkbox | ❌ | ❌ | Ídem. |
| `antecedentes.hemorragiaSevera`        | ✅ bool | ✅ checkbox | ❌ | ❌ | Ídem. |
| `antecedentes.embarazada`              | ✅ bool | ✅ checkbox | ❌ | ❌ | Ídem. Crítico en mujeres. |
| `antecedentes.lactando`                | ✅ bool | ✅ checkbox | ❌ | ❌ | Ídem. Crítico. |
| `antecedentes.patologicos` (TEXTO)     | ✅ string | ✅ textarea libre | ❌ | ❌ | Texto libre NO se muestra. **Información MUY relevante oculta.** |
| `antecedentes.familiares` (TEXTO)      | ✅ string | ✅ textarea libre | ❌ | ❌ | Texto libre NO se muestra. **Información MUY relevante oculta.** |
| `antecedentesPsicosociales`            | ✅ string | ✅ textarea libre | ❌ | ✅ ExpedienteMedicalInfo | OK en expediente, pero NO en Medico. |
| `notas`                                | ✅ string | ✅ textarea libre | ❌ | ✅ ExpedienteMedicalInfo | OK en expediente, pero NO en Medico. |

**📌 Información CRÍTICA OCULTA al Médico durante la consulta:**
- 9 antecedentes booleanos (diabetes, hipertensión, corazón, embarazo…). Estos son el **primer filtro** antes de recetar cualquier medicamento.
- Antecedentes Patológicos en texto libre (2 campos).
- Medicamentos Actuales.
- Alergias (aunque sí están en Expediente, no están en la consulta directa).

---

### 1.3 Entidad `Triaje` (Tabla: `triaje`)

| Campo BD | Tipo | Se Guarda (TriageNuevo.tsx) | Se Muestra Medico | Se Muestra ExpedienteVitalSigns | Observación |
|----------|------|-----------------------------|-------------------|---------------------------------|-------------|
| `temperatura` | NUMERIC | ✅ | ✅ (si hay triage) | ✅ | OK. |
| `presion_arterial` | TEXT | ✅ | ✅ | ✅ | OK. |
| `ritmo_cardiaco` | INT | ✅ | ✅ | ✅ | OK. |
| `frec_respiratoria` | INT | ✅ | ✅ | ✅ | OK. |
| `altura` | INT | ✅ | ✅ | ✅ | OK. |
| `peso` | NUMERIC | ✅ | ✅ | ✅ | OK. |
| `oxigenacion` / `saturacion_oxigeno` | NUMERIC | ✅ (SE DUPLICA — mira expediente-captura.js líneas 465 y 467) | ✅ | ✅ | **Campo duplicado en la BD.** El triaje new guarda lo mismo en ambas columnas. |
| `glucosa` / `azucar_en_sangre` | INT | ✅ (SE DUPLICA — líneas 466 y 468) | ✅ | ✅ | **Ídem. Duplicado.** |
| `razon_consulta` | TEXT | ✅ | ✅ (se muestra como motivo en Medico?) | ❌ | OK. |
| `observaciones` | TEXT | ✅ | ✅ | ❌ | OK. |
| `realizado_por` | TEXT | ✅ | ❌ | ❌ | Quién hizo el triaje. No visible en Medico. |
| `encargado_triaje` | TEXT | ✅ expediente-captura | ❌ | ❌ | OK, para import histórico. |

---

### 1.4 Entidad `NotaMedica` / `ConsultaMedica` (Tabla: `nota_medica`)

| Campo BD | Tipo | Se Guarda (Medico.tsx) | Se Muestra al Guardar (ResumenConsulta) | Observación |
|----------|------|------------------------|-----------------------------------------|-------------|
| `motivo_consulta` | TEXT | ✅ | ✅ | OK. |
| `padecimiento_actual` | TEXT | ✅ | ✅ | OK. |
| `exploracion_fisica` | TEXT | ✅ | ✅ | OK. |
| `diagnostico` | TEXT | ✅ | ✅ | OK. |
| `tratamiento` | TEXT | ✅ | ✅ | OK. |
| `plan_tratamiento` | TEXT | ⚠️ **NO existe en Medico** | ❌ | **Campo existe en BD y en expediente-captura, pero el Medico NO lo captura. Se llena con tratamiento + plan concatenado en import.** |
| `medicamentos` | JSONB ✅ array objetos `{nombre,dosis,frecuencia,duracion}` | ✅ | ✅ | OK. |
| `estudios_indicados` | JSONB ✅ array objetos `{tipo,indicaciones}` | ✅ | ✅ | OK. |
| `indicaciones` / `recomendaciones` | TEXT | ✅ como `recomendaciones` | ✅ | Mapeo OK. |
| `observaciones` | TEXT | ⚠️ **NO existe en Medico** | ❌ | Campo libre existe en BD. Médico no lo captura. |
| `proxima_cita` | TEXT | ✅ si agenda seguimiento | ✅ | OK. |
| `requiere_seguimiento` | BOOL | ✅ | ✅ | OK. |
| `estado_seguimiento` | TEXT | ❌ | ❌ | Para workflow futuro. OK. |
| `especialidad` | TEXT | ✅ por cita | ✅ | OK. |
| `id_doctor` / `medico_usuario_id` | TEXT | ✅ (user.id o nombre) | ✅ | OK. |

---

## 2. Plan de Normalización de Variables (BD y FE)

### 2.1 Naming Convention — Unificación

> **Problema**: El mismo concepto se escribe de 3 maneras distintas según el archivo.

| Concepto | BD actual (snake_case) | Frontend actual (mezcla) | ✅ NORMALIZADO FE (camelCase único) |
|----------|------------------------|--------------------------|------------------------------------|
| Saturación O₂ | `saturacion_oxigeno` y `oxigenacion` (2 cols) | `saturacionOxigeno` | Quedarse con `saturacionOxigeno`. Borrar la columna `oxigenacion` duplicada o dejarla como alias de respaldo. |
| Glucosa / Azúcar | `azucar_en_sangre` y `glucosa` (2 cols) | `azucarEnSangre` | Quedarse con `azucarEnSangre`. Borrar `glucosa`. |
| ID paciente | `id_paciente` | `id` | OK. Mantener `mapPaciente` (utils.js) se encarga. |
| ID cita | `id_cita` | `id` | OK. |
| Teléfono | `telefono` | `telefono` | OK. |
| Ciudad | `ciudad` | `ciudad` | OK. |
| Fecha nacimiento | `fecha_de_nacimiento` | `fechaNacimiento` | OK. |
| Expediente | `numero_expediente` | `numeroExpediente` | OK. |
| Antecedentes Patológicos (texto) | NO EXISTE campo columna; está DENTRO del JSONB `antecedentes` key `patologicos` | `infoMedica.antecedentes.patologicos` | **Nuevo campo sugerido en la interfaz tipo InformacionMedica** (ver punto 2.3). |
| Antecedentes Familiares (texto) | Ídem | `infoMedica.antecedentes.familiares` | Ídem. |
| Alergias | Dentro de JSONB tipo='infomed' key `alergias` | `infoMedica.alergias` | OK. |
| Medicamentos actuales | Dentro JSONB key `medicamentosActuales` | `infoMedica.medicamentosActuales` | OK. |
| Antecedentes Psicosociales | Dentro JSONB key `antecedentesPsicosociales` | `infoMedica.antecedentesPsicosociales` | OK. |
| Notas / Observaciones generales | Dentro JSONB key `notas` | `infoMedica.notas` | OK. |

### 2.2 Eliminación de Duplicados en BD (Limpieza Segura)

Archivo a tocar: [migrations.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/helpers/migrations.js)

```sql
-- Paso 1. Migrar datos de la columna duplicada a la canónica
UPDATE citas.triaje
SET saturacion_oxigeno = COALESCE(saturacion_oxigeno, oxigenacion)
WHERE oxigenacion IS NOT NULL AND saturacion_oxigeno IS NULL;

UPDATE citas.triaje
SET azucar_en_sangre = COALESCE(azucar_en_sangre, glucosa)
WHERE glucosa IS NOT NULL AND azucar_en_sangre IS NULL;

-- Paso 2. Marcar como deprecadas (en lugar de borrar para evitar romper backups históricos)
-- Opcional: borrar realmente si hay certeza.
-- ALTER TABLE citas.triaje DROP COLUMN IF EXISTS oxigenacion;
-- ALTER TABLE citas.triaje DROP COLUMN IF EXISTS glucosa;
```

Y en el server: **`expediente-captura.js`** líneas 465–468 deben dejar de insertar en ambas. Quedarse solo con `saturacion_oxigeno` y `azucar_en_sangre`.

### 2.3 Expansión del Tipo `InformacionMedica` (FE)

Archivo a tocar: [types.ts](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/types.ts)

```typescript
// ====== ANTES (incompleto) ======
export interface AntecedentesGenerales {
  enfermedadesCorazon: boolean;
  diabetes: boolean;
  tuberculosis: boolean;
  altaPresion: boolean;
  rinones: boolean;
  asma: boolean;
  hemorragiaSevera: boolean;
  embarazada?: boolean;
  lactando?: boolean;
}

export interface InformacionMedica {
  pacienteId: string;
  alergias: string[];
  medicamentosActuales: string[];
  antecedentes: AntecedentesGenerales;
  antecedentesPsicosociales: string;
  notas: string;
}

// ====== DESPUÉS (normalizado, alineado a ImportarExpediente Sección 1) ======
export interface AntecedentesGenerales {
  // 9 booleanos clásicos (ya existían, se mantienen)
  enfermedadesCorazon: boolean;
  diabetes: boolean;
  tuberculosis: boolean;
  altaPresion: boolean;
  rinones: boolean;
  asma: boolean;
  hemorragiaSevera: boolean;
  embarazada?: boolean;
  lactando?: boolean;

  // NUEVOS campos texto que ya se guardaban en el JSONB pero no estaban en el tipo
  patologicos?: string;   // Texto libre: enfermedades crónicas, cirugías previas, etc.
  familiares?: string;    // Texto libre: padecimientos familiares.
}

export interface InformacionMedica {
  pacienteId: string;
  alergias: string[];
  medicamentosActuales: string[];
  antecedentes: AntecedentesGenerales;
  antecedentesPsicosociales: string;
  notas: string;
}
```

---

## 3. Rediseño de la Pantalla del Médico — `Medico.tsx`

### 3.1 Arquitectura Propuesta (Modelo Importar Expediente)

> **Regla**: Cuando el médico abre una cita (`iniciarConsulta`), ve en **una sola pantalla** (sin cambio de tabs) todo lo necesario:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [Citas en Espera · Botón Cerrar / Salir]   [Encabezado sticky: Paciente]  │
├────────────────────────────┬───────────────────────────────────────────────┤
│                            │                                               │
│  SECCIÓN 1 · IZQUIERDA     │   SECCIÓN 2 · DERECHA                         │
│  Información del Paciente  │   Valoración de la Cita (Captura Médica)      │
│  (Siempre Visible)         │                                               │
│  ┌──────────────────────┐  │  ┌─ Triage (SOLO LECTURA) ─────────────────┐ │
│  │ ✏️ Datos Generales   │  │  │  Signos vitales del día · Hora llegada  │ │
│  │   (Editables inline) │  │  │  Observaciones triaje · Realizado por  │ │
│  │   Nombre, edad,      │  │  └────────────────────────────────────────┘ │
│  │   fnacimiento, sexo, │  │                                               │
│  │   teléfono, ciudad   │  │  ┌─ Formulario Valoración Médica ─────────┐ │
│  │   [Botón: Editar]    │  │  │  * Motivo Consulta                     │ │
│  └──────────────────────┘  │  │  * Padecimiento Actual                │ │
│                            │  │  * Exploración Física                 │ │
│  ┌──────────────────────┐  │  │  * Diagnóstico                        │ │
│  │ ⚠️ Alergias (Rojo)   │  │  │  * Tratamiento + Plan (unido)        │ │
│  │ 💊 Medicamentos Act. │  │  │  * Medicamentos (chips con 4 campos) │ │
│  │ ✅ 9 Antecedentes    │  │  │  * Estudios Indicados                 │ │
│  │    Bool + Resumen    │  │  │  * Recomendaciones / Indicaciones    │ │
│  │ 📝 Patológicos (TXT) │  │  │  * Observaciones (NUEVO campo)       │ │
│  │ 👨‍👩‍👧 Familiares (TXT)│  │  └────────────────────────────────────────┘ │
│  │ 🧠 Psicosociales     │  │                                               │
│  │ 📄 Notas Generales   │  │  ┌─ Seguimiento ──────────────────────────┐ │
│  │                      │  │  │  Requiere seguimiento? ◻︎ / ☑︎          │ │
│  │  [TODOS EDITABLES]   │  │  │  Recomendar en X días · Evento · Hora  │ │
│  │  [Botón Guardar Info]│  │  │  [Agendar y Cerrar] [Solo Guardar]     │ │
│  └──────────────────────┘  │  └────────────────────────────────────────┘ │
│                            │                                               │
└────────────────────────────┴───────────────────────────────────────────────┘
```

### 3.2 Mapeo de Sección 1 (Izquierda) = ImportarExpediente Sección 1

| Componente UI | Campo | Modo | Acción al editar |
|---------------|-------|------|------------------|
| **Encabezado paciente** | `numeroExpediente · edad · sexo · fechaNacimiento (YYYY-MM-DD) · teléfono · ciudad · origenExpediente (badge CAPTURADA si es captura_física)` | Solo lectura en header | N/A |
| **Card: Datos Generales** | `nombre, apellido, fechaNacimiento, sexo, telefono, ciudad` | **Editable** (Click en "Editar Datos" → entra en modo formulario con Inputs como ImportarExp Sección 1) | PATCH `/api/pacientes/:id` usando el endpoint `PUT /:id` que ya existe en [pacientes.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/pacientes.js) |
| **Card: Alergias** | `infoMedica.alergias` | **Editable** — chips + input para añadir/quitar (copiar UI de ImportarExp) | PUT `/api/informacion-medica/:pacienteId` → ya existe |
| **Card: Medicamentos Actuales** | `infoMedica.medicamentosActuales` | **Editable** — chips + input | PUT `/api/informacion-medica` (ídem) |
| **Card: Antecedentes Patológicos y Familiares** | 9 booleanos + 2 textarea (`patologicos` + `familiares`) | **Editable** — checkboxes + textareas (igual que ImportarExp) | PUT `/api/informacion-medica` |
| **Card: Psicosociales y Notas Generales** | `antecedentesPsicosociales` + `notas` | **Editable** — textareas | PUT `/api/informacion-medica` |

> **IMPORTANTE**: Editar la Información Médica durante la consulta **no debe bloquear ni mezclar** el formulario de valoración de la cita. La Sección 1 tiene su propio botón independiente "💾 Guardar Información del Paciente" que guarda asincrónicamente en el fondo, sin tocar el estado de la nota médica.

---

### 3.3 Mapeo de Sección 2 (Derecha) = ImportarExpediente Sección 2 (1 cita actual)

| Sub-sección | Campos | Modo | Endpoint |
|-------------|--------|------|----------|
| **Triage (solo lectura, NO editable por el médico)** | Temperatura, Presión, Ritmo Cardiaco, Frec Resp, Altura, Peso, Saturación O₂, Azúcar, `razon_consulta` como Motivo Sugerido, `observaciones` triaje, `realizado_por`, fecha-hora del triaje | Read-only (estético, badge "✅ Capturado por X a las HH:MM") | N/A |
| **Valoración Médica** | `motivoConsulta`, `padecimientoActual`, `exploracionFisica`, `diagnostico`, `tratamiento`, `planTratamiento (NUEVO — antes estaba oculto)` | Editable Textareas | POST `/api/consultas` |
| **Medicamentos** | Array de `{nombre, dosis, frecuencia, duracion}` | Editable dinámico | POST `/api/consultas` + guardar como JSONB en `nota_medica.medicamentos` |
| **Estudios Indicados** | Array de `{tipo, indicaciones}` | Editable dinámico | POST `/api/consultas` + JSONB en `nota_medica.estudios_indicados` |
| **Recomendaciones / Indicaciones** | `recomendaciones` | Textarea | POST `/api/consultas` |
| **Observaciones** (NUEVO campo que ya existía en BD pero no en Medico) | `observaciones` | Textarea opcional | POST `/api/consultas` |
| **Seguimiento** | `requiereSeguimiento`, `notaSeguimiento`, `reagendacionRecomendadaDias`, seleccionar evento futuro + horario | Editable | addCita + updateSeguimiento (ya existentes en DataContext) |

---

### 3.4 Permisos y Reglas de Edición en la Sección 1

```
Quién puede editar Datos Generales (paciente.*):
  ✅ Administrador
  ✅ Recepción (por consistencia — ya lo hace al dar de alta)
  ✅ Médico (el cambio que pides)
  ⚠️ Triage (DECISIÓN TÚ: normalmente no; pero si hay datos urgentes como teléfono de contacto, podrías permitirlo con auditoría)

Quién puede editar InformacionMedica (antecedentes infomed):
  ✅ Administrador
  ✅ Médico (el cambio que pides)
  ✅ Triage (puede añadir alergia detectada en la toma de signos)

Auditoría de cambios:
  - Cualquier PUT /pacientes/:id ya llama a recordAudit (pacientes.js línea 201)
  - PUT /informacion-medica NO lo hace. → AÑADIR recordAudit en [informacion-medica.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/informacion-medica.js) líneas 35 y 61.
```

---

## 4. Cambios Técnicos por Archivo

### 4.1 Backend (`/server`)

| Archivo | Cambio |
|---------|--------|
| [helpers/migrations.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/helpers/migrations.js) | 1. Unificar datos de `oxigenacion` → `saturacion_oxigeno` y `glucosa` → `azucar_en_sangre`.<br>2. Asegurar columna `observaciones` en `nota_medica` (ya existe, pero confirmar). |
| [routes/informacion-medica.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/informacion-medica.js) | **Añadir `recordAudit`** en POST y PUT para que quede rastro de qué médico editó la información del paciente. |
| [routes/expediente-captura.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/expediente-captura.js) | Limpiar líneas 465/467 y 466/468 (dejar de insertar las columnas duplicadas `oxigenacion` y `glucosa`). Mantener solo `saturacion_oxigeno` y `azucar_en_sangre`. |
| [helpers/utils.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/helpers/utils.js) | `mapPaciente` → confirmar que ya manda todos los campos que Medico necesita. Asegurarse de NO perder `telefono` y `ciudad` (los manda — línea 88-90 — OK). |
| [routes/consultas.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/consultas.js) | Aceptar 2 nuevos campos en el body que ya existen en BD pero que Medico no mandaba: `planTratamiento` y `observaciones`. Mappearlos a `plan_tratamiento` y `observaciones` de `nota_medica`. |

### 4.2 Frontend (`/src/app`)

| Archivo | Cambio |
|---------|--------|
| [types.ts](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/types.ts) | Expandir `AntecedentesGenerales` con `patologicos?: string` y `familiares?: string`.<br>Expandir `ConsultaMedica` con `planTratamiento?: string` y `observaciones?: string`.<br>Expandir `Paciente` (ya tiene ciudad y teléfono — confirmar que no estén opcionales innecesariamente). |
| `context/DataContext.tsx` | 1. Añadir acción `updatePaciente(pacienteId, payload)`. (Actualmente existe en `pacientes.js` PUT pero verifica si el FE lo usa; si no, agregar en el contexto).<br>2. Añadir `updateInformacionMedica(pacienteId, infoMedica)` que llame al PUT `/api/informacion-medica/:pacienteId`.<br>3. En `addConsultaMedica`, aceptar los 2 nuevos campos (`planTratamiento`, `observaciones`). |
| **NUEVO COMPONENTE** `components/medico/Seccion1PacienteEditable.tsx` | Contiene toda la Sección 1 (datos generales editables + info médica editable). Reutiliza los inputs/chips/checkboxes/textarea de [importarexpedientepage.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/pacientes/importarexpedientepage.tsx) (líneas 760–1022). Extraer a un componente reusable para no duplicar código. |
| **NUEVO COMPONENTE** `components/medico/Seccion2Valoracion.tsx` | Formulario de valoración médica. Reutiliza el form actual de `Medico.tsx` pero organiza mejor + agrega `planTratamiento` y `observaciones`. |
| **NUEVO COMPONENTE** `components/medico/TriageReadOnly.tsx` | Muestra signos vitales del día SOLO lectura (usa los mismos colores/badges que ExpedienteVitalSigns.tsx). |
| [pages/Medico.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/Medico.tsx) | **Rediseño estructural**:<br>1. `selectedCita` abre layout 2 columnas: izq = Sección1PacienteEditable, der = (TriageReadOnly + Sección2Valoracion).<br>2. Quitar el `Tabs` de `consulta`/`expediente`. La info del expediente está AHORA en la misma pantalla a la izquierda.<br>3. `iniciarConsulta` carga a `selectedCita.paciente`, `selectedCita.triage`, `selectedCita.infoMedica`.<br>4. Si el médico edita y guarda la info del paciente → toast + refrescar infoMedica localmente en el estado sin cerrar la valoración.<br>5. Al guardar la consulta: validar campos mínimos, guardar, actualizar cita a `completada`, abrir modal de resumen, limpiar form, volver a lista. |
| [components/expediente/ExpedienteMedicalInfo.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/expediente/ExpedienteMedicalInfo.tsx) | Añadir los campos que HOY están guardados y no se muestran (mantener consistencia visual con Medico):<br>✅ `medicamentosActuales` (chips outline)<br>✅ Resumen de Antecedentes: 9 booleanos en grid (icono check ✅ / ❌)<br>✅ `antecedentes.patologicos` (card texto)<br>✅ `antecedentes.familiares` (card texto)<br>Esto hace que el Expediente sea completo, igual que lo que ve el médico. |
| [utils/triageAccess.ts](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/utils/triageAccess.ts) | Sin cambios estructurales; asegurarse de que al unificar signos vitales no se rompan los cálculos de `pickEventoActivoParaTriageConCitas`. |

---

## 5. Fases de Implementación (Orden Sugerido)

### 🟩 Fase 0 — Tipos y Normalización (Sin romper nada visible)
1. [ ] Actualizar `types.ts` — `AntecedentesGenerales.patologicos` / `.familiares` / `ConsultaMedica.planTratamiento` / `.observaciones`
2. [ ] Migración limpieza: `triaje` — unificar `oxigenacion` → `saturacion_oxigeno` / `glucosa` → `azucar_en_sangre`
3. [ ] Limpiar `expediente-captura.js` (solo insertar columnas canónicas)
4. [ ] Añadir `recordAudit` en `routes/informacion-medica.js`
5. [ ] `npm run typecheck` → sin errores
6. [ ] Probar importar un expediente histórico para confirmar que los campos `patologicos` / `familiares` siguen guardándose

### 🟩 Fase 1 — DataContext y Endpoints listos para ser consumidos
1. [ ] Agregar `updatePaciente` a `DataContext` (si no existe ya) con llamada `PUT /api/pacientes/:id`
2. [ ] Agregar `updateInformacionMedica` a `DataContext` con llamada `PUT /api/informacion-medica/:pacienteId`
3. [ ] Modificar `addConsultaMedica` para aceptar `planTratamiento` y `observaciones`
4. [ ] Ajustar `routes/consultas.js` para mapear esos 2 campos a la BD
5. [ ] Probar endpoints con Thunder Client: editar paciente, editar info médica, guardar consulta con observaciones

### 🟩 Fase 2 — Extraer componentes reutilizables (bajo acoplamiento)
1. [ ] Extraer el bloque **Datos Generales** de `importarexpedientepage.tsx` (líneas 760–842) a `components/paciente/DatosGeneralesEditor.tsx`
2. [ ] Extraer **Info Médica General** (líneas 846–942) a `components/paciente/InfoMedicaEditor.tsx`
3. [ ] Extraer **Antecedentes Patológicos + Familiares** (líneas 944–1022) a `components/paciente/AntecedentesEditor.tsx`
4. [ ] Actualizar `importarexpedientepage.tsx` para usar los nuevos componentes (no debería cambiar su comportamiento)
5. [ ] Correr app: Importar Expediente debe verse y comportarse IGUAL que antes

### 🟩 Fase 3 — Rediseño del Expediente (SOLO LECTURA)
1. [ ] Expandir `ExpedienteMedicalInfo.tsx` para mostrar:
   - ✅ Medicamentos actuales (chips)
   - ✅ Grid con 9 antecedentes booleanos (icon check/cruz)
   - ✅ `antecedentes.patologicos` textarea visualizado como párrafo `whitespace-pre-wrap`
   - ✅ `antecedentes.familiares` igual
2. [ ] Verificar que Expediente de un paciente importado históricamente muestre TODO lo que se capturó

### 🟩 Fase 4 — Rediseño de Medico.tsx (la pieza central)
1. [ ] Crear `TriageReadOnly.tsx` (signos del día solo lectura)
2. [ ] Refactor `Medico.tsx`:
   - Layout 2 columnas cuando `selectedCita` no es null
   - Columna izquierda → `DatosGeneralesEditor` + `InfoMedicaEditor` + `AntecedentesEditor` conectados al paciente actual
   - Columna derecha → `TriageReadOnly` + formulario valoración actual (con campos `planTratamiento` y `observaciones` agregados)
   - Botón independiente "💾 Guardar Información del Paciente" (izquierda) + Botón principal "Guardar Consulta" (derecha)
   - Al editar info del paciente: toast "Información actualizada" sin cerrar nada; al guardar consulta: flujo actual resumen
3. [ ] Confirmar que alergias, medicamentos, antecedentes aparecen SIEMPRE visibles sin cambiar tabs.

### 🟩 Fase 5 — Pruebas E2E
1. [ ] **Escenario**: Recepción agenda → Check-in → Triage captura → Asignación médico → Médico abre consulta:
   - ✅ Ve datos generales, teléfono, ciudad
   - ✅ Ve fecha de nacimiento + sexo + edad
   - ✅ Ve alergias si existen
   - ✅ Ve medicamentos actuales
   - ✅ Ve antecedentes booleanos y texto
   - ✅ Ve signos vitales del triaje (solo lectura)
   - ✅ Médico agrega una alergia nueva (la guarda y se ve reflejada en expediente)
   - ✅ Médico corrige teléfono (se ve reflejado en Expediente)
   - ✅ Médico escribe observaciones y plan de tratamiento → guarda consulta
   - ✅ Expediente después contiene: datos editados + triaje + nota médica completa con observaciones y plan
2. [ ] `npm run typecheck`
3. [ ] `npm run build`

---

## 6. Matriz de Riesgos

| Riesgo | Prob | Impacto | Mitigación |
|--------|------|---------|------------|
| Médico edita datos del paciente mientras otro usuario también lo edita (race condition) | Baja | Medio | No hay "lock optimista" aún. Mitigación simple: antes de guardar `updateInformacionMedica`, hacer `SELECT ... FOR UPDATE` en el row de `antecedentes` en el servidor. |
| Los campos editables de info médica al guardar mezclan arrays (merge vs reemplazar) | Alta | Alto | **Actualmente `informacion-medica.js` reemplaza TODO el JSONB con lo que llega**. Esto ES CORRECTO en este flujo porque el médico siempre ve el estado actual y edita sobre él. Asegurarse de no hacer merge adicional. |
| `numeroExpediente` o `origenExpediente` se ven en el header y confunden al médico | Baja | Bajo | Poner badge sutil `EXP-XXXX` y `Origen: Sistema | Captura física` solo si la información es relevante clínicamente. |
| Layout 2-columnas no cabe en pantalla laptop chica (1366px) | Media | Medio | Breakpoint: <1280px → stackear verticalmente (col izq arriba, col der abajo). Scrollbar en la página general, no cada card por separado. |
| Triage editó una alergia Mientras Médico editaba otra → se sobreescribe | Baja | Medio | El último en guardar gana. Para cuando esto pase en la vida real, es improbable. Se puede añadir en auditoría qué campos editó cada quién. |

---

## 7. Criterios de Aceptación

✅ En la consulta médica, el doctor VE inmediatamente (sin cambiar de pestaña):
- [x] Nombre completo, edad, fecha nacimiento, sexo, teléfono, ciudad, núm. expediente
- [x] Alergias (chips rojos visibles a primera vista)
- [x] Medicamentos actuales
- [x] 9 antecedentes booleanos (diabetes, hipertensión, embarazo…)
- [x] Antecedentes patológicos y familiares en texto
- [x] Antecedentes psicosociales + notas generales
- [x] Signos vitales capturados hoy en triaje (solo lectura)

✅ El doctor PUEDE modificar y guardar (sin cerrar la valoración):
- [x] Datos generales (teléfono, ciudad, nombre)
- [x] Añadir / eliminar alergias y medicamentos
- [x] Marcar/desmarcar antecedentes booleanos
- [x] Editar textos de antecedentes / psicosociales / notas
- [x] Queda rastro en auditoría de quién cambió qué

✅ Nuevos campos capturados en la nota médica:
- [x] Plan de tratamiento (separado del texto tratamiento general)
- [x] Observaciones de cierre

✅ Expediente de paciente HISTÓRICO:
- [x] Muestra todos los campos que ahora sí estaban guardados pero no se veían (medicamentos actuales, antecedentes familiares texto, etc.)

✅ Compilación limpia:
- [x] `npm run typecheck`
- [x] `npm run build`

---

> 💡 **Orden recomendado para no agobiarte**: Fase 0 (tipos/limpieza) 1 día → Fases 1 y 2 (1 día) → Fase 3 (Expediente, medio día) → Fase 4 (Medico, 1–2 días) → Pruebas (medio día). Total ~4 días hábiles sin romper nada del otro plan de reestructuración de flujo. Puedes avanzar en PARALELO con el plan de bloques N:M; el diseño del Médico es independiente del flujo de asignación de médico.
