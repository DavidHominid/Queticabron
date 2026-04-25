import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useNavigate } from 'react-router';
import {
  Calendar,
  Users,
  Activity,
  CheckCircle2,
  UserPlus,
  Heart,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from './dashboard/StatCard';
import { WelcomeCard } from './dashboard/WelcomeCard';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export function DashboardRecepcion() {
  const navigate = useNavigate();
  const { citas, pacientes, eventos } = useData();
  const { user } = useAuth();

  // Obtener el evento activo para hoy en la ciudad del usuario
  const hoy = new Date().toISOString().split('T')[0];
  const ciudadesUsuario =
    Array.isArray((user as any)?.ciudades) && (user as any).ciudades.length
      ? ((user as any).ciudades as string[])
      : user?.ciudad
        ? [user.ciudad]
        : [];
  const eventoActivo = eventos.find((e) => e.estado === 'activo' && ciudadesUsuario.includes(e.ciudad));
  
  const citasHoy = citas.filter((c) => 
    c.eventoId === eventoActivo?.id && 
    c.fecha && new Date(c.fecha).toISOString().split('T')[0] === hoy
  );

  const citasCompletadas = citasHoy.filter(c => c.estado === 'completada');

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        title="¡Buenos días, Recepción!"
        subtitle="Bienvenido al sistema de gestión médica"
        gradientFrom="from-blue-600"
        gradientTo="to-blue-700"
        icon={Calendar}
        badgeText={eventoActivo?.nombre || 'Sin evento activo'}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Citas Hoy"
          value={citasHoy.length.toString()}
          icon={Calendar}
          color="bg-blue-500"
          trend="+12% vs ayer"
        />
        <StatCard
          title="Pacientes Registrados"
          value={pacientes.length.toString()}
          icon={Users}
          color="bg-green-500"
          trend="+5 esta semana"
        />
        <StatCard title="Citas Completadas" value={citasCompletadas.length.toString()} icon={CheckCircle2} color="bg-purple-500" />
        <StatCard title="Eventos Activos" value={eventos.length.toString()} icon={Activity} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Citas de Hoy */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Citas de Hoy</CardTitle>
              <Badge variant="secondary">{citasHoy.length} citas</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {citasHoy.slice(0, 5).map((cita) => {
                const paciente = pacientes.find((p) => p.id === cita.pacienteId);
                return (
                  <div key={cita.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <span className="text-lg font-semibold text-blue-600">{cita.hora.substring(0, 5)}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{paciente?.nombre}</p>
                        <p className="text-sm text-gray-500 capitalize">{cita.especialidad.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <Badge
                          className={
                            cita.estado === 'completada'
                              ? 'bg-green-100 text-green-700'
                              : cita.estado === 'en_consulta'
                              ? 'bg-purple-100 text-purple-700'
                              : cita.estado === 'en_triage'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }
                        >
                          {cita.estado === 'programada' && 'Programada'}
                          {cita.estado === 'en_triage' && 'En Triage'}
                          {cita.estado === 'en_consulta' && 'En Consulta'}
                          {cita.estado === 'completada' && 'Completada'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <Button variant="outline" className="w-full" onClick={() => navigate('/citas')}>
                Ver todas las citas
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 justify-start" onClick={() => navigate('/pacientes')}>
              <UserPlus className="w-4 h-4 mr-2" />
              Registrar Paciente
            </Button>
            <Button className="w-full bg-green-600 hover:bg-green-700 justify-start" onClick={() => navigate('/citas')}>
              <Calendar className="w-4 h-4 mr-2" />
              Agendar Cita
            </Button>
            <Button className="w-full bg-purple-600 hover:bg-purple-700 justify-start" onClick={() => navigate('/eventos')}>
              <Activity className="w-4 h-4 mr-2" />
              Ver Eventos
            </Button>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 justify-start" onClick={() => navigate('/cirugias')}>
              <Heart className="w-4 h-4 mr-2" />
              Ver Cirugías
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
