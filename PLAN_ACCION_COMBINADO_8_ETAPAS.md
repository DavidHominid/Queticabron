# Plan de Acción Combinado — Actualización Global
## Words of Hope (Módulo 1)

> **Unifica**: Un solo plan lineal de 8 etapas** que integra los 2 documentos de los 2 proyectos (Reestructuración del Flujo Citas (bloques N:M, pool multi-médico, triaje opcional) y 2) Normalización Variables + Apartado Médico. Se agrega una **Capa Transversal de Pruebas, Resolución de Errores y Auditoría Continua** que se ejecuta en cada paso. No se avanza de etapa si la anterior no tiene "bandera "

---

## 0. Principios Rectores del Plan Lineal

1. **Una sola cosa a la vez. No se mezclan cambios de Flujo Operativo (Citas) con cambios de UI (Médico) en la misma etapa sin antes pasar por la capa de pruebas.
2. **Compatibilidad Hacia atrás obligatoria**: Todo lo viejo sigue funcionando mientras se construye lo nuevo.
3. **Auditoría Continua** Cada etapa termina con: typecheck + build + pruebas humo + guardado de evidencia en carpeta `/audits/fecha_etapa_X.
4. **Rollback seguro** cada etapa se pueda deshacer (feature flags o ramas) sin perder datos.
5. **Sin de errores en crudo**: todo error se captura, se documenta, se resuelve y se registra en el Registro de Errores de esta sección.

---

## 1. Pre-requisitos Antes de Empezar (Día 0, ~1–2h)

| # 0.1 Entorno listo
- [ ] Rama nueva `git` dedicada: `git checkout -b feature/actualizacion-global-modulo1`
- [ ] Guardar copia de seguridad BD (si es staging/producción; en local es con: `
pg_dump -h ... > backup_pre_actualizacion_YYYYMMDD.sql`).
- [ ] `package.json`: confirmar Node.js (recomendado 18+) y npm
- [ ] `correr `npm installnpm run dev` y cerrar la app y tomar una evidencia "estado inicial" (screenshot home) y guardar en `/audits/YYYYMMDD/evidencia_00_inicial.png`.

### 0.2 Estructura de Carpetas para Auditoría Continua
Crear (no subir la si es) para dejar claridad en el repo:

```
audits/
├─ 00_LineaBase/                # Evidencias iniciales (typecheck  build screenshots, dump DB antes de cambios
├─ 01_Etapa1_Tipos/
│   ├─ typecheck.log.txt
│   ├─ build.log
│   ├─ evidencias/
│   └─ errores_registrados.md      # Si hubo, cómo se solucionaron
├─ 02_Etapa2_NormalizacionBD/
├─ ... (una por etapa)
└─ errores_global.md             # REGISTRO GLOBAL DE ERRORES —se llena en cada etapa)
```

Archivo base para el Registro Global de Errores (plantilla única para todo el proyecto):

```markdown
| ID | Fecha | Etapa | Archivo/Componente | Error Descripción | Severidad (Bloqueante/Alta/Media/Baja) | Pasos para reproducir | Solución implementada | Responsable | Estado |
|----|-------|-------|---------------------|-----------------------------------------|---------------------------------------------|----------------|-----------|---|
| E001 |       |       |                     |                                         |             |                |           |       |
```

### 0.3 Feature Flags (para no romper nada mientras se construye)
Crear un archivo `src/app/utils/featureFlags.ts` (nuevo) que controle NUEVOS comportamientos antes de que estén 100% listos:

```typescript
// src/app/utils/featureFlags.ts
export const FEATURES = {
  POOL_MULTI_MEDICO:   true,   // Activar UI del editor (solo configuración — sin cambios en flujo operativo
  BLOQUES_N_M:          false,  // Se apaga hasta Etapa 4
  TRIAGE_OPCIONAL:       true,   // UI del editor, pero solo se usa en BE en Etapa 3
  CHECKIN_RECEPCION:      false,  // Se prende Etapa 4
  EDITABLE_INFO_MEDICA:   false,  // Se prende Etapa 5
};
```

> Así podemos guardar los valores por default se comportan igual que HOY.

---

## Etapa 1 — Tipos Compartidos + Migraciones Seguras
## Duración estimada: ~4–6 h

