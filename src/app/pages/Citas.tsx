import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AgendaCitasDiaCalendar } from '../components/citas/AgendaCitasDiaCalendar';
import { AgendarCitaDialog } from '../components/eventos/AgendarCitaDialog';
import { AgendarCitaGeneralDialog } from '../components/eventos/AgendarCitaGeneralDialog';
import { DetalleCitasBloqueDialog } from '../components/eventos/DetalleCitasBloqueDialog';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { Cita, Especialidad, Evento, HorarioDisponible, Paciente, Seguimiento, TipoCitaEvento } from '../types';
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
  const {
    eventos,
    citas,
    pacientes,
    usuarios,
    especialidadesCatalogo,
    seguimientos,
    addCita,
    updateCita,
    updateSeguimiento,
    addRegistroAuditoria,
    isInitialized,
  } = useData();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [agendaMensaje, setAgendaMensaje] = useState('');
  const [seguimientoParaAgendar, setSeguimientoParaAgendar] = useState<Seguimiento | null>(null);

  const [agendarOpen, setAgendarOpen] = useState(false);
  const [agendarEvento, setAgendarEvento] = useState<Evento | null>(null);
  const [agendarEspecialidad, setAgendarEspecialidad] = useState<Especialidad | null>(null);
  const [agendarHorario, setAgendarHorario] = useState<HorarioDisponible | null>(null);

  const [agendarGeneralOpen, setAgendarGeneralOpen] = useState(false);
  const [agendarGeneralFecha, setAgendarGeneralFecha] = useState('');
  const [agendarGeneralHora, setAgendarGeneralHora] = useState('');
  const [agendarGeneralPaciente, setAgendarGeneralPaciente] = useState<Paciente | null>(null);
  const [elegirPacienteOpen, setElegirPacienteOpen] = useState(false);
  const [elegirPacienteQuery, setElegirPacienteQuery] = useState('');

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
  // Incluir citas de eventos visibles + citas generales (sin evento)
  const citasVisibles = useMemo(
    () => (citas || []).filter((c) => c.eventoId === 'general' || visibleEventIds.has(c.eventoId)),
    [citas, visibleEventIds],
  );

  const pacientesById = useMemo(() => {
    const out = new Map<string, Paciente>();
    for (const p of pacientes || []) {
      if (p?.id) out.set(String(p.id), p);
    }
    return out;
  }, [pacientes]);

  const ultimaCitaByPacienteId = useMemo(() => {
    const out = new Map<string, Cita>();
    const ordenadas = [...(citasVisibles || [])].filter((c) => c && c.estado !== 'cancelada');
    ordenadas.sort((a, b) => {
      const ka = `${String(a.fecha || '').trim()} ${String(a.hora || '').trim()}`;
      const kb = `${String(b.fecha || '').trim()} ${String(b.hora || '').trim()}`;
      return kb.localeCompare(ka);
    });
    for (const c of ordenadas) {
      const pid = String(c.pacienteId || '').trim();
      if (!pid) continue;
      if (!out.has(pid)) out.set(pid, c);
    }
    return out;
  }, [citasVisibles]);

  const seguimientosPendientesAgendar = useMemo(() => {
    const allow = user?.rol === 'recepcion' || user?.rol === 'administrador';
    if (!allow) return [] as Seguimiento[];
    return (seguimientos || []).filter((s) => s.estado === 'pendiente_de_agendar');
  }, [seguimientos, user?.rol]);

  const onClickDisponible = (payload: { evento: Evento; especialidad: Especialidad; horario: HorarioDisponible }) => {
    setAgendaMensaje('');
    if (seguimientoParaAgendar && String(seguimientoParaAgendar.eventoSeguimientoId || '').trim()) {
      if (String(payload.evento.id) !== String(seguimientoParaAgendar.eventoSeguimientoId)) {
        setAgendaMensaje(t('citas.followups_wrong_event'));
        return;
      }
    }
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
    const costoRaw = Number.isFinite(Number(tipo?.precio))
      ? Number(tipo?.precio)
      : Number.isFinite(Number(espEvento?.costo))
        ? Number(espEvento?.costo)
        : 0;
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
      costoPagado: seguimientoParaAgendar ? 0 : costoRaw,
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

    if (seguimientoParaAgendar && updateSeguimiento) {
      await updateSeguimiento(seguimientoParaAgendar.id, {
        citaId: nueva.id,
        estado: 'agendada',
        fechaCita: nueva.fecha,
        horaCita: nueva.hora,
        requiereSeguimiento: true,
        notaSeguimiento: seguimientoParaAgendar.notaSeguimiento || '',
        observaciones: seguimientoParaAgendar.observaciones || '',
        diagnostico: seguimientoParaAgendar.diagnostico || '',
      });
      setSeguimientoParaAgendar(null);
    }
  };

  const onClickEmptySlot = (payload: { fecha: string; horaInicio: string; horaFin: string }) => {
    setAgendarGeneralFecha(payload.fecha);
    setAgendarGeneralHora(payload.horaInicio);
    setAgendarGeneralPaciente(null);
    setElegirPacienteQuery('');
    setElegirPacienteOpen(true); // primero seleccionar paciente
  };

  const onAgendarGeneral = async (payload: { paciente: Paciente; fecha: string; hora: string; especialidad: string; consultorio: string; costo: number }) => {
    const nueva: Cita = {
      id: `cit${Date.now()}`,
      eventoId: 'general',
      pacienteId: payload.paciente.id,
      especialidad: payload.especialidad as Especialidad,
      fecha: payload.fecha,
      hora: payload.hora,
      consultorio: payload.consultorio,
      estado: 'programada',
      costoPagado: payload.costo,
      duracionMinutos: 30, // Citas generales asumen 30 min
      fechaCreacion: todayYmd(),
    };

    await addCita(nueva);

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Agendar Cita General',
      detalles: `Agendó cita general para ${payload.paciente.nombre} (${payload.paciente.numeroExpediente}) · ${labelEspecialidad(payload.especialidad as Especialidad, especialidadesCatalogo)} · ${payload.fecha} ${payload.hora} (cita ID: ${nueva.id})`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || 'sonoyta',
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <Card className="shadow-sm lg:col-span-3">
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
                  // onClickEmptySlot={onClickEmptySlot} // Por mientras se elimina la opcion de crear citas fuera de eventos
                />
              </CardContent>
            </Card>

            {(user?.rol === 'recepcion' || user?.rol === 'administrador') && (
              <Card className="shadow-sm lg:col-span-1">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{t('citas.followups_pending')}</CardTitle>
                    <Badge variant="secondary">{seguimientosPendientesAgendar.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  {seguimientoParaAgendar && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">{t('citas.followups_selected')}</div>
                          <div className="truncate font-medium text-foreground">
                            {pacientesById.get(String(seguimientoParaAgendar.pacienteId))?.nombre || seguimientoParaAgendar.pacienteId}
                          </div>
                          {String(seguimientoParaAgendar.notaSeguimiento || '').trim() && (
                            <div className="mt-1 line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
                              {String(seguimientoParaAgendar.notaSeguimiento || '').trim()}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSeguimientoParaAgendar(null)}
                        >
                          {t('citas.followups_clear')}
                        </Button>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{t('citas.followups_pick_slot')}</div>
                    </div>
                  )}

                  {seguimientosPendientesAgendar.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      {t('citas.followups_empty')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {seguimientosPendientesAgendar.slice(0, 20).map((s) => {
                        const paciente = pacientesById.get(String(s.pacienteId));
                        const nota = String(s.notaSeguimiento || '').trim();
                        const eventoTarget = String(s.eventoSeguimientoId || '').trim();
                        const eventoNombre = eventoTarget ? (eventosVisibles.find((e) => String(e.id) === eventoTarget)?.nombre || eventoTarget) : '';
                        const ultimaCita = ultimaCitaByPacienteId.get(String(s.pacienteId));
                        const eventoUltimoNombre = ultimaCita
                          ? eventoById.get(String(ultimaCita.eventoId))?.nombre ||
                            eventos.find((e) => String(e.id) === String(ultimaCita.eventoId))?.nombre ||
                            String(ultimaCita.eventoId || '')
                          : '';
                        const tipoUltimo = ultimaCita?.tipoCitaNombre ? String(ultimaCita.tipoCitaNombre) : '';
                        return (
                          <div key={s.id} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">{paciente?.nombre || s.pacienteId}</div>
                                <div className="text-xs text-muted-foreground">{paciente?.numeroExpediente || ''}</div>
                                {eventoNombre && <div className="mt-1 text-xs text-muted-foreground">{eventoNombre}</div>}
                                {(eventoUltimoNombre || tipoUltimo) && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Último seguimiento: {eventoUltimoNombre || 'Evento N/A'}
                                    {tipoUltimo ? ` · ${tipoUltimo}` : ''}
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setSeguimientoParaAgendar(s);
                                  setAgendaMensaje(t('citas.followups_msg_selected'));
                                }}
                              >
                                {t('citas.followups_action')}
                              </Button>
                            </div>
                            {nota && <div className="mt-2 line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">{nota}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
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
          pacienteInicial={
            seguimientoParaAgendar ? pacientesById.get(String(seguimientoParaAgendar.pacienteId)) || null : null
          }
          tipoCitaIdFijo={agendarHorario.tipoCitaId}
          onAgendar={onAgendar}
        />
      )}

      {/* Paso 1: elegir paciente cuando se hace clic en espacio vacío del calendario */}
      <Dialog open={elegirPacienteOpen} onOpenChange={setElegirPacienteOpen}>
        <DialogContent className="flex max-h-[75vh] w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>Seleccionar Paciente</DialogTitle>
            <DialogDescription>¿Para quién es la cita del {agendarGeneralFecha} a las {agendarGeneralHora}?</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto px-6 py-4 space-y-3">
            <Input
              placeholder="Buscar por nombre, expediente o teléfono…"
              value={elegirPacienteQuery}
              onChange={(e) => setElegirPacienteQuery(e.target.value)}
            />
            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              {pacientes
                .filter((p) => {
                  const q = elegirPacienteQuery.trim().toLowerCase();
                  if (!q) return true;
                  return p.nombre.toLowerCase().includes(q) || p.numeroExpediente.toLowerCase().includes(q) || p.telefono.includes(q);
                })
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full flex-col px-4 py-3 text-left text-sm hover:bg-muted/30 border-b border-border"
                    onClick={() => {
                      setAgendarGeneralPaciente(p);
                      setElegirPacienteOpen(false);
                      setAgendarGeneralOpen(true);
                    }}
                  >
                    <span className="font-medium text-foreground">{p.nombre}</span>
                    <span className="text-xs text-muted-foreground">{p.numeroExpediente} · {p.telefono}</span>
                  </button>
                ))}
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setElegirPacienteOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paso 2: diálogo de cita general con paciente ya seleccionado */}
      {agendarGeneralPaciente && (
        <AgendarCitaGeneralDialog
          open={agendarGeneralOpen}
          onOpenChange={setAgendarGeneralOpen}
          paciente={agendarGeneralPaciente}
          citas={citasVisibles}
          eventos={eventosVisibles}
          especialidadesCatalogo={especialidadesCatalogo || []}
          defaultFecha={agendarGeneralFecha}
          defaultHora={agendarGeneralHora}
          onAgendar={onAgendarGeneral}
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
