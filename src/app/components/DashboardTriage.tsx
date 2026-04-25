import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useNavigate } from 'react-router';
import { Activity, Clock, Users, CheckCircle2, AlertCircle, ClipboardList, ArrowRight } from 'lucide-react';
import { StatCard } from './dashboard/StatCard';
import { WelcomeCard } from './dashboard/WelcomeCard';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export function DashboardTriage() {
  const navigate = useNavigate();
  const { citas, pacientes, eventos, registrosTriage } = useData();
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
  
  const citasPendientes = citasHoy.filter((c) => c.estado === 'programada');
  const citasEnTriage = citasHoy.filter((c) => c.estado === 'en_triage');
  const citasCompletadas = citasHoy.filter((c) => c.estado === 'completada' || c.estado === 'en_consulta');

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        title="¡Buenos días, Enfermería!"
        subtitle="Gestión de signos vitales y triage de pacientes"
        gradientFrom="from-green-600"
        gradientTo="to-green-700"
        icon={ClipboardList}
        badgeText={`${citasHoy.length} pacientes en lista de hoy`}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Pendientes de Triage"
          value={citasPendientes.length.toString()}
          icon={AlertCircle}
          color="bg-yellow-100" // Custom color handling in DashboardTriage previously used background classes differently
        />
        <StatCard
          title="En Proceso"
          value={citasEnTriage.length.toString()}
          icon={Activity}
          color="bg-blue-100"
        />
        <StatCard
          title="Completados"
          value={citasCompletadas.length.toString()}
          icon={CheckCircle2}
          color="bg-green-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pacientes Pendientes */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pacientes de Hoy</CardTitle>
              <Badge variant="secondary">{citasHoy.length} pacientes</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {citasHoy.slice(0, 6).map((cita) => {
                const paciente = pacientes.find((p) => p.id === cita.pacienteId);
                const tieneRegistroTriage = registrosTriage.some((t) => t.citaId === cita.id);
                return (
                  <div key={cita.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                          <span className="text-lg font-semibold text-green-600">{cita.hora.substring(0, 5)}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{paciente?.nombre}</p>
                        <p className="text-sm text-gray-500">{paciente?.numeroExpediente}</p>
                      </div>
                      <div>
                        {tieneRegistroTriage ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Completado
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <Button variant="outline" className="w-full" onClick={() => navigate('/triage')}>
                Ir a módulo de Triage
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de actividad */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-lg">Actividad de Hoy</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total de Pacientes</span>
                <span className="font-semibold text-gray-900">{citasHoy.length}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-600 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Progreso de Triage</span>
                <span className="font-semibold text-blue-600">
                  {citasCompletadas.length + citasEnTriage.length}/{citasHoy.length}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{
                    width: `${citasHoy.length > 0 ? ((citasCompletadas.length + citasEnTriage.length) / citasHoy.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-3">Tiempo Promedio</p>
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">8 min</p>
                  <p className="text-xs text-gray-500">por paciente</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