### Objetivo
Alinear types.ts, tipos del frontend con las nuevas columnas de BD sin tocar la UI ni el flujo operativo.

### Tareas

| Tarea | Archivos | Verificación |
|-------|---------|---------------|
| 1.1. Ampliar `EspecialidadEvento` con 4 campos nuevos (pool, intervalo default, cupo default, requiereTriage) + `saltadoTriage` + `Cita.saltadoTriage` + `EventoBloque.requiereTriage` + Expandir `AntecedentesGenerales.patologicos/familiares` + `ConsultaMedica.planTratamiento/observaciones | [types.ts](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/types.ts) | Revisar cada interface |
| 1.2. Crear feature flags | `utils/featureFlags.ts` | Exista y compile |
| 1.3. Ejecutar migraciones SEGURAS (solo `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, sin borrar ni alterar tipos de columnas existentes) — NUNCA dropear nada): 4 cols `evento_especialidad`, cols `citas` (bloque, llegada, orden, prioridad, asignación, `saltado_triage`, índices nuevos) | [migrations.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/helpers/migrations.js) | `npm run dev` (auto aplica migraciones. Log en consola sin errores) |
| 1.4. `createEspecialidad` inicialice defaults (EventoEditor.tsx) | [EventoEditor.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/EventoEditor.tsx) Línea ~102 | No cambia UI pero al agregar una especialidad trae valores por default |

### Capa de Pruebas + Resolución Errores + Auditoría (OBLIGATORIO pasar para avanzar)
| Acción | Salida Esperada |
|--------|----------------|
| Correr `npm run typecheck > audits/01_Etapa1_Tipos/typecheck.log` | 0 errores |
| Correr `npm run build > audits/01_Etapa1_Tipos/build.log` | 0 errores |
| Levantar app y navegar: Home, Eventos, Editor Evento, Citas, Triage, Médico, Importar Expediente, Expediente de paciente existente | Carga completa sin warnings de consola ni de red (ver DevTools en todas las pantallas) |
| Editar un evento existente y agregarle una especialidad nueva + guardar + recargar | Los valores por default (30min, cupo 8, triaje true, pool []) se guardan OK |
| Registrar cualquier error encontrado | Entrada en `audits/errores_global.md` con su solución |
| Guardar 3 screenshots: Editor de la pantalla Eventos Evento + Expediente | `/audits/01_Etapa1_Tipos/evidencias/` OK

** Criterio de avance a Etapa 2: typecheck 0 + build 0 + pantallas principales sin errores consola.

---

## Etapa 2 — Normalización Variables + Editor de Eventos (SOLO Configuración)
### Duración: ~1 Día completo

### Objetivo
Que el Administrador ya pueda configurar pool multi-médico, intervalo, cupo y triaje opcional por especialidad. **El flujo operativo NO cambia en esta etapa.

### Tareas

