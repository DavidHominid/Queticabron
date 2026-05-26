import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Cita, Especialidad, EspecialidadCatalogo, Evento, HorarioDisponible } from '../../types';
import { labelEspecialidad } from '../../utils/especialidades';
import { now, todayYmd } from '../../utils/clock';

export type EstadoAgendaDia = 'disponible' | Cita['estado'];

const ESTADO_COLORS: Record<EstadoAgendaDia, { bg: string; border: string; text: string }> = {
  disponible: { bg: 'var(--primary)', border: 'var(--primary)', text: 'var(--primary-foreground)' },
  programada: { bg: 'var(--secondary)', border: 'var(--secondary)', text: 'var(--secondary-foreground)' },
  en_triage: { bg: 'var(--brand-soft-peach)', border: 'var(--brand-soft-peach)', text: 'var(--accent-foreground)' },
  en_consulta: { bg: 'var(--brand-tertiary)', border: 'var(--brand-tertiary)', text: 'var(--primary-foreground)' },
  completada: { bg: 'var(--brand-primary-strong)', border: 'var(--brand-primary-strong)', text: 'var(--primary-foreground)' },
  cancelada: { bg: 'var(--chart-4)', border: 'var(--chart-4)', text: 'var(--primary-foreground)' },
  cedida: { bg: 'var(--chart-5)', border: 'var(--chart-5)', text: 'var(--primary-foreground)' },
  no_asistio: { bg: 'var(--outline)', border: 'var(--outline)', text: 'var(--primary-foreground)' },
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

const formatCosto = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
};

const citasInWindow = (
  citas: Cita[],
  payload: { eventoId: string; especialidad: Especialidad; fecha: string; horaInicio: string; horaFin: string; tipoCitaId?: string },
  includeCanceladas: boolean,
  getDuracionMinutos?: (c: Cita) => number,
) => {
  const hoy = todayYmd();
  const s = timeToMinutes(payload.horaInicio);
  const e = timeToMinutes(payload.horaFin);
  const tipoId = String(payload.tipoCitaId || '').trim();
  return (citas || []).filter((c) => {
    if (c.eventoId !== payload.eventoId) return false;
    if (c.especialidad !== payload.especialidad) return false;
    if (c.fecha !== payload.fecha) return false;
    if (!includeCanceladas && c.estado === 'cancelada' && String(payload.fecha || '').substring(0, 10) !== hoy) return false;
    if (tipoId && String(c.tipoCitaId || '') !== tipoId) return false;
    const cs = timeToMinutes(c.hora);
    const cdurRaw = getDuracionMinutos ? getDuracionMinutos(c) : c.duracionMinutos;
    const cdur = Number.isFinite(Number(cdurRaw)) ? Math.max(1, Math.floor(Number(cdurRaw))) : 60;
    const ce = cs + cdur;
    return cs < e && ce > s;
  });
};

