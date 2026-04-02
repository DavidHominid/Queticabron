import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useNavigate } from 'react-router';
import {
  Stethoscope,
  Heart,
  ArrowRight,
  Activity,
  UserPlus,
  Users,
} from 'lucide-react';
import { StatCard } from './dashboard/StatCard';
import { WelcomeCard } from './dashboard/WelcomeCard';
import { useData } from '../context/DataContext';

export function DashboardMedico() {
  const navigate = useNavigate();
  const { citas, pacientes, seguimientos, cirugias } = useData();
  const hoy = new Date().toISOString().split('T')[0];
  const citasHoy = citas.filter((c) => c.fecha && new Date(c.fecha).toISOString().split('T')[0] === hoy);
  const seguimientosPendientes = seguimientos.filter((s) => s.estado === 'pendiente');
  const seguimientosAgendados = seguimientos.filter((s) => s.estado === 'agendada');

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        title="¡Buenos días, Doctor!"
        subtitle="Panel de consultas y seguimiento médico"
        gradientFrom="from-purple-600"
        gradientTo="to-purple-700"
        icon={Stethoscope}
        badgeText="Sistema de gestión médica integral"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Consultas Hoy" value={citasHoy.length.toString()} icon={Stethoscope} color="bg-purple-500" />
        <StatCard
          title="Seguimientos"
          value={seguimientos.length.toString()}
          icon={UserPlus}
          color="bg-blue-500"
          trend={`${seguimientosPendientes.length} pendientes`}
        />
        <StatCard title="Cirugías Activas" value={cirugias.length.toString()} icon={Heart} color="bg-red-500" />
        <StatCard title="Mis Pacientes" value={pacientes.length.toString()} icon={Users} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consultas del Día */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-gray-900">Pacientes de Hoy</CardTitle>
              <Badge variant="secondary">{citasHoy.length} consultas</Badge>
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
                        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                          <span className="text-lg font-semibold text-purple-600">{cita.hora.substring(0, 5)}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{paciente?.nombre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-500">{paciente?.numeroExpediente}</p>
                          <span className="text-gray-300">•</span>
                          <p className="text-sm text-gray-500 capitalize">{cita.especialidad.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div>
                        <Badge
                          className={
                            cita.estado === 'completada'
                              ? 'bg-green-100 text-green-700'
                              : cita.estado === 'en_consulta'
                              ? 'bg-purple-100 text-purple-700'
                              : cita.estado === 'en_triage'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
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
              <Button variant="outline" className="w-full text-gray-900" onClick={() => navigate('/medico')}>
                Ir a Consultas
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumen y Acciones */}
        <div className="space-y-6">
          {/* Seguimientos */}
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-lg text-gray-900">Seguimientos</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pendientes de Agendar</span>
                  <span className="font-semibold text-yellow-600">{seguimientosPendientes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Citas Agendadas</span>
                  <span className="font-semibold text-blue-600">{seguimientosAgendados.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-semibold text-gray-900">{seguimientos.length}</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4 text-gray-900" onClick={() => navigate('/seguimientos')}>
                Ver Todos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-lg text-gray-900">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 justify-start" onClick={() => navigate('/medico')}>
                <Stethoscope className="w-4 h-4 mr-2" />
                Consultar Paciente
              </Button>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 justify-start" onClick={() => navigate('/pacientes')}>
                <Users className="w-4 h-4 mr-2" />
                Ver Pacientes
              </Button>
              <Button className="w-full bg-red-600 hover:bg-red-700 justify-start" onClick={() => navigate('/cirugias')}>
                <Heart className="w-4 h-4 mr-2" />
                Gestionar Cirugías
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
