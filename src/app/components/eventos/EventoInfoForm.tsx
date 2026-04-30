import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Ciudad, CiudadCatalogo, Evento, UserRole } from '../../types';
import { labelCiudad } from '../../utils/ciudades';
import { Calendar as CalendarUI } from '../ui/calendar';

const parseIsoToDate = (iso?: string | null) => {
  const v = String(iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const formatIsoToDmy = (iso?: string | null) => {
  const d = parseIsoToDate(iso);
  return d ? format(d, 'dd/MM/yyyy') : '—';
};

export function EventoInfoForm({
  value,
  onChange,
  ciudadesCatalogo,
  rolUsuario,
  ciudadBloqueada,
}: {
  value: Evento;
  onChange: (next: Evento) => void;
  ciudadesCatalogo: CiudadCatalogo[];
  rolUsuario?: UserRole;
  ciudadBloqueada?: Ciudad;
}) {
  const ciudadesDisponibles = (ciudadesCatalogo || []).filter((c) => c.activa);
  const bloqueada = Boolean(ciudadBloqueada && String(ciudadBloqueada).trim());
  const [rangoActivo, setRangoActivo] = useState<'inscripciones' | 'evento'>('inscripciones');
  const [mesesVisibles, setMesesVisibles] = useState(1);
  const mesActual = useMemo(() => startOfMonth(new Date()), []);

  useEffect(() => {
    const mqLg = window.matchMedia('(min-width: 1024px)');
    const mqMd = window.matchMedia('(min-width: 768px)');
    const apply = () => setMesesVisibles(mqLg.matches ? 4 : mqMd.matches ? 2 : 1);
    apply();
    mqLg.addEventListener('change', apply);
    mqMd.addEventListener('change', apply);
    return () => {
      mqLg.removeEventListener('change', apply);
      mqMd.removeEventListener('change', apply);
    };
  }, []);

  const rangoInscripciones: DateRange | undefined = useMemo(() => {
    const from = parseIsoToDate(value.fechaInicioInscripcion);
    const to = parseIsoToDate(value.fechaFinInscripcion || value.fechaLimiteInscripcion);
    if (!from && !to) return undefined;
    return { from, to };
  }, [value.fechaInicioInscripcion, value.fechaFinInscripcion, value.fechaLimiteInscripcion]);

  const rangoEvento: DateRange | undefined = useMemo(() => {
    const from = parseIsoToDate(value.fechaInicio);
    const to = parseIsoToDate(value.fechaFin);
    if (!from && !to) return undefined;
    return { from, to };
  }, [value.fechaInicio, value.fechaFin]);

  const selected = rangoActivo === 'inscripciones' ? rangoInscripciones : rangoEvento;
  return (
    <section className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b px-6 py-5">
        <h2 className="text-base font-semibold text-gray-900">Información del evento</h2>
      </div>
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">Nombre</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value.nombre}
            onChange={(e) => onChange({ ...value, nombre: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">Ciudad</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value.ciudad}
            onChange={(e) => onChange({ ...value, ciudad: e.target.value as Ciudad })}
            disabled={rolUsuario === 'recepcion' && bloqueada}
          >
            {rolUsuario === 'recepcion' && bloqueada ? (
              <option value={ciudadBloqueada}>{labelCiudad(ciudadBloqueada as any, ciudadesCatalogo)}</option>
            ) : (
              ciudadesDisponibles.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">Estado</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value.estado}
            onChange={(e) => onChange({ ...value, estado: e.target.value as Evento['estado'] })}
          >
            <option value="activo">Activo</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm ${rangoActivo === 'inscripciones' ? 'border-blue-600 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                onClick={() => setRangoActivo('inscripciones')}
              >
                <div className="font-semibold text-gray-900">Inscripciones</div>
                <div className="text-gray-600">
                  {formatIsoToDmy(value.fechaInicioInscripcion)} - {formatIsoToDmy(value.fechaFinInscripcion || value.fechaLimiteInscripcion)}
                </div>
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm ${rangoActivo === 'evento' ? 'border-blue-600 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                onClick={() => setRangoActivo('evento')}
              >
                <div className="font-semibold text-gray-900">Evento</div>
                <div className="text-gray-600">
                  {formatIsoToDmy(value.fechaInicio)} - {formatIsoToDmy(value.fechaFin)}
                </div>
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white">
              <CalendarUI
                mode="range"
                numberOfMonths={mesesVisibles}
                fromMonth={mesActual}
                selected={selected}
                onSelect={(range) => {
                  const fromIso = range?.from ? format(range.from, 'yyyy-MM-dd') : '';
                  const toIso = range?.to ? format(range.to, 'yyyy-MM-dd') : '';

                  if (rangoActivo === 'inscripciones') {
                    onChange({
                      ...value,
                      fechaInicioInscripcion: fromIso,
                      fechaFinInscripcion: toIso,
                      fechaLimiteInscripcion: toIso || fromIso,
                    });
                    return;
                  }

                  onChange({ ...value, fechaInicio: fromIso, fechaFin: toIso });
                }}
                locale={es}
                initialFocus
                className="p-2"
                modifiers={{
                  inscripciones: rangoInscripciones,
                  evento: rangoEvento,
                }}
                modifiersClassNames={{
                  inscripciones: 'bg-emerald-100 text-emerald-900',
                  evento: 'bg-sky-100 text-sky-900',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
