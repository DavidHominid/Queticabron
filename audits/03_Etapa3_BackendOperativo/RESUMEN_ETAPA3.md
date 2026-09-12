# Resumen Etapa 3 - Backend Operativo (Flujo Citas N:M + Triaje Opcional + Colas FIFO)

- [x] utils.js: toDBEstado/toFEEstado 3 estados nuevos + helpers calcularIntervaloEfectivo / calcularCupoEfectivo (Default+Override horario>esp>fallback)
- [x] utils.js: mapCita retorna 7 cols nuevas: bloqueId, horaLlegada, ordenLlegada, prioridadTriage, horaAsignacion, medicoAsignadoPor, saltadoTriage
- [x] citas.js POST /: marca saltado_triage = !requiereTriageEsp tomado desde evento_especialidad al agendar
- [x] citas.js PUT /checkin/:id: orden_llegada = MAX(fecha+evento+esp)+1; estado = saltaTriaje ? asignando_medico : llegada_registrada; broadcast; recordAudit
- [x] citas.js PUT /asignar-medico/:id: 409 si estado no válido; 400 si medicoId fuera pool (pool vacío → backward compat legacy singleton); 403 si rol≠medico; SET medico_encargado, hora_asignacion=NOW, prioridad_triage, medico_asignado_por, estado='en_consulta'; broadcast; recordAudit
- [x] citas.js GET /cola-triage/:eventoId: WHERE saltado_triage=false + estados lógicos; ORDER estado_peso > prioridad_triage ASC > hora_llegada > orden_llegada
- [x] citas.js GET /cola-asignacion/:eventoId: WHERE triage_completado OR (saltado_triage AND asignando_medico); ORDER saltado_triage ASC (0 primero) > prioridad > llegada > orden
- [x] triage.js POST /: TOP validación → 400 si saltado_triage o esp no requiere triaje con _meta; UPDATE citas.estado='triage_completado' (no 'confirmada' legacy); broadcast; recordAudit
- [x] consultas.js POST /: import toFEEstado; 409 si estado!==en_consulta con _meta; 403 si medico guardando≠medico_encargado (excepto admin); recordAudit detalles append "Atendida sin triaje" cuando saltado_triage=true
- [x] npm run typecheck 0 errores → audits/03_Etapa3_BackendOperativo/typecheck.log
- [x] npm run build 0 errores (warning pre-existente chunk grande no bloqueante) → audits/03_Etapa3_BackendOperativo/build.log

## Flujo Completo de Estados Etapa 3 verificado:
programada → [PUT checkin] → (saltaTriaje? asignando_medico : llegada_registrada) → [POST triaje OK] → triage_completado → [PUT asignar-medico OK] → en_consulta → [POST consultas OK] → completada

## Checklist Thunder Client 6 casos (A-F) — ejecución pendiente en herramienta cliente:
- [ ] Caso A: POST 2 citas misma fecha/esp 1 triaje=true + 1 triaje=false → saltado_triage correcto
- [ ] Caso B: PUT checkin ambas → ordenLlegada 1 y 2; Vacunas pasa directo asignando_medico; Med Gen pasa llegada_registrada
- [ ] Caso C: POST triaje cita Vacunas → 400 con _meta { saltadoTriage, requiereTriage }
- [ ] Caso D: PUT asignar-medico cita con médico FUERA pool → 400 + pool: string[]
- [ ] Caso E: PUT asignar-medico cita triage_completado con pool médico válido → estado=en_consulta, medico_encargado, auditoría OK
- [ ] Caso F: GET cola-triage + cola-asignacion → Vacunas NUNCA en cola-triage; ambas en cola-asignacion con orden esperado (vacunas primero, luego prioridad/llegada)
