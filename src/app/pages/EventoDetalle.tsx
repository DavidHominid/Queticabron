import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AgendaCalendar } from '../components/eventos/AgendaCalendar';
import { AgendarCitaDialog } from '../components/eventos/AgendarCitaDialog';
import { DetalleCitasBloqueDialog } from '../components/eventos/DetalleCitasBloqueDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
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
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Cita, Especialidad, Evento, HorarioDisponible, Paciente, Usuario } from '../types';
import { labelCiudad } from '../utils/ciudades';
import { labelEspecialidad } from '../utils/especialidades';
import { nowIso, nowMs, todayYmd } from '../utils/clock';

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
  return nowMs() > end.getTime();
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );

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
  const {
    eventos,
    citas,
    pacientes,
    usuarios,
    especialidadesCatalogo,
    ciudadesCatalogo,
    deleteEvento,
    addCita,
    addRegistroAuditoria,
    isInitialized,
  } = useData();
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
  const hoy = useMemo(() => todayYmd(), []);

  const usuariosById = useMemo(() => {
    const out = new Map<string, Usuario>();
    for (const u of usuarios || []) {
      if (u?.id) out.set(String(u.id), u as Usuario);
    }
    return out;
  }, [usuarios]);

  const nombreUsuario = useMemo(() => {
    return (usuarioId?: string | null) => {
      const idLocal = String(usuarioId || '').trim();
      if (!idLocal) return 'Sin asignar';
      return usuariosById.get(idLocal)?.nombre || idLocal;
    };
  }, [usuariosById]);

  const ciudadLabel = useMemo(() => {
    if (!evento) return '';
    return labelCiudad(evento.ciudad, ciudadesCatalogo);
  }, [evento, ciudadesCatalogo]);

  const estadoEvento = useMemo(() => {
    if (!evento) return '';
    if (evento.estado === 'cancelado') return 'Cancelado';
    if (evento.estado === 'finalizado' || bloqueado) return 'Finalizado';
    return 'Activo';
  }, [bloqueado, evento]);

  const estadoEventoVariant = useMemo(() => {
    if (!evento) return 'outline' as const;
    if (evento.estado === 'cancelado') return 'destructive' as const;
    if (evento.estado === 'finalizado' || bloqueado) return 'secondary' as const;
    return 'default' as const;
  }, [bloqueado, evento]);

  const inscripcionResumen = useMemo(() => {
    if (!evento) return { rango: 'Sin configurar', estado: 'Sin configurar', variant: 'outline' as const };
    const start = String(evento.fechaInicioInscripcion || '').trim();
    const end = String(evento.fechaFinInscripcion || evento.fechaLimiteInscripcion || '').trim();
    const rango = start || end ? `${formatDate(start)} - ${formatDate(end)}` : 'Sin configurar';
    if (!start || !end) return { rango, estado: 'Sin configurar', variant: 'outline' as const };
    if (hoy < start) return { rango, estado: 'Aún no inicia', variant: 'secondary' as const };
    if (hoy > end) return { rango, estado: 'Cerrada', variant: 'destructive' as const };
    return { rango, estado: 'Abierta', variant: 'default' as const };
  }, [evento, hoy]);

  const citasEvento = useMemo(() => {
    if (!evento) return [] as Cita[];
    return (citas || []).filter((c) => c.eventoId === evento.id);
  }, [citas, evento]);

  const resumenCitas = useMemo(() => {
    const total = citasEvento.length;
    const noCanceladas = citasEvento.filter((c) => c.estado !== 'cancelada');
    const porEstado = citasEvento.reduce<Record<string, number>>((acc, c) => {
      const key = String(c.estado || 'desconocido');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const ingresos = citasEvento.reduce((sum, c) => sum + (Number.isFinite(Number(c.costoPagado)) ? Number(c.costoPagado) : 0), 0);
    return { total, noCanceladas: noCanceladas.length, porEstado, ingresos };
  }, [citasEvento]);

  const cupoTotalEvento = useMemo(() => {
    if (!evento) return 0;
    let total = 0;
    for (const esp of evento.especialidades || []) {
      for (const h of esp.horarios || []) {
        total += Number.isFinite(Number(h.cupoTotal)) ? Number(h.cupoTotal) : 0;
      }
    }
    return total;
  }, [evento]);

  const cuposResumen = useMemo(() => {
    const ocupados = resumenCitas.noCanceladas;
    const total = cupoTotalEvento;
    const disponibles = total ? Math.max(0, total - ocupados) : 0;
    const pct = total ? Math.round((ocupados / total) * 100) : 0;
    return { total, ocupados, disponibles, pct };
  }, [cupoTotalEvento, resumenCitas.noCanceladas]);

  const citasPorEspecialidad = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of citasEvento) {
      const key = String(c.especialidad || '');
      if (!key) continue;
      out[key] = (out[key] || 0) + 1;
    }
    return out;
  }, [citasEvento]);

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
            <h2 className="text-lg font-semibold text-foreground">Evento no encontrado</h2>
            <p className="mt-2 text-muted-foreground">El evento seleccionado no existe o fue eliminado.</p>
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
            <button
              type="button"
              onClick={() => navigate('/eventos')}
              className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a eventos
            </button>
            <h1 className="text-2xl font-semibold text-foreground">{evento?.nombre || 'Evento'}</h1>
            <p className="mt-1 text-muted-foreground">Consulta la información general del evento y su agenda por especialidad.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => (evento ? navigate(`/eventos/${evento.id}/editar`) : null)}
              disabled={!evento || bloqueado}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar evento
            </Button>
            {evento && user?.rol === 'administrador' && !bloqueado && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
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
                      className="bg-destructive text-white hover:bg-destructive/90"
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
                            fechaHora: nowIso(),
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
                  <Button type="button" variant="destructive">
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
                      className="bg-destructive text-white hover:bg-destructive/90"
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
                            fechaHora: nowIso(),
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
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-24 animate-pulse rounded bg-muted/60" />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <div className="space-y-6 lg:col-span-1">
                <Card className="shadow-sm">
                  <CardHeader className="border-b">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">Información del evento</CardTitle>
                      <Badge variant={estadoEventoVariant}>{estadoEvento}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6 text-sm">
                    <div>
                      <div className="text-muted-foreground">Ciudad</div>
                      <div className="font-medium text-foreground">{ciudadLabel || evento.ciudad}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Fechas del evento</div>
                      <div className="font-medium text-foreground">
                        {formatDate(evento.fechaInicio)} - {formatDate(evento.fechaFin)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-muted-foreground">Inscripciones</div>
                        <Badge variant={inscripcionResumen.variant}>{inscripcionResumen.estado}</Badge>
                      </div>
                      <div className="font-medium text-foreground">{inscripcionResumen.rango}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Especialidades</div>
                      <div className="font-medium text-foreground">{evento.especialidades.length}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cupos (aprox.)</div>
                      <div className="font-medium text-foreground">
                        {cuposResumen.total ? (
                          <>
                            {cuposResumen.ocupados} ocupados · {cuposResumen.disponibles} disponibles · {cuposResumen.pct}%
                          </>
                        ) : (
                          'Sin cupos calculables'
                        )}
                      </div>
                    </div>
                    {user?.rol === 'administrador' && (
                      <div>
                        <div className="text-muted-foreground">ID</div>
                        <div className="font-medium text-foreground">{evento.id}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="border-b">
                    <CardTitle className="text-base">Resumen de citas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-muted/20 p-3">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">{resumenCitas.total}</div>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/20 p-3">
                        <div className="text-xs text-muted-foreground">No canceladas</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">{resumenCitas.noCanceladas}</div>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/20 p-3">
                        <div className="text-xs text-muted-foreground">Programadas</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">{resumenCitas.porEstado.programada || 0}</div>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/20 p-3">
                        <div className="text-xs text-muted-foreground">Completadas</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">{resumenCitas.porEstado.completada || 0}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/20 p-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Ingresos (sumatoria)</div>
                        <div className="mt-1 font-semibold text-foreground">{formatMoney(resumenCitas.ingresos)}</div>
                      </div>
                      <Badge variant="outline">{hoy}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm lg:col-span-3">
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Agenda del evento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Especialidad</label>
                      <select
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
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
                      <label className="mb-2 block text-sm font-medium text-foreground">Desde</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        min={evento.fechaInicio || undefined}
                        max={evento.fechaFin || undefined}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Hasta</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                        min={evento.fechaInicio || undefined}
                        max={evento.fechaFin || undefined}
                      />
                    </div>
                  </div>

                  {!especialidad ? (
                    <div className="text-sm text-muted-foreground">Selecciona una especialidad para visualizar la agenda.</div>
                  ) : days.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Selecciona un rango de fechas válido.</div>
                  ) : horarios.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-10 text-center">
                      <CalendarDays className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                      <div className="text-sm text-muted-foreground">Esta especialidad aún no tiene horarios configurados.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {agendaMensaje && <div className="text-sm text-destructive">{agendaMensaje}</div>}
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

            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Configuración por especialidad</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Accordion type="multiple" className="w-full">
                  {evento.especialidades.map((esp) => {
                    const tipos = Array.isArray(esp.tiposCita) ? esp.tiposCita : [];
                    const horariosSorted = [...(esp.horarios || [])].sort((a, b) =>
                      `${a.dia}T${a.horaInicio}`.localeCompare(`${b.dia}T${b.horaInicio}`),
                    );
                    const horariosPreview = horariosSorted.slice(0, 10);
                    const horariosExtra = Math.max(0, horariosSorted.length - horariosPreview.length);
                    const cupoTotalEsp = (esp.horarios || []).reduce(
                      (sum, h) => sum + (Number.isFinite(Number(h.cupoTotal)) ? Number(h.cupoTotal) : 0),
                      0,
                    );

                    const tipoLabel = (tipoCitaId?: string) => {
                      const key = String(tipoCitaId || '').trim();
                      if (!key) return '';
                      const found = tipos.find((t) => String(t.id || '') === key);
                      return found?.nombre ? String(found.nombre) : key;
                    };

                    return (
                      <AccordionItem key={esp.especialidad} value={esp.especialidad}>
                        <AccordionTrigger>
                          <div className="flex w-full flex-wrap items-center justify-between gap-2 pr-2">
                            <div className="font-medium text-foreground">
                              {labelEspecialidad(esp.especialidad, especialidadesCatalogo)}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{citasPorEspecialidad[esp.especialidad] || 0} citas</Badge>
                              <Badge variant="secondary">{(esp.horarios || []).length} bloques</Badge>
                              <Badge variant="secondary">{cupoTotalEsp} cupos</Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="space-y-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">Médico encargado</div>
                                <div className="font-medium text-foreground">{nombreUsuario(esp.medicoEncargado)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Practicantes</div>
                                <div className="font-medium text-foreground">
                                  {(esp.practicantes || []).length
                                    ? esp.practicantes.map((p) => nombreUsuario(p)).join(', ')
                                    : 'Sin asignar'}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Consultorio</div>
                                <div className="font-medium text-foreground">{String(esp.consultorio || '').trim() || 'Sin asignar'}</div>
                              </div>
                            </div>

                            <div className="space-y-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">Costo base</div>
                                <div className="font-medium text-foreground">{formatMoney(esp.costo || 0)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Tipos de cita</div>
                                {tipos.length === 0 ? (
                                  <div className="font-medium text-foreground">Sin tipos configurados</div>
                                ) : (
                                  <div className="space-y-2">
                                    {tipos.map((t) => (
                                      <div key={String(t.id || t.nombre)} className="rounded-xl border border-border bg-muted/20 p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="font-medium text-foreground">{t.nombre}</div>
                                          <Badge variant="outline">{formatMoney(t.precio)}</Badge>
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                          {t.duracionMinutos} min · {nombreUsuario(t.medicoEncargado)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6">
                            <div className="mb-2 text-sm font-medium text-foreground">Horarios</div>
                            {horariosSorted.length === 0 ? (
                              <div className="text-sm text-muted-foreground">Sin horarios configurados.</div>
                            ) : (
                              <div className="space-y-2">
                                {horariosPreview.map((h) => (
                                  <div key={slotKeyForHorario(h) + h.dia} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm">
                                    <div className="font-medium text-foreground">
                                      {formatDate(h.dia)} · {h.horaInicio}-{h.horaFin}
                                      {h.tipoCitaId ? ` · ${tipoLabel(h.tipoCitaId)}` : ''}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>Cupo: {Number.isFinite(Number(h.cupoTotal)) ? Number(h.cupoTotal) : '—'}</span>
                                      <span>Intervalo: {Number.isFinite(Number(h.intervalo)) ? Number(h.intervalo) : 60}m</span>
                                    </div>
                                  </div>
                                ))}
                                {horariosExtra > 0 && (
                                  <div className="text-sm text-muted-foreground">+{horariosExtra} horarios más</div>
                                )}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>

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
                    fechaCreacion: todayYmd(),
                  };

                  await addCita(nuevaCita);
                  await addRegistroAuditoria({
                    id: `aud${Date.now()}`,
                    usuarioId: user?.id || '',
                    nombreUsuario: user?.nombre || '',
                    rol: user?.rol || 'recepcion',
                    accion: 'Agendar Cita',
                    detalles: `Agendó cita para paciente ${paciente.nombre} (${paciente.numeroExpediente}) en ${nuevaCita.fecha} ${nuevaCita.hora} (${nuevaCita.especialidad}${nuevaCita.tipoCitaNombre ? ` · ${nuevaCita.tipoCitaNombre}` : ''})`,
                    fechaHora: nowIso(),
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
