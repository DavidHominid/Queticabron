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
import { todayYmd } from '../utils/clock';

const normCiudad = (value: unknown) => {
  const v = typeof value === 'string' ? value : value && typeof value === 'object' ? (value as any).codigo || (value as any).ciudad || '' : String(value ?? '');
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
};

export function DashboardRecepcion() {
  const navigate = useNavigate();
  const { citas, pacientes, eventos } = useData();
  const { user } = useAuth();

  // Obtener el evento activo para hoy en la ciudad del usuario
  const hoy = todayYmd();
  const ciudadesExtra = Array.isArray((user as any)?.ciudades) ? ((user as any).ciudades as unknown[]) : [];
  const base = ciudadesExtra.length ? ciudadesExtra : user?.ciudad ? [user.ciudad] : [];
  const ciudadesUsuario = Array.from(new Set(base.map(normCiudad).filter(Boolean)));
  const eventoActivo = eventos.find((e) => e.estado === 'activo' && ciudadesUsuario.includes(normCiudad(e.ciudad)));
  
  const citasHoy = citas.filter((c) => 
    c.eventoId === eventoActivo?.id && 
    c.fecha && new Date(c.fecha).toISOString().split('T')[0] === hoy
  );

  const citasCompletadas = citasHoy.filter(c => c.estado === 'completada');

  const estadoLabel = (estado: string) => {
    if (estado === 'programada') return 'Programada';
    if (estado === 'en_triage') return 'En Triage';
    if (estado === 'en_consulta') return 'En Consulta';
    if (estado === 'completada') return 'Completada';
    return estado;
  };

  const estadoBadgeProps = (estado: string) => {
    if (estado === 'completada') return { variant: 'outline' as const, className: 'bg-primary text-primary-foreground border-transparent' };
    if (estado === 'en_consulta') return { variant: 'outline' as const, className: 'bg-secondary text-secondary-foreground border-transparent' };
    return { variant: 'outline' as const, className: 'bg-background' };
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        title="¡Buenos días, Recepción!"
        subtitle="Bienvenido al sistema de gestión médica"
        tone="primary"
        icon={Calendar}
        badgeText={eventoActivo?.nombre || 'Sin evento activo'}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Citas Hoy"
          value={citasHoy.length.toString()}
          icon={Calendar}
          tone="primary"
          trend="+12% vs ayer"
        />
        <StatCard
          title="Pacientes Registrados"
          value={pacientes.length.toString()}
          icon={Users}
          tone="secondary"
          trend="+5 esta semana"
        />
        <StatCard title="Citas Completadas" value={citasCompletadas.length.toString()} icon={CheckCircle2} tone="accent" />
        <StatCard title="Eventos Activos" value={eventos.length.toString()} icon={Activity} tone="muted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Citas de Hoy */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Citas de Hoy</CardTitle>
              <Badge variant="secondary">{citasHoy.length} citas</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {citasHoy.slice(0, 5).map((cita) => {
                const paciente = pacientes.find((p) => p.id === cita.pacienteId);
                const badge = estadoBadgeProps(cita.estado);
                return (
                  <div key={cita.id} className="p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                          <span className="text-lg font-semibold text-secondary-foreground">{cita.hora.substring(0, 5)}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{paciente?.nombre}</p>
                        <p className="text-sm text-muted-foreground capitalize">{cita.especialidad.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <Badge variant={badge.variant} className={badge.className}>
                          {estadoLabel(cita.estado)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-border bg-muted/20">
              <Button variant="outline" className="w-full" onClick={() => navigate('/citas')}>
                Ver todas las citas
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Button className="w-full justify-start" onClick={() => navigate('/pacientes')}>
              <UserPlus className="w-4 h-4 mr-2" />
              Registrar Paciente
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/citas')}>
              <Calendar className="w-4 h-4 mr-2" />
              Agendar Cita
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/eventos')}>
              <Activity className="w-4 h-4 mr-2" />
              Ver Eventos
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/cirugias')}>
              <Heart className="w-4 h-4 mr-2" />
              Ver Cirugías
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
