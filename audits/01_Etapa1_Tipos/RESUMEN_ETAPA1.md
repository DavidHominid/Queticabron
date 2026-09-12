# Resumen Etapa 1 - Tipos + Migraciones Seguras + Editor config + Server mapeo

Fecha: 2026-09-11 01:53
Checklist de la etapa:
- [x] types.ts: EspecialidadEvento 4 campos (medicoUsuarioIds, intervaloMinutosDefault, cupoPorBloqueDefault, requiereTriage)
- [x] types.ts: EventoBloque nueva interface
- [x] types.ts: Cita: 7 campos nuevos (bloqueId, horaLlegada, ordenLlegada, prioridadTriage, horaAsignacion, medicoAsignadoPor, saltadoTriage)
- [x] types.ts: Cita.estado union expandida con llegada_registrada, triage_completado, asignando_medico
- [x] types.ts: AntecedentesGenerales.patologicos y familiares (string, opcionales)
- [x] types.ts: ConsultaMedica.planTratamiento y .observaciones (string, opcionales)
- [x] migrations.js: migrateEventosNuevasColumnasEspecialidadYFlujo (4 cols evento_especialidad + 7 cols citas + 3 índices + backfill pool legacy)
- [x] migrations.js: migrateTriajeUnificarDuplicadosOxigenacionGlucosa (UPDATE SET canónicas oxigenacion → saturacion_oxigeno, glucosa → azucar_en_sangre)
- [x] server/index.js: import + invoke de las 2 nuevas migraciones en arranque
- [x] EventoEditor.tsx: createEspecialidad inicializa los 4 campos nuevos a [], 30, 8, true
- [x] server/routes/eventos.js SELECT_EVENTOS: lee 4 cols nuevas desde BD
- [x] server/routes/eventos.js mapEventoEspecialidadRow helper: fallback pool legacy medico_usuario_id → [medicoEncargado]
- [x] server/routes/eventos.js mapRowsToEventos: especialidades salen con los 4 campos nuevos en camelCase
- [x] server/routes/eventos.js persistEspecialidades: INSERT evento_especialidad incluye 4 cols nuevas (pool, intervalo_default, cupo_default, requiere_triage)
- [x] src/app/utils/featureFlags.ts: FEATURES con 5 flags lineales
- [x] AgendaCitasDiaCalendar.tsx: ESTADO_COLORS corregido con 3 estados nuevos para eliminar error TS2739
- [x] Registro Global de Errores: 1 entrada (E001) con solución
- [x] npm run typecheck: 0 errores → ver audits/01_Etapa1_Tipos/typecheck.log
- [x] npm run build: 0 errores (solo warning pre-existente de chunk 500kB) → ver audits/01_Etapa1_Tipos/build.log
