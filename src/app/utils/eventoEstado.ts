import { Evento } from '../types';
import { todayYmd } from './clock';

type NoAgendableReason = 'cancelado' | 'finalizado' | 'inscripciones_no_inician' | 'fuera_ventana' | 'fuera_fechas_evento';

const isYmd = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());

const ymd = (value?: string | null) => {
  const v = String(value || '').trim();
  return isYmd(v) ? v : '';
};

export const deriveEstadoEvento = (evento?: Evento | null, hoy = todayYmd()): Evento['estado'] | '' => {
  if (!evento) return '';
  if (evento.estado === 'cancelado') return 'cancelado';
  const fin = ymd(evento.fechaFin);
  if (fin && hoy > fin) return 'finalizado';
  return 'activo';
};

export const isEventoSoloLectura = (evento?: Evento | null, hoy = todayYmd()) => {
  const estado = deriveEstadoEvento(evento, hoy);
  return estado === 'finalizado' || estado === 'cancelado';
};

export const canAgendarCitaEnEvento = (
  evento?: Evento | null,
  fechaCita?: string | null,
  hoy = todayYmd(),
): { ok: boolean; reason?: NoAgendableReason } => {
  if (!evento) return { ok: false, reason: 'fuera_ventana' };

  const estado = deriveEstadoEvento(evento, hoy);
  if (estado === 'cancelado') return { ok: false, reason: 'cancelado' };
  if (estado === 'finalizado') return { ok: false, reason: 'finalizado' };

  const inicioIns = ymd(evento.fechaInicioInscripcion);
  const finEvento = ymd(evento.fechaFin);
  if (inicioIns && hoy < inicioIns) return { ok: false, reason: 'inscripciones_no_inician' };
  if (inicioIns && finEvento && (hoy < inicioIns || hoy > finEvento)) return { ok: false, reason: 'fuera_ventana' };

  const citaYmd = ymd(fechaCita);
  const inicioEvento = ymd(evento.fechaInicio);
  if (citaYmd && inicioEvento && finEvento && (citaYmd < inicioEvento || citaYmd > finEvento)) {
    return { ok: false, reason: 'fuera_fechas_evento' };
  }

  return { ok: true };
};

