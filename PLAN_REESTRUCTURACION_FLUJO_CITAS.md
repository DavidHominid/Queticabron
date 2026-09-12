# Plan de Reestructuración — Flujo de Eventos y Citas
## Words of Hope (Módulo 1)

> Documento de referencia para la transformación del modelo de agendamiento de citas de **1:1 (1 paciente → 1 hora → 1 médico)** a **bloques N:M (N pacientes → 1 bloque horario configurado por especialidad → M médicos por especialidad)** con asignación dinámica por orden de llegada, triaje opcional por especialidad y pool multi-médico.

> Última actualización: se integraron los requerimientos del editor de eventos/especialidades (Sección 0).

---

## 0. Requerimientos Nuevos del Editor de Eventos y Especialidades (Integración 2026-09-11)

> **Contexto actual revisado**: Hoy el editor de eventos (EventoEditor + EspecialidadCardEditor) permite:
> - Una sola cadena `medicoEncargado` por especialidad del evento (campo `medicoEncargado: string` singular).
> - El `intervalo` y `cupoTotal` se definen **por horario** en `HorarioDisponible`.
> - No existe bandera de triaje por especialidad; el triaje siempre está activo implícitamente.

### 0.1 ¿Qué debe poder configurar el Administrador al crear/editar un Evento?

Por cada **Especialidad** que se agrega al evento, debe poder configurar:

| Item | ¿Cómo está hoy? | Objetivo | Nivel |
|------|-----------------|----------|-------|
| **Pool de Médicos** | 1 solo `medicoEncargado` (string) | **Múltiples médicos asignables** a la especialidad del evento (array de IDs de usuario). Ej: Med. General puede tener Dr. Pérez + Dra. Gómez + Dr. López. | Por EspecialidadEvento |
| **Intervalo de Agendamiento** | Definido por horario dentro de `HorarioDisponible.intervalo` | **Mover a nivel EspecialidadEvento como default.** El intervalo se configura UNA SOLA VEZ por especialidad (ej: 30 min). Todos los bloques de esa especialidad nacen con ese intervalo. El valor por horario sigue existiendo pero como **override opcional**. | Por EspecialidadEvento (+ override opcional por HorarioDisponible) |
| **Cupo por Intervalo (bloque)** | `cupoTotal` en HorarioDisponible pero se interpretaba como 1:1 | **Cupo configurable a nivel EspecialidadEvento como default.** Ej: 8 personas por bloque de 30 min. El horario puede sobreescribirlo si una fecha en específico tiene cupo reducido. | Por EspecialidadEvento (+ override opcional por HorarioDisponible) |
| **Requiere Triaje?** | Implícito = siempre sí | **Bandera booleana opcional** `requiereTriage` (default `true` por consistencia). Ej: Chequeo General o Vacunas PODRÍAN no pasar por triaje. | Por EspecialidadEvento |

### 0.2 Impacto en el Flujo Operativo (cuando `requiereTriage = false`)

El flujo objetivo de la **Sección 1.2** se vuelve condicional:

```
[RECEPCIÓN: Agendar] → BLOQUE (misma lógica)
        │
        ▼
[RECEPCIÓN: Check-in] → programada → llegada_registrada (igual)
        │
        ▼
¿requiereTriage de la especialidad === true?
        │
        ├─ SÍ → [TRIAGE] → triage_completado → ASIGNACIÓN MÉDICO → en_consulta → MÉDICO → completada
        │                                                                    ↑
        └─ NO →  [ASIGNACIÓN MÉDICO (inmediata después de check-in o automática)] ┘
                          (se salta el paso de triaje completamente)
                          Estado: llegada_registrada → asignando_medico → en_consulta
```

Esto implica que el rol `triage` no verá citas de especialidades marcadas como `requiereTriage = false` en su cola. La asignación médico puede ser manual (por Recepción/Médico) o **automática** (FIFO por orden llegada → médico con menos carga del pool).

---

## 1. Resumen Ejecutivo

### 1.1 Flujo Actual (Modelo 1:1)
| Paso | Rol | Acción | Estado Cita Resultante |
|------|-----|--------|------------------------|
| 1 | Recepción | Agenda paciente → **hora exacta + médico fijo** | `programada` |
| 2 | Triage | Abre cita por hora → captura signos → envía a consulta | `en_triage` → `en_consulta` |
| 3 | Médico | Ve citas **asignadas a su nombre** → valora → cierra | `completada` |

