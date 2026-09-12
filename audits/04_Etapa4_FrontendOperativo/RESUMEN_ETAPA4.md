# Resumen Etapa 4 - Flujo Operativo Frontend (Recepción → Triage → Asignación → Médico)

- [x] featureFlags.ts: `CHECKIN_RECEPCION = true` activado para pruebas
- [x] DashboardRecepcion.tsx: labels 3 estados nuevos (llegada_registrada, triage_completado, asignando_medico) con paleta tokens existentes
- [x] DashboardRecepcion.tsx: botón Check-in por cita `PUT /api/citas/checkin/:id` + headers `x-usuario` fallback + toast éxito orden Llegada #N
- [x] DashboardRecepcion.tsx: badge `Llegada #N` (icono Ticket) solo cuando ordenLlegada>0; badge "Sin triaje" (icono ArrowRight) si saltadoTriage=true
- [x] NUEVO componente [AsignacionMedicoQueue.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/triage/AsignacionMedicoQueue.tsx) (carpeta `components/triage/`):
  - Escoge evento activo automáticamente (`pickEventoActivoParaTriageConCitas`)
  - Construye cola local FIFO: `saltadoTriage ASC (0=primero) → prioridadTriage ASC → horaLlegada → ordenLlegada → hora`
  - Filtra solo: `(triage_completado OR asignando_medico OR (llegada_registrada AND saltadoTriage=true)) AND sin medicoEncargado`
  - Pool médicos por especialidad: botones individuales si poolMedicosIds tiene data; dropdown "Otro…" + fallback si pool vacío (todos los médicos del catálogo)
  - `PUT /api/citas/asignar-medico/:id` con body `{medicoId, prioridadTriage, usuarioId, nombreUsuario, rol, ciudad}`; 400 si fuera pool muestra `data.pool: string[]`
  - Badges visuales: Prioridad 1 destructiva roja / 2 amber / 3 default; Ticket orden; Clock hora llegada; ArrowRight Sin triaje
  - Botón Refrescar manual + SSE automático (DataContext ya tiene listener `operacional`)
- [x] DashboardRecepcion.tsx: integración AsignacionMedicoQueue full-width debajo grid principal (solo si flag CHECKIN_RECEPCION=true)
- [x] TriageNuevo.tsx:
  - citasHoy incluye 6 estados (programada, llegada_registrada, en_triage, triage_completado, asignando_medico, en_consulta)
  - **NUEVO filtro crítico**: `citasVisibles excluye saltadoTriage===true` (Vacunas/Chequeo NUNCA aparecen en dashboard de triaje)
  - **NUEVO orden FIFO**: `prioridadTriage ASC (def 3) → ordenLlegada ASC → horaLlegada ASC → hora ASC`
  - handleSubmit: `updateCita(id, {estado: 'triage_completado'})` YA NO pasa directo a en_consulta — respeta flujo separado asignación médica
- [x] Medico.tsx:
  - Nuevo import ArrowRight (error E006 typecheck resuelto)
  - Header paciente badges: NUEVO badge `[ArrowRight] Sin triaje` cuando selectedCita.saltadoTriage===true
  - Bloque signos vitales: TERNARIO correcto `(!triage && saltado) ? placeholder : triage ? vitals : null`
    - Placeholder `border-2 border-dashed` tono `--chart-2` con texto "Sin triaje · Flujo directo a consulta" + descripción especialidad no requiere + paso directo check-in → asignación
- [x] npm run typecheck = 0 errores → audits/04_Etapa4_FrontendOperativo/typecheck.log
- [x] npm run build = 0 errores (warning chunk grande pre-existente no bloquea) → audits/04_Etapa4_FrontendOperativo/build.log

## Notas de E006 (solucionado):
- `src/app/pages/Medico.tsx líneas 583 y 621`: TS2304 "Cannot find name 'ArrowRight'" — uso el icono sin importarlo. Fix: añadir `ArrowRight` al bloque imports lucide-react (línea 32). Posterior typecheck OK.

## Resumen del flujo completo ahora funcional FE + BE:

1. **Recepción agenda cita** → `saltado_triage = !requiereTriageEsp` se marca desde POST citas (Etapa3)
2. **Recepción Check-in (Dashboard Recepcion)** → `PUT /citas/checkin/:id` ordenLlegada auto; estado pasa `asignando_medico` (si salta triaje) o `llegada_registrada` (si requiere). Badge Llegada #N aparece inmediatamente (SSE push)
3. **Triage captura (TriageNuevo)** → SOLO ve citas que requieren triaje; ordena automáticamente por prioridad+orden llegada; guardar triaje cambia estado `triage_completado`. NUNCA aparecen citas salto triaje.
4. **Recepción Asigna médico (columna AsignacionMedicoQueue integrada Dashboard)** → Vacunas/Chequeo salto triaje aparecen PRIMERO; luego prioridad/llegada. Click médico del pool o seleccionar otro; estado pasa `en_consulta` y medicoEncargado se asigna
5. **Médico abre Medico.tsx** → Ve citas en_consulta asignadas a él; si especialidad no requiere triaje aparece placeholder `Sin triaje · Flujo directo a consulta` con badge header; si tiene triaje los signos vitales se ven normales
6. **POST /consultas guarda valoración** → Etapa3 validó 409 si estado!==en_consulta, 403 si médico ajeno, auditoría "Atendida sin triaje" cuando procede. Estado pasa completada + SSE broadcast inmediato todos dashboards