| Tarea | Archivos |
|-------|---------|
| 2.1. Backend `eventos.js`: GET mapee 4 campos nuevos con helper `mapEventoEspecialidad`; POST/PUT persisten en cols `; `evento_especialidad`. Helper `calcularIntervaloEfectivo` y `calcularCupoEfectivo` (FE + BE) | [eventos.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/eventos.js) |
| 2.2. UI EspecialidadCardEditor.tsx: Agregar 4 bloques de UI (mencionados en la sección 4.2.2 del plan de citas): Pool multi-médico (checkboxes), Intervalo (30), Cupo (8), RequiereTriage (checkbox ON/OFF). Helper de warning si pool está vacío al guardar. | [EspecialidadCardEditor.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/eventos/EspecialidadCardEditor.tsx) |
| 2.3. Normalización BD triaje: Unificar datos `oxigenacion → saturacion_oxigeno` y `glucosa → azucar_en_sangre` (UPDATE + dejar alias deprecadas. Quitar las inserciones duplicadas `expediente-captura.js` líneas 465–468. | [migrations.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/helpers/migrations.js), [expediente-captura.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/expediente-captura.js) |
| 2.4. `informacion-medica.js`: Añadir `recordAudit` cada vez que se modifica (POST y PUT) — lo guarda quién editó (usuario, fecha, campos editados). | [informacion-medica.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/informacion-medica.js) |

### Capa de Pruebas + Resolución Errores + Auditoría
| Acción | Salida |
|--------|--------|
| **Pruebas unitarias sencillas (consola DB): `SELECT * FROM citas.evento_especialidad WHERE evento_id = 'evt_xxx'` después guardar evento | 4 cols nuevas traen valores correctamente |
| Editor Evento (UI): Crear evento "Jornada septiembre" con 2 especialidades: <br> A) Med General · pool 3 médicos · 20min · cupo 6 · triaje true <br> B) Vacunas · pool 1 médico · 15 min · cupo 12 · triaje false | Guardar. Recargar F5. Valores persisten |
| `npm run typecheck` | 0 errores |
| `npm run build` | 0 errores |
| Prueba de normalización triaje (saturación y glucosa): Importar 1 expediente histórico → revisar tablas triaje | Solo `saturacion_oxigeno` y `azucar_en_sangre` tienen datos; las otras 2 están NULL |
| Cualquier error detectado → | Entrada `audits/errores_global.md` + evidencia screenshot |
| Screenshots | `/audits/02_Etapa2/evidencias/` — Editor de evento mostrando pool 3 médicos + pantalla Config card |

** Criterio de avance: El editor configura los 4 items y los valores persisten en la BD sin tocar nada del flujo operativo citas/triage/médico.

---

## Etapa 3 — Backend Operativo (Nuevos Endpoints + Condicional Triaje)
### Duración: ~1 Día

### Objetivo
Todos los endpoints nuevos funcionan, se validan contra Postman/Thunder Client. **El FE aún no los usa (solo quedan listos).

### Tareas

| Tarea | Archivos |
|-------|---------|
| 3.1. `PUT /api/citas/checkin/:id` | [citas.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/citas.js) |
| 3.2. `PUT /api/citas/asignar-medico/:id` con validación: `medicoId en medicoUsuarioIds` de la especialidad | [citas.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/citas.js) |
| 3.3. `GET /api/citas/cola-triage/:esp` → filtra solo esp `requiere_triage=true`; `GET /cola-asignacion` | [citas.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/citas.js) |
| 3.4. `POST /api/triage` → Rechaza 400 si la cita esp tiene `requiereTriage=false`. Si triaje true → guarda + cita estado `triage_completado` (no más directo a confirmada/en_consulta). | [triage.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/triage.js) |
| 3.5. `POST /api/citas` → Lee `requiereTriage` de la especialidad y guarda `saltado_triage = !requiereTriage`. | [citas.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/citas.js) |
| 3.6. `consultas.js` → valida que `cita.medico_encargado === user.id` o admin y que el estado sea `en_consulta`. Si `saltado_triage=true` y no hay triaje → OK. | [consultas.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/consultas.js) |
| 3.7. `helpers/utils.js`: Actualizar `toDBEstado` / `toFEEstado` con 3 estados nuevos (`llegada_registrada`, `triage_completado`, `asignando_medico`). | [utils.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/helpers/utils.js) |

### Capa de Pruebas + Resolución Errores + Auditoría
| Acción | Salida Esperada |
|--------|-----------------|
| **Batería de Thunder Client/Postman** (guardar colección en `/audits/03_Etapa3/thunder-collection.json`):<br>1. Crear 3 citas random por POST (2 Med General triaje true · 1 Vacunas triaje false)<br>2. `PUT checkin` a las 3 → respuesta cita1=0, orden_llegada auto-incrementa.<br>3. `POST triaje` a la 1 cita de Vacunas → 400 (correcto: no requiere triaje).<br>4. `POST triaje` a Med General → 200 OK + pasa a `triage_completado.<br>5. `asignar-medico` a cita Med General con médico **NO** en pool → 400 (correcto: validación).<br>6. `asignar-medico` con médico del pool → 200 + estado `en_consulta` + ` medico_encargado` llenado. | Todos los 6 casos pasan como se describe. |
| `broadcast('operacional')` — abrir 2 navegadores: uno en Citas, otro Triage, otro Médico. Hacer check-in desde Postman. | 3 dashboards se actualicen. |
| `npm run typecheck && npm run build` | 0 errores |
| Registro de errores + screenshots Thunder Client → | `03_Etapa3/` |