**Limitaciones actuales:**
- Cada cita tiene una hora única y un `medico_encargado` definido en el agendamiento
- Solo 1 médico por especialidad del evento (no hay pool)
- El horario se fracciona con `intervalo_minutos` (cupo = duración / intervalo)
- No existe concepto de **bloque con capacidad configurable** ni de **orden de llegada**
- No hay asignación dinámica de médico después del triage
- No se puede desactivar el triaje por especialidad

---

### 1.2 Nuevo Flujo Objetivo (Modelo Bloques N:M + Pool Médicos)
```
[RECEPCIÓN: Agendar] → Asigna paciente a un BLOQUE (ej: 09:00–09:30 · Med. General · cupo=8)
                         (sin médico fijo, sin "hora individual" exacta)
                         │
                         ▼
[RECEPCIÓN: Check-in día del evento] → Registra hora_llegada → cola por orden FIFO
                                         Estado: `programada` → `llegada_registrada`
                                         │
                                         ▼
[¿ESPECIALIDAD REQUIERE TRIAGE?]
  │
  ├─ SÍ → [TRIAGE] → Toma paciente de la cola → captura signos → marca triage_completado
  │                  Estado: `llegada_registrada` → `en_triage` → `triage_completado`
  │
  └─ NO → Salta triaje. Estado se mantiene: `llegada_registrada` (pasa directo a asignación)
        │
        ▼
[ASIGNACIÓN DINÁMICA A MÉDICO] (automática o manual)
  ├─ Inputs: Pacientes elegibles, POOL de médicos configurados en la EspecialidadEvento
  ├─ Regla: FIFO por hora_llegada → asignar al médico LIBRE del pool (o con menor carga activa)
  └─ Resultado: cita.medico_encargado se llena AHORA (no en el agendamiento)
  Estado: `triage_completado` / `llegada_registrada` → `asignando_medico` → `en_consulta`
  │
  ▼
[MÉDICO] → Ve su cola de citas asignadas dinámicamente → abre consulta → ve:
            ├─ Datos del paciente
            ├─ Triage capturado (SI la especialidad lo requirió; si no, sección vacía con badge "No requirió triaje")
            ├─ Historia previa (opcional)
            → Valora → guarda → ¿requiere seguimiento? → agenda o cierra
            Estado: `en_consulta` → `completada`
            │
            ▼
[EXPEDIENTE] → Se persiste como siempre (tabla expediente: triaje + consulta JSONB)
               Si la cita NO tuvo triaje, el sub-documento de triaje queda null/omitido.
```

---

## 2. Cambios en el Modelo de Datos (Base de Datos)

### 2.0. Ajustes en el Editor de Eventos: `evento_especialidad`
> Tabla referenciada: revisar definición en [migrations.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/helpers/migrations.js)

```sql
-- Columnas NUEVAS en la tabla evento_especialidad (una fila = 1 especialidad dentro de 1 evento)
ALTER TABLE citas.evento_especialidad
  ADD COLUMN IF NOT EXISTS medico_usuario_ids TEXT[] DEFAULT '{}';       -- POOL MULTI-MÉDICO (array de user.id o user.nombre)
ALTER TABLE citas.evento_especialidad
  ADD COLUMN IF NOT EXISTS intervalo_minutos_default INTEGER DEFAULT 30; -- Intervalo default p/especialidad (ej 30min)
ALTER TABLE citas.evento_especialidad
  ADD COLUMN IF NOT EXISTS cupo_por_bloque_default INTEGER DEFAULT 8;    -- Cupo default (ej 8 pers/30min)
ALTER TABLE citas.evento_especialidad
  ADD COLUMN IF NOT EXISTS requiere_triage BOOL NOT NULL DEFAULT true;   -- ¿Pasa por triaje?
```

> Nota: Los valores por default (30 min, 8 cupo, requiere_triage=true) aseguran compatibilidad HACIA ATRÁS con eventos ya creados — se comportan igual que hoy.

### 2.1 Nuevas Columnas en `citas`
Archivo de migraciones: [migrations.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/helpers/migrations.js)

```sql
-- Agregar a la tabla citas (schema citas)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS bloque_id TEXT;        -- FK a evento_bloque (opcional)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS hora_llegada TIMESTAMPTZ; -- Check-in día del evento
ALTER TABLE citas ADD COLUMN IF NOT EXISTS orden_llegada INTEGER; -- Posición FIFO por bloque/especialidad/día
ALTER TABLE citas ADD COLUMN IF NOT EXISTS prioridad_triage INTEGER DEFAULT 5; -- 1=mayor urgencia, 5=ruta normal
ALTER TABLE citas ADD COLUMN IF NOT EXISTS hora_asignacion_medico TIMESTAMPTZ; -- Cuando se le asignó médico
ALTER TABLE citas ADD COLUMN IF NOT EXISTS medico_asignado_por TEXT; -- usuario_id o 'sistema' (asignación automática)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS saltado_triage BOOL NOT NULL DEFAULT false; -- true: especialidad no requería triaje
```

