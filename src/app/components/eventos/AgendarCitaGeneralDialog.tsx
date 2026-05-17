import { useEffect, useId, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Cita, EspecialidadCatalogo, Evento, Paciente } from '../../types';
import { todayYmd } from '../../utils/clock';

/** Agrupa las citas por fecha para el calendario */
const buildCalendarEvents = (citas: Cita[], eventos: Evento[]) => {
  const eventoById = new Map<string, Evento>();
  for (const e of eventos) eventoById.set(e.id, e);

  // Dias con eventos activos → marcar en rojo/naranja
  const eventosDias: Record<string, string> = {};
  for (const ev of eventos) {
    if ((ev as any).estado !== 'activo') continue;
    for (const esp of ev.especialidades || []) {
      for (const h of esp.horarios || []) {
        const d = String(h.dia || '').substring(0, 10);
        if (d) eventosDias[d] = ev.nombre || 'Evento';
      }
    }
  }

  const out: any[] = [];

  // Eventos comunitarios → fondo rosado
  for (const [dia, nombre] of Object.entries(eventosDias)) {
    out.push({
      id: `ev-${dia}`,
      title: `📅 ${nombre}`,
      start: dia,
      allDay: true,
      backgroundColor: 'var(--brand-soft-peach)',
      borderColor: 'var(--brand-soft-peach)',
      textColor: 'var(--accent-foreground)',
      display: 'background',
    });
    out.push({
      id: `ev-label-${dia}`,
      title: `Evento: ${nombre}`,
      start: dia,
      allDay: true,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: 'hsl(30 80% 45%)',
    });
  }

  // Citas generales → punto azul por día
  const citasPorDia: Record<string, number> = {};
  for (const c of citas) {
    const d = String(c.fecha || '').substring(0, 10);
    if (!d || c.estado === 'cancelada') continue;
    citasPorDia[d] = (citasPorDia[d] || 0) + 1;
  }
  for (const [dia, count] of Object.entries(citasPorDia)) {
    out.push({
      id: `citas-${dia}`,
      title: `${count} cita${count !== 1 ? 's' : ''}`,
      start: dia,
      allDay: true,
      backgroundColor: 'hsl(217 91% 60%)',
      borderColor: 'hsl(217 91% 60%)',
      textColor: '#fff',
    });
  }

  return out;
};

export function AgendarCitaGeneralDialog({
  open,
  onOpenChange,
  paciente,
  citas,
  eventos,
  especialidadesCatalogo,
  defaultFecha,
  defaultHora,
  onAgendar,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Paciente ya seleccionado previamente — no se pide en este diálogo */
  paciente: Paciente;
  citas: Cita[];
  eventos: Evento[];
  especialidadesCatalogo: EspecialidadCatalogo[];
  defaultFecha?: string;
  defaultHora?: string;
  onAgendar: (payload: { paciente: Paciente; fecha: string; hora: string; especialidad: string; consultorio: string; costo: number }) => Promise<void> | void;
}) {
  const hoy = todayYmd();
  const [fecha, setFecha] = useState(defaultFecha || '');
  const [hora, setHora] = useState(defaultHora || '08:00');
  const [especialidad, setEspecialidad] = useState<string>(especialidadesCatalogo[0]?.codigo || 'medicina_familiar');
  const [consultorio, setConsultorio] = useState('General');
  const [costo, setCosto] = useState<number>(0);
  const [error, setError] = useState('');
  const errorId = useId();
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFecha(defaultFecha || '');
    setHora(defaultHora || '08:00');
    setError('');
    setGuardando(false);
  }, [open, defaultFecha, defaultHora]);

  const calendarEvents = useMemo(() => buildCalendarEvents(citas, eventos), [citas, eventos]);

  const timeToMinutes = (t: string) => {
    const [hh, mm] = String(t || '').split(':').map((x) => Number(x));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
    return hh * 60 + mm;
  };

  const submit = async () => {
    if (!fecha || !hora) {
      setError('Selecciona una fecha (en el calendario) y una hora.');
      return;
    }

    // Verificar cruce con otra cita en la misma especialidad y hora
    const startMin = timeToMinutes(hora);
    const dur = 30;
    const endMin = startMin + dur;

    const ocupada = (citas || []).some((c) => {
      if (c.fecha !== fecha) return false;
      if (c.estado === 'cancelada') return false;
      if (c.especialidad === especialidad) {
        const cs = timeToMinutes(c.hora);
        const cdur = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
        const ce = cs + cdur;
        if (cs < endMin && ce > startMin) return true;
      }
      return false;
    });

    if (ocupada) {
      setError('Ya existe otra cita registrada en este horario para esta especialidad. Por favor elige otra hora.');
      return;
    }

    setError('');
    setGuardando(true);
    try {
      await onAgendar({ paciente, fecha, hora, especialidad, consultorio, costo });
      onOpenChange(false);
    } catch (e: any) {
      const msg = typeof e?.message === 'string' && e.message.trim() ? e.message : 'No se pudo agendar la cita. Intenta nuevamente.';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Agendar Cita Rápida</DialogTitle>
          <DialogDescription>
            Paciente: <strong>{paciente.nombre}</strong> · {paciente.numeroExpediente}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-6 space-y-5">

          {/* Calendario de selección de fecha */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Selecciona un día en el calendario
              </span>
              {fecha && (
                <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  {fecha}
                </span>
              )}
            </div>
            <div className="rounded-lg border border-border overflow-hidden text-xs [&_.fc-daygrid-day]:cursor-pointer [&_.fc-daygrid-day:hover]:bg-muted/30">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={esLocale}
                headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
                buttonText={{ today: 'Hoy' }}
                height="auto"
                selectable={false}
                events={calendarEvents}
                dateClick={(info) => {
                  const d = info.dateStr.substring(0, 10);
                  if (d < hoy) return; // no permitir fechas pasadas
                  setFecha(d);
                  setError('');
                }}
                dayCellClassNames={(arg) => {
                  const d = arg.date.toISOString().substring(0, 10);
                  const classes: string[] = [];
                  if (d === fecha) classes.push('!bg-primary/20 ring-2 ring-inset ring-primary');
                  if (d < hoy) classes.push('opacity-40 cursor-not-allowed');
                  return classes;
                }}
                eventContent={(arg) => (
                  <div className="truncate px-1 text-[10px] leading-tight">{arg.event.title}</div>
                )}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              🟠 Días con evento comunitario &nbsp;·&nbsp; 🔵 Días con citas agendadas
            </p>
          </div>

          {/* Hora, especialidad, consultorio, costo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hora</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
            <div>
              <Label>Costo ($)</Label>
              <Input type="number" min="0" step="0.01" value={costo} onChange={(e) => setCosto(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Especialidad</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
              >
                {especialidadesCatalogo.map((e) => (
                  <option key={e.codigo} value={e.codigo}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Consultorio (Opcional)</Label>
              <Input value={consultorio} onChange={(e) => setConsultorio(e.target.value)} placeholder="Ej. Consultorio 1" />
            </div>
          </div>

          {error && (
            <div id={errorId} role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={guardando || !fecha}>
            {guardando ? 'Agendando…' : 'Agendar cita'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
