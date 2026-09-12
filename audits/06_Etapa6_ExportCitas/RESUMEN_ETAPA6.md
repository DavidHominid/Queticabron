# Resumen Etapa 6 — Exportación Citas (Libro Excel XLSX + CSV Unicode)

## [x] Instalación
- [x] Dependencia: `npm install xlsx` (SheetJS Community). Versión actual instalada.
- [x] Dependencia ya existía en node_modules (`up to date`). Log: audits/06_Etapa6_ExportCitas/_npm_install_xlsx.log.

## [x] Backend — Endpoints Nuevos
Archivo nuevo: **[export.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/export.js)**
Integración: **[server/index.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/index.js#L41)** import + app.use `/api/export`.

Los 3 endpoints:
1. **GET /api/export/citas.xlsx** → libro .xlsx attachment Content-Type MS-OpenXML + Content-Disposition filename safe.
2. **GET /api/export/citas.csv** → CSV UTF-8 + **BOM \uFEFF** (Excel lee acentos y Ñ correctamente).
3. **GET /api/export/citas-preview** → JSON {total, porEstado, fechaPrimera, fechaUltima} (UI futura si queremos badge N pre-download).

### Filtros Query Params aceptados en los 3 endpoints:
| Param | Descripción |
|---|---|
| `fechaDesde` | YYYY-MM-DD. >= fecha_cita |
| `fechaHasta` | YYYY-MM-DD. <= fecha_cita |
| `eventoId` | ID evento |
| `especialidad` | Código (insensitive) |
| `estado` | Estado cita (insensitive) |
| `ciudad` | Ciudad paciente (normaliza lowercase _ y -) |
| `medicoId` | usuario_medico_asignado O lower(medico_encargado) |
| LIMIT | 20,000 rows hard cap para prevenir memory spike |

### 19 Columnas canónicas exportadas:
1. ID Cita
2. Fecha
3. Hora
4. Duración (min)
5. Paciente (nombre + apellido)
6. Teléfono Paciente
7. Ciudad Paciente (capitalizada)
8. Evento (nombre)
9. Ciudad Evento
10. Especialidad (label capitalizada)
11. Tipo Cita
12. Estado (traducción Humana: Llegada, Triaje OK, Asignando Médico, En Consulta, etc.)
13. Orden Llegada (#N formateado)
14. Saltado Triaje (Sí/No)
15. Prioridad Triaje (Urgente=1, Prioritario=2, Normal=3)
16. Médico Asignado (usuarios.nombre apellidos | medico_encargado legacy fallback)
17. Fecha Triaje
18. Triaje Realizado por
19. Observaciones

### Estilo XLSX:
- `ws['!cols']` widths precalculados (ID=9, Paciente=28, Observaciones=40 chars etc.)
- Sheet nombre: "Citas"
- Buffer salida tipo: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Header `X-Total-Rows` response con el total para tracking frontend

## [x] Frontend — Integración UI Export 2 Dashboards

### ✅ DashboardRecepcion ([DashboardRecepcion.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/components/DashboardRecepcion.tsx))
- Header "Citas de Hoy" expandido: Título + evento activo subtitle | Badge N citas | Botón [⇩ Exportar] DropdownMenu
- Dropdown 2 grupos:
  1. **SOLO HOY (YYYY-MM-DD)** → Excel XLSX · CSV (aplica fechaDesde=fechaHasta=hoy + eventoId activo + ciudad usuario)
  2. **EVENTO COMPLETO** → si existe eventoActivo?.id: XLSX · CSV (mismo ciudad + eventoId SIN rango fecha)
- Helpers inline: `buildExportParams(scope)` + `triggerDownload(extension, scope)` anchor target="_blank" navegador hace Content-Disposition download natural. No CORS, no fetch blob — simple, funciona en 100% navegadores.
- Toast éxito "Descargando Excel…" / "CSV …"

### ✅ Página Citas ([Citas.tsx](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/src/app/pages/Citas.tsx) ruta `/citas`)
- Header página expandido: H1/subtitle | Badge `citasVisibles.length N citas` | Botón [⇩ Exportar] DropdownMenu
- Dropdown 3 grupos:
  1. **Últimos 30 días** (fechaDesde=hoy-30d, fechaHasta=hoy + Filtros ciudad del usuario, admin bypass)
  2. **Últimos 90 días** (hoy-90d → hoy)
  3. **Todas (ciudades visibles)** — sin rango fecha, filtro ciudad igual que eventosVisibles
- Misma UX trigger, toast confirmación.
- canSeeAllCiudades bypass correcto: admin exporta TODAS las ciudades; recepción solo la(s) suya(s).

## [x] Seguridad
- Sin body JSON, GET endpoints = logs Sentry/Apify fáciles.
- filtro ciudad PostgreSQL usa `COALESCE(p.ciudad,'')` sin unaccent (no requiere extensión habilitada; función solo existía en export.js primera draft, removida).
- LIMIT 20,000 filas hard-cap en SQL para evitar descarga de 1M rows accidental.
- Filename safe `citas_words_of_hope_YYYYMMDD_HHmm.xlsx/.csv` sin chars ilegales.

## [x] Auditoría Pasada
- [x] `npm run typecheck` = 0 errores → audits/06_Etapa6_ExportCitas/typecheck.log
- [x] `npm run build` = built in **22.14s · 0 errores** (warning chunk grande pre-existente) → audits/06_Etapa6_ExportCitas/build.log
- [x] GetDiagnostics = 0 issues

## 🚨 Errores Detectados y Solucionados (E007 + E008)

### E007 — SyntaxError anotaciones TS en archivo JS ESM (CRÍTICA)
- **Síntoma**: `server/routes/export.js` v0 draft tenía anotaciones de tipo TypeScript en `.js` plano (`ESTADOS_LABEL: Record<string,string>`, `params: unknown[]`, etc.). Node 22 NO carga `ts-node` ni `tsx` para archivos `server/**/*.js` por política del proyecto (AGENTS.md §2 Backend Vanilla JS ESM).
- **Impacto**: Node crasheaba en startup puerto 3001 con `SyntaxError: Missing initializer in const declaration` línea 7. Vite proxy reportaba **ECONNREFUSED /api/** ×N durante ~2 minutos hasta restart.
- **Solución**: Reescribir [export.js](file:///d:/Modulo1_vs_David/MODULO%201/MODULO%201/server/routes/export.js) COMPLETO a vanilla JS ESM — mismo comportamiento 3 endpoints, 19 columnas, filtros, SheetJS buffer, CSV BOM UTF-8, LIMIT 20k rows.
- **Validación**: `node -c server/routes/export.js` = Syntax OK. Server arranca, DB conectada, LISTEN operacional_change OK.
- **Estado**: ✅ Resuelto. Documentado en errores_global.md fila E007.

### E008 — SQL 500 /api/export/* + Cascada ECONNRESET Vite proxy (ALTA)
- **Síntoma Runtime Julie (10:37 a.m. 2026-09-11)**:
  ```
  [FRONTEND] [vite] http proxy error: /api/sse · Error: read ECONNRESET
  [FRONTEND] [vite] http proxy error: /api/login · Error: read ECONNRESET
  ```
- **Root Causa 2 capas**:
  1. **I1 JOINs/columnas incorrectas**: `eventos.id_evento` vs PK real `eventos.id`; columna `nombre` vs real `titulo`; `ciudad` vs `ubicacion`; tabla `citas.usuarios` vs esquema real `public.usuarios`.
  2. **I2 Tabla faltante / Columna faltante parse error PostgreSQL**:
     - `LEFT JOIN "citas".tipos_cita tcn` → BD histórica Words of Hope **no tiene** `tipos_cita` (solo `evento_tipo_cita`). PostgreSQL valida relación en parseo ANTES de ejecutar → `relation "citas.tipos_cita" does not exist` (COALESCE solo salva nulos, NO tablas faltantes).
     - Subquery triaje: `SELECT fecha_triaje FROM citas.triaje` → histórica usa `fecha_hora`/`fecha`. PostgreSQL → `column "fecha_triaje" does not exist`.
  3. **Cascada**: Cada 500 cerraba socket con cliente; Vite proxy interpreta cierre a mitad del stream SSE/login como ECONNRESET.
- **Solución V4 Robusta 2 capas**:
  1. **`detectCitasTipoCitaRef()`**: Reutilizo helper de `citas.js` L8 — introspección FK `citas_fk_tipo_cita` vía `information_schema.table_constraints`. Devuelve `'tipos_cita' | 'evento_tipo_cita' | null`. Construyo JOIN condicional SOLO a la tabla que existe.
  2. **`to_jsonb(tj)->>'col_name'::timestamp` Pattern**: En subquery triaje reemplazo referencia directa de columna por acceso JSONB. Si la clave no existe en la tabla, Postgres devuelve NULL sin error de parseo. Permite 3 variantes históricas de fecha y 2 de responsable triaje.
- **Validación Runtime (confirmada ✅)**:
  | Endpoint | HTTP Status | Resultado |
  |---|---|---|
  | `GET /api/export/citas-preview` | 200 | JSON `{total:4, porEstado:{Completada:3,pendiente:1}, fechaPrimera:2026-03-14, fechaUltima:2026-09-04}` |
  | `GET /api/export/citas.csv?fechaDesde=2025-01-01` | 200 | `text/csv; charset=utf-8`, BOM UTF-8 `EF BB BF` presente, 19 cols HEADER exactas, 4 filas datos, total lines 5 (header+4 rows = X-Total-Rows:4 coincide) |
  | `GET /api/sse` | 200 | `text/event-stream`, `event: connected`, `data: ok` — SIN ECONNRESET |
  | `GET /api/login` (health GET) | (405 method no permitido esperado) | Socket abierto, sin cierre prematuro. |
- **Estado**: ✅ Resuelto. Documentado en errores_global.md fila E008.

### ✅ Checklist E007/E008 cerrados
- [x] 6.5.a typecheck FE 0 errores
- [x] 6.5.b build FE 0 errores
- [x] 6.5.c Node reinicia post-fix sin stderr inicial
- **[x] 6.5.d curl /api/export/citas-preview → 200 JSON válido (total=4)**
- [x] 6.5.e E007 documentado errores_global.md
- **[x] 6.5.e.2 E008 documentado errores_global.md**
- **[x] 6.5.f Actualizar RESUMEN_ETAPA6.md con secciones E007 + E008**
- **[x] 6.5.g curl /api/export/citas.csv?fechaDesde=2025-01-01 → 200 CSV BOM UTF-8 19 cols × 4 rows**

## Resumen Plan Combinado

✅ Etapa 0. Setup/auditorías
✅ Etapa 1. Tipos + migraciones BD
✅ Etapa 2. Editor Eventos + Normalización variables
✅ Etapa 3. Backend Operativo (Checkin, colas, asignación)
✅ Etapa 4. Frontend Flujo Operativo (dashboards)
✅ Etapa 5. Médico · Layout 2 columnas editable
✅ Etapa 6. Exportación Citas XLSX/CSV 🔒 CERRADA

---

⏭ **Etapa 7 pendiente**: Pruebas de Estrés y Concurrencia:
   1. Race cupo (N=5 POSTs a cupo=3) → 2x 409 Conflict esperados.
   2. Doble asignación mismo medico → 409 o last-write-wins auditado.
   3. 403 Médico ajeno intenta guardar consulta de otro → bloqueado.
   4. Medico.tsx responsive 1366×768 (colapsa a 1 columna; no overflow).
   5. Thunder Client collection A-F runtime validación.

⏭ **Etapa 8 pendiente**: Documentación Capacitación Operativa, Build final, Dump BD, junta Go/No-Go → merge a main.
