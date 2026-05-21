import { createBrowserRouter } from 'react-router';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { Eventos } from './pages/Eventos';
import { EventoDetalle } from './pages/EventoDetalle';
import { EventoEditor } from './pages/EventoEditor';
import { Pacientes } from './pages/Pacientes';
import { Citas } from './pages/Citas';
import { TriageNuevo } from './pages/TriageNuevo';
import { Consultas } from './pages/Consultas';
import { Expedientes } from './pages/Expedientes';
import { ExpedientePaciente } from './pages/ExpedientePaciente';
import { ExpedienteResumen } from './pages/expediente/ExpedienteResumen';
import { ExpedienteCitas } from './pages/expediente/ExpedienteCitas';
import { ExpedienteCitaDetalle } from './pages/expediente/ExpedienteCitaDetalle.tsx';
import { Seguimientos } from './pages/Seguimientos';
import { Auditoria } from './pages/Auditoria';
import { Cirugias } from './pages/Cirugias';
import { Medico } from './pages/Medico';
import { Usuarios } from './pages/Usuarios';
import { Variables } from './pages/Variables';
import { AgendaQuirofanos } from './pages/AgendaQuirofanos';
import { RootLayout } from './components/RootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: Login,
      },
      {
        path: 'dashboard',
        Component: Dashboard,
      },
      {
        path: 'eventos',
        Component: Eventos,
      },
      {
        path: 'eventos/nuevo',
        Component: EventoEditor,
      },
      {
        path: 'eventos/:id',
        Component: EventoDetalle,
      },
      {
        path: 'eventos/:id/editar',
        Component: EventoEditor,
      },
      {
        path: 'pacientes',
        Component: Pacientes,
      },
      {
        path: 'citas',
        Component: Citas,
      },
      {
        path: 'triage',
        Component: TriageNuevo,
      },
      {
        path: 'consultas',
        Component: Consultas,
      },
      {
        path: 'medico',
        Component: Medico,
      },
      {
        path: 'expedientes',
        Component: Expedientes,
      },
      {
        path: 'expediente/:pacienteId',
        Component: ExpedientePaciente,
        children: [
          {
            index: true,
            Component: ExpedienteResumen,
          },
          {
            path: 'citas',
            Component: ExpedienteCitas,
          },
          {
            path: 'citas/:citaId',
            Component: ExpedienteCitaDetalle,
          },
        ],
      },
      {
        path: 'cirugias',
        Component: Cirugias,
      },
      {
        path: 'agenda-quirofanos',
        Component: AgendaQuirofanos,
      },
      {
        path: 'seguimientos',
        Component: Seguimientos,
      },
      {
        path: 'auditoria',
        Component: Auditoria,
      },
      {
        path: 'usuarios',
        Component: Usuarios,
      },
      {
        path: 'variables',
        Component: Variables,
      },
      {
        path: 'configuracion',
        Component: Dashboard, // Placeholder
      },
    ],
  },
]);