**Ajuste a estados de cita** — Nuevo enum/valores:
```typescript
// Antes: 'programada' | 'cancelada' | 'cedida' | 'en_triage' | 'en_consulta' | 'completada' | 'no_asistio'
// Ahora (AGREGAR):
type EstadoCitaNuevo = 'llegada_registrada' | 'triage_completado' | 'asignando_medico';
// Secuencia final:
// Caso CON triaje: programada → llegada_registrada → en_triage → triage_completado → asignando_medico → en_consulta → completada
// Caso SIN triaje: programada → llegada_registrada → asignando_medico → en_consulta → completada
// Ramas: → cancelada, → no_asistio, → cedida
```

### 2.2 Nueva Tabla `evento_bloque` (Opcional pero recomendada)
Para agrupar las citas del mismo bloque y tener un cupo controlado centralizado:

```sql
CREATE TABLE IF NOT EXISTS citas.evento_bloque (
  id TEXT PRIMARY KEY,             -- ej: "blk_20260315_0900_0930_medgen"
  evento_id TEXT NOT NULL REFERENCES citas.eventos(id) ON DELETE CASCADE,
  evento_especialidad_id BIGINT NOT NULL REFERENCES citas.evento_especialidad(id) ON DELETE CASCADE,
  especialidad TEXT NOT NULL,
  dia DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  cupo_total INTEGER NOT NULL DEFAULT 8,           -- Toma el default de evento_especialidad
  cupo_ocupado INTEGER NOT NULL DEFAULT 0,
  medico_usuario_ids TEXT[] DEFAULT '{}',          -- Hereda el pool de evento_especialidad (o puede restringirse por bloque)
  requiere_triage BOOL NOT NULL DEFAULT true,      -- Heredado de evento_especialidad
  tipo_cita_id BIGINT REFERENCES citas.evento_tipo_cita(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Nuevos Índices
```sql
CREATE INDEX IF NOT EXISTS idx_citas_bloque ON citas.citas(bloque_id);
CREATE INDEX IF NOT EXISTS idx_citas_hora_llegada ON citas.citas(hora_llegada) WHERE estado IN ('llegada_registrada','en_triage','triage_completado','asignando_medico');
CREATE INDEX IF NOT EXISTS idx_citas_especialidad_estado ON citas.citas(especialidad, estado)
  WHERE estado IN ('triage_completado','asignando_medico','llegada_registrada');
CREATE INDEX IF NOT EXISTS idx_citas_medico_encargado_estado ON citas.citas(medico_encargado, estado)
  WHERE estado = 'en_consulta';
