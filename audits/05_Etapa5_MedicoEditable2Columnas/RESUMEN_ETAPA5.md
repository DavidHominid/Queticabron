# Resumen Etapa 5 — Médico · Layout 2 Columnas (Info Editable Independiente vs Valoración)

## [x] Feature Flag
- [x] `src/app/utils/featureFlags.ts` → `EDITABLE_INFO_MEDICA: true` (antes false). Si se desactiva: `Medico.tsx` auto vuelve a 1 columna simple (fallback legacy interno).

## [x] Componente #1 · Datos Generales (Editor independiente)
Archivo: **[DatosGeneralesPacienteEditor.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/medico/DatosGeneralesPacienteEditor.tsx)** (nuevo, carpeta `components/medico/`)

- [x] Modo dual `visualización / edición` con botón **Editar** → pasa a modo input; botones **Cancelar / Guardar cambios** después.
- [x] Dirty tracking en `useMemo` (compara `draftFromPaciente`) — el botón "Guardar cambios" queda deshabilitado si `!dirty`.
- [x] **Campos editables inline**:
  1. Nombre(s) * (required)
  2. Apellidos
  3. Teléfono (Input)
  4. Fecha de Nacimiento (`<Input type=date>`)
  5. Sexo — Select: Masculino / Femenino
  6. Ciudad — reutiliza **[CiudadAutocomplete.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/CiudadAutocomplete.tsx)** (prioridad catálogo local + `/api/ciudades/buscar` proxy).
- [x] **Save independiente** `PUT /api/pacientes/:id` — body: `{nombre, apellido, fechaNacimiento, sexo, telefono, ciudad, usuario_solicitante, rol_solicitante, x-usuario header}`. El backend ya valida **400 duplicado por nombre+apellido (update excluyente al propio id)**.
- [x] Toast éxito al guardar; toast error 400/500 mostrando mensaje servidor.
- [x] `onSaved?: (p: Paciente) => void` — callback opcional. Medico.tsx re-hidrata `setSelectedCita({paciente: actualizado})` así que la UI se refresca instantáneamente sin esperar SSE.
- [x] Banner indicador "Tienes cambios sin guardar" cuando dirty=true + editing.

## [x] Componente #2 · Información Médica (Editor independiente)
Archivo: **[InfoMedicaEditor.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/medico/InfoMedicaEditor.tsx)** (nuevo, carpeta `components/medico/`)

- [x] Modo dual `visualización / edición` + dirty tracking.
- [x] **Campos (100% correspondiente al canónico types `AntecedentesGenerales` / `InformacionMedica`):**
  1. **Alergias** — chips tipo destructivo. Agregar por Enter o botón Agregar. Quitar con `×` inline por chip. Chequeo case-insensitive no duplicar.
  2. **Medicamentos Actuales** — chips tipo secondary. Misma UX enter/agregar/quitar.
  3. **9 Checkboxes Antecedentes Personales Bool** (idénticos a `AntecedentesGenerales`):
     • Cardiopatías / HTA (cardio group) · Diabetes · Asma · Renal · TB · Hemorragia severa · Embarazo actual · Lactancia.
  4. **Antecedentes Patológicos (detalle texto libre)** — historial quirúrgicos, crónicos, transfusiones.
  5. **Antecedentes Familiares / Heredo** — HTA, diabetes, cardiopatías, cáncer padres/hermanos.
  6. **Antecedentes Psicosociales** — ocupación, tabaquismo/alcohol, apoyo social, migratoria.
  7. **Notas permanentes clínicas** — visible a todos los médicos.
- [x] View mode: cuando `!editing`, muestra solo campos no vacíos (si no hay dato, label "Sin X registradas." italic muted), sin checkboxes deshabilitados.
- [x] **Save independiente** `PUT /api/informacion-medica/:pacienteId` (upsert: si no existe `infomed` en `antecedentes` → INSERT; si existe → UPDATE). Auditoría en backend automática con `diffKeys`.
- [x] `onSaved?: (im: InformacionMedica) => void` — Medico.tsx actualiza `setSelectedCita({infoMedica: actualizada})` inline, así que la **alerta de alergias** del formulario de medicamentos se dispara inmediatamente sin refresh.
- [x] Banner "Sin cambios pendientes" / "Cambios sin guardar".

## [x] Medico.tsx — REDISEÑO LAYOUT 2 COLUMNAS RESPONSIVE
Archivo modificado: **[Medico.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/Medico.tsx)** (líneas ~568-1276)

