import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Cita, Especialidad, HorarioDisponible, TipoCitaEvento } from '../../types';

const toYmd = (d: Date) => d.toISOString().slice(0, 10);
const toHm = (d: Date) => d.toTimeString().slice(0, 5);
const buildKey = (h: HorarioDisponible) => `${h.dia}|${h.horaInicio}|${h.horaFin}|${h.intervalo ?? 60}|${h.tipoCitaId || ''}`;
const toDurationHours = (start: Date, end: Date) => Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600000));
const tipoPalette = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#c026d3', '#0f766e', '#b91c1c', '#4f46e5'];

const timeToMinutes = (t: string) => {
  const [hh, mm] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const countCitasInWindow = (
  citas: Cita[],
  eventoId: string,
  esp: Especialidad,
  day: string,
  start: string,
  end: string,
  tipoCitaId?: string,
) => {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return citas.filter((c) => {
    if (c.eventoId !== eventoId) return false;
    if (c.especialidad !== esp) return false;
    if (c.fecha !== day) return false;
    if (c.estado === 'cancelada') return false;
    if (tipoCitaId && String(c.tipoCitaId || '') !== String(tipoCitaId)) return false;
    const m = timeToMinutes(c.hora);
    return m >= s && m < e;
  }).length;
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

const buildHorario = (start: Date, durHours: number, cupoTotal = 1, tipoCitaId?: string): HorarioDisponible => {
  const safeStart = startOfHour(start);
  const safeEnd = addHours(safeStart, Math.max(1, Math.floor(durHours) || 1));
  return {
    dia: toYmd(safeStart),
    horaInicio: toHm(safeStart),
    horaFin: toHm(safeEnd),
    intervalo: 60,
    cupoTotal: Number.isFinite(Number(cupoTotal)) ? Math.max(1, Math.floor(Number(cupoTotal))) : 1,
    tipoCitaId: tipoCitaId ? String(tipoCitaId) : undefined,
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
  tiposCita = [],
  tipoCitaIdActivo,
  eventoId,
  especialidad,
  citas = [],
}: {
  startDate: string;
  endDate: string;
  value: HorarioDisponible[];
  onChange: (next: HorarioDisponible[]) => void;
  defaultIntervalo?: number;
  tiposCita?: TipoCitaEvento[];
  tipoCitaIdActivo?: string;
  eventoId?: string;
  especialidad?: Especialidad;
  citas?: Cita[];
}) {
  const [mensajeBloqueo, setMensajeBloqueo] = useState('');
  const validRange = useMemo(() => {
    if (!startDate || !endDate) return undefined;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
    const endExclusive = new Date(end);
    endExclusive.setDate(endExclusive.getDate() + 1);
    return { start: start.toISOString().slice(0, 10), end: endExclusive.toISOString().slice(0, 10) };
  }, [startDate, endDate]);

  const lockedKeys = useMemo(() => {
    if (!eventoId || !especialidad) return new Set<string>();
    const locked = new Set<string>();
    for (const h of value || []) {
      const key = buildKey(h);
      const n = countCitasInWindow(citas || [], eventoId, especialidad, h.dia, h.horaInicio, h.horaFin, h.tipoCitaId);
      if (n > 0) locked.add(key);
    }
    return locked;
  }, [citas, especialidad, eventoId, value]);

  const tipoNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tiposCita || []) {
      if (!t) continue;
      const id = t.id ? String(t.id) : '';
      if (!id) continue;
      map.set(id, String(t.nombre || '').trim());
    }
    return map;
  }, [tiposCita]);

  const tipoColorById = useMemo(() => {
    const map = new Map<string, string>();
    const list = (tiposCita || []).filter((t) => t?.id && String(t?.nombre || '').trim());
    list.forEach((t, i) => {
      map.set(String(t.id), tipoPalette[i % tipoPalette.length]);
    });
    return map;
  }, [tiposCita]);

  const events = useMemo(() => {
    return (value || []).map((h) => {
      const key = buildKey(h);
      const start = `${h.dia}T${h.horaInicio}`;
      const end = `${h.dia}T${h.horaFin}`;
      const cupo = Number.isFinite(Number(h.cupoTotal)) ? Math.max(1, Math.floor(Number(h.cupoTotal))) : 1;
      const duration = toDurationHours(new Date(start), new Date(end));
      const locked = lockedKeys.has(key);
      const tipoLabel = h.tipoCitaId ? tipoNameById.get(String(h.tipoCitaId)) || '' : '';
      const tipoColor = h.tipoCitaId ? tipoColorById.get(String(h.tipoCitaId)) : undefined;
      const color = locked ? '#9ca3af' : tipoColor || '#2563eb';
      return {
        id: key,
        title: locked ? 'Bloqueado' : tipoLabel || '',
        start,
        end,
        editable: !locked,
        startEditable: !locked,
        durationEditable: !locked,
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        extendedProps: {
          intervalo: 60,
          cupoTotal: cupo,
          duration,
          locked,
          tipoCitaId: h.tipoCitaId ? String(h.tipoCitaId) : '',
        },
      };
    });
  }, [lockedKeys, tipoColorById, tipoNameById, value]);

  const duracionHorasActiva = useMemo(() => {
    const id = String(tipoCitaIdActivo || '').trim();
    if (!id) return 1;
    const t = (tiposCita || []).find((x) => String(x?.id || '') === id);
    const mins = Number.isFinite(Number(t?.duracionMinutos)) ? Math.max(1, Math.floor(Number(t?.duracionMinutos))) : 60;
    return Math.max(1, Math.ceil(mins / 60));
  }, [tiposCita, tipoCitaIdActivo]);

  const overlaps = (day: string, startHm: string, endHm: string, tipoCitaId?: string, ignoreKey?: string) => {
    const s = timeToMinutes(startHm);
    const e = timeToMinutes(endHm);
    for (const h of value || []) {
      if (ignoreKey && buildKey(h) === ignoreKey) continue;
      if (String(h.dia) !== String(day)) continue;
      if (tipoCitaId && String(h.tipoCitaId || '') !== String(tipoCitaId)) continue;
      const hs = timeToMinutes(h.horaInicio);
      const he = timeToMinutes(h.horaFin);
      if (s < he && e > hs) return true;
    }
    return false;
  };

  const createBlocks = (start: Date) => {
    if ((tiposCita || []).length > 0 && !String(tipoCitaIdActivo || '').trim()) {
      setMensajeBloqueo('Selecciona un tipo de cita para asignarlo a los bloques.');
      return;
    }
    const safeStart = startOfHour(start);
    const day = toYmd(safeStart);
    const end = addHours(safeStart, duracionHorasActiva);
    if (toYmd(end) !== day) {
      setMensajeBloqueo('El bloque no puede cruzar al siguiente día.');
      return;
    }
    const startHm = toHm(safeStart);
    const endHm = toHm(end);
    if (overlaps(day, startHm, endHm, undefined, undefined)) {
      setMensajeBloqueo('Ese horario se empalma con otro bloque.');
      return;
    }
    const nuevo = buildHorario(safeStart, duracionHorasActiva, 1, tipoCitaIdActivo);
    onChange(mergeHorarios([...(value || []), nuevo]));
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-700">
        Haz click en el calendario para crear un bloque. La altura del bloque refleja la duración del tipo de cita (en horas) y siempre inicia en una hora exacta.
      </div>
      {mensajeBloqueo && <div className="text-sm text-red-600">{mensajeBloqueo}</div>}
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
          selectable={false}
          selectMirror={false}
          editable={true}
          eventDurationEditable={false}
          eventOverlap={false}
          selectOverlap={false}
          events={events}
          validRange={validRange}
          dateClick={(info) => {
            setMensajeBloqueo('');
            createBlocks(info.date);
          }}
          eventDrop={(info) => {
            setMensajeBloqueo('');
            if (lockedKeys.has(info.event.id)) {
              info.revert();
              setMensajeBloqueo('No puedes mover un horario que ya tiene citas agendadas.');
              return;
            }
            const base = (value || []).filter((h) => buildKey(h) !== info.event.id);
            const tipoCitaId = String(info.event.extendedProps.tipoCitaId || '').trim() || undefined;
            const dur = Number.isFinite(Number(info.event.extendedProps.duration)) ? Math.max(1, Math.floor(Number(info.event.extendedProps.duration))) : 1;
            const safeStart = info.event.start!;
            const end = addHours(startOfHour(safeStart), dur);
            if (toYmd(end) !== toYmd(safeStart)) {
              info.revert();
              setMensajeBloqueo('El bloque no puede cruzar al siguiente día.');
              return;
            }
            const startHm = toHm(startOfHour(safeStart));
            const endHm = toHm(end);
            if (overlaps(toYmd(safeStart), startHm, endHm, undefined, info.event.id)) {
              info.revert();
              setMensajeBloqueo('Ese movimiento se empalma con otro bloque.');
              return;
            }
            const moved = buildHorario(safeStart, dur, Number(info.event.extendedProps.cupoTotal) || 1, tipoCitaId);
            onChange(mergeHorarios([...base, moved]));
          }}
          eventClick={(info) => {
            setMensajeBloqueo('');
            if (lockedKeys.has(info.event.id)) {
              setMensajeBloqueo('No puedes eliminar un horario que ya tiene citas agendadas.');
              return;
            }
            onChange((value || []).filter((h) => buildKey(h) !== info.event.id));
          }}
          height="auto"
          eventResizableFromStart={true}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          eventContent={(arg) => (
            <div className="px-1 py-0.5 text-[11px] leading-tight">
              <div className="font-medium">{arg.timeText}</div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