CREATE INDEX IF NOT EXISTS idx_eventoesp_evento ON citas.evento_especialidad(evento_id);
```

---

## 3. Cambios en el Backend (Express)

### 3.0 Ruta `/api/eventos` — [eventos.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/eventos.js)

#### POST / PUT (Al guardar un evento): Integración de las nuevas columnas
- El body de `especialidades[]` ahora puede traer:
  ```json
  {
    "especialidad": "medicina_familiar",
    "medicoEncargado": "",        // ← DEPRECAR (mantener 1 solo ciclo por compatib. pero leer de abajo)
    "medicoUsuarioIds": ["u_1", "u_5", "u_9"],
    "intervaloMinutosDefault": 30,
    "cupoPorBloqueDefault": 8,
    "requiereTriage": true,
    "practicantes": [],
    "consultorio": "Consultorio 1",
    "horarios": [...]
  }
  ```
- Persistir en `evento_especialidad.medico_usuario_ids`, `intervalo_minutos_default`, `cupo_por_bloque_default`, `requiere_triage`.
- Al construir `evento_horario` (si existe esa tabla): si un `horario.intervalo` no viene o es 0 → usar el default de la especialidad. Ídem para `cupo_total` del horario: si es 0/undefined → usar `cupoPorBloqueDefault`.

#### Nuevo endpoint GET `/api/eventos/:id/bloques`
Retorna bloques + cupos en vivo + `requiereTriage` por bloque.

#### Lectura GET `/api/eventos/:id`
Expandir el mapping del server para retornar los 4 campos nuevos al FE. Ejemplo helper `mapEventoEspecialidad`:
```javascript
const mapEventoEspecialidad = (row) => ({
  especialidad: row.especialidad,
  medicoEncargado: row.medico_encargado || '', // legacy
  medicoUsuarioIds: Array.isArray(row.medico_usuario_ids) ? row.medico_usuario_ids : [],
  intervaloMinutosDefault: Number(row.intervalo_minutos_default) || 30,
  cupoPorBloqueDefault: Number(row.cupo_por_bloque_default) || 8,
  requiereTriage: Boolean(row.requiere_triage ?? true),
  practicantes: row.practicantes || [],
  consultorio: row.consultorio || '',
  horarios: [],
  costo: Number(row.costo) || 0,
  tiposCita: []
});
```

---

### 3.1 Ruta `/api/citas` — [citas.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/citas.js)

#### POST `/` (Crear cita — Recepción agenda)
**Antes**: requería `hora` exacta, validaba conflicto 1:1, asignaba `medico_encargado` desde `tipo_cita` o `especialidad`

**Ahora**:
1. Validar que el **bloque** tenga cupo disponible. El bloque usa el `cupoTotal` del horario, que a su vez hereda de `cupoPorBloqueDefault` de la especialidad si el horario no lo define.
2. **NO** aceptar `medicoEncargado` en el body (o ignorarlo).
3. Leer `requiereTriage` de la especialidad del evento; guardar `saltado_triage = !requiereTriage` para trazabilidad.
4. Guardar `bloque_id`, `hora` (= `horaInicio` del bloque), `estado = 'programada'`.
5. Si hay tabla `evento_bloque`: incrementar `cupo_ocupado` atómicamente.

#### PUT `/checkin/:id` (Nuevo endpoint — Recepción registra llegada)
```
Body: { usuarioId? }
Hace:
  - SET hora_llegada = NOW()
  - Calcular orden_llegada en el bloque
  - SET estado = 'llegada_registrada'
  - Leer esp.ev.requiere_triage de la especialidad asociada a la cita:
      * Si requiere_triage = FALSE → OPCIÓN 1 (recomendada): se puede pasar DIRECTAMENTE a `asignando_medico`
        para que recepción o sistema asignen médico ya.
        OPCIÓN 2: dejar en llegada_registrada y que el sistema de asignación los tome igualmente.
  - broadcast('operacional')
```

#### PUT `/asignar-medico/:id` (Nuevo endpoint)
Validación adicional: `medicoUsuarioId` debe estar en `medicoUsuarioIds` del pool de la `EspecialidadEvento` del evento. Si no está → error 400 "Médico no habilitado para esta especialidad en este evento".

#### GET `/cola-triage/:especialidad` (Nuevo endpoint)
Filtrar solo citas de especialidades donde `requiere_triage = true`. Las que no lo requieren **nunca** aparecen en la cola de triaje (no hay que mostrárselas al personal de triaje para que no pierdan tiempo).

---

### 3.2 Ruta `/api/triage` — [triage.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/triage.js)

#### POST `/` (Nueva pre-condición)
1. Antes de guardar: **leer si la especialidad/evento de la cita tiene `requiere_triage = false`**.
2. Si `requiere_triage = false` y `saltado_triage = true` → **rechazar 400**: "Esta especialidad no requiere triaje; la cita debe pasar directo a asignación de médico". (Evita que alguien intente triar por error).
3. Si la especialidad SÍ requiere triaje: seguir como se indica en la sección 3.2 base (guardar → cita → `triage_completado`).

---

### 3.3 Ruta `/api/consultas` — [consultas.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/consultas.js)

Sin cambios estructurales, pero:
- Si `cita.saltado_triage = true` y no hay registro de triaje → está bien, no lanzar error. El registro del expediente guarda `triage: null`.

---

## 4. Cambios en el Frontend (React + TypeScript)

### 4.1 Tipos Compartidos — [types.ts](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/types.ts)

```typescript
// ====== ACTUALIZADO: EspecialidadEvento ======
export interface EspecialidadEvento {
  especialidad: Especialidad;

  // ===== NUEVOS CAMPOS (integrados Sept-11) =====
  medicoUsuarioIds: string[];                   // MULTI-MEDICO POOL (IDs de usuario)
  intervaloMinutosDefault: number;              // Default p/toda la espec. (30 min)
  cupoPorBloqueDefault: number;                 // Default cupo x/bloque (8)
  requiereTriage: boolean;                      // ¿Requiere paso por triaje? default true

  // ===== CAMPOS LEGACY (mantener por compatibilidad) =====
  medicoEncargado: string;                      // ← Eventualmente deprecar, pero lo mantenemos 1 ciclo.
  practicantes: string[];
  consultorio: string;
  horarios: HorarioDisponible[];
  costo: number;
  tiposCita?: TipoCitaEvento[];
}

