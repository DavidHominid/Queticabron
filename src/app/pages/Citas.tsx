import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AgendaCitasDiaCalendar } from '../components/citas/AgendaCitasDiaCalendar';
import { AgendarCitaDialog } from '../components/eventos/AgendarCitaDialog';
import { DetalleCitasBloqueDialog } from '../components/eventos/DetalleCitasBloqueDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { Cita, Especialidad, Evento, HorarioDisponible, Paciente, TipoCitaEvento } from '../types';
import { labelEspecialidad } from '../utils/especialidades';
import { nowIso, todayYmd } from '../utils/clock';

const timeToMinutes = (t: string) => {
  const [hh, mm] = String(t || '').split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const hasCita = (
  citas: Cita[],
  payload: { eventoId: string; especialidad: Especialidad; fecha: string; horaInicio: string; horaFin: string; tipoCitaId?: string },
) => {
  const s = timeToMinutes(payload.horaInicio);
  const e = timeToMinutes(payload.horaFin);
  const tipoId = String(payload.tipoCitaId || '').trim();
  return (citas || []).some((c) => {
    if (c.eventoId !== payload.eventoId) return false;
    if (c.especialidad !== payload.especialidad) return false;
    if (c.fecha !== payload.fecha) return false;
    if (c.estado === 'cancelada') return false;
    if (tipoId && String(c.tipoCitaId || '') !== tipoId) return false;
    const cs = timeToMinutes(c.hora);
    const cdur = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
    const ce = cs + cdur;
    return cs < e && ce > s;
  });
};

export function Citas() {
  const { eventos, citas, pacientes, usuarios, especialidadesCatalogo, addCita, updateCita, addRegistroAuditoria, isInitialized } = useData();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [agendaMensaje, setAgendaMensaje] = useState('');

  const [agendarOpen, setAgendarOpen] = useState(false);
  const [agendarEvento, setAgendarEvento] = useState<Evento | null>(null);
  const [agendarEspecialidad, setAgendarEspecialidad] = useState<Especialidad | null>(null);
  const [agendarHorario, setAgendarHorario] = useState<HorarioDisponible | null>(null);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleCitas, setDetalleCitas] = useState<Cita[]>([]);
  const [detalleTitulo, setDetalleTitulo] = useState('');
  const [detalleSubtitulo, setDetalleSubtitulo] = useState('');
  const [detalleEvento, setDetalleEvento] = useState<Evento | null>(null);

  const hoy = useMemo(() => todayYmd(), []);

  const canSeeAllCiudades = user?.rol === 'administrador';
  const ciudadesUsuario = useMemo(() => {
    const ciudades = Array.isArray((user as any)?.ciudades) ? ((user as any).ciudades as string[]) : [];
    if (ciudades.length) return ciudades;
    return user?.ciudad ? [user.ciudad] : [];
  }, [user?.ciudad, (user as any)?.ciudades]);

  const eventosVisibles = useMemo(() => {
    const base = canSeeAllCiudades ? eventos : eventos.filter((e) => ciudadesUsuario.includes(e.ciudad));
    return [...base].sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));
  }, [canSeeAllCiudades, ciudadesUsuario, eventos]);

  const eventoById = useMemo(() => {
    const map = new Map<string, Evento>();
    for (const e of eventosVisibles) map.set(e.id, e);
    return map;
  }, [eventosVisibles]);

  const visibleEventIds = useMemo(() => new Set(eventosVisibles.map((e) => e.id)), [eventosVisibles]);
  const citasVisibles = useMemo(() => (citas || []).filter((c) => visibleEventIds.has(c.eventoId)), [citas, visibleEventIds]);

  const onClickDisponible = (payload: { evento: Evento; especialidad: Especialidad; horario: HorarioDisponible }) => {
    setAgendaMensaje('');
    if (payload.evento.estado !== 'activo') {
      setAgendaMensaje(t('citas.not_active'));
      return;
    }
    const dia = String(payload.horario.dia || '').substring(0, 10);
    if (dia && dia <= hoy) {
      setAgendaMensaje(t('citas.day_of_only'));
      return;
    }
    if (
      hasCita(citasVisibles, {
        eventoId: payload.evento.id,
        especialidad: payload.especialidad,
        fecha: payload.horario.dia,
        horaInicio: payload.horario.horaInicio,
        horaFin: payload.horario.horaFin,
        tipoCitaId: payload.horario.tipoCitaId,
      })
    ) {
      setAgendaMensaje(t('citas.slot_taken'));
      return;
    }
    setAgendarEvento(payload.evento);
    setAgendarEspecialidad(payload.especialidad);
    setAgendarHorario(payload.horario);
    setAgendarOpen(true);
  };

  const onClickCitas = (payload: { evento: Evento; especialidad: Especialidad; horario: HorarioDisponible; citas: Cita[] }) => {
    setAgendaMensaje('');
    setDetalleCitas(payload.citas);
    setDetalleTitulo(t('citas.title'));
    setDetalleSubtitulo(
      `${payload.evento.nombre} · ${labelEspecialidad(payload.especialidad, especialidadesCatalogo)} · ${payload.horario.dia} · ${payload.horario.horaInicio}-${payload.horario.horaFin}`,
    );
    setDetalleEvento(payload.evento);
    setDetalleOpen(true);
  };

  const onAgendar = async (payload: { paciente: Paciente; hora: string; tipoCita: TipoCitaEvento | null }) => {
    if (!agendarEvento || !agendarEspecialidad || !agendarHorario) return;
    if (agendarEvento.estado !== 'activo') {
      throw new Error(t('citas.not_active'));
    }
    const dia = String(agendarHorario.dia || '').substring(0, 10);
    if (dia && dia <= hoy) {
      throw new Error(t('citas.day_of_only'));
    }

    if (
      hasCita(citasVisibles, {
        eventoId: agendarEvento.id,
        especialidad: agendarEspecialidad,
        fecha: agendarHorario.dia,
        horaInicio: agendarHorario.horaInicio,
        horaFin: agendarHorario.horaFin,
        tipoCitaId: agendarHorario.tipoCitaId,
      })
    ) {
      throw new Error(t('citas.slot_taken'));
    }

    const espEvento = agendarEvento.especialidades.find((e) => e.especialidad === agendarEspecialidad) || null;
    const tipo = payload.tipoCita;
    const nueva: Cita = {
      id: `cit${Date.now()}`,
      eventoId: agendarEvento.id,
      pacienteId: payload.paciente.id,
      especialidad: agendarEspecialidad,
      fecha: agendarHorario.dia,
      hora: payload.hora,
      consultorio: espEvento?.consultorio || '',
      tipoCitaId: tipo?.id ? String(tipo.id) : undefined,
      tipoCitaNombre: tipo?.nombre ? String(tipo.nombre) : undefined,
      duracionMinutos: tipo?.duracionMinutos ? Number(tipo.duracionMinutos) : undefined,
      medicoEncargado: String(tipo?.medicoEncargado || '').trim() || espEvento?.medicoEncargado || '',
      estado: 'programada',
      costoPagado: Number.isFinite(Number(tipo?.precio))
        ? Number(tipo?.precio)
        : Number.isFinite(Number(espEvento?.costo))
          ? Number(espEvento?.costo)
          : 0,
      fechaCreacion: todayYmd(),
    };

    await addCita(nueva);

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Agendar Cita',
      detalles: `Agendó cita para ${payload.paciente.nombre} (${payload.paciente.numeroExpediente}) · ${labelEspecialidad(agendarEspecialidad, especialidadesCatalogo)}${nueva.tipoCitaNombre ? ` · ${nueva.tipoCitaNombre}` : ''} · ${agendarHorario.dia} ${payload.hora} · Evento: ${agendarEvento.nombre} (cita ID: ${nueva.id})`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || agendarEvento.ciudad || 'sonoyta',
    });
  };

  const onCancelarCita = async (cita: Cita) => {
    await updateCita(String(cita.id), { estado: 'cancelada', cedidaA: undefined });
    setDetalleCitas((prev) => prev.map((c) => (c.id === cita.id ? { ...c, estado: 'cancelada', cedidaA: undefined } : c)));
    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Cancelar Cita',
      detalles: `Canceló la cita ${cita.id} (${cita.fecha} ${cita.hora})`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || (detalleEvento?.ciudad || ''),
    });
  };

  const onRegistrarLlegada = async (cita: Cita) => {
    await updateCita(String(cita.id), { estado: 'en_triage' });
    setDetalleCitas((prev) => prev.map((c) => (c.id === cita.id ? { ...c, estado: 'en_triage' } : c)));
    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Registrar Llegada',
      detalles: `Registró llegada para la cita ${cita.id} (${cita.fecha} ${cita.hora})`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || (detalleEvento?.ciudad || ''),
    });
  };

  const onCederCita = async (cita: Cita, nuevoPaciente: Paciente) => {
    await updateCita(String(cita.id), { estado: 'cedida', pacienteId: nuevoPaciente.id, cedidaA: nuevoPaciente.id });
    setDetalleCitas((prev) =>
      prev.map((c) => (c.id === cita.id ? { ...c, estado: 'cedida', pacienteId: nuevoPaciente.id, cedidaA: nuevoPaciente.id } : c)),
    );
    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Ceder Cita',
      detalles: `Cedió la cita ${cita.id} (${cita.fecha} ${cita.hora}) a ${nuevoPaciente.nombre} (${nuevoPaciente.numeroExpediente})`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || (detalleEvento?.ciudad || ''),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t('citas.title')}</h1>
            <p className="mt-1 text-muted-foreground">
              {t('citas.subtitle')}
            </p>
          </div>
        </div>

        {!isInitialized && (
          <Card className="shadow-sm">
            <CardContent className="p-8">
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-24 animate-pulse rounded bg-muted/60" />
            </CardContent>
          </Card>
        )}

        {isInitialized && eventosVisibles.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <CalendarDays className="mx-auto mb-4 h-16 w-16 text-muted-foreground/40" />
              <h3 className="mb-2 text-lg font-medium text-foreground">{t('citas.no_events')}</h3>
              <p className="text-muted-foreground">{t('citas.create_event')}</p>
            </CardContent>
          </Card>
        )}

        {isInitialized && eventosVisibles.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-base">{t('citas.agenda')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {agendaMensaje && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {agendaMensaje}
                </div>
              )}
              <AgendaCitasDiaCalendar
                eventos={eventosVisibles}
                citas={citasVisibles}
                especialidadesCatalogo={especialidadesCatalogo}
                onClickDisponible={onClickDisponible}
                onClickCitas={onClickCitas}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {agendarEvento && agendarEspecialidad && agendarHorario && (
        <AgendarCitaDialog
          open={agendarOpen}
          onOpenChange={setAgendarOpen}
          evento={agendarEvento}
          especialidad={agendarEspecialidad}
          horario={agendarHorario}
          citas={citasVisibles}
          pacientes={pacientes}
          tipoCitaIdFijo={agendarHorario.tipoCitaId}
          onAgendar={onAgendar}
        />
      )}

      <DetalleCitasBloqueDialog
        open={detalleOpen}
        onOpenChange={(next) => {
          setDetalleOpen(next);
          if (!next) {
            setDetalleCitas([]);
            setDetalleTitulo('');
            setDetalleSubtitulo('');
            setDetalleEvento(null);
          }
        }}
        citas={detalleCitas}
        pacientes={pacientes}
        usuarios={usuarios}
        titulo={detalleTitulo}
        subtitulo={detalleSubtitulo}
        evento={detalleEvento}
        onCancelarCita={onCancelarCita}
        onRegistrarLlegada={onRegistrarLlegada}
        onCederCita={onCederCita}
      />
    </DashboardLayout>
  );
}