- [x] **Header persistente arriba (100% width)**: badges Num. Expediente / Edad / Sexo / [→] Sin triaje / Hora cita — igual que Etapa4, ahora en su propia Card.
- [x] **Container principal**: `grid-cols-1 xl:grid-cols-[480px_1fr]`.
  - Breakpoint: **≥1280px (xl)** → 2 columnas reales.
  - Menor a 1280px: colapsa a 1 columna normal (primero editores, luego valoración). UX mobile/laptop 13" no se rompe.
  - **480px IZQ WIDTH FIJO** (para nunca encojer el editor mientras el médico escribe); lado derecho `1fr` auto-anchura.
  - Separador `border-r` en xl; en <xl `border-b` (row).
- [x] **COLUMNA IZQUIERDA (480px xl fijo) · Expediente editable**:
  1. `DatosGeneralesPacienteEditor` (arriba)
  2. `<div className="h-px w-full bg-border" />` separador
  3. `InfoMedicaEditor` (abajo)
  - Save INDEPENDIENTES. No necesita hacer clic en "Completar consulta" — el médico puede corregir nombre / teléfono / alergias ANTES de escribir la valoración, sin perder nada del formulario.
- [x] **COLUMNA DERECHA (resto) · Valoración clínica**:
  1. Bloque triaje o placeholder Sin Triaje (`saltadoTriage===true`) separado en su propia Card.
  2. Tabs `[Consulta | Expediente]` intacto:
     - Tab **Consulta**: Motivo / Padecimiento / Exploración Física / Diagnóstico / Tratamiento + tabla medicamentos (con alerta alergias si colisiona con infoMedica actualizada!) / tabla Estudios / Recomendaciones / Checkbox seguimiento-calendario / Cancelar · Completar consulta.
     - Tab **Expediente**: Historial citas del paciente con botón Ver detalle.
- [x] **Fallback legacy**: si `FEATURES.EDITABLE_INFO_MEDICA===false` || `!pacienteActual` → muestra grid compacto 1-columna 6 campos readonly (nombre, tel, fechaNac, identif, ciudad, fechaRegistro) — sin romper el dashboard.

## Auditoría Pasada

- [x] `npm run typecheck` = 0 errores → [typecheck.log](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/audits/05_Etapa5_MedicoEditable2Columnas/typecheck.log)
- [x] `npm run build` = 0 errores · built in **27.35s** (chunks grandes pre-existente, no bloquea Go) → [build.log](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/audits/05_Etapa5_MedicoEditable2Columnas/build.log)
- [x] GetDiagnostics = 0 issues

## Resumen UX Flujo completo E0-E5

```
1. Recepción agenda cita (Editor Eventos pool multi-médico)
2. Recepción Check-in → orden Llegada #N. Si Vacunas/Chequeo salta triaje → asignando_medico directo.
3. Triage captura SOLO citas que requieren triaje → triage_completado.
4. Recepción Cola de Asignación (AsignacionMedicoQueue integrada Dashboard):
   1° citas saltadoTriaje, 2° prioridad/llegada. Click médico del pool o Otro.
   Cita pasa en_consulta, medicoEncargado asignado.
5. MÉDICO abre Medico.tsx → PANTALLA NUEVA 2 COLUMNAS:
   ┌──────────────────────────┬─────────────────────────────────────┐
   │COL IZQ 480px (xl)        │COL DERECHA (1fr)                   │
   │                          │                                     │
   │• Datos Generales Editar  │• Triage (8 signos vitales)          │
   │  nombre/tel/fechaNac/    │  / Placeholder Sin Triaje dashed   │
   │  sexo/ciudad             │                                     │
   │       ↓ Save             │• Tabs: [Consulta · Expediente]      │
   │                          │  Motivo / Padecimiento /           │
   │• Info Médica Editar      │  Exploración / Diagnóstico /       │
   │  Alergias chips          │  Tratamiento (alerta alergias      │
   │  Medicamentos chips      │   LIGADA ACTUALIZACIÓN INFOMED!)   │
   │  9 bool antecedentes     │  Estudios · Recomendaciones        │
   │  Patológicos/Familiares  │  Seguimiento calendario            │
   │  Psicosociales / Notas   │                                     │
   │       ↓ Save             │  [Cancelar] [Completar consulta]   │
   └──────────────────────────┴─────────────────────────────────────┘
```

## Etapa 5 = CERRADA ✅. Siguiente (Plan Etapa6): Export Citas xlsx/csv (server/routes/export.js + botón UI Dashboard Citas).
