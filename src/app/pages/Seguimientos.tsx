import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Calendar,
  FileText,
  Plus,
  Search,
  User,
  Pill,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  ChevronLeft,
  Phone,
  PhoneMissed,
  PhoneOff,
  XCircle,
  Ban,
} from 'lucide-react';
import { AgendaCalendar } from '../components/eventos/AgendaCalendar';
import { labelEspecialidad } from '../utils/especialidades';
import { Especialidad, HorarioDisponible, IntentoContacto, Seguimiento } from '../types';
import { todayYmd, formatDateYmd } from '../utils/clock';

// Semáforo de riesgo: clasifica urgencia según fechaProgramada vs hoy
const riesgoSemaforo = (seg: Seguimiento, hoy: string): 'rojo' | 'ambar' | 'verde' | null => {
  const estadosCerrados = ['completada', 'cancelado_por_paciente', 'incontactable', 'agendada'];
  if (estadosCerrados.includes(seg.estado)) return null;
  const fecha = seg.fechaProgramada || seg.fechaCita || '';
  if (!fecha) return 'verde';
  if (fecha < hoy) return 'rojo';
  // Esta semana = dentro de 7 días
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + 7);
  const limitStr = limite.toISOString().slice(0, 10);
  if (fecha <= limitStr) return 'ambar';
  return 'verde';
};

const semaforoBorderClass = (nivel: 'rojo' | 'ambar' | 'verde' | null): string => {
  if (nivel === 'rojo') return 'border-l-4 border-l-red-500';
  if (nivel === 'ambar') return 'border-l-4 border-l-amber-400';
  if (nivel === 'verde') return 'border-l-4 border-l-emerald-500';
  return '';
};

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

const slotKeyForHorario = (h: { horaInicio: string; horaFin: string; intervalo?: number; tipoCitaId?: string }) => {
  const intervalo = Number.isFinite(Number(h.intervalo)) ? Math.max(1, Math.floor(Number(h.intervalo))) : 60;
  return `${h.horaInicio}|${h.horaFin}|${intervalo}|${h.tipoCitaId || ''}`;
};

