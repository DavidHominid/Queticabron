import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, MapPin, Stethoscope, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Cita, Evento, Paciente, Usuario } from '../../types';
import { CrearPacienteDialog } from '../pacientes/CrearPacienteDialog';
import { todayYmd } from '../../utils/clock';

const estadoLabel = (estado: Cita['estado']) =>
  (
    {
      programada: 'Programada',
      en_triage: 'En triage',
      en_consulta: 'En consulta',
      completada: 'Completada',
      cancelada: 'Cancelada',
      cedida: 'Cedida',
      no_asistio: 'No asistió',
    } as const
  )[estado] || estado;

const estadoBadge = (estado: Cita['estado']) => {
  if (estado === 'cancelada') return { variant: 'destructive' as const, className: '' };
  if (estado === 'completada') return { variant: 'default' as const, className: '' };
  if (estado === 'en_consulta' || estado === 'en_triage') return { variant: 'secondary' as const, className: '' };
  return { variant: 'outline' as const, className: 'bg-background' };
};

export function DetalleCitasBloqueDialog({
  open,
  onOpenChange,
  citas,
  pacientes,
  usuarios,
  titulo,
  subtitulo,
  primaryAction,
  evento,
  onCancelarCita,
  onRegistrarLlegada,
  onCederCita,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  citas: Cita[];
  pacientes: Paciente[];
  usuarios?: Usuario[];
  titulo: string;
  subtitulo: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  evento?: Evento | null;
  onCancelarCita?: (cita: Cita) => Promise<void> | void;
  onRegistrarLlegada?: (cita: Cita) => Promise<void> | void;
  onCederCita?: (cita: Cita, nuevoPaciente: Paciente) => Promise<void> | void;
}) {
  const [modoCeder, setModoCeder] = useState(false);
  const [cederQuery, setCederQuery] = useState('');
  const [cederPaciente, setCederPaciente] = useState<Paciente | null>(null);
  const [crearPacienteOpen, setCrearPacienteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModoCeder(false);
    setCederQuery('');
    setCederPaciente(null);
    setCrearPacienteOpen(false);
  }, [citas, open]);

  const pacienteById = useMemo(() => {
    const map = new Map<string, Paciente>();
    for (const p of pacientes) map.set(p.id, p);
    return map;
  }, [pacientes]);

  const usuarioById = useMemo(() => {
    const map = new Map<string, Usuario>();
    for (const u of usuarios || []) map.set(u.id, u);
    return map;
  }, [usuarios]);

  const seleccionada = useMemo(() => citas[0] || null, [citas]);
  const paciente = useMemo(() => (seleccionada ? pacienteById.get(seleccionada.pacienteId) || null : null), [pacienteById, seleccionada]);
  const medicoNombre = useMemo(() => {
    if (!seleccionada?.medicoEncargado) return '';
    const u = usuarioById.get(String(seleccionada.medicoEncargado));
    return u?.nombre || String(seleccionada.medicoEncargado);
  }, [seleccionada?.medicoEncargado, usuarioById]);

  const hoy = useMemo(() => todayYmd(), []);
  const fechaCita = useMemo(() => (seleccionada?.fecha ? String(seleccionada.fecha).substring(0, 10) : ''), [seleccionada?.fecha]);
  const esDiaDeCita = Boolean(fechaCita && fechaCita === hoy);
  const esFuturo = Boolean(fechaCita && fechaCita > hoy);

  const canCancelar = Boolean(
    seleccionada &&
      onCancelarCita &&
      seleccionada.estado !== 'cancelada' &&
      ((esDiaDeCita && !['completada'].includes(seleccionada.estado)) || esFuturo),
  );
  const canCeder = Boolean(seleccionada && onCederCita && seleccionada.estado !== 'cancelada' && esFuturo);
  const canLlegada = Boolean(
    seleccionada &&
      onRegistrarLlegada &&
      esDiaDeCita &&
      (seleccionada.estado === 'programada' || seleccionada.estado === 'cedida'),
  );

  const cederFiltrados = useMemo(() => {
    const q = String(cederQuery || '').trim().toLowerCase();
    if (!q) return pacientes.slice(0, 10);
    return pacientes
      .filter((p) => p.numeroExpediente.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q) || p.telefono.toLowerCase().includes(q))
      .slice(0, 12);
  }, [cederQuery, pacientes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[85vh] 2xl:max-w-7xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {titulo}
          </DialogTitle>
          <DialogDescription className="text-pretty">{subtitulo}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
          {!seleccionada ? (
            <div className="text-sm text-muted-foreground">No hay una cita seleccionada.</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <User className="h-4 w-4 text-primary" />
                        Paciente
                      </div>
                      <div className="mt-2 text-sm text-foreground font-semibold">{paciente?.nombre || 'Paciente'}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {paciente?.numeroExpediente || 'Sin expediente'} · {paciente?.telefono || 'Sin teléfono'}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {paciente?.sexo || '—'} · {Number.isFinite(Number(paciente?.edad)) ? `${paciente?.edad} años` : '—'}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        Cita
                      </div>
                      <div className="mt-2 text-sm text-foreground font-semibold">
                        {seleccionada.fecha} · {seleccionada.hora}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">ID: {seleccionada.id}</div>
                      <div className="mt-2">
                        <Badge {...estadoBadge(seleccionada.estado)}>{estadoLabel(seleccionada.estado)}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        Consultorio
                      </div>
                      <div className="mt-2 text-sm text-foreground font-semibold">{seleccionada.consultorio || '—'}</div>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        Doctor a cargo
                      </div>
                      <div className="mt-2 text-sm text-foreground font-semibold">{medicoNombre || '—'}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Especialidad: {seleccionada.especialidad.replace('_', ' ')}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <div className="text-sm font-medium text-foreground">Pago</div>
                    <div className="mt-2 text-sm text-foreground font-semibold">${seleccionada.costoPagado}</div>
                  </div>

                  {(onCancelarCita || onCederCita || onRegistrarLlegada) && (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="bg-muted/20 px-4 py-3 text-sm font-medium text-foreground">Acciones</div>
                      <div className="p-4 space-y-4">
                        {!esDiaDeCita && !esFuturo && (
                          <div className="text-sm text-muted-foreground">
                            Esta cita es de una fecha anterior. No se permiten cambios.
                          </div>
                        )}
                        {esDiaDeCita && (
                          <div className="text-sm text-muted-foreground">
                            En el día de la cita solo se permite cancelar o registrar llegada.
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={!canCancelar}
                            onClick={() => {
                              if (!seleccionada || !onCancelarCita) return;
                              setModoCeder(false);
                              onCancelarCita(seleccionada);
                            }}
                            className="w-full sm:w-auto"
                          >
                            Cancelar cita
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!canCeder}
                            onClick={() => {
                              if (!canCeder) return;
                              setModoCeder((p) => !p);
                              setCederPaciente(null);
                              setCederQuery('');
                            }}
                            className="w-full sm:w-auto"
                          >
                            Ceder cupo
                          </Button>
                          <Button
                            type="button"
                            disabled={!canLlegada}
                            onClick={() => {
                              if (!seleccionada || !onRegistrarLlegada) return;
                              setModoCeder(false);
                              onRegistrarLlegada(seleccionada);
                            }}
                            className="w-full sm:w-auto"
                          >
                            Registrar llegada
                          </Button>
                        </div>

                        {modoCeder && canCeder && (
                          <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                            <div className="text-sm font-medium text-foreground">Ceder a otro paciente</div>
                            <Input
                              value={cederQuery}
                              onChange={(e) => {
                                setCederQuery(e.target.value);
                                setCederPaciente(null);
                              }}
                              placeholder="Buscar por expediente, nombre o teléfono"
                            />
                            <div className="max-h-56 overflow-auto rounded-lg border border-border">
                              {cederFiltrados.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                              ) : (
                                cederFiltrados.map((p) => {
                                  const active = cederPaciente?.id === p.id;
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => setCederPaciente(p)}
                                      className={`flex w-full flex-col px-3 py-2 text-left text-sm transition-colors ${
                                        active ? 'bg-muted/40 ring-1 ring-inset ring-ring' : 'bg-background hover:bg-muted/30'
                                      }`}
                                    >
                                      <div className="font-medium text-foreground">{p.nombre}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {p.numeroExpediente} · {p.telefono}
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                              <Button type="button" variant="outline" onClick={() => setCrearPacienteOpen(true)}>
                                Registrar paciente
                              </Button>
                              <Button
                                type="button"
                                disabled={!cederPaciente}
                                onClick={() => {
                                  if (!seleccionada || !cederPaciente || !onCederCita) return;
                                  onCederCita(seleccionada, cederPaciente);
                                  setModoCeder(false);
                                  setCederPaciente(null);
                                  setCederQuery('');
                                }}
                              >
                                Confirmar cesión
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {primaryAction && (
            <Button type="button" onClick={primaryAction.onClick} disabled={Boolean(primaryAction.disabled)}>
              {primaryAction.label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <CrearPacienteDialog
        open={crearPacienteOpen}
        onOpenChange={(next) => setCrearPacienteOpen(next)}
        ciudadDefault={(evento?.ciudad as any) || undefined}
        onCreated={(p) => {
          setCederPaciente(p);
          setCederQuery(p.nombre);
          setModoCeder(true);
        }}
      />
    </Dialog>
  );
}
