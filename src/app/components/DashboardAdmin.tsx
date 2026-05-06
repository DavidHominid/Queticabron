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

  const rolBadgeStyle = (rol: string) => {
    if (rol === 'administrador') {
      return { variant: 'outline' as const, className: 'bg-accent text-accent-foreground border-transparent capitalize' };
    }
    if (rol === 'medico') {
      return { variant: 'outline' as const, className: 'bg-primary text-primary-foreground border-transparent capitalize' };
    }
    if (rol === 'triage') {
      return { variant: 'outline' as const, className: 'bg-secondary text-secondary-foreground border-transparent capitalize' };
    }
    return { variant: 'outline' as const, className: 'bg-background capitalize' };
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        title="¡Buenos días, Administrador!"
        subtitle="Panel de administración y gestión del sistema"
        tone="accent"
        icon={Shield}
        badgeText="Control total del sistema médico"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Usuarios Activos"
          value={usuariosActivos.length.toString()}
          icon={Users}
          tone="primary"
        />
        <StatCard title="Total Pacientes" value={pacientes.length.toString()} icon={Users} tone="secondary" />
        <StatCard title="Registros Auditoría" value={registrosAuditoria.length.toString()} icon={FileText} tone="accent" />
        <StatCard title="Roles Configurados" value="4" icon={Shield} tone="muted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usuarios por Rol */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Usuarios del Sistema</CardTitle>
              <Badge variant="secondary">{totalUsuarios} usuarios</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 border border-border rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Recepción</span>
                  <Badge variant="secondary">{usuariosPorRol.recepcion}</Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${totalUsuarios > 0 ? (usuariosPorRol.recepcion / totalUsuarios) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/30 border border-border rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Triage</span>
                  <Badge variant="secondary">{usuariosPorRol.triage}</Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${totalUsuarios > 0 ? (usuariosPorRol.triage / totalUsuarios) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/30 border border-border rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Médico</span>
                  <Badge variant="secondary">{usuariosPorRol.medico}</Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${totalUsuarios > 0 ? (usuariosPorRol.medico / totalUsuarios) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/30 border border-border rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Administrador</span>
                  <Badge variant="secondary">{usuariosPorRol.administrador}</Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
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
            <CardHeader className="border-b border-border bg-muted/30">
              <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Button className="w-full justify-start" onClick={() => navigate('/usuarios')}>
                <UserCog className="w-4 h-4 mr-2" />
                Crear Usuario
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/variables')}>
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Variables
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/auditoria')}>
                <FileText className="w-4 h-4 mr-2" />
                Ver Auditoría
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/pacientes')}>
                <Users className="w-4 h-4 mr-2" />
                Gestionar Pacientes
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b border-border bg-muted/30">
              <CardTitle className="text-lg">Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">Sistema Operativo</span>
                </div>
                <Badge>Normal</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-sm text-muted-foreground">Base de Datos</span>
                </div>
                <Badge variant="secondary">Activa</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-sm text-muted-foreground">Conectividad</span>
                </div>
                <Badge variant="outline" className="bg-background">
                  Óptima
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auditoría Reciente */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30">
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
                <div key={registro.id} className="p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground">{registro.nombreUsuario}</p>
                        <Badge
                          variant={rolBadgeStyle(registro.rol).variant}
                          className={rolBadgeStyle(registro.rol).className}
                        >
                          {registro.rol}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{registro.detalles}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
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
              <div className="p-8 text-center text-muted-foreground">
                No hay actividad reciente registrada en la base de datos.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
