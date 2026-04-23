import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Cita, Especialidad, Evento, HorarioDisponible, Paciente } from '../../types';

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
  onAgendar,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  evento: Evento;
  especialidad: Especialidad;
  horario: HorarioDisponible;
  citas: Cita[];
  pacientes: Paciente[];
  onAgendar: (payload: { paciente: Paciente; hora: string }) => Promise<void> | void;
}) {
  const [query, setQuery] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [comboAbierto, setComboAbierto] = useState(false);
  const [comboActivoIdx, setComboActivoIdx] = useState<number>(-1);
  const comboRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setPacienteSeleccionado(null);
    setHoraSeleccionada('');
    setError('');
    setGuardando(false);
    setComboAbierto(false);
    setComboActivoIdx(-1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (ev: MouseEvent) => {
      const el = comboRef.current;
      if (!el) return;
      if (ev.target instanceof Node && el.contains(ev.target)) return;
      closeCombo();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const cupoTotal = useMemo(() => {
    const direct = Number.isFinite(Number(horario.cupoTotal)) ? Math.max(0, Math.floor(Number(horario.cupoTotal))) : 0;
    return direct || computeDefaultCupo(horario);
  }, [horario]);

  const intervalo = useMemo(() => {
    return Number.isFinite(Number(horario.intervalo)) ? Math.max(1, Math.floor(Number(horario.intervalo))) : 60;
  }, [horario]);

  const horasDisponibles = useMemo(() => {
    const inicio = timeToMinutes(horario.horaInicio);
    const fin = timeToMinutes(horario.horaFin);
    const totalSlots = Math.max(0, cupoTotal);
    if (inicio >= fin || !totalSlots) return [] as string[];

    const generated: string[] = [];
    for (let m = inicio; m < fin; m += intervalo) {
      generated.push(minutesToHm(m));
    }
    const sliced = generated.length > totalSlots ? generated.slice(0, totalSlots) : generated;

    const ocupadas = new Set(
      citas
        .filter((c) => c.eventoId === evento.id && c.especialidad === especialidad && c.fecha === horario.dia && c.estado !== 'cancelada')
        .map((c) => c.hora),
    );

    return sliced.filter((h) => !ocupadas.has(h));
  }, [citas, cupoTotal, especialidad, evento.id, horario.dia, horario.horaFin, horario.horaInicio, intervalo]);

  useEffect(() => {
    if (!open) return;
    setHoraSeleccionada(horasDisponibles[0] || '');
  }, [horasDisponibles, open]);

  const pacientesFiltrados = useMemo(() => {
    const effectiveQuery = pacienteSeleccionado && query === pacienteSeleccionado.nombre ? '' : query;
    const q = effectiveQuery.trim().toLowerCase();
    if (!q) return pacientes.slice(0, 8);
    return pacientes
      .filter((p) => p.numeroExpediente.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q) || p.telefono.toLowerCase().includes(q))
      .slice(0, 12);
  }, [pacienteSeleccionado, pacientes, query]);

  const openCombo = () => {
    setComboAbierto(true);
    setComboActivoIdx(-1);
  };

  const closeCombo = () => {
    setComboAbierto(false);
    setComboActivoIdx(-1);
  };

  const selectPaciente = (p: Paciente) => {
    setPacienteSeleccionado(p);
    setQuery(p.nombre);
    closeCombo();
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
      await onAgendar({ paciente: pacienteSeleccionado, hora: horaSeleccionada });
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar cita</DialogTitle>
          <DialogDescription>
            {evento.nombre} · {horario.dia} · {horario.horaInicio}-{horario.horaFin}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">Paciente</div>
            <div ref={comboRef} className="relative">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPacienteSeleccionado(null);
                  openCombo();
                }}
                onFocus={() => openCombo()}
                onClick={() => openCombo()}
                onBlur={() => {
                  window.setTimeout(() => closeCombo(), 120);
                }}
                onKeyDown={(e) => {
                  if (!comboAbierto && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                    openCombo();
                    return;
                  }

                  if (!comboAbierto) return;

                  if (e.key === 'Escape') {
                    e.preventDefault();
                    closeCombo();
                    return;
                  }

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setComboActivoIdx((idx) => {
                      const next = Math.min(pacientesFiltrados.length - 1, idx + 1);
                      return Number.isFinite(next) ? next : -1;
                    });
                    return;
                  }

                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setComboActivoIdx((idx) => {
                      const next = Math.max(-1, idx - 1);
                      return Number.isFinite(next) ? next : -1;
                    });
                    return;
                  }

                  if (e.key === 'Enter') {
                    if (comboActivoIdx < 0) return;
                    const chosen = pacientesFiltrados[comboActivoIdx];
                    if (!chosen) return;
                    e.preventDefault();
                    selectPaciente(chosen);
                  }
                }}
                placeholder="Buscar por expediente, nombre o teléfono"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                role="combobox"
                aria-expanded={comboAbierto}
                aria-autocomplete="list"
              />

              {comboAbierto && (
                <div
                  className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                  role="listbox"
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                >
                  {pacientesFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-600">Sin resultados</div>
                  ) : (
                    pacientesFiltrados.map((p, idx) => {
                      const isSelected = pacienteSeleccionado?.id === p.id;
                      const isActive = comboActivoIdx === idx;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectPaciente(p)}
                          className={`flex w-full flex-col px-3 py-2 text-left text-sm transition-colors ${
                            isActive ? 'bg-gray-100' : 'bg-white'
                          } ${isSelected ? 'ring-1 ring-inset ring-blue-600' : ''} hover:bg-gray-50`}
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => setComboActivoIdx(idx)}
                        >
                          <div className="font-medium text-gray-900">{p.nombre}</div>
                          <div className="text-xs text-gray-600">{p.numeroExpediente} · {p.telefono}</div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {pacientes.length === 0 && <div className="text-sm text-gray-600">No hay pacientes cargados.</div>}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={guardando || !horaSeleccionada}>
            {guardando ? 'Agendando…' : 'Agendar cita'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
