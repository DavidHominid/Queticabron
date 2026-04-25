import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Calendar, User } from 'lucide-react';

export function Consultas() {
  const { citas, pacientes, registrosTriage } = useData();
  const { user } = useAuth();
  const especialidadesUsuario = (user?.especialidades?.length ? user.especialidades : user?.especialidad ? [user.especialidad] : []).filter(Boolean);

  // Filtrar citas que están en consulta y son de la especialidad del médico
  const citasEnConsulta = citas.filter(
    (c) => c.estado === 'en_consulta' && especialidadesUsuario.includes(c.especialidad)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Consultas Médicas</h1>
          <p className="text-gray-600 mt-1">Pacientes listos para consulta</p>
        </div>

        <div className="space-y-3">
          {citasEnConsulta.map((cita) => {
            const paciente = pacientes.find((p) => p.id === cita.pacienteId);
            const triage = registrosTriage.find((t) => t.citaId === cita.id);

            return (
              <Card key={cita.id} className="shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{paciente?.nombre}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{paciente?.numeroExpediente}</span>
                        <span>•</span>
                        <span>{paciente?.edad} años</span>
                        <span>•</span>
                        <span>{triage?.observaciones || 'Sin observaciones'}</span>
                      </div>
                      {triage && (
                        <div className="mt-2 flex gap-4 text-sm">
                          <span>PA: {triage.signosVitales.presionArterial}</span>
                          <span>FC: {triage.signosVitales.ritmoCardiaco} bpm</span>
                          <span>Temp: {triage.signosVitales.temperatura}°C</span>
                          <span>Gluc: {triage.signosVitales.azucarEnSangre} mg/dL</span>
                        </div>
                      )}
                    </div>
                    <Badge className="bg-purple-100 text-purple-700">En Consulta</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {citasEnConsulta.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pacientes en consulta</h3>
              <p className="text-gray-600">Los pacientes aparecerán aquí después de pasar por triage</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