export function AgendaCitasDiaCalendar({
  eventos,
  citas,
  especialidadesCatalogo,
  onClickDisponible,
  onClickCitas,
  onClickEmptySlot,
}: {
  eventos: Evento[];
  citas: Cita[];
  especialidadesCatalogo?: EspecialidadCatalogo[];
  onClickDisponible: (payload: { evento: Evento; especialidad: Especialidad; horario: HorarioDisponible }) => void;
  onClickCitas: (payload: { evento: Evento; especialidad: Especialidad; horario: HorarioDisponible; citas: Cita[] }) => void;
  onClickEmptySlot?: (payload: { fecha: string; horaInicio: string; horaFin: string }) => void;
}) {
  const eventoById = useMemo(() => {
    const map = new Map<string, Evento>();
    for (const e of eventos || []) map.set(e.id, e);
    return map;
  }, [eventos]);

  const citasData = useMemo(() => {
    const map = new Map<string, Cita[]>();
    const metaById = new Map<string, { duracionMinutos: number; costo: number; tipoCitaNombre: string }>();
    for (const c of citas || []) {
      const f = String(c.fecha || '').trim();
      if (!f) continue;
      const evento = eventoById.get(c.eventoId) || null;
      const tipoId = c.tipoCitaId ? String(c.tipoCitaId) : '';
      const espEvento = (evento?.especialidades || []).find((x) => x.especialidad === c.especialidad) || null;
      const tipo = tipoId && espEvento ? (espEvento.tiposCita || []).find((t) => String(t.id || '') === tipoId) : null;
      const durRaw = Number.isFinite(Number(c.duracionMinutos)) ? Number(c.duracionMinutos) : Number(tipo?.duracionMinutos);
      const duracionMinutos = Number.isFinite(Number(durRaw)) ? Math.max(1, Math.floor(Number(durRaw))) : 60;
      const costoPagado = Number(c.costoPagado);
      let costo = Number.isFinite(costoPagado) ? costoPagado : 0;
      if (!(costo > 0) && espEvento) {
        const inferred = Number.isFinite(Number(tipo?.precio))
          ? Number(tipo?.precio)
          : Number.isFinite(Number(espEvento.costo))
            ? Number(espEvento.costo)
            : 0;
        if (inferred > 0) costo = inferred;
      }
      const tipoCitaNombre = String(c.tipoCitaNombre || tipo?.nombre || '').trim();
      metaById.set(String(c.id), { duracionMinutos, costo, tipoCitaNombre });
      const arr = map.get(f) || [];
      arr.push(c);
      map.set(f, arr);
    }
    return { byFecha: map, metaById };
  }, [citas, eventoById]);

  const citasByFecha = citasData.byFecha;
  const citaMetaById = citasData.metaById;

  const minMax = useMemo(() => {
    const baseMin = 7 * 60;
    const baseMax = 20 * 60;
    const mins: number[] = [];
    const maxs: number[] = [];
    for (const e of eventos || []) {
      for (const esp of e.especialidades || []) {
        for (const h of esp.horarios || []) {
          if (!h?.horaInicio || !h?.horaFin) continue;
          mins.push(timeToMinutes(h.horaInicio));
          maxs.push(timeToMinutes(h.horaFin));
        }
      }
    }
    for (const c of citas || []) {
      if (!c.hora) continue;
      const start = timeToMinutes(c.hora);
      mins.push(start);
      const meta = citaMetaById.get(String(c.id)) || null;
      const dur = meta?.duracionMinutos ?? c.duracionMinutos ?? 60;
      maxs.push(start + dur);
    }
    if (!mins.length || !maxs.length) return { minTime: minutesToTime(baseMin), maxTime: minutesToTime(baseMax) };
    const min = Math.min(...mins.filter((x) => Number.isFinite(x)));
    const max = Math.max(...maxs.filter((x) => Number.isFinite(x)));
    const safeMin = Number.isFinite(min) ? Math.max(0, Math.min(baseMin, min)) : baseMin;
    const safeMax = Number.isFinite(max) ? Math.max(baseMax, max) : baseMax;
    
    // Redondear a la hora para que la cuadrícula comience limpia
    const hourMin = Math.floor(safeMin / 60) * 60;
    const hourMax = Math.min(24 * 60, Math.ceil(safeMax / 60) * 60);

    return { minTime: minutesToTime(hourMin), maxTime: minutesToTime(hourMax) };
  }, [eventos, citas, citaMetaById]);

  const events = useMemo(() => {
    const out: any[] = [];
    const hoy = todayYmd();
    for (const c of citas || []) {
      const meta = citaMetaById.get(String(c.id)) || null;
      const dur = meta?.duracionMinutos ?? 60;
      const estado = (c.estado || 'programada') as EstadoAgendaDia;
      const startMin = timeToMinutes(c.hora);
      const endMin = startMin + dur;
      const startHm = minutesToHm(startMin);
      const color = ESTADO_COLORS[estado] || ESTADO_COLORS.programada;
      const evento = eventoById.get(c.eventoId) || null;
      const eventoNombre = String(evento?.nombre || '').trim();
      const especialidadLabel = labelEspecialidad(c.especialidad, especialidadesCatalogo);
      const tipoId = c.tipoCitaId ? String(c.tipoCitaId) : '';
      const tipoCitaNombre = meta?.tipoCitaNombre ?? '';
      const costo = meta?.costo ?? 0;
      const pagadoRaw = Number(c.costoPagado);
      const pagado = Number.isFinite(pagadoRaw) ? pagadoRaw : 0;
      const pagoPendiente = !(pagado > 0) && costo > 0;
      out.push({
        id: `cita|${c.id}`,
        title: `${startHm} · ${estado}${pagoPendiente ? ' · pago pendiente' : ''}`,
        start: `${c.fecha}T${startHm}:00`,
        end: `${c.fecha}T${minutesToHm(endMin)}:00`,
        backgroundColor: color.bg,
        borderColor: color.border,
        textColor: color.text,
        extendedProps: {
          kind: 'cita',
          citaId: c.id,
          dia: c.fecha,
          eventoId: c.eventoId,
          eventoNombre,
          especialidad: c.especialidad,
          especialidadLabel,
          tipoCitaId: tipoId || undefined,
          tipoCitaNombre,
          costo,
          pagoPendiente,
          horaInicio: startHm,
          horaFin: minutesToHm(endMin),
        },
      });
    }

    for (const e of eventos || []) {
      if (e.estado !== 'activo') continue;
      for (const esp of e.especialidades || []) {
        for (const h of esp.horarios || []) {
          const day = String(h?.dia || '').trim();
          if (!day) continue;
          if (day <= hoy) continue;
          if (!h.horaInicio || !h.horaFin) continue;
          const intervalo = Number.isFinite(Number(h.intervalo)) ? Math.max(1, Math.floor(Number(h.intervalo))) : 60;
          const inicio = timeToMinutes(h.horaInicio);
          const fin = timeToMinutes(h.horaFin);
          if (inicio >= fin) continue;
          const especialidadLabel = labelEspecialidad(esp.especialidad, especialidadesCatalogo);
          const tipoId = h.tipoCitaId ? String(h.tipoCitaId) : '';
          const tipo = tipoId ? (esp.tiposCita || []).find((t) => String(t.id || '') === tipoId) : null;
          const tipoCitaNombre = String(tipo?.nombre || '').trim();
          const costo = Number.isFinite(Number(tipo?.precio))
            ? Number(tipo?.precio)
            : Number.isFinite(Number((esp as any)?.costo))
              ? Number((esp as any).costo)
              : 0;
          const slotLen = Number.isFinite(Number(tipo?.duracionMinutos)) ? Math.max(1, Math.floor(Number(tipo?.duracionMinutos))) : intervalo;
          for (let cur = inicio; cur + slotLen <= fin; cur += slotLen) {
            const slotStart = minutesToHm(cur);
            const slotEnd = minutesToHm(cur + slotLen);
            const ocupadas = citasInWindow(
              citasByFecha.get(day) || [],
              { eventoId: e.id, especialidad: esp.especialidad, fecha: day, horaInicio: slotStart, horaFin: slotEnd, tipoCitaId: h.tipoCitaId },
              false,
              (cita) => citaMetaById.get(String(cita.id))?.duracionMinutos ?? (cita.duracionMinutos as any),
            );
            if (ocupadas.length > 0) continue;
            const color = ESTADO_COLORS.disponible;
            const slotKey = `${e.id}|${esp.especialidad}|${day}|${slotStart}|${slotEnd}|${h.tipoCitaId || ''}`;
            out.push({
              id: `disp|${slotKey}`,
              title: `${slotStart}-${slotEnd} · disponible`,
              start: `${day}T${slotStart}:00`,
              end: `${day}T${slotEnd}:00`,
              backgroundColor: color.bg,
              borderColor: color.border,
              textColor: color.text,
              extendedProps: {
                kind: 'disponible',
                eventoId: e.id,
                eventoNombre: String(e.nombre || '').trim(),
                especialidad: esp.especialidad,
                especialidadLabel,
                dia: day,
                horaInicio: slotStart,
                horaFin: slotEnd,
                intervalo: slotLen,
                tipoCitaId: h.tipoCitaId ? String(h.tipoCitaId) : undefined,
                tipoCitaNombre,
                costo,
              },
            });
          }
        }
      }
    }
    return out;
  }, [citaMetaById, citas, citasByFecha, especialidadesCatalogo, eventoById, eventos]);

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
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          initialDate={todayYmd()}
          now={now()}
          nowIndicator={true}
          locale={esLocale}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          buttonText={{ today: 'Hoy' }}
          slotMinTime={minMax.minTime}
          slotMaxTime={minMax.maxTime}
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          snapDuration="00:15:00"
          allDaySlot={false}
          selectable={!!onClickEmptySlot}
          select={(info) => {
            const fechaStr = info.startStr.substring(0, 10);
            const horaInicio = info.startStr.substring(11, 16);
            const horaFin = info.endStr.substring(11, 16);
            if (onClickEmptySlot) {
              onClickEmptySlot({ fecha: fechaStr, horaInicio, horaFin });
            }
          }}
          editable={false}
          eventOverlap={false}
          slotEventOverlap={false}
          events={events}
          eventClick={(info) => {
            const kind = String((info.event.extendedProps as any)?.kind || '');
            const eventoId = String((info.event.extendedProps as any)?.eventoId || '');
            const esp = String((info.event.extendedProps as any)?.especialidad || '') as Especialidad;
            const dia = String((info.event.extendedProps as any)?.dia || (info.event.startStr || '').slice(0, 10) || '');
            const horaInicio = String((info.event.extendedProps as any)?.horaInicio || '');
            const horaFin = String((info.event.extendedProps as any)?.horaFin || '');
            const intervalo = Number((info.event.extendedProps as any)?.intervalo || 60);
            const tipoCitaId = (info.event.extendedProps as any)?.tipoCitaId ? String((info.event.extendedProps as any).tipoCitaId) : undefined;
            const evento = eventoById.get(eventoId) || null;
            if (!evento || !esp || !dia || !horaInicio || !horaFin) return;
            const horario: HorarioDisponible = { dia, horaInicio, horaFin, intervalo, cupoTotal: 1, tipoCitaId };
            if (kind === 'disponible') {
              onClickDisponible({ evento, especialidad: esp, horario });
              return;
            }
            if (kind === 'cita') {
              const citasSolapadas = citasInWindow(
                citasByFecha.get(dia) || [],
                { eventoId: evento.id, especialidad: esp, fecha: dia, horaInicio, horaFin },
                true,
                (cita) => citaMetaById.get(String(cita.id))?.duracionMinutos ?? (cita.duracionMinutos as any),
              );
              onClickCitas({ evento, especialidad: esp, horario, citas: citasSolapadas });
            }
          }}
          height="auto"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          eventContent={(arg) => {
            const p = (arg.event.extendedProps || {}) as any;
            const eventoNombre = String(p.eventoNombre || '').trim();
            const especialidadLabel = String(p.especialidadLabel || p.especialidad || '').trim();
            const tipoCitaNombre = String(p.tipoCitaNombre || '').trim();
            const costo = formatCosto(p.costo);
            const tooltip = [eventoNombre || 'Cita General', especialidadLabel || 'Especialidad', tipoCitaNombre || 'Sin tipo', costo]
              .filter(Boolean)
              .join(' · ');
            const secondLine = [especialidadLabel || 'Especialidad', tipoCitaNombre || 'Sin tipo'].filter(Boolean).join(' · ');
            return (
              <div className="flex h-full w-full items-center justify-between gap-4 overflow-hidden px-3 py-1 text-[11px] font-medium leading-none" title={tooltip}>
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold shrink-0">{eventoNombre || 'Cita General'}</span>
                  {secondLine && (
                    <>
                      <span className="opacity-40 select-none">|</span>
                      <span className="truncate opacity-90">{secondLine}</span>
                    </>
                  )}
                </div>
                <div className="font-bold tabular-nums shrink-0 bg-white/20 px-2 py-0.5 rounded text-[10px]">
                  {costo}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