** Criterio de avance: 100% 6 casos de la batería Postman pasan sin errores. El flujo "viejo" (citas sin los campos nuevos) sigue funcionando.

---

## Etapa 4 — Flujo Operativo Completo Frontend: Check-in · Triage FIFO · Asignación Médico
### Duración: ~1.5 Días

### Objetivo
Que el personal operativo pueda usar el NUEVO flujo (bloques, pool, triaje opcional). Encender los primeros feature flags: `BLOQUES_N_M=true`, `CHECKIN_RECEPCION=true`.

### Tareas

| Tarea | Archivos |
|-------|---------|
| 4.1. `DataContext.tsx`: Agregar `checkinCita`, `asignarMedicoACita`, `getColaTriage`, `getColaAsignacion`, `fetchEventoBloques`. Asegurar que `addEvento`/`updateEvento` propaguen 4 campos. | `context/DataContext.tsx` |
| 4.2. `TriageNuevo.tsx`: Filtrar por `requiereTriage===true`; Orden FIFO (pesoEstado + prioridad + hora_llegada); Submit → `triage_completado`. Badges 3 estados nuevos | [TriageNuevo.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/TriageNuevo.tsx) |
| 4.3. Crear **`components/triage/AsignacionMedicoQueue.tsx`: Selector especialidad (badges Con/Sin Triaje). Pool de médicos por especialidad. Botón Auto-asignar (FIFO a médico menos cargado). | Nuevo archivo |
| 4.4. Dashboard Recepción o Citas.tsx: Sección Check-in hoy (botón "Registrar Llegada"), badge `ordenLlegada`. | [Citas.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/Citas.tsx) o DashboardRecepcion |
| 4.5. `AgendarCitaDialog.tsx` + EventoDetalle: Bloques unidad; cupo X/Y sin selector médico; badge con/sin triaje; info pool médicos. | [AgendarCitaDialog.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/eventos/AgendarCitaDialog.tsx), [EventoDetalle.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/EventoDetalle.tsx) |
| 4.6. `AgendaCalendar.tsx` (si aplica): Mostrar bloques cupo. | components/eventos/AgendaCalendar.tsx |
| 4.7. `eventoEstado.ts` y triageAccess.ts` etiquetas 3 estados + filtro por `requiereTriage`. | utils/eventoEstado.ts, [triageAccess.ts](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/utils/triageAccess.ts) |

### Capa de Pruebas + Resolución Errores + Auditoría
| Acción | Salida |
|--------|--------|
| **Escenario E2E A — Esp. CON triaje · pool 3 médicos · 30 min · cupo 6:<br>1. Agendar 5 pacientes mismo bloque.<br>2. Recepción hace check-in 3 en 3 minutos distintos.<br>3. Triage captura → pasan a `triage_completado.<br>4. Asignación médico 2 pacientes a 2 médicos distintos.<br>5. Médicos 1 y 2 abren Medico dashboard → SOLO ven SU paciente asignado.<br>6. Guardar 2 consultas + 1 agenda seguimiento.<br>7. Expediente paciente: triaje + consulta aparecen. | Todas las etapas fluyen. Orden Llegada#1, #2, #3 se respeta en cola Asignación. |
| **Escenario E2E B — Esp. SIN triaje · 15 min · cupo 12 · pool 1:<br>1. Agendar 2 pacientes · Vacunas.<br>2. Check-in.<br>3. Triage dashboard → NUNCA aparecen estas 2 citas en cola triaje.<br>4. Recepción asigna médico (o auto-sistema).<br>5. Médico consulta → placeholder "Sin triaje".<br>6. Guardar consulta y expediente. | Flujo correcto. |
| **Compatibilidad hacia atrás": Cita de evento viejo (sin campos nuevos) → `medicoEncargado` (singular) → cae en el pool fallback → se ve y se atiende. | OK |
| Cupo máximo: Intentar agendar paciente #7 en cupo 6 → bloque cupoLleno. | Error usuario-friendly toast informativo, sin romper |
| SSE abiertos 3 roles actualizan en tiempo real | OK |
| `typecheck` + `build` | 0 errores |
| Registro de errores + screenshots | 04_Etapa4 |

