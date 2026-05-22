import { Cita, Evento, User } from '../types';
import { normalizeCiudad } from './ciudades';

const norm = (v: unknown) => String(v ?? '').trim();

const ymdOf = (v: unknown) => String(v ?? '').slice(0, 10);

const eventoIncluyeHoy = (evento: Evento, hoyYmd: string) => {
  const start = ymdOf((evento as any).fechaInicio);
  const end = ymdOf((evento as any).fechaFin);
  if (start && hoyYmd && start > hoyYmd) return false;
  if (end && hoyYmd && end < hoyYmd) return false;
  return true;
};

export const triageCanSeeEspecialidad = (evento: Evento | null | undefined, especialidad: string, user: User | null | undefined, isGeneral: boolean = false) => {
  if (!evento && !isGeneral) return false;
  if (!user) return false;
  if (user.rol === 'administrador') return true;
  if (user.rol !== 'triage') return true;

  const esp = (evento?.especialidades || []).find((e) => e.especialidad === especialidad) || null;
  const list = Array.isArray((esp as any)?.practicantes) ? (((esp as any).practicantes as unknown[]) || []).map(norm).filter(Boolean) : [];
  if (!list.length) return true;

  const uid = norm(user.id);
  const uname = norm(user.nombre);
  return (uid && list.includes(uid)) || (uname && list.includes(uname));
};

export const triageCanSeeCita = (evento: Evento | null | undefined, cita: Cita, user: User | null | undefined) =>
  triageCanSeeEspecialidad(evento, cita.especialidad, user, cita.eventoId === 'general');

export const pickEventoActivoParaTriage = (eventos: Evento[], user: User | null | undefined, hoyYmd: string, ciudadesNorm: string[]) => {
  const activos = (eventos || []).filter((e) => e && (e as any).estado === 'activo');
  if (!activos.length) return null;

  const inCiudades = (e: Evento) => {
    if (!ciudadesNorm.length) return true;
    const c = normalizeCiudad((e as any).ciudad);
    return c ? ciudadesNorm.includes(c) : false;
  };

  const hasAsignaciones = (e: Evento) =>
    (e.especialidades || []).some((esp) => Array.isArray((esp as any)?.practicantes) && (esp as any).practicantes.length > 0);

  const isAsignado = (e: Evento) => {
    if (!user) return false;
    if (user.rol === 'administrador') return true;
    if (user.rol !== 'triage') return true;
    if (!hasAsignaciones(e)) return true;
    const uid = norm(user.id);
    const uname = norm(user.nombre);
    for (const esp of e.especialidades || []) {
      const list = Array.isArray((esp as any)?.practicantes) ? (((esp as any).practicantes as unknown[]) || []).map(norm).filter(Boolean) : [];
      if (!list.length) continue;
      if ((uid && list.includes(uid)) || (uname && list.includes(uname))) return true;
    }
    return false;
  };

  const ranked = activos
    .filter((e) => inCiudades(e))
    .filter((e) => isAsignado(e))
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
    (citas || []).some((c) => (c.eventoId === e.id || c.eventoId === 'general') && ymd(c.fecha) === hoyYmd && estadosOk.has(c.estado) && triageCanSeeCita(e, c, user));

  if (base && tieneCitasHoy(base)) return base;

  const activos = (eventos || []).filter((e) => e && (e as any).estado === 'activo');
  if (!activos.length) return base || null;

  const inCiudades = (e: Evento) => {
    if (!ciudadesNorm.length) return true;
    const c = normalizeCiudad((e as any).ciudad);
    return c ? ciudadesNorm.includes(c) : false;
  };

  const hasAsignaciones = (e: Evento) =>
    (e.especialidades || []).some((esp) => Array.isArray((esp as any)?.practicantes) && (esp as any).practicantes.length > 0);

  const isAsignado = (e: Evento) => {
    if (!user) return false;
    if (user.rol === 'administrador') return true;
    if (user.rol !== 'triage') return true;
    if (!hasAsignaciones(e)) return true;
    const uid = norm(user.id);
    const uname = norm(user.nombre);
    for (const esp of e.especialidades || []) {
      const list = Array.isArray((esp as any)?.practicantes) ? (((esp as any).practicantes as unknown[]) || []).map(norm).filter(Boolean) : [];
      if (!list.length) continue;
      if ((uid && list.includes(uid)) || (uname && list.includes(uname))) return true;
    }
    return false;
  };

  const ranked = activos
    .filter((e) => inCiudades(e))
    .filter((e) => isAsignado(e))
    .map((e) => ({ e, hasCitasHoy: tieneCitasHoy(e), inHoy: eventoIncluyeHoy(e, hoyYmd) }))
    .sort((a, b) => Number(b.hasCitasHoy) - Number(a.hasCitasHoy) || Number(b.inHoy) - Number(a.inHoy));

  return ranked[0]?.e || base || null;
};
