import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, MapPin, Stethoscope, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Cita, Paciente, Usuario } from '../../types';

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
  if (estado === 'completada') return { variant: 'secondary' as const, className: '' };
  if (estado === 'en_consulta' || estado === 'en_triage') return { variant: 'outline' as const, className: 'border-amber-300 text-amber-700' };
  return { variant: 'outline' as const, className: 'border-blue-300 text-blue-700' };
};

const initials = (name: string) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'P';
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
  return (a + b).toUpperCase();
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
}) {
  const [seleccionadaId, setSeleccionadaId] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setSeleccionadaId(citas[0]?.id || '');
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

  const seleccionada = useMemo(() => citas.find((c) => c.id === seleccionadaId) || null, [citas, seleccionadaId]);
  const paciente = useMemo(() => (seleccionada ? pacienteById.get(seleccionada.pacienteId) || null : null), [pacienteById, seleccionada]);
  const medicoNombre = useMemo(() => {
    if (!seleccionada?.medicoEncargado) return '';
    const u = usuarioById.get(String(seleccionada.medicoEncargado));
    return u?.nombre || String(seleccionada.medicoEncargado);
  }, [seleccionada?.medicoEncargado, usuarioById]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            {titulo}
          </DialogTitle>
          <DialogDescription>{subtitulo}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900">Citas ocupadas</div>
              <div className="max-h-[420px] overflow-auto">
                {citas.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-600">No hay citas ocupadas en este bloque.</div>
                ) : (
                  citas.map((c) => {
                  const p = pacienteById.get(c.pacienteId);
                  const isActive = c.id === seleccionadaId;
                  const badge = estadoBadge(c.estado);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSeleccionadaId(c.id)}
                      className={`flex w-full items-start justify-between gap-3 border-t px-4 py-3 text-left transition-colors ${
                        isActive ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                            {initials(p?.nombre || 'Paciente')}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">{p?.nombre || 'Paciente'}</div>
                            <div className="truncate text-xs text-gray-600">{p?.numeroExpediente || 'Sin expediente'}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{c.fecha} {c.hora}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.consultorio}</span>
                        </div>
                      </div>
                      <Badge variant={badge.variant} className={badge.className}>
                        {estadoLabel(c.estado)}
                      </Badge>
                    </button>
                  );
                })
                )}
              </div>
            </div>
          </div>

          <div className="sm:col-span-3">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900">Detalle</div>
              {!seleccionada ? (
                <div className="p-6 text-sm text-gray-600">Selecciona una cita para ver su información.</div>
              ) : (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <User className="h-4 w-4 text-blue-600" />
                        Paciente
                      </div>
                      <div className="mt-2 text-sm text-gray-900 font-semibold">{paciente?.nombre || 'Paciente'}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {paciente?.numeroExpediente || 'Sin expediente'} · {paciente?.telefono || 'Sin teléfono'}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">{paciente?.sexo || '—'} · {Number.isFinite(Number(paciente?.edad)) ? `${paciente?.edad} años` : '—'}</div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <CalendarClock className="h-4 w-4 text-blue-600" />
                        Cita
                      </div>
                      <div className="mt-2 text-sm text-gray-900 font-semibold">
                        {seleccionada.fecha} · {seleccionada.hora}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">ID: {seleccionada.id}</div>
                      <div className="mt-2">
                        <Badge {...estadoBadge(seleccionada.estado)}>{estadoLabel(seleccionada.estado)}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        Consultorio
                      </div>
                      <div className="mt-2 text-sm text-gray-900 font-semibold">{seleccionada.consultorio || '—'}</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Stethoscope className="h-4 w-4 text-blue-600" />
                        Doctor a cargo
                      </div>
                      <div className="mt-2 text-sm text-gray-900 font-semibold">{medicoNombre || '—'}</div>
                      <div className="mt-1 text-xs text-gray-600">Especialidad: {seleccionada.especialidad.replace('_', ' ')}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-900">Pago</div>
                    <div className="mt-2 text-sm text-gray-900 font-semibold">${seleccionada.costoPagado}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
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
    </Dialog>
  );
}
