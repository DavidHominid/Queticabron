# Gestor Citas - Words of Hope (Centro Comunitario de Salud)

Guía técnica del proyecto para agentes e integrantes del equipo que desarrollen dentro de Antigravity IDE.

---

## 1. Información General del Proyecto
- **Nombre**: GestorCitas_WordsOfHope (Módulo 1)
- **Propósito**: Gestión integral de eventos clínicos comunitarios, especialidades, agendamiento de citas por roles, expedientes médicos (triage, consulta médica, quirúrgico) y trazabilidad/auditoría.
- **Roles del Sistema**:
  - **Recepción**: Agendamiento, cancelación, reasignación y flujo de citas.
  - **Triage**: Registro de signos vitales e indicación inicial al recibir pacientes.
  - **Médicos**: Consulta médica, registro de notas clínicas, recetas, estudios y expedientes por cita.
  - **Administración**: Gestión de usuarios, configuración del sistema, catálogo de variables, sedes y auditoría.

---

## 2. Arquitectura de Tecnologías

### Frontend
- **Framework**: React 18 con TypeScript (`tsx`) y Vite 6.
- **Rutas**: React Router 7.
- **UI & Estilos**: Tailwind CSS v4, Radix UI, PrimeReact, Lucide React icons, FullCalendar v6.
- **Base Path Vite**: `/citas/`
- **Alias de Importación**: `@/*` apunta a `./src/*`.

### Backend
- **Framework**: Express.js (Node.js ES Modules).
- **Base de Datos**: PostgreSQL con cliente `pg` conectando a través de pool de conexiones.
- **Tiempo Real**: Server-Sent Events (SSE) en `/api/sse` para actualizaciones push en citas, triage y consultas.
- **Autenticación**: Hashing de contraseñas con `bcryptjs`.
- **Migraciones Automáticas**: El servidor ejecuta migraciones en inicio (`server/index.js`).

---

## 3. Configuración de Entorno (`.env`)

Variables clave requeridas:
```env
DB_USER=admin_citas
DB_PASSWORD=*****
DB_HOST=wordsofhope.dyndns.org
DB_PORT=5432
DB_NAME=centro_comunitario
DB_SCHEMA=citas
PORT=3001
VITE_API_PORT=3001
EVENTOS_MODO_PRUEBAS=true
VITE_EVENTOS_MODO_PRUEBAS=true
```

---

## 4. Comandos de Desarrollo y Verificación

- **Desarrollo Simultáneo (Frontend + Backend)**:
  ```bash
  npm run dev
  ```
  *(Inicia Vite en puerto 5000 y el backend en puerto 3001 con watcher).*

- **Solo Frontend**:
  ```bash
  npm run frontend
  ```

- **Solo Backend**:
  ```bash
  npm run backend
  ```

- **Verificación de Tipos TypeScript**:
  ```bash
  npm run typecheck
  ```

- **Compilación de Producción**:
  ```bash
  npm run build
  ```

---

## 5. Principios de Diseño e Interfaz (Brand Personality)
- **Cálido y Humano, Profesional Clínico**: Transmitir calma, claridad y confianza.
- **WCAG AA**: Garantizar accesibilidad de contraste, estados de foco visibles y navegación por teclado.
- **Estados explícitos**: Acompañar siempre indicadores de color con texto/etiquetas descriptivas.
