import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { HorarioDisponible } from '../../types';

const toYmd = (d: Date) => d.toISOString().slice(0, 10);
const toHm = (d: Date) => d.toTimeString().slice(0, 5);
const buildKey = (h: HorarioDisponible) => `${h.dia}|${h.horaInicio}|${h.horaFin}|${h.intervalo ?? 60}`;
const toDurationHours = (start: Date, end: Date) => Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600000));

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

const buildHorario = (start: Date, end: Date, cupoTotal = 1): HorarioDisponible => {
  const { start: safeStart, end: safeEnd } = normalizeSelection(start, end);
  return {
    dia: toYmd(safeStart),
    horaInicio: toHm(safeStart),
    horaFin: toHm(safeEnd),
    intervalo: 60,
    cupoTotal: Number.isFinite(Number(cupoTotal)) ? Math.max(1, Math.floor(Number(cupoTotal))) : 1,
  };
};

const mergeHorarios = (list: HorarioDisponible[]) => {
  const dedup: Record<string, HorarioDisponible> = {};
  for (const h of list) {
    dedup[buildKey(h)] = {
      ...h,
      intervalo: 60,
      cupoTotal: Number.isFinite(Number(h.cupoTotal)) ? Math.max(1, Math.floor(Number(h.cupoTotal))) : 1,
    };
  }

  return Object.values(dedup).sort((a, b) => {
    const byDay = a.dia.localeCompare(b.dia);
    if (byDay !== 0) return byDay;
    return a.horaInicio.localeCompare(b.horaInicio);
  });
};

export function ScheduleCalendarEditor({
  startDate,
  endDate,
  value,
  onChange,
  defaultIntervalo = 60,
}: {
  startDate: string;
  endDate: string;
  value: HorarioDisponible[];
  onChange: (next: HorarioDisponible[]) => void;
  defaultIntervalo?: number;
}) {
  const validRange = useMemo(() => {
    if (!startDate || !endDate) return undefined;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
    const endExclusive = new Date(end);
    endExclusive.setDate(endExclusive.getDate() + 1);
    return { start: start.toISOString().slice(0, 10), end: endExclusive.toISOString().slice(0, 10) };
  }, [startDate, endDate]);

  const events = useMemo(() => {
    return (value || []).map((h) => {
      const key = buildKey(h);
      const start = `${h.dia}T${h.horaInicio}`;
      const end = `${h.dia}T${h.horaFin}`;
      const cupo = Number.isFinite(Number(h.cupoTotal)) ? Math.max(1, Math.floor(Number(h.cupoTotal))) : 1;
      const duration = toDurationHours(new Date(start), new Date(end));
      return {
        id: key,
        title: `${duration} hora${duration === 1 ? '' : 's'}`,
        start,
        end,
        editable: true,
        extendedProps: {
          intervalo: 60,
          cupoTotal: cupo,
          duration,
        },
      };
    });
  }, [defaultIntervalo, value]);

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-700">
        Selecciona en el calendario para crear un bloque. Por defecto inicia en 1 hora, pero puedes arrastrar o redimensionar para procedimientos de 2 o 3 horas.
      </div>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' }}
          buttonText={{ today: 'Hoy', week: 'Semana', day: 'Día' }}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          slotDuration="01:00:00"
          slotLabelInterval="01:00:00"
          snapDuration="01:00:00"
          allDaySlot={false}
          selectable={true}
          selectMirror={true}
          editable={true}
          eventDurationEditable={true}
          eventOverlap={false}
          selectOverlap={false}
          events={events}
          validRange={validRange}
          select={(info) => {
            const nuevo = buildHorario(info.start, info.end, 1);
            onChange(mergeHorarios([...(value || []), nuevo]));
          }}
          eventDrop={(info) => {
            const base = (value || []).filter((h) => buildKey(h) !== info.event.id);
            const moved = buildHorario(
              info.event.start!,
              info.event.end || addHours(info.event.start!, 1),
              Number(info.event.extendedProps.cupoTotal) || 1,
            );
            onChange(mergeHorarios([...base, moved]));
          }}
          eventResize={(info) => {
            const base = (value || []).filter((h) => buildKey(h) !== info.event.id);
            const resized = buildHorario(
              info.event.start!,
              info.event.end || addHours(info.event.start!, 1),
              Number(info.event.extendedProps.cupoTotal) || 1,
            );
            onChange(mergeHorarios([...base, resized]));
          }}
          eventClick={(info) => {
            onChange((value || []).filter((h) => buildKey(h) !== info.event.id));
          }}
          height="auto"
          eventResizableFromStart={true}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          eventContent={(arg) => (
            <div className="px-1 py-0.5 text-[11px] leading-tight">
              <div className="font-medium">{arg.timeText}</div>
              <div>{arg.event.title}</div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
