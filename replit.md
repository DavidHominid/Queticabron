# Words of Hope - Medical Management System

## Overview
A full-stack healthcare management platform for managing patient records, appointments, triage, surgeries, consultations, and administrative auditing. Built for Centro Comunitario Nueva Esperanza (Sonoyta & Puerto Peñasco).

## Architecture
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS 4 + Radix UI / shadcn/ui
- **Backend:** Node.js + Express.js (ES Modules) on port 3001
- **Database:** Replit built-in PostgreSQL (schema: `palabras_de_esperanza`)
- **Build tool:** Vite 6
- **Package manager:** npm

## Project Structure
```
root/
├── src/                  # Frontend source (React/TypeScript)
│   └── app/
│       ├── components/   # UI components
│       ├── context/      # Auth and Data contexts
│       ├── pages/        # Route views
│       └── routes.ts     # React Router definitions
├── server/               # Backend (Node/Express)
│   ├── config/db.js      # PostgreSQL connection pool
│   ├── routes/           # API route handlers
│   └── index.js          # Express entry point
├── vite.config.ts        # Vite config (port 5000, host 0.0.0.0, allowedHosts: true)
└── package.json
```

## Development
- **Start:** `npm run dev` — runs frontend (port 5000) and backend (port 3001) concurrently
- **Frontend only:** `npm run frontend`
- **Backend only:** `npm run backend`
- **Build:** `npm run build`

## Workflow
- Single workflow: "Start application" — runs `npm run dev` on port 5000 (webview)

## Deployment
- Target: autoscale
- Build: `npm run build` (Vite builds to `dist/`)
- Run: `PORT=5000 node server/index.js` (Express serves built frontend + API on port 5000)

## Environment Variables
- `DATABASE_URL` — Replit's built-in PostgreSQL connection string (auto-provided)
- `DB_SCHEMA` — set to `palabras_de_esperanza`

## Database Schema
Schema: `palabras_de_esperanza` with tables:
- `paciente` — patient records
- `usuarios` — system users (login)
- `citas` — appointments
- `triaje` — triage records
- `nota_medica` — medical consultation notes
- `agenda_cirugias` — surgery scheduling
- `expediente` — medical records/files
- `antecedentes` — patient medical history
- `eventos` — medical events/campaigns
- `auditoria` — audit log

## Default Login
- **admin** / admin123 (role: administrador)
- Other test users can be created via the admin panel

## Key Features
- Patient management (Pacientes / Expedientes)
- Appointment scheduling (Citas + FullCalendar)
- Triage, consultations, surgeries, follow-ups
- Study/lab results management
- User management + login (role-based: recepcion, triage, medico, administrador)
- Audit logging
