import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useNavigate } from 'react-router';
import { Activity, Clock, Users, CheckCircle2, AlertCircle, ClipboardList, ArrowRight } from 'lucide-react';
import { StatCard } from './dashboard/StatCard';
import { WelcomeCard } from './dashboard/WelcomeCard';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { todayYmd } from '../utils/clock';
import { pickEventoActivoParaTriageConCitas, triageCanSeeCita } from '../utils/triageAccess';
import { normalizeCiudad } from '../utils/ciudades';
import { useLanguage } from '../context/LanguageContext';

export function DashboardTriage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { citas, pacientes, eventos, registrosTriage } = useData();
  const { user } = useAuth();

  // Obtener el evento activo para hoy en la ciudad del usuario
  const hoy = todayYmd();
  const ciudadesUsuario =
    Array.isArray((user as any)?.ciudades) && (user as any).ciudades.length
      ? ((user as any).ciudades as string[])
      : user?.ciudad
        ? [user.ciudad]
        : [];
  const ciudadesNorm = Array.from(new Set(ciudadesUsuario.map(normalizeCiudad).filter(Boolean)));
  const eventoActivo = pickEventoActivoParaTriageConCitas(eventos, citas, user, hoy, ciudadesNorm);
  
  const citasHoy = citas.filter(
    (c) =>
      c.eventoId === eventoActivo?.id &&
      c.fecha &&
      String(c.fecha).slice(0, 10) === hoy &&
      triageCanSeeCita(eventoActivo || null, c, user),
  );
  
  const citasPendientes = citasHoy.filter((c) => c.estado === 'programada');
  const citasEnTriage = citasHoy.filter((c) => c.estado === 'en_triage');
  const citasCompletadas = citasHoy.filter((c) => c.estado === 'completada' || c.estado === 'en_consulta');

  const estadoBadgeProps = (tieneRegistroTriage: boolean) => {
    if (tieneRegistroTriage) return { variant: 'outline' as const, className: 'bg-primary text-primary-foreground border-transparent' };
    return { variant: 'outline' as const, className: 'bg-background' };
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        title={t('dash.triage.title')}
        subtitle={t('dash.triage.subtitle')}
        tone="secondary"
        icon={ClipboardList}
        badgeText={`${citasHoy.length} ${t('dash.triage.patients_today')}`}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title={t('dash.triage.pending_triage')}
          value={citasPendientes.length.toString()}
          icon={AlertCircle}
          tone="accent"
        />
        <StatCard
          title={t('dash.triage.in_progress')}
          value={citasEnTriage.length.toString()}
          icon={Activity}
          tone="secondary"
        />
        <StatCard
          title={t('dash.triage.completed')}
          value={citasCompletadas.length.toString()}
          icon={CheckCircle2}
          tone="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pacientes Pendientes */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('dash.triage.patients_today_title')}</CardTitle>
              <Badge variant="secondary">{citasHoy.length} {t('dash.triage.patients')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {citasHoy.slice(0, 6).map((cita) => {
                const paciente = pacientes.find((p) => p.id === cita.pacienteId);
                const tieneRegistroTriage = registrosTriage.some((t) => t.citaId === cita.id);
                const badge = estadoBadgeProps(tieneRegistroTriage);
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
                        <p className="text-sm text-muted-foreground">{paciente?.numeroExpediente}</p>
                      </div>
                      <div>
                        {tieneRegistroTriage ? (
                          <Badge variant={badge.variant} className={badge.className}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t('dash.triage.completed')}
                          </Badge>
                        ) : (
                          <Badge variant={badge.variant} className={badge.className}>
                            <Clock className="w-3 h-3 mr-1" />
                            {t('dash.triage.pending')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-border bg-muted/20">
              <Button variant="outline" className="w-full" onClick={() => navigate('/triage')}>
                {t('dash.triage.go_to_triage')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de actividad */}
        <Card className="shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="text-lg">{t('dash.triage.activity_today')}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('dash.triage.total_patients')}</span>
                <span className="font-semibold text-foreground">{citasHoy.length}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('dash.triage.triage_progress')}</span>
                <span className="font-semibold text-foreground">
                  {citasCompletadas.length + citasEnTriage.length}/{citasHoy.length}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${citasHoy.length > 0 ? ((citasCompletadas.length + citasEnTriage.length) / citasHoy.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">{t('dash.triage.avg_time')}</p>
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">8 {t('dash.triage.min')}</p>
                  <p className="text-xs text-muted-foreground/70">{t('dash.triage.per_patient')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