** Criterio de avance: 2 escenarios E2E pasan 100%.

---

## Etapa 5 — Apartado Médico Rediseñado Editable · 2 Columnas)
### Duración: ~1.5 Días

### Objetivo
El médico ve y edita información paciente + valoración en una sola pantalla. Encender feature flag `EDITABLE_INFO_MEDICA: true`.

### Tareas

| Tarea | Archivos |
|-------|---------|
| 5.1. Extraer componentes reutilizables Info Médico General (Datos Paciente, Alergias, Antecedentes bool + texto) desde `importarexpedientepage.tsx` a `components/paciente/DatosGeneralesEditor.tsx`, InfoMedicaEditor.tsx`, `AntecedentesEditor.tsx`. Refactorizar Importar Expediente para usarlos (debe comportarse igual). | [importarexpedientepage.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/pacientes/importarexpedientepage.tsx) + 3 archivos nuevos components/paciente/. |
| 5.2. Crear Nuevo Componente `TriageReadOnly.tsx` (signos vitales solo lectura) | Nuevo en `components/medico/` |
| 5.3. **Refactor `Medico.tsx` Layout 2 columnas:<br>· Col Izq → DatosGenerales + Info Médica Editable ✏️ (botón guardar independiente con llamada a `updatePaciente` + `updateInformacionMedica`).<br>· Col Der → `TriageReadOnly` (con placeholder sin triaje) + form valoración + 2 campos nuevos `planTratamiento`, `observaciones`. | [Medico.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/Medico.tsx) |
| 5.4. `ExpedienteMedicalInfo.tsx`: Añadir los campos que hoy están ocultos: medicamentosActuales, 9 antecedentes bool, patologicos texto, familiares texto. | [ExpedienteMedicalInfo.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/expediente/ExpedienteMedicalInfo.tsx) |
| 5.5. Expediente timeline: `saltado_triage=true` → badge "No requirió triaje · Saltado" | Expediente* |

### Capa de Pruebas + Resolución Errores + Auditoría
| Acción | Salida |
|--------|--------|
| Importar Expediente pantalla: tras refactor componentes → comportamiento IDÉNTICO que antes (Campos iguales, storage, guardar iguales). | OK |
| Pantalla Medico 2 columnas:<br>1. Abrir consulta paciente Med General CON triaje → 2 cols visibles.<br>2. Médico añade 1 alergia y agrega 1 medicamento.<br>3. Edita teléfono.<br>4. Clic "Guardar Info Paciente" → toast éxito + `auditoría` quién editó en BD.<br>5. Clic Expediente del paciente en otra ventana → ve los cambios. | 5 flujos pasan. 2 columnas responsive <1280px stack vertical OK |
| Pantalla médico 2 columnas paciente Vacunas SIN triaje → Triage placeholder "Sin triaje". | placeholder visible. Campos `planTratamiento` y `observaciones` guardan en nota_medica OK |
| ExpedienteMedicalInfo muestra campos hoy ocultos (meds actuales + 9 bool + texto libre | OK |
| `typecheck` + `build` | 0 errores |
| Registro errores, screenshots, query BD | |

---

## Etapa 6 — Exportación Datos + Historial Citas
### Duración: ~4–6h

### Objetivo
Función de exportar datos de todas las columnas.

### Tareas
| Tarea | Archivos |
|-------|---------|
| 6.1. Instalar `xlsx` (si no). Endpoint `GET /api/export/citas?desde=...&hasta=...&formato=xlsx|csv` con todas las columnas del plan citas Sección 5 Fase 5 cols: Pool médicos, Intervalo, Cupo por bloque, Requiere triaje S/N, saltó S/N. | Nuevo archivo `server/routes/export.js` + `server/index.js` registrar |
| 6.2. Botón "Exportar" en página Citas.tsx o Dashboard Admin. | Citas.tsx |

### Pruebas
Generar Excel 100 filas de citas mix → archivo legible.

---

## Etapa 7 — Pruebas Estrés, Concurrencia, Seguridad + Reparación Deudas
### Duración: ~1 Día

### Objetivo
Probar los casos límite y cerrar huecos.

### Tareas
| Tarea | Descripción |
|-------|-------------|
| 7.1. Race condition cupo (5 usuarios POST /citas mismo bloque cupo=3) — Se pasa de 3. | Usar UPDATE atómico `evento_bloque` o validación select for update |
| 7.2. Doble asignación médico: 2 usuarios intentan `/asignar-medico misma cita → 409 Conflict el 2do. | Validar `medico_encargado is null pre-asign |
| 7.3. Seguridad endpoint: Médico A intenta guardar consulta de Médico B por URL. | 403 |
| 7.4. Pantallas chicas (1366×768): Medico 2 columnas. | Scroll OK |
| 7.5. Usuarios inactivos pool: médicos activoDesde futuro fuera pool. | No aparecen en pool checkboxes. |

### Capa de Pruebas
Guardar scripts de las pruebas en `/audits/07_Etapa7/`.

---

## Etapa 8 — Documentación + Cierre + Go/No-Go
### Duración: ~3h

| Tarea | Salida |
|-------|--------|
| 8.1. Documento de capacitación al equipo operativo (3 páginas cómo funciona nuevo flujo con/sin triaje, pool, check-in, asignación, pantalla médico editable. | `docs/capacitacion_operativa.md` (si lo pides) |
| 8.2. Correr `npm run build` final, `typecheck` final, Dump BD post. | Entregar paquete |
| 8.3. Junta Go/No-Go: Última revisión Registro Global de Errores severos pendientes = 0. | Si hay = merge a main/deploy staging |

---

## Capa Transversal: Registro Global de Errores (Plantilla)

Cada error detectado en CUALQUIER etapa se registra AQUÍ con toda la trazabilidad completa:

```markdown
# Registro Global de Errores — Actualización Global Módulo 1

