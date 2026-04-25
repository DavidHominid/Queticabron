import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useNavigate } from 'react-router';
import {
  Users,
  FileText,
  Shield,
  ArrowRight,
  UserCog,
  ClipboardList,
  SlidersHorizontal,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { StatCard } from './dashboard/StatCard';
import { WelcomeCard } from './dashboard/WelcomeCard';

export function DashboardAdmin() {
  const navigate = useNavigate();
  const { usuarios, pacientes, registrosAuditoria } = useData();

  const usuariosActivos = usuarios.filter((u) => (u as any).activo !== false);
  const totalUsuarios = usuarios.length;

  const usuariosPorRol = {
    recepcion: usuarios.filter((u) => u.rol === 'recepcion').length,
    triage: usuarios.filter((u) => u.rol === 'triage').length,
    medico: usuarios.filter((u) => u.rol === 'medico').length,
    administrador: usuarios.filter((u) => u.rol === 'administrador').length,
  };

  const auditoriaReciente = [...registrosAuditoria]
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        title="¡Buenos días, Administrador!"
        subtitle="Panel de administración y gestión del sistema"
        gradientFrom="from-orange-600"
        gradientTo="to-orange-700"
        icon={Shield}
        badgeText="Control total del sistema médico"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Usuarios Activos"
          value={usuariosActivos.length.toString()}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard title="Total Pacientes" value={pacientes.length.toString()} icon={Users} color="bg-green-500" />
        <StatCard title="Registros Auditoría" value={registrosAuditoria.length.toString()} icon={FileText} color="bg-purple-500" />
        <StatCard title="Roles Configurados" value="4" icon={Shield} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usuarios por Rol */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Usuarios del Sistema</CardTitle>
              <Badge variant="secondary">{totalUsuarios} usuarios</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Recepción</span>
                  <Badge className="bg-blue-600 text-white">{usuariosPorRol.recepcion}</Badge>
                </div>
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${totalUsuarios > 0 ? (usuariosPorRol.recepcion / totalUsuarios) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Triage</span>
                  <Badge className="bg-green-600 text-white">{usuariosPorRol.triage}</Badge>
                </div>
                <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full"
                    style={{ width: `${totalUsuarios > 0 ? (usuariosPorRol.triage / totalUsuarios) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-900">Médico</span>
                  <Badge className="bg-purple-600 text-white">{usuariosPorRol.medico}</Badge>
                </div>
                <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${totalUsuarios > 0 ? (usuariosPorRol.medico / totalUsuarios) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-900">Administrador</span>
                  <Badge className="bg-orange-600 text-white">{usuariosPorRol.administrador}</Badge>
                </div>
                <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-600 rounded-full"
                    style={{ width: `${totalUsuarios > 0 ? (usuariosPorRol.administrador / totalUsuarios) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => navigate('/usuarios')}>
                Gestionar Usuarios
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Acciones y Estado */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 justify-start" onClick={() => navigate('/usuarios')}>
                <UserCog className="w-4 h-4 mr-2" />
                Crear Usuario
              </Button>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 justify-start" onClick={() => navigate('/variables')}>
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Variables
              </Button>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 justify-start" onClick={() => navigate('/auditoria')}>
                <FileText className="w-4 h-4 mr-2" />
                Ver Auditoría
              </Button>
              <Button className="w-full bg-green-600 hover:bg-green-700 justify-start" onClick={() => navigate('/pacientes')}>
                <Users className="w-4 h-4 mr-2" />
                Gestionar Pacientes
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-lg">Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600">Sistema Operativo</span>
                </div>
                <Badge className="bg-green-100 text-green-700">Normal</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600">Base de Datos</span>
                </div>
                <Badge className="bg-blue-100 text-blue-700">Activa</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600">Conectividad</span>
                </div>
                <Badge className="bg-green-100 text-green-700">Óptima</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auditoría Reciente */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Actividad Reciente</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/auditoria')}>
              Ver Todo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y overflow-hidden rounded-b-xl">
            {auditoriaReciente.length > 0 ? (
              auditoriaReciente.map((registro) => (
                <div key={registro.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{registro.nombreUsuario}</p>
                        <Badge
                          className={
                            registro.rol === 'recepcion'
                              ? 'bg-blue-100 text-blue-700'
                              : registro.rol === 'triage'
                              ? 'bg-green-100 text-green-700'
                              : registro.rol === 'medico'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-100 text-orange-700'
                          }
                        >
                          {registro.rol}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{registro.detalles}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(registro.fechaHora).toLocaleString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No hay actividad reciente registrada en la base de datos.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
