import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { DashboardRecepcion } from '../components/DashboardRecepcion';
import { DashboardTriage } from '../components/DashboardTriage';
import { DashboardMedico } from '../components/DashboardMedico';
import { DashboardAdmin } from '../components/DashboardAdmin';

export function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout>
      {user.rol === 'recepcion' && <DashboardRecepcion />}
      {user.rol === 'triage' && <DashboardTriage />}
      {user.rol === 'medico' && <DashboardMedico />}
      {user.rol === 'administrador' && <DashboardAdmin />}
    </DashboardLayout>
  );
}