export interface HorarioDisponible {
  dia: string;
  horaInicio: string;
  horaFin: string;
  intervalo?: number;        // Override OPCIONAL. Si undefined → usar esp.intervaloMinutosDefault
  cupoTotal?: number;        // Override OPCIONAL. Si undefined → usar esp.cupoPorBloqueDefault
  tipoCitaId?: string;
}

// ====== NUEVO TIPO: Bloque horario ======
export interface EventoBloque {
  id: string;
  eventoId: string;
  eventoEspecialidadId: string;
  especialidad: Especialidad;
  dia: string;            // YYYY-MM-DD
  horaInicio: string;     // HH:MM
  horaFin: string;        // HH:MM
  cupoTotal: number;
  cupoOcupado: number;
  medicoUsuarioIds: string[];
  requiereTriage: boolean;   // NUEVO
  tipoCitaId?: string;
}

// ====== ACTUALIZADO: Cita ======
export interface Cita {
  // ... (todos los campos actuales)
  bloqueId?: string;
  horaLlegada?: string;
  ordenLlegada?: number;
  prioridadTriage?: number;
  horaAsignacionMedico?: string;
  medicoAsignadoPor?: string;
  saltadoTriage?: boolean;   // NUEVO: true = especialidad.no_requiere_triage
  estado:
    | 'programada'
    | 'llegada_registrada'
    | 'cancelada'
    | 'cedida'
    | 'en_triage'
    | 'triage_completado'
    | 'asignando_medico'
    | 'en_consulta'
    | 'completada'
    | 'no_asistio';
}
```

---

### 4.2 Editor de Eventos Frontend

#### 4.2.1 [EventoEditor.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/EventoEditor.tsx)
- `createEspecialidad` (línea ~102) pasar de:
  ```typescript
  const createEspecialidad = (especialidad: Especialidad): EspecialidadEvento => ({
    especialidad,
    medicoEncargado: '',
    practicantes: [],
    consultorio: '',
    horarios: [],
    costo: 0,
    tiposCita: [],
  });
  ```
  A:
  ```typescript
  const createEspecialidad = (especialidad: Especialidad): EspecialidadEvento => ({
    especialidad,
    medicoEncargado: '',                       // legacy, vacío
    medicoUsuarioIds: [],                      // NUEVO
    intervaloMinutosDefault: 30,               // NUEVO
    cupoPorBloqueDefault: 8,                   // NUEVO
    requiereTriage: true,                      // NUEVO (por defecto SI hay triaje)
    practicantes: [],
    consultorio: '',
    horarios: [],
    costo: 0,
    tiposCita: [],
  });
  ```
- Al serializar para guardar: incluir los 4 nuevos campos en el payload del evento.

#### 4.2.2 [EspecialidadCardEditor.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/eventos/EspecialidadCardEditor.tsx)
**Agregar 4 nuevas UI dentro del `modo === 'config'`:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Card Editor Config (nuevos campos)                                       │
├──────────────────────────────────────────────────────────────────────────┤
│  [✔ Consultorio — ya existe]                                              │
│                                                                          │
│  ┌─ 👨‍⚕️ Pool de Médicos (multi-select) ──────────────────────────────┐ │
│  │  Sugeridos: médicos cuya especialidad coincide. + checkboxes de todos │ │
│  │  [✓] Dr. Pérez      [✓] Dra. Gómez     [ ] Dr. López (otra esp.)      │ │
│  │  (Mostrar IDs internos ocultos, label nombre + (especialidad))        │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─ ⚙️ Configuración del Bloque por Default ──────────────────────────┐ │
│  │  Intervalo (min):  [ 30 ]   (input numeric, min=5, max=240)         │ │
│  │  Cupo por bloque:   [ 8  ]   (input numeric, min=1, max=100)        │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─ 🩺 Triaje ─────────────────────────────────────────────────────────┐ │
│  │  [✔] Esta especialidad requiere pasar por triaje (check ON/OFF)     │ │
│  │  (help tip: Desactívalo para chequeos generales, vacunas, charlas) │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  [✔ Tipos de cita — ya existe]                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

- Multi-select pool médicos: usar el array `medicos` (línea 112) + `medicosRecomendados` (línea 126). Cada checkbox togglea `onChange({...value, medicoUsuarioIds: [...toggle...]})`.
- Helpers de validación: si guardar el evento y una especialidad tiene `medicoUsuarioIds.length === 0` → warn "No has asignado médicos a la especialidad X; no se podrán atender citas". Permitir guardar pero advertir.
- `requiereTriage = false`: en el ScheduleCalendarEditor (modo horarios) mostrar badge 🔵 "Sin triaje".

---

### 4.3 Contexto de Datos — `DataContext.tsx`
(Mantener los anteriores y agregar)
```typescript
// Acciones ya existentes que ahora transportan más campos:
addEvento(evento): Promise<Evento>;      // body especialidades trae los 4 nuevos
updateEvento(evento): Promise<Evento>;   // ↑

