import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Cita, Especialidad, Evento, HorarioDisponible } from '../../types';

export type EstadoAgendaDia = 'disponible' | Cita['estado'];

const ESTADO_COLORS: Record<EstadoAgendaDia, { bg: string; border: string; text: string }> = {
  disponible: { bg: '#22C55E', border: '#16A34A', text: '#FFFFFF' },
  programada: { bg: '#3B82F6', border: '#2563EB', text: '#FFFFFF' },
  en_triage: { bg: '#F59E0B', border: '#D97706', text: '#FFFFFF' },
  en_consulta: { bg: '#A855F7', border: '#9333EA', text: '#FFFFFF' },
  completada: { bg: '#14B8A6', border: '#0D9488', text: '#FFFFFF' },
  cancelada: { bg: '#EF4444', border: '#DC2626', text: '#FFFFFF' },
  cedida: { bg: '#F97316', border: '#EA580C', text: '#FFFFFF' },
  no_asistio: { bg: '#64748B', border: '#475569', text: '#FFFFFF' },
};

const timeToMinutes = (t: string) => {
  const [hh, mm] = String(t || '').split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const minutesToTime = (m: number) => {
  const hh = Math.max(0, Math.floor(m / 60));
  const mm = Math.max(0, Math.floor(m % 60));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
};

const minutesToHm = (m: number) => minutesToTime(m).slice(0, 5);

const citasInWindow = (
  citas: Cita[],
  payload: { eventoId: string; especialidad: Especialidad; fecha: string; horaInicio: string; horaFin: string; tipoCitaId?: string },
  includeCanceladas: boolean,
) => {
  const s = timeToMinutes(payload.horaInicio);
  const e = timeToMinutes(payload.horaFin);
  const tipoId = String(payload.tipoCitaId || '').trim();
  return (citas || []).filter((c) => {
    if (c.eventoId !== payload.eventoId) return false;
    if (c.especialidad !== payload.especialidad) return false;
    if (c.fecha !== payload.fecha) return false;
    if (!includeCanceladas && c.estado === 'cancelada') return false;
    if (tipoId && String(c.tipoCitaId || '') !== tipoId) return false;
    const cs = timeToMinutes(c.hora);
    const cdur = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
    const ce = cs + cdur;
    return cs < e && ce > s;
  });
};

export function AgendaCitasDiaCalendar({
  dia,
  eventos,
  citas,
  onClickDisponible,
  onClickCitas,
}: {
  dia: string;
  eventos: Evento[];
  citas: Cita[];
  onClickDisponible: (payload: { evento: Evento; especialidad: Especialidad; horario: HorarioDisponible }) => void;
  onClickCitas: (payload: { evento: Evento; especialidad: Especialidad; horario: HorarioDisponible; citas: Cita[] }) => void;
}) {
  const eventoById = useMemo(() => {
    const map = new Map<string, Evento>();
    for (const e of eventos || []) map.set(e.id, e);
    return map;
  }, [eventos]);

  const citasDelDia = useMemo(() => (citas || []).filter((c) => c.fecha === dia), [citas, dia]);

  const minMax = useMemo(() => {
    const baseMin = 7 * 60;
    const baseMax = 20 * 60;
    const mins: number[] = [];
    const maxs: number[] = [];
    for (const e of eventos || []) {
      for (const esp of e.especialidades || []) {
        for (const h of esp.horarios || []) {
          if (h.dia !== dia) continue;
          mins.push(timeToMinutes(h.horaInicio));
          maxs.push(timeToMinutes(h.horaFin));
        }
      }
    }
    if (!mins.length || !maxs.length) return { minTime: minutesToTime(baseMin), maxTime: minutesToTime(baseMax) };
    const min = Math.min(...mins.filter((x) => Number.isFinite(x)));
    const max = Math.max(...maxs.filter((x) => Number.isFinite(x)));
    const safeMin = Number.isFinite(min) ? Math.max(0, Math.min(baseMin, min)) : baseMin;
    const safeMax = Number.isFinite(max) ? Math.max(baseMax, max) : baseMax;
    return { minTime: minutesToTime(safeMin), maxTime: minutesToTime(safeMax) };
  }, [dia, eventos]);

  const events = useMemo(() => {
    const out: any[] = [];
    for (const c of citasDelDia) {
      const dur = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
      const startMin = timeToMinutes(c.hora);
      const endMin = startMin + dur;
      const estado = (c.estado || 'programada') as EstadoAgendaDia;
      const color = ESTADO_COLORS[estado] || ESTADO_COLORS.programada;
      out.push({
        id: `cita|${c.id}`,
        title: `${c.hora} · ${estado}`,
        start: `${c.fecha}T${c.hora}:00`,
        end: `${c.fecha}T${minutesToHm(endMin)}:00`,
        backgroundColor: color.bg,
        borderColor: color.border,
        textColor: color.text,
        extendedProps: {
          kind: 'cita',
          citaId: c.id,
          eventoId: c.eventoId,
          especialidad: c.especialidad,
          horaInicio: c.hora,
          horaFin: minutesToHm(endMin),
        },
      });
    }

    for (const e of eventos || []) {
      if (e.estado !== 'activo') continue;
      for (const esp of e.especialidades || []) {
        for (const h of esp.horarios || []) {
          if (h.dia !== dia) continue;
          if (!h.horaInicio || !h.horaFin) continue;
          const intervalo = Number.isFinite(Number(h.intervalo)) ? Math.max(1, Math.floor(Number(h.intervalo))) : 60;
          const inicio = timeToMinutes(h.horaInicio);
          const fin = timeToMinutes(h.horaFin);
          if (inicio >= fin) continue;
          for (let cur = inicio; cur + intervalo <= fin; cur += intervalo) {
            const slotStart = minutesToHm(cur);
            const slotEnd = minutesToHm(cur + intervalo);
            const ocupadas = citasInWindow(
              citasDelDia,
              { eventoId: e.id, especialidad: esp.especialidad, fecha: dia, horaInicio: slotStart, horaFin: slotEnd, tipoCitaId: h.tipoCitaId },
              false,
            );
            if (ocupadas.length > 0) continue;
            const color = ESTADO_COLORS.disponible;
            const slotKey = `${e.id}|${esp.especialidad}|${dia}|${slotStart}|${slotEnd}|${h.tipoCitaId || ''}`;
            out.push({
              id: `disp|${slotKey}`,
              title: `${slotStart}-${slotEnd} · disponible`,
              start: `${dia}T${slotStart}:00`,
              end: `${dia}T${slotEnd}:00`,
              backgroundColor: color.bg,
              borderColor: color.border,
              textColor: color.text,
              extendedProps: {
                kind: 'disponible',
                eventoId: e.id,
                especialidad: esp.especialidad,
                dia,
                horaInicio: slotStart,
                horaFin: slotEnd,
                intervalo,
                tipoCitaId: h.tipoCitaId ? String(h.tipoCitaId) : undefined,
              },
            });
          }
        }
      }
    }
    return out;
  }, [citasDelDia, dia, eventos]);

  const legend = useMemo(() => {
    const items: Array<{ estado: EstadoAgendaDia; label: string }> = [
      { estado: 'disponible', label: 'Disponible' },
      { estado: 'programada', label: 'Programada' },
      { estado: 'en_triage', label: 'En Triage' },
      { estado: 'en_consulta', label: 'En Consulta' },
      { estado: 'completada', label: 'Completada' },
      { estado: 'cancelada', label: 'Cancelada' },
    ];
    return items;
  }, []);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
          <div className="font-medium text-gray-900">Estados:</div>
          {legend.map((it) => {
            const c = ESTADO_COLORS[it.estado];
            return (
              <div key={it.estado} className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }} />
                <span>{it.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          initialDate={dia || undefined}
          locale={esLocale}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          buttonText={{ today: 'Hoy' }}
          slotMinTime={minMax.minTime}
          slotMaxTime={minMax.maxTime}
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          snapDuration="00:15:00"
          allDaySlot={false}
          selectable={false}
          editable={false}
          eventOverlap={true}
          events={events}
          eventClick={(info) => {
            const kind = String((info.event.extendedProps as any)?.kind || '');
            const eventoId = String((info.event.extendedProps as any)?.eventoId || '');
            const esp = String((info.event.extendedProps as any)?.especialidad || '') as Especialidad;
            const horaInicio = String((info.event.extendedProps as any)?.horaInicio || '');
            const horaFin = String((info.event.extendedProps as any)?.horaFin || '');
            const intervalo = Number((info.event.extendedProps as any)?.intervalo || 60);
            const tipoCitaId = (info.event.extendedProps as any)?.tipoCitaId ? String((info.event.extendedProps as any).tipoCitaId) : undefined;
            const evento = eventoById.get(eventoId) || null;
            if (!evento || !esp || !horaInicio || !horaFin) return;
            const horario: HorarioDisponible = { dia, horaInicio, horaFin, intervalo, cupoTotal: 1, tipoCitaId };
            if (kind === 'disponible') {
              onClickDisponible({ evento, especialidad: esp, horario });
              return;
            }
            if (kind === 'cita') {
              const citasSolapadas = citasInWindow(
                citasDelDia,
                { eventoId: evento.id, especialidad: esp, fecha: dia, horaInicio, horaFin },
                true,
              );
              onClickCitas({ evento, especialidad: esp, horario, citas: citasSolapadas });
            }
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
    </div>
  );
}
