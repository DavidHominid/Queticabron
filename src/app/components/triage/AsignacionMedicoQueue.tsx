import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Stethoscope,
  Ticket,
  User,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { pickEventoActivoParaTriageConCitas } from '../../utils/triageAccess';
import { normalizeCiudad } from '../../utils/ciudades';
import { todayYmd } from '../../utils/clock';
import { labelEspecialidad } from '../../utils/especialidades';

type ColaCita = {
  idCita: number | string;
  pacienteId: number | string;
  pacienteNombre: string;
  numeroExpediente?: string;
  especialidad: string;
  eventoId?: string;
  fechaCita?: string;
  hora?: string;
  estado?: string;
  ordenLlegada?: number | null;
  horaLlegada?: string | null;
  prioridadTriage?: number | null;
  saltadoTriage?: boolean;
  medicoEncargado?: string | null;
  poolMedicosIds?: string[];
  medicoNombreTriage?: string;
  prioridadColor?: string;
};

export function AsignacionMedicoQueue() {
  const { citas, pacientes, eventos, usuarios, especialidadesCatalogo } = useData();
  const { user } = useAuth();
  const [cargando, setCargando] = useState(false);
  const [asignandoId, setAsignandoId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const hoy = todayYmd();

  const ciudadesUsuario = useMemo(() => {
    const list =
      Array.isArray((user as any)?.ciudades) && (user as any).ciudades.length
        ? ((user as any).ciudades as string[])
        : user?.ciudad
          ? [user.ciudad]
          : [];
    return Array.from(new Set(list.map(normalizeCiudad).filter(Boolean)));
  }, [user]);

  const eventoActivo = useMemo(
    () => pickEventoActivoParaTriageConCitas(eventos, citas, user, hoy, ciudadesUsuario),
    [eventos, citas, user, hoy, ciudadesUsuario, refreshTick],
  );

  // Construir cola localmente citas listo usando citas del evento (fallback si endpoint GET /cola-asignacion/:eventoId no está disponible
  const colaLocal: ColaCita[] = useMemo(() => {
    if (!eventoActivo) return [];
    return citas
      .filter((c) => {
        if (String(c.eventoId || '') !== String(eventoActivo.id)) return false;
        const fecha = String(c.fecha || '').slice(0, 10);
        if (fecha !== hoy) return false;
        const est = c.estado || '';
        const enCola =
          est === 'triage_completado' ||
          est === 'asignando_medico' ||
          (est === 'llegada_registrada' && c.saltadoTriage === true);
        if (!enCola) return false;
        return !c.medicoEncargado;
      })
      .sort((a, b) => {
        const saltA = a.saltadoTriage ? 0 : 1;
        const saltB = b.saltadoTriage ? 0 : 1;
        if (saltA !== saltB) return saltA - saltB;
        const pA = Number.isFinite(Number(a.prioridadTriage)) ? Number(a.prioridadTriage) : 3;
        const pB = Number.isFinite(Number(b.prioridadTriage)) ? Number(b.prioridadTriage) : 3;
        if (pA !== pB) return pA - pB;
        const hlA = a.horaLlegada ? String(a.horaLlegada) : '99:99';
        const hlB = b.horaLlegada ? String(b.horaLlegada) : '99:99';
        if (hlA !== hlB) return hlA.localeCompare(hlB);
        const olA = Number.isFinite(Number(a.ordenLlegada)) ? Number(a.ordenLlegada) : 999999;
        const olB = Number.isFinite(Number(b.ordenLlegada)) ? Number(b.ordenLlegada) : 999999;
        if (olA !== olB) return olA - olB;
        return String(a.hora || '').localeCompare(String(b.hora || ''));
      })
      .map((c) => {
        const paciente = pacientes.find((p) => String(p.id) === String(c.pacienteId));
        const espCfg = eventoActivo.especialidades?.find(
          (e: any) => String(e.especialidad) === String(c.especialidad),
        );
        const pool = Array.isArray((espCfg as any)?.medicoUsuarioIds)
          ? (espCfg as any).medicoUsuarioIds
          : espCfg?.medicoEncargado
            ? [String((espCfg as any).medicoEncargado)]
            : [];
        return {
          idCita: c.id,
          pacienteId: c.pacienteId,
          pacienteNombre: paciente?.nombre || `Paciente ${c.pacienteId}`,
          numeroExpediente: paciente?.numeroExpediente,
          especialidad: c.especialidad,
          eventoId: c.eventoId,
          hora: c.hora,
          estado: c.estado,
          ordenLlegada: c.ordenLlegada ?? null,
          horaLlegada: c.horaLlegada ?? null,
          prioridadTriage: c.prioridadTriage ?? null,
          saltadoTriage: c.saltadoTriage === true,
          medicoEncargado: c.medicoEncargado ?? null,
          poolMedicosIds: (pool || []).filter(Boolean),
        };
      });
  }, [citas, pacientes, eventoActivo, hoy, refreshTick]);

  const medicosCatalogoPool = useMemo(() => {
    const idsSet = new Set<string>();
    for (const c of colaLocal) {
      for (const id of c.poolMedicosIds || []) idsSet.add(String(id));
    }
    const out = new Map<string, { id: string; nombre: string }>();
    for (const id of idsSet) {
      const userMatch = usuarios.find(
        (u) =>
          String((u as any).id || '') === id ||
          String(u.nombre || '').toLowerCase() === String(id).toLowerCase(),
      );
      out.set(id, {
        id,
        nombre:
          userMatch?.nombre ||
          (String(id || '').length > 3 ? String(id) : `Médico ${id}`),
      });
    }
    // Añadir todos los usuarios rol=medico al catálogo global para permitir seleccionar cualquiera
    for (const u of usuarios) {
      if (String((u as any).rol || '').toLowerCase() === 'medico') {
        const uid = String((u as any).id || u.nombre || '');
        if (!uid) continue;
        if (!out.has(uid)) out.set(uid, { id: uid, nombre: u.nombre || uid });
      }
    }
    return out;
  }, [colaLocal, usuarios]);

  const handleAsignar = async (citaId: string, medicoId: string, prioridadTriage?: number) => {
    try {
      if (!citaId || !medicoId) return;
      setAsignandoId(String(citaId));
      const res = await fetch(`/api/citas/asignar-medico/${citaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'x-usuario': String((user as any).id) } : {}),
        },
        body: JSON.stringify({
          medicoId,
          prioridadTriage: Number.isFinite(Number(prioridadTriage))
            ? Number(prioridadTriage)
            : undefined,
          usuarioId: (user as any)?.id || undefined,
          nombreUsuario: user?.nombre || '',
          rol: user?.rol || 'recepcion',
          ciudad: (user as any)?.ciudad || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const poolMsg = Array.isArray(data?.pool) && data.pool.length
          ? `\nPool disponible: ${data.pool.join(', ')}`
          : '';
        throw new Error(data?.error || 'No se pudo asignar el médico.' + poolMsg);
      }
      toast.success(`Médico asignado ✅ (${data?.medicoEncargado || medicoId})`);
    } catch (err: any) {
      toast.error(err?.message || 'Error al asignar médico.');
    } finally {
      setAsignandoId(null);
    }
  };

  const badgePrioridad = (n: number | null | undefined) => {
    const val = Number.isFinite(Number(n)) ? Number(n) : 3;
    if (val <= 1) {
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <AlertCircle className="w-3 h-3" /> Prioridad {val}
        </Badge>
      );
    }
    if (val === 2) {
      return (
        <Badge variant="outline" className="gap-1 text-xs border-amber-500 text-amber-700 bg-amber-50">
          <Clock className="w-3 h-3" /> Prioridad {val}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        Prioridad {val}
      </Badge>
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between gap-3">
          <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Stethoscope className="w-5 h-5 text-[color:var(--brand-primary-strong)]" />
            Cola Asignación Médica
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {eventoActivo?.nombre || 'Sin evento activo'}
            {colaLocal.length ? ` · ${colaLocal.length} en espera` : ''}
          </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {colaLocal.filter((c) => c.saltadoTriage).length} sin triaje
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setRefreshTick((t) => t + 1)}
              disabled={cargando}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {colaLocal.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-[color:var(--brand-secondary-strong)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No hay pacientes en cola de asignación.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {colaLocal.map((c) => {
              const pool = c.poolMedicosIds || [];
              const poolMedicos = pool
                .map((id) => medicosCatalogoPool.get(String(id)) || { id: String(id), nombre: String(id) })
                .filter(Boolean);
              return (
                <div key={String(c.idCita)} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-secondary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{c.pacienteNombre}</p>
                        <p className="text-sm text-muted-foreground">{c.numeroExpediente}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <Badge variant="outline" className="bg-accent text-[color:var(--accent-foreground)]">
                            {labelEspecialidad(c.especialidad, especialidadesCatalogo)}
                          </Badge>
                          {Number.isFinite(Number(c.ordenLlegada)) && Number(c.ordenLlegada) > 0 ? (
                            <Badge variant="outline" className="gap-1 text-xs border-[color:var(--brand-primary-strong)] text-[color:var(--brand-primary-strong)] bg-[color:var(--brand-primary-strong)]/5">
                              <Ticket className="w-3 h-3" />#{c.ordenLlegada}
                            </Badge>
                          ) : null}
                          {c.horaLlegada ? (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Clock className="w-3 h-3" />{String(c.horaLlegada).slice(0, 5)}
                            </Badge>
                          ) : null}
                          {c.saltadoTriage ? (
                            <Badge variant="outline" className="gap-1 text-xs border-[color:var(--chart-2)] text-[color:var(--chart-2)] bg-[color:var(--chart-2)]/10">
                              <ArrowRight className="w-3 h-3" />Sin triaje
                            </Badge>
                          ) : (
                            badgePrioridad(c.prioridadTriage)
                          )}
                          {c.estado === 'asignando_medico' ? (
                            <Badge variant="outline" className="gap-1 text-xs border-[color:var(--chart-2)] text-white bg-[color:var(--chart-2)]">
                              Asignando
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {poolMedicos.length === 0 ? (
                      <select
                        className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm disabled:opacity-70"
                        disabled={asignandoId === String(c.idCita)}
                        onChange={(e) => {
                          if (e.target.value) handleAsignar(String(c.idCita), e.target.value, c.prioridadTriage ?? undefined);
                        }}
                        value=""
                      >
                        <option value="">Seleccionar médico…</option>
                        {[...medicosCatalogoPool.values()].map((m) => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {poolMedicos.map((m) => (
                          <Button
                            key={m.id}
                            variant="outline"
                            size="sm"
                            className="gap-1 border-[color:var(--brand-primary-strong)] text-[color:var(--brand-primary-strong)] hover:bg-[color:var(--brand-primary-strong)] hover:text-white"
                            disabled={asignandoId === String(c.idCita)}
                            onClick={() => handleAsignar(String(c.idCita), m.id, c.prioridadTriage ?? undefined)}
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            {m.nombre}
                          </Button>
                        ))}
                        <select
                          className="h-9 rounded-lg border border-input bg-background px-2 py-1 text-xs disabled:opacity-70"
                          disabled={asignandoId === String(c.idCita)}
                          onChange={(e) => {
                            if (e.target.value) handleAsignar(String(c.idCita), e.target.value, c.prioridadTriage ?? undefined);
                          }}
                          value=""
                        >
                          <option value="">Otro…</option>
                          {[...medicosCatalogoPool.values()]
                            .filter((m) => !pool.includes(String(m.id)))
                            .map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
