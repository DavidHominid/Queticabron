import { Cita, Evento, User } from '../types';

const ymdOf = (v: unknown) => String(v ?? '').slice(0, 10);

const eventoIncluyeHoy = (evento: Evento, hoyYmd: string) => {
  const start = ymdOf((evento as any).fechaInicio);
  const end = ymdOf((evento as any).fechaFin);
  if (start && hoyYmd && start > hoyYmd) return false;
  if (end && hoyYmd && end < hoyYmd) return false;
  return true;
};

/**
 * Todo encargado de triaje aprobado por administración (o admin) puede ver las especialidades
 * y pacientes de cualquier evento activo sin necesidad de asignación manual de practicantes.
 */
export const triageCanSeeEspecialidad = (
  evento: Evento | null | undefined,
  _especialidad: string,
  user: User | null | undefined,
  isGeneral: boolean = false,
) => {
  if (!user) return false;
  if (!evento && !isGeneral) return false;
  return true;
};

export const triageCanSeeCita = (evento: Evento | null | undefined, cita: Cita, user: User | null | undefined) =>
  triageCanSeeEspecialidad(evento, cita.especialidad, user, cita.eventoId === 'general');

export const pickEventoActivoParaTriage = (
  eventos: Evento[],
  _user: User | null | undefined,
  hoyYmd: string,
  _ciudadesNorm: string[],
) => {
  const activos = (eventos || []).filter((e) => e && (e as any).estado === 'activo');
  if (!activos.length) return null;

  const ranked = activos
    .map((e) => ({ e, inHoy: eventoIncluyeHoy(e, hoyYmd) }))
    .sort((a, b) => Number(b.inHoy) - Number(a.inHoy));

  return ranked[0]?.e || null;
};

export const pickEventoActivoParaTriageConCitas = (
  eventos: Evento[],
  citas: Cita[],
  user: User | null | undefined,
  hoyYmd: string,
  ciudadesNorm: string[],
) => {
  const base = pickEventoActivoParaTriage(eventos, user, hoyYmd, ciudadesNorm);
  const ymd = (v: unknown) => String(v ?? '').slice(0, 10);
  const estadosOk = new Set<Cita['estado']>(['programada', 'en_triage', 'en_consulta']);

  const tieneCitasHoy = (e: Evento) =>
    (citas || []).some(
      (c) =>
        (c.eventoId === e.id || c.eventoId === 'general') &&
        ymd(c.fecha) === hoyYmd &&
        estadosOk.has(c.estado) &&
        triageCanSeeCita(e, c, user),
    );

  if (base && tieneCitasHoy(base)) return base;

  const activos = (eventos || []).filter((e) => e && (e as any).estado === 'activo');
  if (!activos.length) return base || null;

  const ranked = activos
    .map((e) => ({ e, hasCitasHoy: tieneCitasHoy(e), inHoy: eventoIncluyeHoy(e, hoyYmd) }))
    .sort((a, b) => Number(b.hasCitasHoy) - Number(a.hasCitasHoy) || Number(b.inHoy) - Number(a.inHoy));

  return ranked[0]?.e || base || null;
};
