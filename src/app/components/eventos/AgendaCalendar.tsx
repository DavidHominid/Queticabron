import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { Cita, Especialidad, HorarioDisponible } from '../../types';

const timeToMinutes = (t: string) => {
  const [hh, mm] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const minutesToTime = (m: number) => {
  const hh = Math.max(0, Math.floor(m / 60));
  const mm = Math.max(0, Math.floor(m % 60));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
};

const minutesToHm = (m: number) => minutesToTime(m).slice(0, 5);

const computeDefaultCupo = (h: HorarioDisponible) => {
  const intervalo = Number.isFinite(Number(h.intervalo)) ? Number(h.intervalo) : 60;
  const dur = Math.max(0, timeToMinutes(h.horaFin) - timeToMinutes(h.horaInicio));
  return intervalo ? Math.floor(dur / intervalo) : 0;
};

const computeSlotsOcupados = (citas: Cita[], eventoId: string, esp: Especialidad, h: HorarioDisponible) => {
  const inicio = timeToMinutes(h.horaInicio);
  const fin = timeToMinutes(h.horaFin);
  if (inicio >= fin) return 0;
  const tipoId = h.tipoCitaId ? String(h.tipoCitaId) : '';
  const ocupada = (citas || []).some((c) => {
    if (c.eventoId !== eventoId) return false;
    if (c.especialidad !== esp) return false;
    if (c.fecha !== h.dia) return false;
    if (c.estado === 'cancelada') return false;
    if (tipoId && String(c.tipoCitaId || '') !== tipoId) return false;
    const cs = timeToMinutes(c.hora);
    const cdur = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
    const ce = cs + cdur;
    return cs < fin && ce > inicio;
  });
  return ocupada ? 1 : 0;
};

const startOfHour = (d: Date) => {
  const next = new Date(d);
  next.setMinutes(0, 0, 0);
  return next;
};

const addHours = (d: Date, hours: number) => {
  const next = new Date(d);
  next.setHours(next.getHours() + hours);
  return next;
};

const normalizeSelection = (start: Date, end: Date) => {
  const safeStart = startOfHour(start);
  const safeEndRaw = startOfHour(end);
  const safeEnd = safeEndRaw.getTime() <= safeStart.getTime() ? addHours(safeStart, 1) : safeEndRaw;
  return { start: safeStart, end: safeEnd };
};

const toYmd = (d: Date) => d.toISOString().slice(0, 10);
const toHm = (d: Date) => d.toTimeString().slice(0, 5);

export function AgendaCalendar({
  eventoId,
  especialidad,
  desde,
  hasta,
  horarios,
  citas,
  onSlotAction,
}: {
  eventoId: string;
  especialidad: Especialidad;
  desde: string;
  hasta: string;
  horarios: HorarioDisponible[];
  citas: Cita[];
  onSlotAction: (payload: {
    source: 'bloque' | 'nuevo';
    day: string;
    slotKey: string;
    start: string;
    end: string;
    cupoTotal: number;
    cupoOcupado: number;
    disponibles: number;
  }) => void;
}) {
  const validRange = useMemo(() => {
    if (!desde || !hasta) return undefined;
    const start = new Date(`${desde}T00:00:00`);
    const end = new Date(`${hasta}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
    const endExclusive = new Date(end);
    endExclusive.setDate(endExclusive.getDate() + 1);
    return { start: start.toISOString().slice(0, 10), end: endExclusive.toISOString().slice(0, 10) };
  }, [desde, hasta]);

  const slotBounds = useMemo(() => {
    const baseMin = 7 * 60;
    const baseMax = 20 * 60;
    const filtered = (horarios || []).filter((h) => h.dia && h.dia.includes('-') && (!desde || h.dia >= desde) && (!hasta || h.dia <= hasta));
    if (!filtered.length) return { minTime: minutesToTime(baseMin), maxTime: minutesToTime(baseMax) };
    const min = Math.min(...filtered.map((h) => timeToMinutes(h.horaInicio)).filter((x) => Number.isFinite(x)));
    const max = Math.max(...filtered.map((h) => timeToMinutes(h.horaFin)).filter((x) => Number.isFinite(x)));
    const safeMin = Number.isFinite(min) ? Math.max(0, Math.min(baseMin, min)) : baseMin;
    const safeMax = Number.isFinite(max) ? Math.max(baseMax, max) : baseMax;
    return { minTime: minutesToTime(safeMin), maxTime: minutesToTime(safeMax) };
  }, [desde, hasta, horarios]);

  const events = useMemo(() => {
    return (horarios || [])
      .filter((h) => h.dia && h.dia.includes('-') && (!desde || h.dia >= desde) && (!hasta || h.dia <= hasta))
      .map((h) => {
        const intervalo = Number.isFinite(Number(h.intervalo)) ? Number(h.intervalo) : 60;
        const slotKey = `${h.horaInicio}|${h.horaFin}|${intervalo}|${h.tipoCitaId || ''}`;
        const cupoTotal = Number.isFinite(Number(h.cupoTotal)) ? Math.max(0, Math.floor(Number(h.cupoTotal))) : computeDefaultCupo(h);
        const cupoOcupado = computeSlotsOcupados(citas, eventoId, especialidad, h);
        const disponibles = Math.max(0, cupoTotal - cupoOcupado);
        const ratio = cupoTotal > 0 ? disponibles / cupoTotal : 0;
        const color = cupoTotal <= 0 ? '#6B7280' : disponibles <= 0 ? '#3a65e8ff' : ratio < 0.25 ? '#F97316' : '#22C55E';
        return {
          id: `${h.dia}|${slotKey}`,
          title: cupoTotal > 0 ? `Disp: ${disponibles}/${cupoTotal}` : 'Sin cupo',
          start: `${h.dia}T${h.horaInicio}`,
          end: `${h.dia}T${h.horaFin}`,
          backgroundColor: color,
          borderColor: color,
          textColor: '#fff',
          extendedProps: {
            dia: h.dia,
            slotKey,
            start: `${h.dia}T${h.horaInicio}`,
            end: `${h.dia}T${h.horaFin}`,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin,
            cupoTotal,
            cupoOcupado,
            disponibles,
          },
        };
      });
  }, [citas, desde, eventoId, especialidad, hasta, horarios]);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridWeek"
        initialDate={desde || undefined}
        locale={esLocale}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay,listWeek' }}
        buttonText={{ today: 'Hoy', week: 'Semana', day: 'Día', list: 'Lista' }}
        slotMinTime={slotBounds.minTime}
        slotMaxTime={slotBounds.maxTime}
        slotDuration="01:00:00"
        slotLabelInterval="01:00:00"
        snapDuration="01:00:00"
        allDaySlot={false}
        selectable={true}
        selectMirror={true}
        editable={false}
        eventOverlap={false}
        selectOverlap={false}
        events={events}
        validRange={validRange}
        selectAllow={(info) => {
          const endInclusive = new Date(info.end.getTime() - 1);
          return toYmd(info.start) === toYmd(endInclusive);
        }}
        dateClick={(info) => {
          const start = info.date;
          const end = addHours(start, 1);
          const day = toYmd(start);
          const horaInicio = toHm(start);
          const horaFin = toHm(end);
          onSlotAction({
            source: 'nuevo',
            day,
            slotKey: `${horaInicio}|${horaFin}|60`,
            start: `${day}T${horaInicio}`,
            end: `${day}T${horaFin}`,
            cupoTotal: 1,
            cupoOcupado: 0,
            disponibles: 1,
          });
        }}
        select={(info) => {
          const normalized = normalizeSelection(info.start, info.end);
          const day = toYmd(normalized.start);
          const horaInicio = toHm(normalized.start);
          const horaFin = toHm(normalized.end);
          onSlotAction({
            source: 'nuevo',
            day,
            slotKey: `${horaInicio}|${horaFin}|60`,
            start: `${day}T${horaInicio}`,
            end: `${day}T${horaFin}`,
            cupoTotal: 1,
            cupoOcupado: 0,
            disponibles: 1,
          });
        }}
        eventClick={(info) => {
          const dia = String(info.event.extendedProps.dia || '');
          const slotKey = String(info.event.extendedProps.slotKey || '');
          const start = String(info.event.extendedProps.start || info.event.startStr || '');
          const end = String(info.event.extendedProps.end || info.event.endStr || '');
          const cupoTotal = Number(info.event.extendedProps.cupoTotal) || 0;
          const cupoOcupado = Number(info.event.extendedProps.cupoOcupado) || 0;
          const disponibles = Math.max(0, cupoTotal - cupoOcupado);
          if (!dia || !slotKey) return;
          onSlotAction({
            source: 'bloque',
            day: dia,
            slotKey,
            start,
            end,
            cupoTotal,
            cupoOcupado,
            disponibles,
          });
        }}
        height="auto"
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
        eventContent={(arg) => {
          return (
            <div className="px-1 py-0.5 text-[11px] leading-tight">
              <div className="font-medium">{arg.timeText}</div>
            </div>
          );
        }}
      />
    </div>
  );
}