| ID  | Fecha       | Etapa | Archivo / Componente                  | Descripción error                                                                                                                                                                         | Severidad | Pasos reproducir                                                                                          | Solución Implementada                                                                                                       | Responsable | Estado       |
|-----|-------------|-------|----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------|-------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|-------------|--------------|
| E001|             |       |                                        | Ej: TypeScript Property 'x' does not exist...                                                                                                                                                |           |                                           |                                                                                                                           |             |              |
| E002|             |       |                                        | Ej: DB null al asignar médico fuera del pool no retornaba 400                                                                                                                              |           |                                           |                                                                                                                           |             |              |
| E003|             |       |                                        |                                                                                                                                                                                           |           |                                           |                                                                                                                           |             |              |
```

---

## Ruta crítica de tiempo total

| Etapa | Duración Estimada | Fecha (si empezaras hoy) | % Avance (checkpoint) |
|--------|-------------------|------------------------|-----------------------|
| 0 Pre-requisitos | 2 h | Día 0, mañana | 10% |
| 1 Tipos + migraciones | 4–6h | Día 0 tarde | 20% |
| 2 Editor Eventos + Normalización Variables | 1 día completo | Día 1 | 35% |
| 3 Backend endpoints + condicional triaje | 1 día | Día 2 | 55% |
| 4 Flujo Operativo FE (bloques FIFO, Asignación) | 1.5 días | Días 3–4 | 75% |
| 5 Apartado Médico Editable 2 columnas | 1.5 días | Días 4–5 | 90% |
| 6 Exportación Datos | 4–6h | Día 6 mañana | 93% |
| 7 Estrés/Concurrencia/Seguridad | 1 día | Día 6 tarde / Día7 | 97% |
| 8 Cierre/Documentación/Go-NoGo | 3 h | Día7 tarde | 100% |

** Total: ~7 días hábiles o 5 días intenso (2 etapas por dia.

---

## Criterios de Cancelación/Rollback por etapa
Si una etapa > 5 errores de severidad Bloqueante después de 4 horas de debug:
  a) Documentar los 5 fallos,
  b) Retornar a la etiqueta Git del final de la etapa anterior,
  c) Reportar y planificar remediación el día siguiente sin avanzar a la siguiente.

---

>💡 Regla de oro de convivencia: En la misma pantalla en la que el flujo "viejo" siga apareciendo SIEMPRE en paralelo con el nuevo (feature-flags) mientras no se completen las primeras pruebas E2E. El usuario operativo sin darse cuenta de que algo cambió hasta la Etapa 4 cuando se valide todo.