// Nuevas de la fase anterior (mantener):
checkinCita, asignarMedicoACita, getColaTriage, getColaAsignacion, fetchEventoBloques
```

---

### 4.4 Agendamiento (Recepción) — [AgendarCitaDialog.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/eventos/AgendarCitaDialog.tsx) y [EventoDetalle.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/EventoDetalle.tsx)
- Mostrar badge al lado del nombre de especialidad:
  - `🩺` + "Con triaje" si `requiereTriage === true`
  - `⚡` + "Sin triaje · Asignación inmediata" si `false`
- Pool de médicos: en el resumen del bloque mostrar "Médicos disponibles: 3 (Dr. Pérez, Dra. Gómez, Dr. López)"

---

### 4.5 Dashboard de Triage — [TriageNuevo.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/TriageNuevo.tsx)
**Filtrar para NO mostrar citas de especialidades que no requieren triaje** (evita ruido):
```typescript
const citasVisibles = citasHoy.filter((c) => {
  const espConfig = /* buscar en evento.especialidades.find(e => e.especialidad === c.especialidad) */ ;
  const requiere = espConfig?.requiereTriage ?? true;
  if (!requiere) return false; // ⬅️ NUEVO
  return /* resto del filtro por estados */;
});
```
Si se intenta abrir una cita manualmente con `saltadoTriage === true` → warning con badge "Esta especialidad no requiere triaje; se ignora este paso".

---

### 4.6 Nuevo Componente `AsignacionMedicoQueue.tsx`
Ahora incluye:
- **Selector Especialidad** (arriba del todo): muestra badge "Con Triaje" o "Sin Triaje" en cada opción.
- Para las citas sin triaje: `saltadoTriage = true` → se muestran primero, antes que las de triaje.
- El pool de médicos permitidos SOLO muestra los del `medicoUsuarioIds` de esa especialidad (no todos los médicos del sistema). Si el pool está vacío → warning "No hay médicos asignados a esta especialidad en este evento; revisa la configuración".

---

### 4.7 Dashboard de Médico — [Medico.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/Medico.tsx)
- Al abrir la consulta: Si `cita.saltadoTriage === true` o la especialidad tiene `requiereTriage=false`, la sección de Triage muestra un placeholder sutil:
  ```
  ┌─ Triaje ───────────────────────────────────┐
  │  ⚡ Sin triaje aplicado · Atención directa │
  │  (configuración del evento)                │
  └────────────────────────────────────────────┘
  ```
  No se renderizan los signos en 0 / null; se aclara explícitamente por qué no hay datos.

---

### 4.8 (Resto de las secciones 4.3–4.9 del plan original — sin cambios adicionales)
Se mantienen: Recepción Check-in, Expedientes, Utils, Estados, etc. Solo agregar los nuevos booleanos a los labels.

---

## 5. Fases de Implementación (Orden Sugerido Actualizado)

> Regla de oro: **Hacer una fase, probar, pasar a la siguiente**.

### 🟩 Fase 0 — Tipos + Editor de Eventos (Configurable sin romper flujos viejos)
1. [ ] Actualizar `types.ts`: `EspecialidadEvento` (4 nuevos campos), `Cita.saltadoTriage`, `EventoBloque.requiereTriage`
2. [ ] Migración SQL: columnas `evento_especialidad` (pool médicos, intervalo, cupo, requiere_triage) y `citas.saltado_triage` + índices + columnas nuevas citas de la fase original
3. [ ] Actualizar `createEspecialidad` en EventoEditor.tsx para inicializar los 4 nuevos campos con defaults (no cambia UI aún)
4. [ ] Actualizar server `eventos.js`: mapear los 4 campos nuevos en GET y persistirlos en POST/PUT (no cambia comportamiento)
5. [ ] Actualizar `EspecialidadCardEditor.tsx`: agregar las 4 nuevas UI (pool multi-médico, intervalo, cupo, requiereTriage checkbox). SOLO se guardan. NO se usan aún en el flujo operativo.
6. [ ] Probar: Crear evento con Med. General, pool 2 médicos, intervalo 30, cupo 8, requiere triaje true. Cargar el editor de vuelta y confirmar que se guardan.
7. [ ] `npm run typecheck` → 0 errores

### 🟩 Fase 1 — Backend operativo: Nuevos endpoints + condicional de triaje
1. [ ] Crear `PUT /api/citas/checkin/:id` → lógica `llegada_registrada`
2. [ ] Crear `PUT /api/citas/asignar-medico/:id` → validación contra `medicoUsuarioIds` pool de la esp.
3. [ ] Colas `GET cola-triage/:esp` (solo esp. requiere_triage=true) y `GET cola-asignacion/:esp`
4. [ ] Modificar `POST /api/triage`: rechazar si especialidad no requiere triaje; guardado normal + estado `triage_completado` si sí.
5. [ ] `POST /api/citas`: leer `requiereTriage` y persistir `saltado_triage`.
6. [ ] Añadir `recordAudit` en informacion-medica (del plan normalización variables — compatible).
7. [ ] Probar endpoints con Postman/Thunder Client

### 🟩 Fase 2 — Frontend: Flujo Triage + Cola Asignación + Condicional Sin Triaje
1. [ ] `TriageNuevo.tsx`: filtrar citas de especialidades con `requiereTriage = true`; orden FIFO; submit `triage_completado`
2. [ ] Crear `AsignacionMedicoQueue.tsx`: pool por especialidad, badges con/sin triaje, auto-asignar
3. [ ] Integrar endpoints `cola-asignacion` y `asignarMedicoACita`
4. [ ] `Medico.tsx`: filtro estricto `medicoEncargado === yo`; placeholder "Sin triaje" si aplica;
5. [ ] Probar 2 escenarios:
   - Caso A (SÍ triaje): Check-in → triaje captura → asigna → médico ve consulta → guarda ✓
   - Caso B (SIN triaje): Crear evento esp. Chequeo, `requiereTriage=false`. Check-in → recepción asigna médico directo → médico ve consulta (sin triaje) → guarda ✓

### 🟩 Fase 3 — Frontend Recepción (Check-in + Agendamiento por Bloques)
1. [ ] `AgendarCitaDialog.tsx`: UI de bloque, cupo X/Y, sin médico, badge con/sin triaje
2. [ ] `AgendaCalendar.tsx` si aplica: render bloques
3. [ ] Check-in hoy en `Citas.tsx`
4. [ ] Validar cupo por bloque (no se pasa de N)

### 🟩 Fase 4 — Expediente + Seguimientos + Export
1. [ ] Expediente: si `saltado_triage=true`, mostrar en la timeline "No requirió triaje · Saltado" y omitir el bloque de signos.
2. [ ] Validar guardado de consulta y agenda de seguimiento (igual que antes)
3. [ ] Exportación de datos (incluir en Excel columnas: Pool médicos, Intervalo, Cupo por bloque, Requiere triaje Sí/No, Saltó triaje Sí/No)
4. [ ] SSE

### 🟩 Fase 5 — Limpieza Duplicados y Normalización
(Fase 0 del plan de normalización de variables: limpieza `oxigenacion`/`glucosa` triaje, auditorías, etc. — totalmente independiente, se puede meter aquí).

### 🟥 Fase 6 — Pruebas E2E Completas
1. [ ] **Escenario 1 — Especialidad con triaje (pool 3 médicos, 30min, cupo 8)**
2. [ ] **Escenario 2 — Especialidad SIN triaje (ej: Vacunas · intervalo 15min · cupo 12)**
3. [ ] **Escenario 3 — 2 especialidades distintas en el mismo evento: 1 con triaje + 1 sin triaje** (validar que no se mezclan las colas)
4. [ ] **Compatibilidad**: un evento creado ANTES de estos cambios (sin los campos nuevos) debe seguir funcionando con los defaults (intervalo 30 / cupo 8 / requiereTriage=true / pool vacío usa el legacy medicoEncargado si lo tiene).
5. [ ] `npm run typecheck` + `npm run build`

---

## 6. Matriz de Riesgos (Actualizada)

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Eventos viejos sin `medicoUsuarioIds` pierden el pool | Media | Alto | **Fallback legacy**: al construir el pool en runtime, si `medicoUsuarioIds.length === 0` Y `medicoEncargado` (legacy) tiene valor → usar `[medicoEncargado]` como pool de 1 médico. Nunca mostrar pool vacío si hay legacy. |
| Especialidad con `requiereTriage=false` pero recepción intenta triar por costumbre | Alta | Medio | 1) Ocultar cita del dashboard de triaje (no llega a aparecer). 2) Si alguien llega por URL directa: warning grande + botón disabled. 3) Server POST triaje rechaza 400. |
| Pool multi-médico: médicos de otras especialidades se asignan por error | Baja | Alto | Server endpoint `/asignar-medico`: validar que el `medicoId` esté en `evento_especialidad.medico_usuario_ids` O en legacy fallback. 400 si no. |
| Intervalo default y override por horario causan bloques inconsistentes | Media | Medio | Helper único `calcularIntervaloEfectivo(horario, esp)` y `calcularCupoEfectivo(horario, esp)` en FE y server, usarlo SIEMPRE antes de generar bloques. Tests unitarios sencillos. |
| Cupo se desincroniza al agendar | Media | Medio | UPDATE atómico en `evento_bloque`. |
| Doble asignación médico | Baja | Medio | 409 Conflict al asignar si `medico_encargado IS NOT NULL`. |

---

## 7. Archivos que Tocarás (Checklist Actualizado)

### Backend (`/server`)
- [ ] `helpers/migrations.js` — **nuevo**: 4 cols evento_especialidad + `citas.saltado_triage` + cols originales + índices
- [ ] `helpers/utils.js` — `toDBEstado`, `mapCita`, `mapEventoEspecialidad` (nuevo helper o dentro de eventos.js)
- [ ] `routes/eventos.js` — GET/POST/PUT leen y guardan los 4 campos nuevos
- [ ] `routes/citas.js` — POST valida pool + saltado_triage + 4 endpoints nuevos
- [ ] `routes/triage.js` — validación `requiereTriage` + estado final `triage_completado`
- [ ] `routes/consultas.js` — validar medico_encargado + si triaje fue null es OK
- [ ] `routes/informacion-medica.js` — auditar cambios (del otro plan)
- [ ] `index.js` — registrar rutas nuevas

### Frontend (`/src/app`)
- [ ] `types.ts` — EspecialidadEvento + Cita + EventoBloque actualizados
- [ ] `pages/EventoEditor.tsx` — `createEspecialidad` inicializa 4 campos nuevos
- [ ] `components/eventos/EspecialidadCardEditor.tsx` — **4 UI nuevas**: pool multi-médico checkboxes, intervalo, cupo, requiereTriage
- [ ] `pages/TriageNuevo.tsx` — filtrar solo esp. con triaje + orden FIFO
- [ ] **NUEVO** `components/triage/AsignacionMedicoQueue.tsx` — pool, badges con/sin triaje
- [ ] `pages/Medico.tsx` — placeholder "Sin triaje", filtro médico
- [ ] `pages/EventoDetalle.tsx` + `AgendarCitaDialog.tsx` — badges triaje si/no + pool info
- [ ] `context/DataContext.tsx` — `addEvento`/`updateEvento` propaguen 4 campos + acciones colas
- [ ] `pages/Citas.tsx` / `DashboardRecepcion.tsx` — check-in
- [ ] `utils/eventoEstado.ts`, `utils/triageAccess.ts` — filtrar `requiereTriage`
- [ ] `components/expediente/*` — timeline "Saltó triaje"
- [ ] `components/paciente/*` — componentes reutilizables info médica (del plan normalización)

---

## 8. Comandos de Verificación
```bash
npm run typecheck
npm run build
npm run dev
```

---

## 9. Criterios de "Listo para Producción" (Actualizado)
✅ Editor de eventos permite:
- [x] Agregar 3+ médicos al pool de una especialidad
- [x] Configurar intervalo 30 min / cupo 8 a nivel especialidad
- [x] Apagar triaje en una especialidad (checkbox OFF)
- [x] Guardar y recargar editor; los valores persisten

✅ Flujos operativos:
- [x] Especialidad SÍ triaje: programa → check-in → triaje → asignación → consulta (5+ pacientes, 2 médicos en pool, asignación FIFO balanceada)
- [x] Especialidad NO triaje: programa → check-in → asignación inmediata → consulta (NO aparece en triaje)
- [x] Pool multi-médico: solo médicos del pool se pueden asignar; médico ajeno → error 400
- [x] Intervalo default vs override: horario sin cupo usa el de especialidad
- [x] Eventos legacy (sin campos nuevos): se comportan igual que hoy (fallback medicoEncargado → pool 1, req triaje true, 30/8)

✅ Calidad:
- [x] Dashboards en vivo via SSE
- [x] Cupo no excedible en concurrencia
- [x] Expedientes muestran correctamente "sin triaje" cuando aplica
- [x] `typecheck` y `build` limpios

---

> 💡 **Consejo final**: Empieza siempre por la **Fase 0** (tipos + Editor de Eventos configurable). Eso te da ~2 días de trabajo sin romper NADA del flujo actual y te permite ir "calando" los defaults con el personal operativo. Después pasas a Fase 1–2 donde ya entran los cambios de comportamiento. Ambos planes (reestructuración citas + normalización variables) **son 100% compatibles** y puedes avanzarlos en paralelo (ej: un día haces Fase0 de ambos en ~2 horas total).
