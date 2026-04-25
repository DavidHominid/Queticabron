import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Filter } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AgendaCalendar } from '../components/eventos/AgendaCalendar';
import { AgendarCitaDialog } from '../components/eventos/AgendarCitaDialog';
import { DetalleCitasBloqueDialog } from '../components/eventos/DetalleCitasBloqueDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Cita, Especialidad, Evento, HorarioDisponible, Paciente } from '../types';
import { labelEspecialidad } from '../utils/especialidades';

const listDaysInclusive = (start: string, end: string) => {
  if (!start || !end) return [] as string[];
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s.getTime() > e.getTime()) return [];
  const out: string[] = [];
  const cur = new Date(s);
  while (cur.getTime() <= e.getTime()) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const slotKeyForHorario = (h: HorarioDisponible) => {
  const intervalo = Number.isFinite(Number(h.intervalo)) ? Math.max(1, Math.floor(Number(h.intervalo))) : 60;
  return `${h.horaInicio}|${h.horaFin}|${intervalo}`;
};

const timeToMinutes = (t: string) => {
  const [hh, mm] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const citasInWindow = (
  citas: Cita[],
  payload: { eventoId: string; especialidad: Especialidad; fecha: string; horaInicio: string; horaFin: string },
) => {
  const s = timeToMinutes(payload.horaInicio);
  const e = timeToMinutes(payload.horaFin);
  return citas.filter((c) => {
    if (c.eventoId !== payload.eventoId) return false;
    if (c.especialidad !== payload.especialidad) return false;
    if (c.fecha !== payload.fecha) return false;
    if (c.estado === 'cancelada') return false;
    const m = timeToMinutes(c.hora);
    return m >= s && m < e;
  });
};

const hasCita = (citas: Cita[], payload: { eventoId: string; especialidad: Especialidad; fecha: string; hora: string }) => {
  return citas.some(
    (c) =>
      c.eventoId === payload.eventoId &&
      c.especialidad === payload.especialidad &&
      c.fecha === payload.fecha &&
      c.hora === payload.hora &&
      c.estado !== 'cancelada',
  );
};

export function Citas() {
  const { eventos, citas, pacientes, usuarios, especialidadesCatalogo, addCita, addRegistroAuditoria, isInitialized } = useData();
  const { user } = useAuth();
  const [eventoId, setEventoId] = useState('');
  const [especialidad, setEspecialidad] = useState<Especialidad | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [agendaMensaje, setAgendaMensaje] = useState('');

  const [agendarOpen, setAgendarOpen] = useState(false);
  const [agendarHorario, setAgendarHorario] = useState<HorarioDisponible | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleCitas, setDetalleCitas] = useState<Cita[]>([]);
  const [detalleTitulo, setDetalleTitulo] = useState('');
  const [detalleSubtitulo, setDetalleSubtitulo] = useState('');
  const [detalleHorario, setDetalleHorario] = useState<HorarioDisponible | null>(null);
  const [detalleDisponibles, setDetalleDisponibles] = useState(0);

  const canSeeAllCiudades = user?.rol === 'administrador';

  const eventosVisibles = useMemo(() => {
    const ciudadesUsuario =
      Array.isArray((user as any)?.ciudades) && (user as any).ciudades.length
        ? ((user as any).ciudades as string[])
        : user?.ciudad
          ? [user.ciudad]
          : [];
    const base = canSeeAllCiudades ? eventos : eventos.filter((e) => ciudadesUsuario.includes(e.ciudad));
    return [...base].sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));
  }, [canSeeAllCiudades, eventos, user?.ciudad, (user as any)?.ciudades]);

  const evento = useMemo(() => eventosVisibles.find((e) => e.id === eventoId) || null, [eventosVisibles, eventoId]);

  useEffect(() => {
    if (eventoId) return;
    const firstActivo = eventosVisibles.find((e) => e.estado === 'activo') || eventosVisibles[0];
    if (firstActivo) setEventoId(firstActivo.id);
  }, [eventoId, eventosVisibles]);

  useEffect(() => {
    if (!evento) return;
    if (especialidad) return;
    const first = evento.especialidades?.[0]?.especialidad as Especialidad | undefined;
    if (first) setEspecialidad(first);
  }, [especialidad, evento]);

  useEffect(() => {
    if (!evento) return;
    const days = listDaysInclusive(evento.fechaInicio || '', evento.fechaFin || '');
    if (!days.length) return;
    const limited = days.slice(0, 7);
    setDesde(limited[0]);
    setHasta(limited[limited.length - 1]);
  }, [evento?.id]);

  const horarios = useMemo(() => {
    if (!evento || !especialidad) return [] as HorarioDisponible[];
    return evento.especialidades.find((e) => e.especialidad === especialidad)?.horarios || [];
  }, [evento, especialidad]);

  const horariosSinFecha = useMemo(() => horarios.filter((h) => h.dia && !h.dia.includes('-')), [horarios]);
  const horariosConFecha = useMemo(() => horarios.filter((h) => h.dia && h.dia.includes('-')), [horarios]);

  const onSlotAction = (payload: {
    source: 'bloque' | 'nuevo';
    day: string;
    slotKey: string;
    start: string;
    end: string;
    cupoTotal: number;
    cupoOcupado: number;
    disponibles: number;
  }) => {
    if (!evento || !especialidad) return;
    setAgendaMensaje('');

    if (payload.source === 'nuevo') {
      setAgendaMensaje('No hay un bloque de horario definido en ese punto. Selecciona un bloque existente con cupos.');
      return;
    }

    const horario = horariosConFecha.find((h) => h.dia === payload.day && slotKeyForHorario(h) === payload.slotKey) || null;
    if (!horario) {
      setAgendaMensaje('No se encontró el bloque de horario. Revisa que el evento tenga horarios por fecha.');
      return;
    }

    const ocupadas = citasInWindow(citas, {
      eventoId: evento.id,
      especialidad: especialidad as Especialidad,
      fecha: payload.day,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
    });

    if (ocupadas.length > 0) {
      setDetalleHorario(horario);
      setDetalleCitas(ocupadas);
      setDetalleDisponibles(payload.disponibles);
      setDetalleTitulo('Cupos ocupados');
      setDetalleSubtitulo(`${payload.day} · ${horario.horaInicio}-${horario.horaFin}`);
      setDetalleOpen(true);
      return;
    }

    if (payload.disponibles <= 0) {
      setAgendaMensaje('Este bloque ya no tiene cupos disponibles.');
      return;
    }

    if (evento.estado !== 'activo') {
      setAgendaMensaje('Este evento no está activo. No se pueden agendar citas.');
      return;
    }

    setAgendarHorario(horario);
    setAgendarOpen(true);
  };

  const onAgendar = async (payload: { paciente: Paciente; hora: string }) => {
    if (!evento || !especialidad || !agendarHorario) return;
    if (evento.estado !== 'activo') {
      throw new Error('El evento no está activo.');
    }

    if (hasCita(citas, { eventoId: evento.id, especialidad: especialidad as Especialidad, fecha: agendarHorario.dia, hora: payload.hora })) {
      throw new Error('Ese horario ya fue ocupado por otra cita.');
    }

    const espEvento = evento.especialidades.find((e) => e.especialidad === especialidad) || null;
    const nueva: Cita = {
      id: `cit${Date.now()}`,
      eventoId: evento.id,
      pacienteId: payload.paciente.id,
      especialidad: especialidad as Especialidad,
      fecha: agendarHorario.dia,
      hora: payload.hora,
      consultorio: espEvento?.consultorio || '',
      medicoEncargado: espEvento?.medicoEncargado || '',
      estado: 'programada',
      costoPagado: Number.isFinite(Number(espEvento?.costo)) ? Number(espEvento?.costo) : 0,
      fechaCreacion: new Date().toISOString().slice(0, 10),
    };

    await addCita(nueva);

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Agendar Cita',
      detalles: `Agendó cita para ${payload.paciente.nombre} (${payload.paciente.numeroExpediente}) · ${labelEspecialidad(especialidad as Especialidad, especialidadesCatalogo)} · ${agendarHorario.dia} ${payload.hora} · Evento: ${evento.nombre}`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || evento.ciudad || 'sonoyta',
    });
  };

  const detallePrimaryAction = useMemo(() => {
    if (!evento || !especialidad) return undefined;
    if (evento.estado !== 'activo') return undefined;
    if (!detalleHorario) return undefined;
    if (detalleDisponibles <= 0) return undefined;
    return {
      label: 'Agendar en este bloque',
      onClick: () => {
        setDetalleOpen(false);
        setAgendarHorario(detalleHorario);
        setAgendarOpen(true);
      },
    };
  }, [detalleDisponibles, detalleHorario, especialidad, evento]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Citas</h1>
            <p className="mt-1 text-gray-600">Agenda citas por evento y especialidad respetando horarios, cupos y estados.</p>
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
              <p className="text-gray-600">Primero crea un evento con fechas y horarios para habilitar cupos.</p>
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
                <div className="text-sm font-medium text-gray-900">Evento</div>
                <select
                  value={eventoId}
                  onChange={(e) => {
                    setEventoId(e.target.value);
                    setEspecialidad('');
                    setAgendaMensaje('');
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {eventosVisibles.map((e: Evento) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} · {e.ciudad} · {e.estado}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">Especialidad</div>
                <select
                  value={especialidad}
                  onChange={(e) => {
                    setEspecialidad(e.target.value as Especialidad);
                    setAgendaMensaje('');
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  disabled={!evento}
                >
                  {(evento?.especialidades || []).map((esp) => (
                    <option key={esp.especialidad} value={esp.especialidad}>
                      {labelEspecialidad(esp.especialidad as Especialidad, especialidadesCatalogo)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">Desde</div>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  disabled={!evento}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">Hasta</div>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  disabled={!evento}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <div>
                      <div className="text-gray-500">Inscripciones</div>
                      <div className="font-medium text-gray-900">
                        {formatDate(evento?.fechaInicioInscripcion)} - {formatDate(evento?.fechaFinInscripcion || evento?.fechaLimiteInscripcion)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Evento</div>
                      <div className="font-medium text-gray-900">
                        {formatDate(evento?.fechaInicio)} - {formatDate(evento?.fechaFin)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Estado</div>
                      <div className="font-medium capitalize text-gray-900">{evento?.estado || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isInitialized && evento && especialidad && horariosSinFecha.length > 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="text-sm text-amber-800">
                Este evento tiene horarios guardados como texto (ej. “Lunes”). Para calcular cupos por bloque, define horarios por fecha (YYYY-MM-DD) en el editor del evento.
              </div>
            </CardContent>
          </Card>
        )}

        {isInitialized && evento && especialidad && (
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Agenda por cupos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {agendaMensaje && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{agendaMensaje}</div>
              )}
              <AgendaCalendar
                eventoId={evento.id}
                especialidad={especialidad as Especialidad}
                desde={desde}
                hasta={hasta}
                horarios={horariosConFecha}
                citas={citas}
                onSlotAction={onSlotAction}
              />
              {horariosConFecha.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  No hay horarios por fecha para esta especialidad. Ve a “Editar evento” y agrega bloques con día (YYYY-MM-DD).
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {evento && especialidad && agendarHorario && (
        <AgendarCitaDialog
          open={agendarOpen}
          onOpenChange={setAgendarOpen}
          evento={evento}
          especialidad={especialidad as Especialidad}
          horario={agendarHorario}
          citas={citas}
          pacientes={pacientes}
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
        primaryAction={detallePrimaryAction}
      />
    </DashboardLayout>
  );
}
