import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, Pencil } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AgendaGrid, AgendaSlotRow } from '../components/eventos/AgendaGrid';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useData } from '../context/DataContext';
import { Cita, Especialidad, Evento, HorarioDisponible } from '../types';

const especialidadLabel = (e: Especialidad) =>
  ({
    medicina_familiar: 'Medicina Familiar',
    pediatria: 'Pediatría',
    fisioterapia: 'Fisioterapia',
    vacunas: 'Vacunas',
    deteccion_cancer: 'Detección Oportuna de Cáncer',
    dentista: 'Dentista',
  })[e];

const listDaysInclusive = (start: string, end: string) => {
  if (!start || !end) return [] as string[];
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s.getTime() > e.getTime()) return [];
  const out: string[] = [];
  const cur = new Date(s);
  while (cur.getTime() <= e.getTime()) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

const timeToMinutes = (t: string) => {
  const [hh, mm] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const computeDefaultCupo = (h: HorarioDisponible) => {
  const intervalo = Number.isFinite(Number(h.intervalo)) ? Number(h.intervalo) : 60;
  const dur = Math.max(0, timeToMinutes(h.horaFin) - timeToMinutes(h.horaInicio));
  return intervalo ? Math.floor(dur / intervalo) : 0;
};

const countCitasInWindow = (citas: Cita[], eventoId: string, esp: Especialidad, day: string, start: string, end: string) => {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return citas.filter((c) => {
    if (c.eventoId !== eventoId) return false;
    if (c.especialidad !== esp) return false;
    if (c.fecha !== day) return false;
    const m = timeToMinutes(c.hora);
    return m >= s && m < e;
  }).length;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export function EventoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { eventos, citas, isInitialized } = useData();
  const [especialidad, setEspecialidad] = useState<Especialidad | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const evento = useMemo(() => eventos.find((e) => e.id === id) || null, [eventos, id]);

  useEffect(() => {
    if (!evento) return;
    if (!especialidad) {
      const first = evento.especialidades?.[0]?.especialidad;
      if (first) setEspecialidad(first);
    }
  }, [evento, especialidad]);

  useEffect(() => {
    if (!evento) return;
    if (desde && hasta) return;
    const days = listDaysInclusive(evento.fechaInicio || '', evento.fechaFin || '');
    const limited = days.slice(0, 7);
    if (limited.length) {
      setDesde(limited[0]);
      setHasta(limited[limited.length - 1]);
    }
  }, [evento, desde, hasta]);

  const days = useMemo(() => listDaysInclusive(desde, hasta), [desde, hasta]);

  const horarios = useMemo(() => {
    if (!evento || !especialidad) return [] as HorarioDisponible[];
    return evento.especialidades.find((e) => e.especialidad === especialidad)?.horarios || [];
  }, [evento, especialidad]);

  const slotRows = useMemo(() => {
    const map: Record<string, AgendaSlotRow> = {};
    for (const h of horarios) {
      const intervalo = Number.isFinite(Number(h.intervalo)) ? Number(h.intervalo) : 60;
      const key = `${h.horaInicio}|${h.horaFin}|${intervalo}`;
      map[key] = { key, horaInicio: h.horaInicio, horaFin: h.horaFin, intervalo };
    }
    return Object.values(map).sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));
  }, [horarios]);

  const cells = useMemo(() => {
    if (!evento || !especialidad) return {} as Record<string, { cupoTotal: number; cupoOcupado: number } | undefined>;
    const out: Record<string, { cupoTotal: number; cupoOcupado: number } | undefined> = {};
    for (const h of horarios) {
      if (!h.dia || !h.dia.includes('-')) continue;
      if (!days.includes(h.dia)) continue;
      const intervalo = Number.isFinite(Number(h.intervalo)) ? Number(h.intervalo) : 60;
      const rowKey = `${h.horaInicio}|${h.horaFin}|${intervalo}`;
      const cellKey = `${h.dia}|${rowKey}`;
      const cupoTotal = Number.isFinite(Number(h.cupoTotal)) ? Math.max(0, Math.floor(Number(h.cupoTotal))) : computeDefaultCupo(h);
      const cupoOcupado = countCitasInWindow(citas, evento.id, especialidad, h.dia, h.horaInicio, h.horaFin);
      out[cellKey] = { cupoTotal, cupoOcupado };
    }
    return out;
  }, [evento, especialidad, horarios, days, citas]);

  const onCreateOrEdit = (day: string, slotKey: string) => {
    if (!evento || !especialidad) return;
    const qp = new URLSearchParams({ especialidad, fecha: day, slot: slotKey });
    navigate(`/eventos/${evento.id}/editar?${qp.toString()}`);
  };

  if (isInitialized && !evento) {
    return (
      <DashboardLayout>
        <Card className="shadow-sm">
          <CardContent className="p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">Evento no encontrado</h2>
            <p className="mt-2 text-gray-600">El evento seleccionado no existe o fue eliminado.</p>
            <Button type="button" className="mt-6" onClick={() => navigate('/eventos')}>
              Volver a eventos
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button type="button" onClick={() => navigate('/eventos')} className="mb-3 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a eventos
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">{evento?.nombre || 'Evento'}</h1>
            <p className="mt-1 text-gray-600">Consulta la información general del evento y su agenda por especialidad.</p>
          </div>
          <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={() => (evento ? navigate(`/eventos/${evento.id}/editar`) : null)} disabled={!evento}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar evento
          </Button>
        </div>

        {!evento ? (
          <Card className="shadow-sm">
            <CardContent className="p-8">
              <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
              <div className="mt-4 h-24 animate-pulse rounded bg-gray-100" />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <Card className="shadow-sm lg:col-span-1">
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Información del evento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6 text-sm">
                  <div>
                    <div className="text-gray-500">Ciudad</div>
                    <div className="font-medium text-gray-900">{evento.ciudad}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Inscripciones</div>
                    <div className="font-medium text-gray-900">
                      {formatDate(evento.fechaInicioInscripcion)} - {formatDate(evento.fechaFinInscripcion || evento.fechaLimiteInscripcion)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Evento</div>
                    <div className="font-medium text-gray-900">
                      {formatDate(evento.fechaInicio)} - {formatDate(evento.fechaFin)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Estado</div>
                    <div className="font-medium capitalize text-gray-900">{evento.estado}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Especialidades</div>
                    <div className="font-medium text-gray-900">{evento.especialidades.length}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm lg:col-span-3">
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Agenda del evento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-900">Especialidad</label>
                      <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={especialidad}
                        onChange={(e) => setEspecialidad(e.target.value as Especialidad)}
                      >
                        <option value="">Selecciona…</option>
                        {evento.especialidades.map((esp) => (
                          <option key={esp.especialidad} value={esp.especialidad}>
                            {especialidadLabel(esp.especialidad)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-900">Desde</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        min={evento.fechaInicio || undefined}
                        max={evento.fechaFin || undefined}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-900">Hasta</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                        min={evento.fechaInicio || undefined}
                        max={evento.fechaFin || undefined}
                      />
                    </div>
                  </div>

                  {!especialidad ? (
                    <div className="text-sm text-gray-600">Selecciona una especialidad para visualizar la agenda.</div>
                  ) : days.length === 0 ? (
                    <div className="text-sm text-gray-600">Selecciona un rango de fechas válido.</div>
                  ) : slotRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
                      <CalendarDays className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                      <div className="text-sm text-gray-600">Esta especialidad aún no tiene horarios configurados.</div>
                    </div>
                  ) : (
                    <AgendaGrid days={days} slotRows={slotRows} cells={cells} onCreateOrEdit={onCreateOrEdit} />
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
