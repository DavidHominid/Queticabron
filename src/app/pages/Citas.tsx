import { useMemo, useState } from 'react';
import { CalendarDays, Filter } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AgendaCitasDiaCalendar } from '../components/citas/AgendaCitasDiaCalendar';
import { AgendarCitaDialog } from '../components/eventos/AgendarCitaDialog';
import { DetalleCitasBloqueDialog } from '../components/eventos/DetalleCitasBloqueDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Cita, Especialidad, Evento, HorarioDisponible, Paciente, TipoCitaEvento } from '../types';
import { labelEspecialidad } from '../utils/especialidades';

const todayYmd = () => new Date().toISOString().slice(0, 10);

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
  const { eventos, citas, pacientes, usuarios, especialidadesCatalogo, addCita, addRegistroAuditoria, isInitialized } = useData();
  const { user } = useAuth();

  const [dia, setDia] = useState(todayYmd());
  const [agendaMensaje, setAgendaMensaje] = useState('');

  const [agendarOpen, setAgendarOpen] = useState(false);
  const [agendarEvento, setAgendarEvento] = useState<Evento | null>(null);
  const [agendarEspecialidad, setAgendarEspecialidad] = useState<Especialidad | null>(null);
  const [agendarHorario, setAgendarHorario] = useState<HorarioDisponible | null>(null);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleCitas, setDetalleCitas] = useState<Cita[]>([]);
  const [detalleTitulo, setDetalleTitulo] = useState('');
  const [detalleSubtitulo, setDetalleSubtitulo] = useState('');

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
      setAgendaMensaje('Este evento no está activo. No se pueden agendar citas.');
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
      setAgendaMensaje('Ese horario ya fue ocupado por otra cita.');
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
    setDetalleTitulo('Citas');
    setDetalleSubtitulo(
      `${payload.evento.nombre} · ${labelEspecialidad(payload.especialidad, especialidadesCatalogo)} · ${payload.horario.dia} · ${payload.horario.horaInicio}-${payload.horario.horaFin}`,
    );
    setDetalleOpen(true);
  };

  const onAgendar = async (payload: { paciente: Paciente; hora: string; tipoCita: TipoCitaEvento | null }) => {
    if (!agendarEvento || !agendarEspecialidad || !agendarHorario) return;
    if (agendarEvento.estado !== 'activo') {
      throw new Error('El evento no está activo.');
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
      throw new Error('Ese horario ya fue ocupado por otra cita.');
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
      fechaCreacion: new Date().toISOString().slice(0, 10),
    };

    await addCita(nueva);

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Agendar Cita',
      detalles: `Agendó cita para ${payload.paciente.nombre} (${payload.paciente.numeroExpediente}) · ${labelEspecialidad(agendarEspecialidad, especialidadesCatalogo)}${nueva.tipoCitaNombre ? ` · ${nueva.tipoCitaNombre}` : ''} · ${agendarHorario.dia} ${payload.hora} · Evento: ${agendarEvento.nombre}`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || agendarEvento.ciudad || 'sonoyta',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Citas</h1>
            <p className="mt-1 text-gray-600">
              Administrador general de citas del día: muestra todas las citas (todos los eventos y especialidades) y permite agendar en espacios disponibles.
            </p>
          </div>
        </div>

        {!isInitialized && (
          <Card className="shadow-sm">
            <CardContent className="p-8">
              <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
              <div className="mt-4 h-24 animate-pulse rounded bg-gray-100" />
            </CardContent>
          </Card>
        )}

        {isInitialized && eventosVisibles.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <CalendarDays className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">No hay eventos disponibles</h3>
              <p className="text-gray-600">Crea un evento con fechas y horarios para habilitar espacios disponibles.</p>
            </CardContent>
          </Card>
        )}

        {isInitialized && eventosVisibles.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">Día</div>
                <input
                  type="date"
                  value={dia}
                  onChange={(e) => {
                    setDia(e.target.value);
                    setAgendaMensaje('');
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">Eventos visibles</div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {eventosVisibles.length} evento(s) · {canSeeAllCiudades ? 'todas las ciudades' : 'mis ciudades'}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isInitialized && eventosVisibles.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Agenda del día</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {agendaMensaje && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{agendaMensaje}</div>}
              <AgendaCitasDiaCalendar dia={dia} eventos={eventosVisibles} citas={citasVisibles} onClickDisponible={onClickDisponible} onClickCitas={onClickCitas} />
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
        onOpenChange={setDetalleOpen}
        citas={detalleCitas}
        pacientes={pacientes}
        usuarios={usuarios}
        titulo={detalleTitulo}
        subtitulo={detalleSubtitulo}
      />
    </DashboardLayout>
  );
}
