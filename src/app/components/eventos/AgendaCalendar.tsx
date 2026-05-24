import { useCallback, useMemo } from 'react';
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
  return (citas || []).reduce((acc, c) => {
    if (c.eventoId !== eventoId) return acc;
    if (c.especialidad !== esp) return acc;
    if (c.fecha !== h.dia) return acc;
    if (c.estado === 'cancelada') return acc;
    if (tipoId && String(c.tipoCitaId || '') !== tipoId) return acc;
    const cs = timeToMinutes(c.hora);
    const cdur = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
    const ce = cs + cdur;
    if (!(cs < fin && ce > inicio)) return acc;
    return acc + 1;
  }, 0);
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

const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');
const toYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toHm = (d: Date) => d.toTimeString().slice(0, 5);

export function AgendaCalendar({
  eventoId,
  especialidad,
  desde,
  hasta,
  horarios,
  citas,
  onSlotAction,
  readOnly,
  allowPick,
  selectedEventId,
  minDay,
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
  readOnly?: boolean;
  allowPick?: boolean;
  selectedEventId?: string;
  minDay?: string;
}) {
  const plugins = useMemo(() => [timeGridPlugin, interactionPlugin, listPlugin], []);
  const headerToolbar = useMemo(
    () => ({ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay,listWeek' }),
    [],
  );
  const buttonText = useMemo(() => ({ today: 'Hoy', week: 'Semana', day: 'Día', list: 'Lista' }), []);
  const eventTimeFormat = useMemo(() => ({ hour: '2-digit', minute: '2-digit', meridiem: false }), []);
  const slotLabelFormat = useMemo(() => ({ hour: '2-digit', minute: '2-digit', meridiem: false }), []);

  const minDaySafe = useMemo(() => {
    const a = String(desde || '').trim();
    const b = String(minDay || '').trim();
    if (a && b) return a > b ? a : b;
    return a || b || '';
  }, [desde, minDay]);

  const isDayDisabled = useCallback(
    (ymd: string) => {
      if (!minDaySafe) return false;
      return String(ymd || '') < minDaySafe;
    },
    [minDaySafe],
  );

  const validRange = useMemo(() => {
    if (!desde || !hasta) return undefined;
    const start = new Date(`${desde}T00:00:00`);
    const end = new Date(`${hasta}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
    const endExclusive = new Date(end);
    endExclusive.setDate(endExclusive.getDate() + 1);
    return { start: toYmd(start), end: toYmd(endExclusive) };
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
        const id = `${h.dia}|${slotKey}`;
        const cupoTotal = Number.isFinite(Number(h.cupoTotal))
          ? Math.max(0, Math.floor(Number(h.cupoTotal)))
          : computeDefaultCupo(h);
        const cupoOcupadoRaw = computeSlotsOcupados(citas, eventoId, especialidad, h);
        const cupoOcupado = Math.max(0, Math.min(cupoTotal || cupoOcupadoRaw, cupoOcupadoRaw));
        const disponibles = Math.max(0, cupoTotal - cupoOcupado);
        const ratio = cupoTotal > 0 ? disponibles / cupoTotal : 0;
        const isSelected = selectedEventId ? String(selectedEventId) === id : false;
        const bg =
          cupoTotal <= 0
            ? 'var(--outline)'
            : disponibles <= 0
              ? 'var(--brand-tertiary)'
              : ratio < 0.25
                ? 'var(--brand-soft-peach)'
                : ratio < 0.5
                  ? 'var(--secondary)'
                  : 'var(--primary)';
        const bgFinal = isSelected ? 'var(--muted)' : bg;
        const text = isSelected
          ? 'var(--foreground)'
          : bg === 'var(--brand-soft-peach)'
            ? 'var(--accent-foreground)'
            : 'var(--primary-foreground)';
        return {
          id,
          title: cupoTotal > 0 ? `Disp: ${disponibles}/${cupoTotal}` : 'Sin cupo',
          start: `${h.dia}T${h.horaInicio}`,
          end: `${h.dia}T${h.horaFin}`,
          backgroundColor: bgFinal,
          borderColor: bgFinal,
          textColor: text,
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
            selected: isSelected,
          },
        };
      });
  }, [citas, desde, eventoId, especialidad, hasta, horarios, selectedEventId]);

  const selectAllow = useCallback(
    (info: any) => {
      const endInclusive = new Date(info.end.getTime() - 1);
      const day = toYmd(info.start);
      if (toYmd(info.start) !== toYmd(endInclusive)) return false;
      if (isDayDisabled(day)) return false;
      return true;
    },
    [isDayDisabled],
  );

  const dateClick = useCallback(
    (info: any) => {
      if (readOnly) return;
      const start = info.date;
      const day = toYmd(start);
      if (isDayDisabled(day)) return;
      const end = addHours(start, 1);
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
    },
    [isDayDisabled, onSlotAction, readOnly],
  );

  const select = useCallback(
    (info: any) => {
      if (readOnly) return;
      const normalized = normalizeSelection(info.start, info.end);
      const day = toYmd(normalized.start);
      if (isDayDisabled(day)) return;
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
    },
    [isDayDisabled, onSlotAction, readOnly],
  );

  const eventClick = useCallback(
    (info: any) => {
      if (readOnly && !allowPick) return;
      const dia = String(info.event.extendedProps.dia || '');
      if (isDayDisabled(dia)) return;
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
    },
    [allowPick, isDayDisabled, onSlotAction, readOnly],
  );

  const dayHeaderClassNames = useCallback(
    (arg: any) => {
      const day = toYmd(arg.date);
      return isDayDisabled(day) ? ['fc-day-disabled-custom'] : [];
    },
    [isDayDisabled],
  );

  const dayCellClassNames = useCallback(
    (arg: any) => {
      const day = toYmd(arg.date);
      return isDayDisabled(day) ? ['fc-day-disabled-custom'] : [];
    },
    [isDayDisabled],
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <FullCalendar
        plugins={plugins}
        initialView="timeGridWeek"
        initialDate={desde || undefined}
        locale={esLocale}
        headerToolbar={headerToolbar}
        buttonText={buttonText}
        slotMinTime={slotBounds.minTime}
        slotMaxTime={slotBounds.maxTime}
        slotDuration="01:00:00"
        slotLabelInterval="01:00:00"
        snapDuration="01:00:00"
        allDaySlot={false}
        selectable={!readOnly}
        selectMirror={true}
        editable={false}
        eventOverlap={false}
        selectOverlap={false}
        events={events}
        validRange={validRange}
        selectAllow={selectAllow}
        dateClick={dateClick}
        select={select}
        eventClick={eventClick}
        dayHeaderClassNames={dayHeaderClassNames}
        dayCellClassNames={dayCellClassNames}
        height="auto"
        eventTimeFormat={eventTimeFormat}
        slotLabelFormat={slotLabelFormat}
        eventContent={(arg) => {
          const selected = Boolean(arg.event.extendedProps?.selected);
          return (
            <div className={`h-full w-full px-1 py-0.5 text-[11px] leading-tight ${selected ? 'opacity-90' : ''}`}>
              <div className="font-medium">{arg.timeText}</div>
            </div>
          );
        }}
      />
    </div>
  );
}