export function Seguimientos() {
  const { t } = useLanguage();
  const { seguimientos, pacientes, especialidadesCatalogo, addSeguimiento, updateSeguimiento, addCita, updateCita, eventos, citas } = useData();
  const { user } = useAuth();
  const especialidadSugerida =
    (user?.especialidades?.[0] as string | undefined) ||
    (user?.especialidad as string | undefined) ||
    (especialidadesCatalogo || []).find((e) => e.activa)?.codigo ||
    '';
  const [selectedSeguimiento, setSelectedSeguimiento] = useState<Seguimiento | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [detalleEditando, setDetalleEditando] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    pacienteId: '',
    diagnostico: '',
    observaciones: '',
    fechaCita: '',
    requiereSeguimiento: false,
    notaSeguimiento: '',
    eventoSeguimientoId: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [agendarSeguimiento, setAgendarSeguimiento] = useState<Seguimiento | null>(null);
  const [agendarEventoId, setAgendarEventoId] = useState('');
  const [agendarEspecialidad, setAgendarEspecialidad] = useState<Especialidad>('');
  const [agendarDesde, setAgendarDesde] = useState('');
  const [agendarHasta, setAgendarHasta] = useState('');
  const [agendarHorario, setAgendarHorario] = useState<HorarioDisponible | null>(null);
  const [agendarSelectedEventId, setAgendarSelectedEventId] = useState('');
  const [agendarMensaje, setAgendarMensaje] = useState('');
  const [agendarPrevCitaId, setAgendarPrevCitaId] = useState('');
  const [detalleMensaje, setDetalleMensaje] = useState('');
  // Estado para el mini-modal de "Registrar Llamada"
  const [llamadaModal, setLlamadaModal] = useState<{ seg: Seguimiento } | null>(null);
  const [llamadaResultado, setLlamadaResultado] = useState<IntentoContacto['resultado'] | ''>('');
  const [llamadaNotas, setLlamadaNotas] = useState('');
  const [llamadaGuardando, setLlamadaGuardando] = useState(false);
  const [llamadaMensaje, setLlamadaMensaje] = useState('');
  // Agendar rápido desde tarjeta (sin ir al detalle)
  const [agendarRapido, setAgendarRapido] = useState<Seguimiento | null>(null);

  const hoy = useMemo(() => todayYmd(), []);

  // Resuelve el ID numérico real de una cita desde el seguimiento.
  // Si el citaId guardado es un placeholder temporal ("cit..."), busca por paciente+fecha+hora.
  const resolverCitaIdReal = useCallback((seg: Seguimiento): string => {
    const rawId = String(seg.citaId || '').trim();
    // Si es numérico puro, es el ID real de la BD
    if (rawId && /^\d+$/.test(rawId)) return rawId;
    // Si no, buscar la cita activa por paciente + fecha + hora
    const pid = String(seg.pacienteId || '').trim();
    const fecha = String(seg.fechaCita || '').trim().substring(0, 10);
    const hora = String(seg.horaCita || '').trim();
    if (!pid || !fecha) return '';
    const match = (citas || []).find((c) => {
      if (c.estado === 'cancelada') return false;
      if (String(c.pacienteId || '') !== pid) return false;
      if (String(c.fecha || '').substring(0, 10) !== fecha) return false;
      if (hora && String(c.hora || '').trim() !== hora) return false;
      return true;
    });
    return String(match?.id || '').trim();
  }, [citas]);

  const eventosAgendables = useMemo(() => {
    const list = [...(eventos || [])]
      .filter((ev) => String(ev?.fechaFin || '') >= hoy)
      .sort((a, b) => String(a.fechaInicio || '').localeCompare(String(b.fechaInicio || '')));
    return list.slice(0, 3);
  }, [eventos, hoy]);

  const eventoAgendar = useMemo(() => {
    const key = String(agendarEventoId || '').trim();
    if (!key) return null;
    return (eventos || []).find((e) => String(e.id) === key) || null;
  }, [agendarEventoId, eventos]);

  const horariosAgendar = useMemo(() => {
    if (!eventoAgendar || !agendarEspecialidad) return [];
    return eventoAgendar.especialidades?.find((e) => e.especialidad === agendarEspecialidad)?.horarios || [];
  }, [agendarEspecialidad, eventoAgendar]);

  useEffect(() => {
    if (!eventoAgendar) return;
    const opciones = (eventoAgendar.especialidades || []).map((e) => e.especialidad).filter(Boolean);
    if (!opciones.length) return;
    if (!agendarEspecialidad || !opciones.includes(agendarEspecialidad)) {
      setAgendarEspecialidad(opciones[0] as Especialidad);
    }
  }, [agendarEspecialidad, eventoAgendar]);

  useEffect(() => {
    if (!eventoAgendar?.fechaInicio || !eventoAgendar?.fechaFin) {
      setAgendarDesde('');
      setAgendarHasta('');
      setAgendarHorario(null);
      setAgendarSelectedEventId('');
      setAgendarMensaje('');
      return;
    }
    const start = String(eventoAgendar.fechaInicio || '').trim();
    const end = String(eventoAgendar.fechaFin || '').trim();
    const startSafe = start && start > hoy ? start : hoy;
    const days = listDaysInclusive(startSafe, end);
    const limited = days.slice(0, 7);
    if (limited.length) {
      setAgendarDesde(limited[0]);
      setAgendarHasta(limited[limited.length - 1]);
      setAgendarHorario(null);
      setAgendarSelectedEventId('');
      setAgendarMensaje('');
      return;
    }
    setAgendarDesde('');
    setAgendarHasta('');
    setAgendarHorario(null);
    setAgendarSelectedEventId('');
    setAgendarMensaje('');
  }, [eventoAgendar?.fechaFin, eventoAgendar?.fechaInicio, hoy]);

  const pacienteAgendar = useMemo(() => {
    const pid = String(agendarSeguimiento?.pacienteId || '').trim();
    if (!pid) return null;
    return pacientes.find((p) => String(p.id) === pid) || null;
  }, [agendarSeguimiento?.pacienteId, pacientes]);

  const onOpenAgendar = useCallback(
    (seguimiento: Seguimiento) => {
      const pid = String(seguimiento.pacienteId || '').trim();
      const directCitaId = String(seguimiento.citaId || '').trim();
      const hasFecha = String(seguimiento.fechaCita || '').trim();
      const hasHora = String(seguimiento.horaCita || '').trim();
      const eventoPreferido = String(seguimiento.eventoSeguimientoId || '').trim();
      const citaActual =
        (directCitaId && (citas || []).find((c) => String(c.id) === directCitaId)) ||
        ((!directCitaId && pid && hasFecha && hasHora)
          ? (citas || []).find((c) => {
              if (c.estado === 'cancelada') return false;
              if (String(c.pacienteId || '').trim() !== pid) return false;
              if (String(c.fecha || '').trim().substring(0, 10) !== String(hasFecha).substring(0, 10)) return false;
              if (String(c.hora || '').trim() !== hasHora) return false;
              if (eventoPreferido && String(c.eventoId || '').trim() !== eventoPreferido) return false;
              return true;
            })
          : null) ||
        null;

      const eventoId =
        String(citaActual?.eventoId || '').trim() || eventoPreferido || String(eventosAgendables[0]?.id || '');
      const especialidadId = String(citaActual?.especialidad || '').trim() || String(especialidadSugerida || '').trim();

      setAgendarSeguimiento(seguimiento);
      setAgendarEventoId(eventoId);
      setAgendarEspecialidad(especialidadId as Especialidad);
      setAgendarHorario(null);
      setAgendarSelectedEventId('');
      setAgendarMensaje('');
      setAgendarPrevCitaId(String(citaActual?.id || '').trim());
    },
    [citas, especialidadSugerida, eventosAgendables],
  );

  const onPickSlot = useCallback(
    (payload: { day: string; slotKey: string; disponibles?: number }) => {
      // Bloquear si no hay cupo disponible
      if (typeof payload.disponibles === 'number' && payload.disponibles <= 0) {
        setAgendarMensaje('Este horario ya está lleno. Selecciona otro bloque.');
        setAgendarHorario(null);
        setAgendarSelectedEventId('');
        return;
      }
      const match =
        horariosAgendar.find((h: any) => String(h.dia) === String(payload.day) && slotKeyForHorario(h) === String(payload.slotKey)) ||
        null;
      setAgendarMensaje('');
      setAgendarHorario(match);
      setAgendarSelectedEventId(match ? `${payload.day}|${payload.slotKey}` : '');
    },
    [horariosAgendar],
  );

  const onConfirmAgendar = useCallback(async () => {
    if (!agendarSeguimiento || !eventoAgendar || !agendarEspecialidad || !agendarHorario) return;
    if (!addCita || !updateSeguimiento) return;

    setGuardando(true);
    setAgendarMensaje('');
    try {
      if (agendarPrevCitaId && updateCita) {
        await updateCita(agendarPrevCitaId, { estado: 'cancelada' } as any);
      }

      const espEvento = eventoAgendar.especialidades.find((e) => e.especialidad === agendarEspecialidad) || null;
      if (!espEvento) throw new Error('No hay configuración de especialidad para ese evento.');

      const tipo =
        (espEvento.tiposCita || []).find((t: any) => String(t.id || '') && String(t.id) === String(agendarHorario.tipoCitaId || '')) ||
        (espEvento.tiposCita || [])[0] ||
        null;

      const nueva = {
        eventoId: eventoAgendar.id,
        pacienteId: agendarSeguimiento.pacienteId,
        especialidad: agendarEspecialidad,
        fecha: agendarHorario.dia,
        hora: agendarHorario.horaInicio,
        consultorio: String((espEvento as any).consultorio || '').trim() || '',
        tipoCitaId: tipo?.id ? String(tipo.id) : undefined,
        tipoCitaNombre: tipo?.nombre ? String(tipo.nombre) : undefined,
        duracionMinutos: tipo?.duracionMinutos ? Number(tipo.duracionMinutos) : undefined,
        medicoEncargado: String(tipo?.medicoEncargado || '').trim() || String((espEvento as any).medicoEncargado || '').trim() || '',
        estado: 'programada',
        costoPagado: Number.isFinite(Number(tipo?.precio))
          ? Number(tipo.precio)
          : Number.isFinite(Number((espEvento as any).costo))
            ? Number((espEvento as any).costo)
            : 0,
        fechaCreacion: hoy,
      };

      // addCita devuelve la cita con el ID real de la BD (numérico), NO el id temporal
      const citaCreada = await addCita(nueva as any);
      const citaIdReal = String(citaCreada?.id || '').trim();
      if (!citaIdReal) throw new Error('El servidor no devolvió un ID de cita válido.');

      await updateSeguimiento(String(agendarSeguimiento.id), {
        ...agendarSeguimiento,
        citaId: citaIdReal,
        estado: 'agendada',
        fechaCita: agendarHorario.dia,
        horaCita: agendarHorario.horaInicio,
        requiereSeguimiento: true,
        eventoSeguimientoId: String(eventoAgendar.id),
      });

      setAgendarSeguimiento(null);
      setAgendarHorario(null);
      setAgendarSelectedEventId('');
      setAgendarMensaje('');
      setAgendarPrevCitaId('');
    } catch (err: any) {
      setAgendarMensaje(err?.message || 'No se pudo agendar la cita. Intenta con otro horario.');
    } finally {
      setGuardando(false);
    }
  }, [addCita, agendarEspecialidad, agendarHorario, agendarPrevCitaId, agendarSeguimiento, eventoAgendar, hoy, updateCita, updateSeguimiento]);


  const handleOpenNew = (seg?: Seguimiento) => {
    if (seg) {
      setSelectedSeguimiento(seg);
      setDetalleEditando(true);
      setDetalleMensaje('');
      setFormData({
        pacienteId: seg.pacienteId || '',
        diagnostico: seg.diagnostico || '',
        observaciones: seg.observaciones || '',
        fechaCita: seg.fechaCita || '',
        requiereSeguimiento: Boolean(seg.requiereSeguimiento) || seg.estado === 'pendiente_de_agendar',
        notaSeguimiento: seg.notaSeguimiento || '',
        eventoSeguimientoId: seg.eventoSeguimientoId || '',
      });
      return;
    } else {
      setSelectedSeguimiento(null);
      setDetalleEditando(false);
      setFormData({
        pacienteId: '',
        diagnostico: '',
        observaciones: '',
        fechaCita: '',
        requiereSeguimiento: false,
        notaSeguimiento: '',
        eventoSeguimientoId: '',
      });
    }
    setShowNewModal(true);
  };

  const handleGuardar = async () => {
    if (!formData.diagnostico) return;
    setGuardando(true);
    try {
      const nuevo: Seguimiento = {
        id: String(Date.now()),
        pacienteId: formData.pacienteId,
        citaId: '',
        diagnostico: formData.diagnostico,
        observaciones: formData.observaciones,
        requiereSeguimiento: Boolean(formData.requiereSeguimiento),
        notaSeguimiento: formData.notaSeguimiento || '',
        eventoSeguimientoId: String(formData.eventoSeguimientoId || '').trim() || undefined,
        fechaCreacion: new Date().toISOString(),
        estado: formData.requiereSeguimiento && String(formData.eventoSeguimientoId || '').trim() ? 'pendiente_de_agendar' : 'pendiente',
      };
      await addSeguimiento(nuevo);
      setShowNewModal(false);
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarEdicion = useCallback(async () => {
    if (!selectedSeguimiento || !updateSeguimiento || !formData.diagnostico) return;
    setGuardando(true);
    setDetalleMensaje('');
    try {
      const requiere = Boolean(formData.requiereSeguimiento);
      const eventoId = String(formData.eventoSeguimientoId || '').trim();
      const keepAgendada = selectedSeguimiento.estado === 'agendada' && String(selectedSeguimiento.fechaCita || '').trim();
      const estadoFinal = keepAgendada ? 'agendada' : requiere && eventoId ? 'pendiente_de_agendar' : 'pendiente';

      await updateSeguimiento(selectedSeguimiento.id, {
        ...selectedSeguimiento,
        pacienteId: formData.pacienteId,
        diagnostico: formData.diagnostico,
        observaciones: formData.observaciones,
        requiereSeguimiento: requiere,
        notaSeguimiento: formData.notaSeguimiento || '',
        eventoSeguimientoId: eventoId || undefined,
        estado: estadoFinal as any,
      });
      setDetalleEditando(false);
    } catch (err: any) {
      setDetalleMensaje(err?.message || 'No se pudo guardar el seguimiento.');
    } finally {
      setGuardando(false);
    }
  }, [formData, selectedSeguimiento, updateSeguimiento]);

  // Filtrar seguimientos
  const seguimientosFiltrados = seguimientos.filter((seg) => {
    const paciente = pacientes.find((p) => p.id === seg.pacienteId || p.id === String((seg as any).id_paciente));
    const diag = seg.diagnostico || '';
    const matchSearch =
      !searchTerm ||
      paciente?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente?.numeroExpediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diag.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado =
      estadoFilter === 'todos' ||
      (estadoFilter === 'pendiente' && ((seg.estado || 'pendiente') === 'pendiente' || seg.estado === 'pendiente_de_agendar')) ||
      (estadoFilter === 'cerrado' && (seg.estado === 'cancelado_por_paciente' || seg.estado === 'incontactable')) ||
      seg.estado === estadoFilter;
    return matchSearch && matchEstado;
  });

  // Agrupar seguimientos por estado
  const seguimientosPendientes = seguimientosFiltrados.filter((s) => (s.estado || 'pendiente') === 'pendiente' || s.estado === 'pendiente_de_agendar');
  const seguimientosAgendados = seguimientosFiltrados.filter((s) => s.estado === 'agendada');
  const seguimientosCompletados = seguimientosFiltrados.filter((s) => s.estado === 'completada');
  const seguimientosCerrados = seguimientosFiltrados.filter((s) => s.estado === 'cancelado_por_paciente' || s.estado === 'incontactable');

  // Handler: registrar intento de llamada
  const handleRegistrarLlamada = useCallback(async () => {
    if (!llamadaModal || !llamadaResultado) return;
    setLlamadaGuardando(true);
    setLlamadaMensaje('');
    try {
      const res = await fetch(`/api/seguimientos/${llamadaModal.seg.id}/contacto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultado: llamadaResultado,
          notas: llamadaNotas,
          usuario: user?.nombre || 'Sistema',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al registrar llamada');
      
      // Refresh seguimientos preservando los datos actuales
      if (updateSeguimiento) {
        await updateSeguimiento(llamadaModal.seg.id, { ...llamadaModal.seg, intentosContacto: data.intentosContacto });
      }

      // Si backend sugiere marcar incontactable, mostramos la advertencia fija sin cerrar
      if (data._sugerirIncontactable) {
        setLlamadaMensaje('3+ intentos fallidos. Considera marcar como Incontactable (usa los botones inferiores).');
      } else {
        setLlamadaModal(null);
        setLlamadaResultado('');
        setLlamadaNotas('');
        setLlamadaMensaje('');
      }
    } catch (err: any) {
      setLlamadaMensaje(err?.message || 'Error al registrar.');
    } finally {
      setLlamadaGuardando(false);
    }
  }, [llamadaModal, llamadaNotas, llamadaResultado, updateSeguimiento, user?.nombre]);

  const estadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente': return t('seg.status.pending');
      case 'pendiente_de_agendar': return 'Pendiente de Agendar';
      case 'agendada': return t('seg.status.scheduled');
      case 'completada': return t('seg.status.completed');
      case 'cancelado_por_paciente': return 'Cancelado por Paciente';
      case 'incontactable': return 'Incontactable';
      default: return estado;
    }
  };

  const estadoMeta = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return { label: estadoLabel(estado), icon: AlertCircle, className: 'bg-muted text-foreground border-[color:var(--outline)]' };
      case 'pendiente_de_agendar':
        return { label: estadoLabel(estado), icon: CalendarClock, className: 'bg-[color:var(--brand-secondary-strong)] text-secondary-foreground border-[color:var(--brand-secondary-strong)]' };
      case 'agendada':
        return { label: estadoLabel(estado), icon: CalendarClock, className: 'bg-secondary/15 text-[color:var(--brand-secondary-strong)] border-secondary/25' };
      case 'completada':
        return { label: estadoLabel(estado), icon: CheckCircle2, className: 'bg-[color:var(--brand-primary-strong)] text-primary-foreground border-[color:var(--brand-primary-strong)]' };
      case 'cancelado_por_paciente':
        return { label: estadoLabel(estado), icon: XCircle, className: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700' };
      case 'incontactable':
        return { label: estadoLabel(estado), icon: Ban, className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700' };
      default:
        return { label: estadoLabel(estado), icon: AlertCircle, className: 'bg-muted text-muted-foreground border-border' };
    }
  };

  return (
    <DashboardLayout>
      {agendarSeguimiento ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground">Agendar</h1>
              <p className="mt-1 text-sm text-muted-foreground">Selecciona un bloque disponible para asignar la cita.</p>
            </div>
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => {
                setAgendarSeguimiento(null);
                setAgendarHorario(null);
                setAgendarSelectedEventId('');
                setAgendarMensaje('');
              }}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>

          <Card>
            <CardHeader className="border-b gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-[color:var(--brand-primary-strong)]">
                    {pacienteAgendar?.imagen ? (
                      <img src={pacienteAgendar.imagen} alt={pacienteAgendar.nombre} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold text-foreground">{pacienteAgendar?.nombre || 'Paciente'}</CardTitle>
                    <p className="mt-0.5 text-sm text-muted-foreground">{pacienteAgendar?.numeroExpediente || 'Expediente N/A'}</p>
                  </div>
                </div>
                <Badge className="border border-secondary/25 bg-secondary/10 text-[color:var(--brand-secondary-strong)]">
                  Seguimiento
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="agendar-evento">Evento</Label>
                  <select
                    id="agendar-evento"
                    className="mt-1 h-11 w-full rounded-lg border border-border bg-input-background px-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    value={agendarEventoId}
                    onChange={(e) => setAgendarEventoId(e.target.value)}
                  >
                    <option value="">Selecciona evento...</option>
                    {eventosAgendables.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.nombre} · {ev.fechaInicio}-{ev.fechaFin}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="agendar-especialidad">Especialidad</Label>
                  <select
                    id="agendar-especialidad"
                    className="mt-1 h-11 w-full rounded-lg border border-border bg-input-background px-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    value={agendarEspecialidad}
                    onChange={(e) => setAgendarEspecialidad(e.target.value as Especialidad)}
                    disabled={!eventoAgendar}
                  >
                    {(eventoAgendar?.especialidades || []).map((e) => (
                      <option key={e.especialidad} value={e.especialidad}>
                        {labelEspecialidad(e.especialidad, especialidadesCatalogo)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {agendarMensaje && <div className="text-sm text-destructive">{agendarMensaje}</div>}

              {eventoAgendar && agendarEspecialidad && horariosAgendar.length > 0 && agendarDesde && agendarHasta ? (
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <div className="mb-2 text-sm font-medium text-foreground">Disponibilidad</div>
                  <AgendaCalendar
                    eventoId={eventoAgendar.id}
                    especialidad={agendarEspecialidad}
                    desde={agendarDesde}
                    hasta={agendarHasta}
                    horarios={horariosAgendar}
                    citas={citas}
                    readOnly
                    allowPick
                    onSlotAction={(p) => onPickSlot({ day: p.day, slotKey: p.slotKey, disponibles: p.disponibles })}
                    selectedEventId={agendarSelectedEventId}
                    minDay={hoy}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    {agendarHorario ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {String(agendarHorario.dia || '')} · {String(agendarHorario.horaInicio || '')}-{String(agendarHorario.horaFin || '')}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAgendarHorario(null);
                            setAgendarSelectedEventId('');
                          }}
                        >
                          Quitar selección
                        </Button>
                      </div>
                    ) : (
                      <div>Selecciona un bloque (clic) para agendar.</div>
                    )}
                    <Button onClick={onConfirmAgendar} disabled={guardando || !agendarHorario}>
                      {guardando ? 'Agendando...' : 'Confirmar cita'}
                    </Button>
                  </div>
                </div>
              ) : agendarEventoId ? (
                <div className="rounded-xl border border-border bg-muted/10 p-3 text-sm text-muted-foreground">
                  No hay horarios configurados para esta especialidad en el evento seleccionado.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : selectedSeguimiento ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground">Seguimiento</h1>
              <p className="mt-1 text-sm text-muted-foreground">Detalles y acciones del seguimiento.</p>
            </div>
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => {
                setSelectedSeguimiento(null);
                setDetalleEditando(false);
                setDetalleMensaje('');
              }}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>

          {(() => {
            const paciente = pacientes.find(
              (p) => String(p.id) === String(selectedSeguimiento.pacienteId) || String(p.id) === String((selectedSeguimiento as any).id_paciente),
            );
            const meta = estadoMeta(selectedSeguimiento.estado || 'pendiente');
            const EstadoIcon = meta.icon;
            const nota = String(selectedSeguimiento.notaSeguimiento || '').trim();
            const eventoNombre = String(selectedSeguimiento.eventoSeguimientoId || '').trim()
              ? eventos.find((e) => String(e.id) === String(selectedSeguimiento.eventoSeguimientoId))?.nombre || String(selectedSeguimiento.eventoSeguimientoId)
              : '';

            return (
              <Card>
                <CardHeader className="border-b gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-[color:var(--brand-primary-strong)]">
                        {paciente?.imagen ? (
                          <img src={paciente.imagen} alt={paciente.nombre} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-6 w-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold text-foreground">{paciente?.nombre || 'Paciente'}</CardTitle>
                        <p className="mt-0.5 text-sm text-muted-foreground">{paciente?.numeroExpediente || 'Expediente N/A'}</p>
                      </div>
                    </div>
                    <Badge className={`border px-3 py-1.5 text-sm flex items-center gap-1.5 ${meta.className}`}>
                      <EstadoIcon className="h-4 w-4" />
                      {meta.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-4">
                  {detalleMensaje && <div className="text-sm text-destructive">{detalleMensaje}</div>}

                  {detalleEditando ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="det-paciente">Paciente</Label>
                          <select
                            id="det-paciente"
                            className="h-11 w-full rounded-lg border border-border bg-input-background px-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            value={formData.pacienteId}
                            onChange={(e) => setFormData({ ...formData, pacienteId: e.target.value })}
                          >
                            {pacientes.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre} {p.apellido}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="det-evento">{t('seg.followup_event')}</Label>
                          <select
                            id="det-evento"
                            className="h-11 w-full rounded-lg border border-border bg-input-background px-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            value={formData.eventoSeguimientoId}
                            onChange={(e) => setFormData({ ...formData, eventoSeguimientoId: e.target.value })}
                            disabled={!formData.requiereSeguimiento}
                          >
                            <option value="">{t('seg.followup_event_pending')}</option>
                            {eventosAgendables.map((ev) => (
                              <option key={ev.id} value={ev.id}>
                                {ev.nombre} · {ev.fechaInicio}-{ev.fechaFin}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="det-diagnostico">Diagnóstico *</Label>
                        <Input
                          id="det-diagnostico"
                          value={formData.diagnostico}
                          onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="det-observaciones">Observaciones / Indicaciones</Label>
                        <Textarea
                          id="det-observaciones"
                          value={formData.observaciones}
                          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="det-requiere"
                            checked={formData.requiereSeguimiento}
                            onCheckedChange={(checked) => {
                              const val = Boolean(checked);
                              setFormData({
                                ...formData,
                                requiereSeguimiento: val,
                                eventoSeguimientoId: val ? formData.eventoSeguimientoId : '',
                                notaSeguimiento: val ? formData.notaSeguimiento : '',
                              });
                            }}
                          />
                          <Label htmlFor="det-requiere" className="cursor-pointer">
                            {t('seg.requires_scheduling')}
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="det-nota">{t('seg.followup_note')}</Label>
                        <Textarea
                          id="det-nota"
                          value={formData.notaSeguimiento}
                          onChange={(e) => setFormData({ ...formData, notaSeguimiento: e.target.value })}
                          placeholder={t('seg.followup_note_placeholder')}
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDetalleEditando(false);
                            setDetalleMensaje('');
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={handleGuardarEdicion} disabled={guardando || !formData.diagnostico}>
                          {guardando ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                        <p className="text-xs font-medium text-muted-foreground">{t('seg.diagnosis')}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-foreground">
                          {String(selectedSeguimiento.diagnostico || '').trim() || 'Sin diagnóstico'}
                        </p>
                      </div>

                      {String(selectedSeguimiento.observaciones || '').trim() ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4">
                          <div className="flex items-start gap-2">
                            <Pill className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Indicaciones del Médico</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{selectedSeguimiento.observaciones}</p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {nota ? (
                        <div className="rounded-xl border bg-accent p-4">
                          <p className="text-xs font-medium text-muted-foreground">{t('seg.followup_note')}</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{nota}</p>
                        </div>
                      ) : null}

                      {eventoNombre ? (
                        <div className="rounded-xl border bg-card p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium text-muted-foreground">{t('seg.followup_event')}</div>
                            <Badge variant="outline" className="bg-accent">
                              {eventoNombre}
                            </Badge>
                          </div>
                        </div>
                      ) : null}

                      {selectedSeguimiento.fechaCita ? (
                        <div className="rounded-xl border border-secondary/20 bg-secondary/10 p-4">
                          <div className="flex items-start gap-3">
                            <Calendar className="mt-0.5 h-5 w-5 text-[color:var(--brand-secondary-strong)]" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{t('seg.next_appt')}</p>
                              <p className="mt-1 text-sm text-foreground">
                                {formatDateYmd(selectedSeguimiento.fechaCita)} · {String(selectedSeguimiento.horaCita || '').trim() || 'Hora N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                        {selectedSeguimiento.estado !== 'completada' && (
                          <Button className="gap-2" onClick={() => onOpenAgendar(selectedSeguimiento)}>
                            <Calendar className="h-4 w-4" />
                            {selectedSeguimiento.estado === 'agendada' ? 'Reagendar' : 'Agendar'}
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => handleOpenNew(selectedSeguimiento)}>
                          Editar
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      ) : (
        <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">{t('seg.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('seg.subtitle')}</p>
          </div>
          <Button onClick={() => handleOpenNew()} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            {t('seg.new')}
          </Button>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base text-foreground">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-accent p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t('seg.pending')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Incluye los pendientes de agendar</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-[color:var(--brand-secondary-strong)]">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xl font-semibold text-foreground">{seguimientosPendientes.length}</p>
              </div>

              <div className="rounded-xl border bg-accent p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t('seg.scheduled')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Con cita ya asignada</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/15 text-[color:var(--brand-secondary-strong)]">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xl font-semibold text-foreground">{seguimientosAgendados.length}</p>
              </div>

              <div className="rounded-xl border bg-accent p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t('seg.completed')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Listos, sin acciones pendientes</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-[color:var(--brand-primary-strong)]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xl font-semibold text-foreground">{seguimientosCompletados.length}</p>
              </div>

              <div className="rounded-xl border bg-accent p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cerrados</p>
                    <p className="mt-1 text-sm text-muted-foreground">Incontactables y cancelados</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/20">
                    <Ban className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xl font-semibold text-foreground">{seguimientos.filter(s => s.estado === 'cancelado_por_paciente' || s.estado === 'incontactable').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('seg.search')}
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={estadoFilter === 'todos' ? 'default' : 'outline'} onClick={() => setEstadoFilter('todos')}>
                  {t('seg.all')} ({seguimientos.length})
                </Button>
                <Button size="sm" variant={estadoFilter === 'pendiente' || estadoFilter === 'pendiente_de_agendar' ? 'default' : 'outline'} onClick={() => setEstadoFilter('pendiente')}>
                  {t('seg.pending')} ({seguimientosPendientes.length})
                </Button>
                <Button size="sm" variant={estadoFilter === 'agendada' ? 'default' : 'outline'} onClick={() => setEstadoFilter('agendada')}>
                  {t('seg.scheduled')} ({seguimientosAgendados.length})
                </Button>
                <Button size="sm" variant={estadoFilter === 'cerrado' ? 'default' : 'outline'} onClick={() => setEstadoFilter('cerrado')}>
                  Cerrados ({seguimientosCerrados.length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Seguimientos */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {seguimientosFiltrados.map((seguimiento) => {
            const paciente = pacientes.find((p) => String(p.id) === String(seguimiento.pacienteId) || String(p.id) === String((seguimiento as any).id_paciente));
            const notaSeguimiento = String(seguimiento.notaSeguimiento || '').trim();
            const meta = estadoMeta(seguimiento.estado || 'pendiente');
            const EstadoIcon = meta.icon;
            const semaforo = riesgoSemaforo(seguimiento, hoy);
            const esPendiente = seguimiento.estado === 'pendiente' || seguimiento.estado === 'pendiente_de_agendar';
            const esCerrado = seguimiento.estado === 'cancelado_por_paciente' || seguimiento.estado === 'incontactable';
            const intentos = seguimiento.intentosContacto || [];
            const ultimoIntento = intentos.length > 0 ? intentos[intentos.length - 1] : null;
            const iconoIntento = {
              no_contesto: PhoneMissed,
              buzon: PhoneOff,
              prometio_devolver: Phone,
              contactado: Phone,
              otro: Phone,
            };
            return (
              <Card
                key={seguimiento.id}
                className={`cursor-pointer transition-shadow hover:shadow-[0_8px_22px_rgba(1,106,103,0.08)] overflow-hidden ${semaforoBorderClass(semaforo)}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedSeguimiento(seguimiento);
                  setDetalleEditando(false);
                  setDetalleMensaje('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedSeguimiento(seguimiento);
                    setDetalleEditando(false);
                    setDetalleMensaje('');
                  }
                }}
              >
                <CardHeader className="border-b gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-[color:var(--brand-primary-strong)]">
                          {paciente?.imagen ? (
                            <img src={paciente.imagen} alt={paciente.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-6 w-6" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base font-semibold text-foreground">{paciente?.nombre || 'Paciente'}</CardTitle>
                          <p className="mt-0.5 text-sm text-muted-foreground">{paciente?.numeroExpediente || 'Expediente N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className={`border px-3 py-1.5 text-sm flex items-center gap-1.5 ${meta.className}`}>
                        <EstadoIcon className="h-4 w-4" />
                        {meta.label}
                      </Badge>
                      {semaforo === 'rojo' && <span className="text-xs font-semibold text-red-600">🔴 VENCIDO</span>}
                      {semaforo === 'ambar' && <span className="text-xs font-semibold text-amber-600">🟡 Esta semana</span>}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-5 w-5 text-[color:var(--brand-primary-strong)]" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">{t('seg.diagnosis')}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-foreground">{seguimiento.diagnostico}</p>
                      </div>
                    </div>
                  </div>

                  {/* Indicaciones del médico (recomendaciones de la consulta) */}
                  {String(seguimiento.observaciones || '').trim() && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3">
                      <div className="flex items-start gap-2">
                        <Pill className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Indicaciones del Médico</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground line-clamp-3">{seguimiento.observaciones}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {notaSeguimiento && (
                    <div className="rounded-xl border bg-accent p-3">
                      <p className="text-xs font-medium text-muted-foreground">{t('seg.followup_note')}</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-2">{notaSeguimiento}</p>
                    </div>
                  )}

                  {/* Última llamada registrada */}
                  {ultimoIntento && (() => {
                    const IcoLlamada = iconoIntento[ultimoIntento.resultado as keyof typeof iconoIntento] || Phone;
                    const resultadoLabel: Record<string, string> = {
                      no_contesto: 'No contestó', buzon: 'Buzón', prometio_devolver: 'Prometió devolver', contactado: 'Contactado', otro: 'Otro'
                    };
                    return (
                      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
                        <IcoLlamada className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium">{resultadoLabel[ultimoIntento.resultado] ?? ultimoIntento.resultado}</span>
                        <span className="ml-auto">Intento {intentos.length} · {new Date(ultimoIntento.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    );
                  })()}

                  {seguimiento.fechaCita && (
                    <div className="rounded-xl border border-secondary/20 bg-secondary/10 p-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
                        <p className="text-sm font-semibold text-foreground">{t('seg.next_appt')}</p>
                        <p className="ml-auto text-sm text-foreground">{formatDateYmd(seguimiento.fechaCita)} · {String(seguimiento.horaCita || '').trim() || 'Hora N/A'}</p>
                      </div>
                    </div>
                  )}

                  {/* Botones de acción rápida */}
                  {!esCerrado && (
                    <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      {esPendiente && (
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={(e) => { e.stopPropagation(); setAgendarRapido(seguimiento); onOpenAgendar(seguimiento); }}
                        >
                          <Calendar className="h-4 w-4" />
                          Agendar Cita
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLlamadaModal({ seg: seguimiento });
                          setLlamadaResultado('');
                          setLlamadaNotas('');
                          setLlamadaMensaje('');
                        }}
                      >
                        <Phone className="h-4 w-4" />
                        Registrar Llamada
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {seguimientosFiltrados.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-[color:var(--brand-secondary-strong)]">
                <ClipboardList className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{t('seg.empty_title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || estadoFilter !== 'todos'
                  ? t('seg.empty_desc_filtered')
                  : t('seg.empty_desc')}
              </p>
              {(searchTerm || estadoFilter !== 'todos') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('');
                    setEstadoFilter('todos');
                  }}
                >
                  {t('seg.clear_filters')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal Nuevo/Editar Seguimiento */}
        <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo Seguimiento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="seg-paciente">Paciente</Label>
                <select
                  id="seg-paciente"
                  className="h-11 w-full rounded-lg border border-border bg-input-background px-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  value={formData.pacienteId}
                  onChange={(e) => setFormData({ ...formData, pacienteId: e.target.value })}
                >
                  <option value="">Seleccionar paciente...</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="seg-diagnostico">Diagnóstico *</Label>
                <Input
                  id="seg-diagnostico"
                  value={formData.diagnostico}
                  onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                  placeholder="Ingrese el diagnóstico"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="seg-observaciones">Observaciones / Indicaciones</Label>
                <Textarea
                  id="seg-observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Indicaciones o notas adicionales"
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="seg-requiere"
                    checked={formData.requiereSeguimiento}
                    onCheckedChange={(checked) => {
                      const val = Boolean(checked);
                      setFormData({
                        ...formData,
                        requiereSeguimiento: val,
                        eventoSeguimientoId: val ? formData.eventoSeguimientoId : '',
                        notaSeguimiento: val ? formData.notaSeguimiento : '',
                      });
                    }}
                  />
                  <Label htmlFor="seg-requiere" className="cursor-pointer">
                    {t('seg.requires_scheduling')}
                  </Label>
                </div>
              </div>
              {formData.requiereSeguimiento && (
                <div className="space-y-1">
                  <Label htmlFor="seg-evento">{t('seg.followup_event')}</Label>
                  <select
                    id="seg-evento"
                    className="h-11 w-full rounded-lg border border-border bg-input-background px-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    value={formData.eventoSeguimientoId}
                    onChange={(e) => setFormData({ ...formData, eventoSeguimientoId: e.target.value })}
                  >
                    <option value="">{t('seg.followup_event_pending')}</option>
                    {(() => {
                      const hoy = todayYmd();
                      const list = [...(eventos || [])]
                        .filter((ev) => String(ev?.fechaFin || '') >= hoy)
                        .sort((a, b) => String(a.fechaInicio || '').localeCompare(String(b.fechaInicio || '')))
                        .slice(0, 3);
                      return list.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.nombre} · {ev.fechaInicio}-{ev.fechaFin}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="seg-nota-seguimiento">{t('seg.followup_note')}</Label>
                <Textarea
                  id="seg-nota-seguimiento"
                  value={formData.notaSeguimiento}
                  onChange={(e) => setFormData({ ...formData, notaSeguimiento: e.target.value })}
                  placeholder={t('seg.followup_note_placeholder')}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowNewModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardar}
                  disabled={guardando || !formData.diagnostico}
                >
                  {guardando ? 'Guardando...' : 'Guardar Seguimiento'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Registrar Llamada */}
        <Dialog open={!!llamadaModal} onOpenChange={(open) => { if (!open) { setLlamadaModal(null); setLlamadaResultado(''); setLlamadaNotas(''); setLlamadaMensaje(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Registrar Llamada</DialogTitle>
            </DialogHeader>
            {llamadaModal && (() => {
              const pac = pacientes.find(p => String(p.id) === String(llamadaModal.seg.pacienteId));
              return (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Paciente: <span className="font-semibold text-foreground">{pac?.nombre || 'Desconocido'}</span></p>
                  <div className="space-y-2">
                    <Label>¿Qué pasó con la llamada?</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {([
                        { value: 'no_contesto', label: 'No contestó' },
                        { value: 'buzon', label: 'Buzón de voz' },
                        { value: 'prometio_devolver', label: 'Prometió devolver la llamada' },
                        { value: 'contactado', label: 'Contactado exitosamente' },
                        { value: 'otro', label: 'Otro resultado' },
                      ] as const).map(op => (
                        <button
                          key={op.value}
                          type="button"
                          onClick={() => setLlamadaResultado(op.value)}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                            llamadaResultado === op.value
                              ? 'border-ring bg-primary/10 font-semibold text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="llamada-notas">Notas adicionales (opcional)</Label>
                    <Textarea id="llamada-notas" value={llamadaNotas} onChange={e => setLlamadaNotas(e.target.value)} rows={2} placeholder="Ej: llamé al número del expediente, dice que cambió de médico..." />
                  </div>
                  {llamadaMensaje && <p className="text-sm text-amber-600 font-medium">{llamadaMensaje}</p>}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                    <span className="text-xs text-muted-foreground font-medium mr-1">Cierre administrativo:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-orange-600 border-orange-300 hover:bg-orange-50 gap-1.5"
                      disabled={llamadaGuardando}
                      onClick={async () => {
                        if (!updateSeguimiento) return;
                        // Cancelar la cita en la BD usando el ID real (numérico)
                        const citaIdReal = resolverCitaIdReal(llamadaModal.seg);
                        if (citaIdReal && updateCita) {
                          await updateCita(citaIdReal, { estado: 'cancelada' } as any);
                        }
                        await updateSeguimiento(llamadaModal.seg.id, {
                          ...llamadaModal.seg,
                          estado: 'cancelado_por_paciente',
                          fechaCita: undefined,
                          horaCita: undefined,
                          citaId: undefined,
                        });
                        setLlamadaModal(null);
                      }}
                    >
                      <XCircle className="h-4 w-4" /> Canceló
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50 gap-1.5"
                      disabled={llamadaGuardando}
                      onClick={async () => {
                        if (!updateSeguimiento) return;
                        // Cancelar la cita en la BD usando el ID real (numérico)
                        const citaIdReal = resolverCitaIdReal(llamadaModal.seg);
                        if (citaIdReal && updateCita) {
                          await updateCita(citaIdReal, { estado: 'cancelada' } as any);
                        }
                        await updateSeguimiento(llamadaModal.seg.id, {
                          ...llamadaModal.seg,
                          estado: 'incontactable',
                          fechaCita: undefined,
                          horaCita: undefined,
                          citaId: undefined,
                        });
                        setLlamadaModal(null);
                      }}
                    >
                      <Ban className="h-4 w-4" /> Incontactable
                    </Button>
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" onClick={() => setLlamadaModal(null)}>Cancelar</Button>
                      <Button onClick={handleRegistrarLlamada} disabled={llamadaGuardando || !llamadaResultado || llamadaMensaje.includes('3+ intentos')}>
                        {llamadaGuardando ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        </div>
      )}
    </DashboardLayout>
  );
}
