import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useNavigate } from 'react-router';
import {
  Calendar,
  Users,
  Activity,
  CheckCircle2,
  UserPlus,
  Heart,
  ArrowRight,
  LogIn,
  Ticket,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { StatCard } from './dashboard/StatCard';
import { WelcomeCard } from './dashboard/WelcomeCard';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { todayYmd } from '../utils/clock';
import { FEATURES } from '../utils/featureFlags';
import { toast } from 'sonner';
import { AsignacionMedicoQueue } from './triage/AsignacionMedicoQueue';

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
  const { t } = useLanguage();
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
    if (estado === 'programada') return t('dash.recep.scheduled');
    if (estado === 'llegada_registrada') return 'Llegada';
    if (estado === 'en_triage') return t('dash.recep.in_triage');
    if (estado === 'triage_completado') return 'Triaje OK';
    if (estado === 'asignando_medico') return 'Asignando Médico';
    if (estado === 'en_consulta') return t('dash.recep.in_consultation');
    if (estado === 'completada') return t('dash.recep.completed');
    if (estado === 'cancelada') return 'Cancelada';
    return estado;
  };

  const estadoBadgeProps = (estado: string) => {
    if (estado === 'completada') return { variant: 'outline' as const, className: 'bg-primary text-primary-foreground border-transparent' };
    if (estado === 'en_consulta') return { variant: 'outline' as const, className: 'bg-secondary text-secondary-foreground border-transparent' };
    if (estado === 'llegada_registrada') return { variant: 'outline' as const, className: 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)] border-transparent' };
    if (estado === 'triage_completado') return { variant: 'outline' as const, className: 'bg-[color:var(--warning)] text-[color:var(--warning-foreground,white)] border-transparent' };
    if (estado === 'asignando_medico') return { variant: 'outline' as const, className: 'bg-[color:var(--chart-2)] text-white border-transparent' };
    return { variant: 'outline' as const, className: 'bg-background' };
  };

  const handleCheckin = async (citaId: string) => {
    try {
      const id = String(citaId).trim();
      if (!id) return;
      const res = await fetch(`/api/citas/checkin/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'x-usuario': String(user.id) } : {}),
        },
        body: JSON.stringify({
          nombreUsuario: user?.nombre || '',
          rol: user?.rol || 'recepcion',
          ciudad: user?.ciudad || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo registrar la llegada.');
      toast.success(data?.ordenLlegada ? `Llegada #${data.ordenLlegada} registrada ✅` : 'Llegada registrada ✅');
    } catch (err: any) {
      toast.error(err?.message || 'Error de red al registrar llegada.');
    }
  };

  const buildExportParams = (scope: 'hoy' | 'todoEvento') => {
    const params = new URLSearchParams();
    if (user?.ciudad) params.set('ciudad', String(user.ciudad));
    if (eventoActivo?.id) params.set('eventoId', String(eventoActivo.id));
    if (scope === 'hoy') {
      params.set('fechaDesde', hoy);
      params.set('fechaHasta', hoy);
    }
    return params.toString();
  };

  const triggerDownload = (extension: 'xlsx' | 'csv', scope: 'hoy' | 'todoEvento') => {
    const qs = buildExportParams(scope);
    const url = `/api/export/citas.${extension}${qs ? `?${qs}` : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noreferrer noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 200);
    toast.success(
      extension === 'xlsx'
        ? `Descargando Excel ${scope === 'hoy' ? 'de hoy' : 'del evento'}…`
        : `Descargando CSV ${scope === 'hoy' ? 'de hoy' : 'del evento'}…`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        title={t('dash.recep.title')}
        subtitle={t('dash.recep.subtitle')}
        tone="primary"
        icon={Calendar}
        badgeText={eventoActivo?.nombre || t('dash.recep.no_event')}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('dash.recep.total_appts_today')}
          value={citasHoy.length.toString()}
          icon={Calendar}
          tone="primary"
        />
        <StatCard
          title={t('dash.recep.registered_patients')}
          value={pacientes.length.toString()}
          icon={Users}
          tone="secondary"
        />
        <StatCard title={t('dash.recep.completed_appts')} value={citasCompletadas.length.toString()} icon={CheckCircle2} tone="accent" />
        <StatCard title={t('dash.recep.active_events')} value={eventos.length.toString()} icon={Activity} tone="muted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Citas de Hoy */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{t('dash.recep.appts_today')}</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Evento activo: <span className="font-medium text-foreground">{eventoActivo?.nombre || t('dash.recep.no_event')}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{citasHoy.length} {t('dash.recep.appts')}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel>Exportar solo hoy ({hoy})</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => triggerDownload('xlsx', 'hoy')} className="gap-2 cursor-pointer">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Libro Excel (.xlsx)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => triggerDownload('csv', 'hoy')} className="gap-2 cursor-pointer">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>CSV para hojas de cálculo (.csv)</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    {eventoActivo?.id ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Exportar evento completo</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => triggerDownload('xlsx', 'todoEvento')} className="gap-2 cursor-pointer">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>Excel · todo el evento</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => triggerDownload('csv', 'todoEvento')} className="gap-2 cursor-pointer">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span>CSV · todo el evento</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {citasHoy.slice(0, 5).map((cita) => {
                const paciente = pacientes.find((p) => p.id === cita.pacienteId);
                const badge = estadoBadgeProps(cita.estado);
                const puedeCheckearse = cita.estado === 'programada';
                return (
                  <div key={cita.id} className="p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                          <span className="text-lg font-semibold text-secondary-foreground">{cita.hora.substring(0, 5)}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground truncate">{paciente?.nombre}</p>
                          {String(cita.origen || 'sistema') === 'captura_fisica' ? (
                            <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 bg-amber-500/10 text-[10px]">
                              Hist.
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                              Sist.
                            </Badge>
                          )}
                          {Number.isFinite(Number(cita.ordenLlegada)) && Number(cita.ordenLlegada) > 0 ? (
                            <Badge variant="outline" className="gap-1 border-[color:var(--brand-primary-strong)] text-[color:var(--brand-primary-strong)] bg-[color:var(--brand-primary-strong)]/5">
                              <Ticket className="w-3 h-3" />
                              Llegada #{cita.ordenLlegada}
                            </Badge>
                          ) : null}
                          {cita.saltadoTriage ? (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <ArrowRight className="w-3 h-3" />
                              Sin triaje
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{cita.especialidad.replace('_', ' ')}</p>
                        {cita.especialidadOtra ? (
                          <p className="text-xs text-muted-foreground italic mt-0.5">{cita.especialidadOtra}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={badge.variant} className={badge.className}>
                          {estadoLabel(cita.estado)}
                        </Badge>
                        {FEATURES.CHECKIN_RECEPCION && puedeCheckearse ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckin(cita.id);
                            }}
                            className="gap-1.5 border-[color:var(--brand-primary-strong)] text-[color:var(--brand-primary-strong)] hover:bg-[color:var(--brand-primary-strong)] hover:text-white"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            Check-in
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-border bg-muted/20">
              <Button variant="outline" className="w-full" onClick={() => navigate('/citas')}>
                {t('dash.recep.view_all_appts')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="text-lg">{t('dash.recep.quick_actions')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Button className="w-full justify-start" onClick={() => navigate('/pacientes')}>
              <UserPlus className="w-4 h-4 mr-2" />
              {t('dash.recep.register_patient')}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/citas')}>
              <Calendar className="w-4 h-4 mr-2" />
              {t('dash.recep.schedule_appt')}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/eventos')}>
              <Activity className="w-4 h-4 mr-2" />
              {t('dash.recep.view_events')}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/cirugias')}>
              <Heart className="w-4 h-4 mr-2" />
              {t('dash.recep.view_surgeries')}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/seguimientos')}>
              <Users className="w-4 h-4 mr-2" />
              {t('nav.seguimientos')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Cola de Asignación Médica */}
      {FEATURES.CHECKIN_RECEPCION ? <AsignacionMedicoQueue /> : null}
    </div>
  );
}
