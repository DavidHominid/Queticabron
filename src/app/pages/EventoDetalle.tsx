import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AgendaCalendar } from '../components/eventos/AgendaCalendar';
import { AgendarCitaDialog } from '../components/eventos/AgendarCitaDialog';
import { DetalleCitasBloqueDialog } from '../components/eventos/DetalleCitasBloqueDialog';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Cita, Especialidad, Evento, HorarioDisponible, Paciente, Usuario } from '../types';
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

const isEventoFinalizado = (fechaFin?: string | null) => {
  if (!fechaFin) return false;
  const end = new Date(`${fechaFin}T23:59:59`);
  if (Number.isNaN(end.getTime())) return false;
  return Date.now() > end.getTime();
};

const slotKeyForHorario = (h: HorarioDisponible) => {
  const intervalo = Number.isFinite(Number(h.intervalo)) ? Math.max(1, Math.floor(Number(h.intervalo))) : 60;
  return `${h.horaInicio}|${h.horaFin}|${intervalo}|${h.tipoCitaId || ''}`;
};

const timeToMinutes = (t: string) => {
  const [hh, mm] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const citasInWindow = (
  citas: Cita[],
  payload: { eventoId: string; especialidad: Especialidad; fecha: string; horaInicio: string; horaFin: string; tipoCitaId?: string },
) => {
  const s = timeToMinutes(payload.horaInicio);
  const e = timeToMinutes(payload.horaFin);
  return citas.filter((c) => {
    if (c.eventoId !== payload.eventoId) return false;
    if (c.especialidad !== payload.especialidad) return false;
    if (c.fecha !== payload.fecha) return false;
    if (c.estado === 'cancelada') return false;
    if (payload.tipoCitaId && String(c.tipoCitaId || '') !== String(payload.tipoCitaId)) return false;
    const cs = timeToMinutes(c.hora);
    const cdur = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
    const ce = cs + cdur;
    return cs < e && ce > s;
  });
};

const hasCita = (
  citas: Cita[],
  payload: { eventoId: string; especialidad: Especialidad; fecha: string; horaInicio: string; horaFin: string; tipoCitaId?: string },
) => {
  const s = timeToMinutes(payload.horaInicio);
  const e = timeToMinutes(payload.horaFin);
  return citas.some(
    (c) => {
      if (c.eventoId !== payload.eventoId) return false;
      if (c.especialidad !== payload.especialidad) return false;
      if (c.fecha !== payload.fecha) return false;
      if (c.estado === 'cancelada') return false;
      if (payload.tipoCitaId && String(c.tipoCitaId || '') !== String(payload.tipoCitaId)) return false;
      const cs = timeToMinutes(c.hora);
      const cdur = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
      const ce = cs + cdur;
      return cs < e && ce > s;
    },
  );
};

export function EventoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { eventos, citas, pacientes, usuarios, especialidadesCatalogo, deleteEvento, addCita, addRegistroAuditoria, isInitialized } = useData();
  const { user } = useAuth();
  const modoPruebas = String((import.meta as any).env?.VITE_EVENTOS_MODO_PRUEBAS || '')
    .trim()
    .toLowerCase() === 'true';
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

  const evento = useMemo(() => eventos.find((e) => e.id === id) || null, [eventos, id]);
  const bloqueado = useMemo(() => isEventoFinalizado(evento?.fechaFin || null), [evento?.fechaFin]);

  useEffect(() => {
    if (!evento) return;
    if (!especialidad) {
      const first = evento.especialidades?.[0]?.especialidad;
      if (first) setEspecialidad(first);
    }
  }, [evento, especialidad]);

  useEffect(() => {
    if (!evento) return;
    if (desde && hasta) return;
    const days = listDaysInclusive(evento.fechaInicio || '', evento.fechaFin || '');
    const limited = days.slice(0, 7);
    if (limited.length) {
      setDesde(limited[0]);
      setHasta(limited[limited.length - 1]);
    }
  }, [evento, desde, hasta]);

  const days = useMemo(() => listDaysInclusive(desde, hasta), [desde, hasta]);

  const horarios = useMemo((): HorarioDisponible[] => {
    if (!evento || !especialidad) return [];
    return evento.especialidades.find((e) => e.especialidad === especialidad)?.horarios || [];
  }, [evento, especialidad]);

  const onCreateOrEdit = (day: string, slotKey: string) => {
    if (!evento || !especialidad) return;
    const qp = new URLSearchParams({ especialidad, fecha: day, slot: slotKey });
    navigate(`/eventos/${evento.id}/editar?${qp.toString()}`);
  };

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
      onCreateOrEdit(payload.day, payload.slotKey);
      return;
    }

    const horario = horarios.find((h) => h.dia === payload.day && slotKeyForHorario(h) === payload.slotKey) || null;
    if (!horario) {
      onCreateOrEdit(payload.day, payload.slotKey);
      return;
    }

    const ocupadas = citasInWindow(citas, {
      eventoId: evento.id,
      especialidad: especialidad as Especialidad,
      fecha: payload.day,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
      tipoCitaId: horario.tipoCitaId,
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

    setAgendarHorario(horario);
    setAgendarOpen(true);
  };

  if (isInitialized && !evento) {
    return (
      <DashboardLayout>
        <Card className="shadow-sm">
          <CardContent className="p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">Evento no encontrado</h2>
            <p className="mt-2 text-gray-600">El evento seleccionado no existe o fue eliminado.</p>
            <Button type="button" className="mt-6" onClick={() => navigate('/eventos')}>
              Volver a eventos
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button type="button" onClick={() => navigate('/eventos')} className="mb-3 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a eventos
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">{evento?.nombre || 'Evento'}</h1>
            <p className="mt-1 text-gray-600">Consulta la información general del evento y su agenda por especialidad.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => (evento ? navigate(`/eventos/${evento.id}/editar`) : null)}
              disabled={!evento || bloqueado}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar evento
            </Button>
            {evento && user?.rol === 'administrador' && !bloqueado && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar evento</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará el evento "{evento.nombre}" y también especialidades, horarios, practicantes, citas, triage y notas médicas relacionadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={async () => {
                        try {
                          await deleteEvento(evento.id);
                          addRegistroAuditoria({
                            id: `aud${Date.now()}`,
                            usuarioId: user?.id || '',
                            nombreUsuario: user?.nombre || '',
                            rol: user?.rol || 'administrador',
                            accion: 'Eliminar Evento',
                            detalles: `Eliminó evento: ${evento.nombre} (${evento.id})`,
                            fechaHora: new Date().toISOString(),
                            ciudad: (user?.ciudad || 'sonoyta') as any,
                          });
                          navigate('/eventos');
                        } catch (err: any) {
                          alert(err?.message || 'No se pudo eliminar el evento.');
                        }
                      }}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {evento && user?.rol === 'administrador' && bloqueado && modoPruebas && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar (pruebas)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar evento (modo pruebas)</AlertDialogTitle>
                    <AlertDialogDescription>
                      El evento ya finalizó y normalmente es de solo lectura. En modo pruebas se permite eliminarlo de forma forzada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={async () => {
                        try {
                          await deleteEvento(evento.id, { force: true });
                          addRegistroAuditoria({
                            id: `aud${Date.now()}`,
                            usuarioId: user?.id || '',
                            nombreUsuario: user?.nombre || '',
                            rol: user?.rol || 'administrador',
                            accion: 'Eliminar Evento (Pruebas)',
                            detalles: `Eliminó evento (pruebas): ${evento.nombre} (${evento.id})`,
                            fechaHora: new Date().toISOString(),
                            ciudad: (user?.ciudad || 'sonoyta') as any,
                          });
                          navigate('/eventos');
                        } catch (err: any) {
                          alert(err?.message || 'No se pudo eliminar el evento.');
                        }
                      }}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {!evento ? (
          <Card className="shadow-sm">
            <CardContent className="p-8">
              <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
              <div className="mt-4 h-24 animate-pulse rounded bg-gray-100" />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <Card className="shadow-sm lg:col-span-1">
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Información del evento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6 text-sm">
                  <div>
                    <div className="text-gray-500">Ciudad</div>
                    <div className="font-medium text-gray-900">{evento.ciudad}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Inscripciones</div>
                    <div className="font-medium text-gray-900">
                      {formatDate(evento.fechaInicioInscripcion)} - {formatDate(evento.fechaFinInscripcion || evento.fechaLimiteInscripcion)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Evento</div>
                    <div className="font-medium text-gray-900">
                      {formatDate(evento.fechaInicio)} - {formatDate(evento.fechaFin)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Estado</div>
                    <div className="font-medium capitalize text-gray-900">{evento.estado}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Especialidades</div>
                    <div className="font-medium text-gray-900">{evento.especialidades.length}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm lg:col-span-3">
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Agenda del evento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-900">Especialidad</label>
                      <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={especialidad}
                        onChange={(e) => setEspecialidad(e.target.value as Especialidad)}
                      >
                        <option value="">Selecciona…</option>
                        {evento.especialidades.map((esp) => (
                          <option key={esp.especialidad} value={esp.especialidad}>
                            {labelEspecialidad(esp.especialidad, especialidadesCatalogo)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-900">Desde</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        min={evento.fechaInicio || undefined}
                        max={evento.fechaFin || undefined}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-900">Hasta</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                        min={evento.fechaInicio || undefined}
                        max={evento.fechaFin || undefined}
                      />
                    </div>
                  </div>

                  {!especialidad ? (
                    <div className="text-sm text-gray-600">Selecciona una especialidad para visualizar la agenda.</div>
                  ) : days.length === 0 ? (
                    <div className="text-sm text-gray-600">Selecciona un rango de fechas válido.</div>
                  ) : horarios.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
                      <CalendarDays className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                      <div className="text-sm text-gray-600">Esta especialidad aún no tiene horarios configurados.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {agendaMensaje && <div className="text-sm text-red-600">{agendaMensaje}</div>}
                      <AgendaCalendar
                        eventoId={evento.id}
                        especialidad={especialidad as Especialidad}
                        desde={desde}
                        hasta={hasta}
                        horarios={horarios}
                        citas={citas}
                        onSlotAction={onSlotAction}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {evento && especialidad && agendarHorario && (
              <AgendarCitaDialog
                open={agendarOpen}
                onOpenChange={(next) => {
                  setAgendarOpen(next);
                  if (!next) setAgendarHorario(null);
                }}
                evento={evento as Evento}
                especialidad={especialidad as Especialidad}
                horario={agendarHorario}
                citas={citas}
                pacientes={pacientes}
                tipoCitaIdFijo={agendarHorario.tipoCitaId}
                onAgendar={async ({ paciente, hora, tipoCita }) => {
                  const espCfg = evento.especialidades.find((e) => e.especialidad === (especialidad as Especialidad));
                  if (!espCfg) throw new Error('No se encontró la configuración de la especialidad en el evento.');

                  if (
                    hasCita(citas, {
                      eventoId: evento.id,
                      especialidad: especialidad as Especialidad,
                      fecha: agendarHorario.dia,
                      horaInicio: agendarHorario.horaInicio,
                      horaFin: agendarHorario.horaFin,
                      tipoCitaId: agendarHorario.tipoCitaId,
                    })
                  ) {
                    throw new Error('Esa hora ya fue ocupada.');
                  }

                  const nuevaCita: Cita = {
                    id: `cit${Date.now()}`,
                    eventoId: evento.id,
                    pacienteId: paciente.id,
                    especialidad: especialidad as Especialidad,
                    fecha: agendarHorario.dia,
                    hora,
                    consultorio: espCfg.consultorio || 'Consultorio 1',
                    tipoCitaId: tipoCita?.id ? String(tipoCita.id) : undefined,
                    tipoCitaNombre: tipoCita?.nombre ? String(tipoCita.nombre) : undefined,
                    duracionMinutos: tipoCita?.duracionMinutos ? Number(tipoCita.duracionMinutos) : undefined,
                    medicoEncargado: String(tipoCita?.medicoEncargado || '').trim() || espCfg.medicoEncargado || '',
                    estado: 'programada',
                    costoPagado: Number.isFinite(Number(tipoCita?.precio)) ? Number(tipoCita?.precio) : Number.isFinite(Number(espCfg.costo)) ? Number(espCfg.costo) : 0,
                    fechaCreacion: new Date().toISOString().split('T')[0],
                  };

                  await addCita(nuevaCita);
                  await addRegistroAuditoria({
                    id: `aud${Date.now()}`,
                    usuarioId: user?.id || '',
                    nombreUsuario: user?.nombre || '',
                    rol: user?.rol || 'recepcion',
                    accion: 'Agendar Cita',
                    detalles: `Agendó cita para paciente ${paciente.nombre} (${paciente.numeroExpediente}) en ${nuevaCita.fecha} ${nuevaCita.hora} (${nuevaCita.especialidad}${nuevaCita.tipoCitaNombre ? ` · ${nuevaCita.tipoCitaNombre}` : ''})`,
                    fechaHora: new Date().toISOString(),
                    ciudad: user?.ciudad || evento.ciudad,
                  });
                }}
              />
            )}

            {evento && especialidad && (
              <DetalleCitasBloqueDialog
                open={detalleOpen}
                onOpenChange={(next) => {
                  setDetalleOpen(next);
                  if (!next) {
                    setDetalleCitas([]);
                    setDetalleHorario(null);
                    setDetalleTitulo('');
                    setDetalleSubtitulo('');
                    setDetalleDisponibles(0);
                  }
                }}
                citas={detalleCitas}
                pacientes={pacientes as Paciente[]}
                usuarios={usuarios as Usuario[]}
                titulo={detalleTitulo}
                subtitulo={detalleSubtitulo}
                primaryAction={
                  detalleHorario && detalleDisponibles > 0
                    ? {
                        label: 'Agendar otro cupo',
                        onClick: () => {
                          setDetalleOpen(false);
                          setAgendarHorario(detalleHorario);
                          setAgendarOpen(true);
                        },
                      }
                    : undefined
                }
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
