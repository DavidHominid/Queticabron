import { useEffect, useId, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Cita, Especialidad, Evento, HorarioDisponible, Paciente, TipoCitaEvento } from '../../types';
import { CrearPacienteDialog } from '../pacientes/CrearPacienteDialog';

const timeToMinutes = (t: string) => {
  const [hh, mm] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const minutesToHm = (m: number) => {
  const hh = Math.max(0, Math.floor(m / 60));
  const mm = Math.max(0, Math.floor(m % 60));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const computeDefaultCupo = (h: HorarioDisponible) => {
  const intervalo = Number.isFinite(Number(h.intervalo)) ? Number(h.intervalo) : 60;
  const dur = Math.max(0, timeToMinutes(h.horaFin) - timeToMinutes(h.horaInicio));
  return intervalo ? Math.floor(dur / intervalo) : 0;
};

export function AgendarCitaDialog({
  open,
  onOpenChange,
  evento,
  especialidad,
  horario,
  citas,
  pacientes,
  tipoCitaIdFijo,
  onAgendar,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  evento: Evento;
  especialidad: Especialidad;
  horario: HorarioDisponible;
  citas: Cita[];
  pacientes: Paciente[];
  tipoCitaIdFijo?: string;
  onAgendar: (payload: { paciente: Paciente; hora: string; tipoCita: TipoCitaEvento | null }) => Promise<void> | void;
}) {
  const [query, setQuery] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [tipoSeleccionadoId, setTipoSeleccionadoId] = useState<string>('');
  const [error, setError] = useState('');
  const errorId = useId();
  const [guardando, setGuardando] = useState(false);
  const [crearPacienteOpen, setCrearPacienteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setPacienteSeleccionado(null);
    setHoraSeleccionada('');
    setTipoSeleccionadoId('');
    setError('');
    setGuardando(false);
    setCrearPacienteOpen(false);
  }, [open]);

  const cupoTotal = useMemo(() => {
    const direct = Number.isFinite(Number(horario.cupoTotal)) ? Math.max(0, Math.floor(Number(horario.cupoTotal))) : 0;
    return direct || computeDefaultCupo(horario);
  }, [horario]);

  const intervalo = useMemo(() => {
    return Number.isFinite(Number(horario.intervalo)) ? Math.max(1, Math.floor(Number(horario.intervalo))) : 60;
  }, [horario]);

  const tiposCita = useMemo(() => {
    const espCfg = evento.especialidades?.find((e) => e.especialidad === especialidad);
    const list = Array.isArray((espCfg as any)?.tiposCita) ? ((espCfg as any).tiposCita as TipoCitaEvento[]) : [];
    return list
      .map((t) => ({
        ...t,
        id: t.id ? String(t.id) : undefined,
        nombre: String(t.nombre || ''),
        duracionMinutos: Number.isFinite(Number(t.duracionMinutos)) ? Math.max(5, Math.floor(Number(t.duracionMinutos))) : 60,
        precio: Number.isFinite(Number((t as any).precio)) ? Number((t as any).precio) : 0,
        medicoEncargado: String((t as any).medicoEncargado || ''),
      }))
      .filter((t) => t.nombre.trim());
  }, [especialidad, evento.especialidades]);

  const tipoSeleccionado = useMemo(() => {
    if (!tiposCita.length) return null;
    if (tipoCitaIdFijo && String(tipoCitaIdFijo).trim()) {
      return tiposCita.find((t) => String(t.id || '') === String(tipoCitaIdFijo)) || null;
    }
    const byId = tiposCita.find((t) => t.id && t.id === tipoSeleccionadoId) || null;
    return byId || tiposCita[0] || null;
  }, [tipoCitaIdFijo, tipoSeleccionadoId, tiposCita]);

  useEffect(() => {
    if (!open) return;
    if (!tiposCita.length) return;
    if (tipoCitaIdFijo && String(tipoCitaIdFijo).trim()) {
      setTipoSeleccionadoId(String(tipoCitaIdFijo));
      return;
    }
    setTipoSeleccionadoId((prev) => prev || String(tiposCita[0]?.id || ''));
  }, [open, tipoCitaIdFijo, tiposCita]);

  const duracionMinutos = useMemo(() => {
    const selected = tipoSeleccionado;
    if (selected?.duracionMinutos) return Math.max(5, Math.floor(Number(selected.duracionMinutos)));
    return intervalo;
  }, [intervalo, tipoSeleccionado]);

  const horasDisponibles = useMemo(() => {
    const inicio = timeToMinutes(horario.horaInicio);
    const fin = timeToMinutes(horario.horaFin);
    if (inicio >= fin) return [] as string[];

    const tipoId = String((horario as any).tipoCitaId || tipoCitaIdFijo || '').trim();
    const ocupada = (citas || []).some((c) => {
      if (c.eventoId !== evento.id) return false;
      if (c.especialidad !== especialidad) return false;
      if (c.fecha !== horario.dia) return false;
      if (c.estado === 'cancelada') return false;
      if (tipoId && String(c.tipoCitaId || '') !== tipoId) return false;
      const cs = timeToMinutes(c.hora);
      const cdur = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
      const ce = cs + cdur;
      return cs < fin && ce > inicio;
    });
    if (ocupada) return [] as string[];
    if (inicio + duracionMinutos > fin) return [] as string[];
    return [horario.horaInicio];
  }, [citas, duracionMinutos, especialidad, evento.id, horario.dia, horario.horaFin, horario.horaInicio, tipoCitaIdFijo]);

  useEffect(() => {
    if (!open) return;
    setHoraSeleccionada(horasDisponibles[0] || '');
  }, [horasDisponibles, open]);

  const pacientesOrdenados = useMemo(() => {
    return [...pacientes].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }));
  }, [pacientes]);

  const pacientesFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pacientesOrdenados;
    return pacientesOrdenados.filter((p) => {
      const exp = String(p.numeroExpediente || '').toLowerCase();
      const nom = String(p.nombre || '').toLowerCase();
      const tel = String(p.telefono || '').toLowerCase();
      return exp.includes(q) || nom.includes(q) || tel.includes(q);
    });
  }, [pacientesOrdenados, query]);

  const selectPaciente = (p: Paciente) => {
    setPacienteSeleccionado(p);
    setError('');
  };

  const submit = async () => {
    if (!pacienteSeleccionado) {
      setError('Selecciona un paciente.');
      return;
    }
    if (!horaSeleccionada) {
      setError('Este bloque ya no tiene cupos disponibles.');
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await onAgendar({ paciente: pacienteSeleccionado, hora: horaSeleccionada, tipoCita: tipoSeleccionado });
      onOpenChange(false);
    } catch (e: any) {
      const msg = typeof e?.message === 'string' && e.message.trim() ? e.message : 'No se pudo agendar la cita. Intenta nuevamente.';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Agendar cita</DialogTitle>
          <DialogDescription>{evento.nombre} · {horario.dia}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/10 px-4 py-3">
              <div className="text-xs text-muted-foreground">Horario</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {horario.horaInicio}-{horario.horaFin}
              </div>
            </div>
            <div className="rounded-xl border bg-muted/10 px-4 py-3">
              <div className="text-xs text-muted-foreground">Duración</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{duracionMinutos} min</div>
            </div>
          </div>

          {tiposCita.length > 0 && !(tipoCitaIdFijo && String(tipoCitaIdFijo).trim()) && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Tipo de cita</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                  value={tipoSeleccionado?.id || ''}
                  onChange={(e) => setTipoSeleccionadoId(e.target.value)}
                >
                  {tiposCita.map((t) => (
                    <option key={t.id || t.nombre} value={t.id || ''}>
                      {t.nombre} · {t.duracionMinutos} min · ${t.precio}
                    </option>
                  ))}
                </select>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  ${Number.isFinite(Number(tipoSeleccionado?.precio)) ? Number(tipoSeleccionado?.precio) : 0}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Paciente</div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPacienteSeleccionado(null);
                  }}
                  placeholder="Buscar por expediente, nombre o teléfono"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                />
                <Button type="button" variant="outline" className="sm:w-auto" onClick={() => setCrearPacienteOpen(true)}>
                  Registrar paciente
                </Button>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/20 px-4 py-3 text-xs font-semibold text-muted-foreground">
                  {pacientesFiltrados.length} pacientes
                </div>
                <div className="max-h-72 overflow-auto">
                  {pacientesFiltrados.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Sin resultados</div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-background">
                        <tr className="border-b border-border">
                          <th className="px-4 py-2 text-xs font-semibold text-muted-foreground">Expediente</th>
                          <th className="px-4 py-2 text-xs font-semibold text-muted-foreground">Paciente</th>
                          <th className="px-4 py-2 text-xs font-semibold text-muted-foreground">Teléfono</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pacientesFiltrados.map((p) => {
                          const selected = pacienteSeleccionado?.id === p.id;
                          return (
                            <tr
                              key={p.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => selectPaciente(p)}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter' && e.key !== ' ') return;
                                e.preventDefault();
                                selectPaciente(p);
                              }}
                              aria-selected={selected}
                              className={`border-b border-border transition-colors ${
                                selected ? 'bg-muted/40' : 'bg-background hover:bg-muted/20'
                              }`}
                            >
                              <td className="px-4 py-2 align-middle font-medium text-foreground">{p.numeroExpediente}</td>
                              <td className="px-4 py-2 align-middle text-foreground">{p.nombre}</td>
                              <td className="px-4 py-2 align-middle text-muted-foreground">{p.telefono}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {pacientes.length === 0 && <div className="text-sm text-muted-foreground">No hay pacientes cargados.</div>}
          </div>

          {error && (
            <div id={errorId} role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={guardando || !horaSeleccionada}>
            {guardando ? 'Agendando…' : 'Agendar cita'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <CrearPacienteDialog
        open={crearPacienteOpen}
        onOpenChange={(next) => setCrearPacienteOpen(next)}
        ciudadDefault={evento.ciudad}
        onCreated={(p) => {
          selectPaciente(p);
          setQuery(p.nombre);
        }}
      />
    </Dialog>
  );
}
