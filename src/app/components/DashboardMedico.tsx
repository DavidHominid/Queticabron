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
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { todayYmd } from '../utils/clock';

export function DashboardMedico() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { citas, pacientes, seguimientos, cirugias } = useData();
  const { user } = useAuth();
  const hoy = todayYmd();
  const esCitaDelMedico = (c: any) => c?.medicoEncargado && (c.medicoEncargado === user?.id || c.medicoEncargado === user?.nombre);
  const citasDelMedico = user?.rol === 'medico' ? citas.filter(esCitaDelMedico) : citas;
  const citasHoy = citasDelMedico.filter((c) => c.fecha && new Date(c.fecha).toISOString().split('T')[0] === hoy);
  const seguimientosPendientes = seguimientos.filter((s) => s.estado === 'pendiente');
  const seguimientosAgendados = seguimientos.filter((s) => s.estado === 'agendada');
  const pacientesDelMedicoCount =
    user?.rol === 'medico'
      ? new Set(citasDelMedico.map((c) => c.pacienteId)).size
      : pacientes.length;

  const estadoLabel = (estado: string) => {
    if (estado === 'programada') return t('dash.recep.scheduled');
    if (estado === 'en_triage') return t('dash.recep.in_triage');
    if (estado === 'en_consulta') return t('dash.recep.in_consultation');
    if (estado === 'completada') return t('dash.recep.completed');
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
        title={t('dash.medico.title')}
        subtitle={t('dash.medico.subtitle')}
        tone="secondary"
        icon={Stethoscope}
        badgeText={t('dash.medico.badge')}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title={t('dash.medico.appts_today')} value={citasHoy.length.toString()} icon={Stethoscope} tone="primary" />
        <StatCard
          title={t('dash.medico.followups')}
          value={seguimientos.length.toString()}
          icon={UserPlus}
          tone="secondary"
          trend={`${seguimientosPendientes.length} ${t('dash.medico.pending')}`}
        />
        <StatCard title={t('dash.medico.active_surgeries')} value={cirugias.length.toString()} icon={Heart} tone="destructive" />
        <StatCard title={t('dash.medico.my_patients')} value={pacientesDelMedicoCount.toString()} icon={Users} tone="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consultas del Día */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('dash.medico.patients_today')}</CardTitle>
              <Badge variant="secondary">{citasHoy.length} {t('dash.medico.consultations')}</Badge>
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
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">{paciente?.numeroExpediente}</p>
                          <span className="text-muted-foreground/40">•</span>
                          <p className="text-sm text-muted-foreground capitalize">{cita.especialidad.replace('_', ' ')}</p>
                        </div>
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
              <Button variant="outline" className="w-full" onClick={() => navigate('/medico')}>
                {t('dash.medico.go_to_consultations')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumen y Acciones */}
        <div className="space-y-6">
          {/* Seguimientos */}
          <Card className="shadow-sm">
            <CardHeader className="border-b border-border bg-muted/30">
              <CardTitle className="text-lg">{t('dash.medico.followups_title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('dash.medico.pending_schedule')}</span>
                  <span className="font-semibold text-foreground">{seguimientosPendientes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('dash.medico.scheduled_appts')}</span>
                  <span className="font-semibold text-foreground">{seguimientosAgendados.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('dash.medico.total')}</span>
                  <span className="font-semibold text-foreground">{seguimientos.length}</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/seguimientos')}>
                {t('dash.medico.view_all')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card className="shadow-sm">
            <CardHeader className="border-b border-border bg-muted/30">
              <CardTitle className="text-lg">{t('dash.medico.quick_actions')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Button className="w-full justify-start" onClick={() => navigate('/medico')}>
                <Stethoscope className="w-4 h-4 mr-2" />
                {t('dash.medico.consult_patient')}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/pacientes')}>
                <Users className="w-4 h-4 mr-2" />
                {t('dash.medico.view_patients')}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/cirugias')}>
                <Heart className="w-4 h-4 mr-2" />
                {t('dash.medico.manage_surgeries')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
