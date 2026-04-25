import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { FileText, Search, User, Calendar, Phone, MapPin } from 'lucide-react';

export function Expedientes() {
  const { pacientes, citas, consultasMedicas } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const especialidadesUsuario = (user?.especialidades?.length ? user.especialidades : user?.especialidad ? [user.especialidad] : []).filter(Boolean);

  // Filtrar pacientes que han tenido citas con este médico
  const pacientesDelMedico = pacientes.filter((paciente) =>
    citas.some((cita) => cita.pacienteId === paciente.id && especialidadesUsuario.includes(cita.especialidad))
  );

  const pacientesFiltrados = pacientesDelMedico.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.numeroExpediente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Expedientes Clínicos</h1>
          <p className="text-gray-600 mt-1">Accede a los expedientes de tus pacientes</p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nombre o expediente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pacientesFiltrados.map((paciente) => {
            const citasCount = citas.filter(
              (c) => c.pacienteId === paciente.id && especialidadesUsuario.includes(c.especialidad)
            ).length;

            return (
              <Card key={paciente.id} className="shadow-sm hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{paciente.nombre}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {paciente.numeroExpediente}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{paciente.edad} años</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>{citasCount} consultas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {pacientesFiltrados.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron expedientes</h3>
              <p className="text-gray-600">
                Los expedientes de tus pacientes aparecerán aquí
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
