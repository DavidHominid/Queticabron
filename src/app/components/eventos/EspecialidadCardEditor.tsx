import { Trash2 } from 'lucide-react';
import { Cita, EspecialidadCatalogo, EspecialidadEvento, Usuario } from '../../types';
import { Checkbox } from '../ui/checkbox';
import { ScheduleCalendarEditor } from './ScheduleCalendarEditor';
import { labelEspecialidad } from '../../utils/especialidades';

const normalizePracticantes = (value: EspecialidadEvento): string[] => {
  const anyValue = value as unknown as { practicante?: string; practicantes?: unknown };
  if (Array.isArray(anyValue.practicantes)) {
    return (anyValue.practicantes as unknown[]).map((p) => String(p)).filter(Boolean);
  }
  if (typeof anyValue.practicante === 'string' && anyValue.practicante.trim()) {
    return [anyValue.practicante.trim()];
  }
  return [];
};

const consultorioOptions = [
  'Consultorio 1',
  'Consultorio 2',
  'Consultorio 3',
  'Consultorio 4',
  'Consultorio 5',
  'Consultorio 6',
  'Consultorio 7',
  'Consultorio 8',
  'Dentista',
];

const labelUsuario = (u: Usuario) => `${u.nombre} (${u.rol})`;

const findUsuario = (usuarios: Usuario[], idOrName: string) => {
  if (!idOrName) return undefined;
  return usuarios.find((u) => u.id === idOrName) || usuarios.find((u) => u.nombre === idOrName);
};

export function EspecialidadCardEditor({
  days,
  value,
  onChange,
  onRemove,
  usuarios,
  especialidadesCatalogo,
  eventoId,
  citas,
}: {
  days: string[];
  value: EspecialidadEvento;
  onChange: (next: EspecialidadEvento) => void;
  onRemove: () => void;
  usuarios: Usuario[];
  especialidadesCatalogo?: EspecialidadCatalogo[];
  eventoId?: string;
  citas?: Cita[];
}) {
  const practicantesList = normalizePracticantes(value);
  const medicos = usuarios.filter((u) => u.rol === 'medico');
  const hoy = new Date().toISOString().slice(0, 10);
  const esActivoEfectivo = (u: Usuario) => {
    if ((u as any).activo === false) return false;
    const desde = (u as any).activoDesde ? String((u as any).activoDesde) : '';
    const hasta = (u as any).activoHasta ? String((u as any).activoHasta) : '';
    if (desde && desde > hoy) return false;
    if (hasta && hasta < hoy) return false;
    return true;
  };
  const medicoMatchesEspecialidad = (u: Usuario) => {
    const list = Array.isArray(u.especialidades) ? u.especialidades : u.especialidad ? [u.especialidad] : [];
    return list.includes(value.especialidad);
  };
  const medicosRecomendados = medicos.filter(medicoMatchesEspecialidad);
  const medicosOtros = medicos.filter((u) => !medicoMatchesEspecialidad(u));
  const triageUsers = usuarios.filter((u) => u.rol === 'triage').filter(esActivoEfectivo);
  const medicoActual = findUsuario(usuarios, value.medicoEncargado);
  const practicantesActual = practicantesList
    .map((idOrName) => findUsuario(usuarios, idOrName))
    .filter(Boolean) as Usuario[];
  const cuposRegistrados = (value.horarios || []).reduce((acc, horario) => {
    const cupo = Number.isFinite(Number(horario.cupoTotal)) ? Math.max(1, Math.floor(Number(horario.cupoTotal))) : 1;
    return acc + cupo;
  }, 0);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900">{labelEspecialidad(value.especialidad, especialidadesCatalogo)}</h3>
            <div className="text-sm text-gray-600">Cupos registrados: {cuposRegistrados}</div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-red-600"
            aria-label="Eliminar especialidad"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-1">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900">Médico encargado</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={medicoActual?.id || value.medicoEncargado || ''}
              onChange={(e) => onChange({ ...value, medicoEncargado: e.target.value })}
            >
              <option value="">Selecciona un médico</option>
              {value.medicoEncargado && !medicoActual && <option value={value.medicoEncargado}>Actual: {value.medicoEncargado}</option>}
              {medicosRecomendados.length > 0 && (
                <optgroup label="Recomendados">
                  {medicosRecomendados.map((u) => (
                    <option key={u.id} value={u.id}>
                      {labelUsuario(u)}
                    </option>
                  ))}
                </optgroup>
              )}
              {medicosOtros.length > 0 && (
                <optgroup label="Otros">
                  {medicosOtros.map((u) => (
                    <option key={u.id} value={u.id}>
                      {labelUsuario(u)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {medicosRecomendados.length === 0 && (
              <div className="text-xs text-amber-700">
                No hay médicos con esta especialidad asignada. Puedes seleccionar cualquier médico o asignar especialidades en “Usuarios”.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900">Consultorio</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={value.consultorio || ''}
              onChange={(e) => onChange({ ...value, consultorio: e.target.value })}
            >
              <option value="">Selecciona un consultorio</option>
              {value.consultorio && !consultorioOptions.includes(value.consultorio) && <option value={value.consultorio}>Actual: {value.consultorio}</option>}
              {consultorioOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900">Costo</label>
            <input
              type="number"
              min={0}
              step={1}
              value={value.costo}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ ...value, costo: Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0 });
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-900">Practicantes</div>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {triageUsers.map((u) => {
                const checked = practicantesList.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        const isOn = Boolean(next);
                        const base = practicantesList.filter(Boolean);
                        const updated = isOn
                          ? Array.from(new Set([...base, u.id]))
                          : base.filter((id) => id !== u.id);
                        onChange({ ...value, practicantes: updated });
                      }}
                    />
                    <span className="truncate">{labelUsuario(u)}</span>
                  </label>
                );
              })}
              {triageUsers.length === 0 && <div className="text-sm text-gray-500">No hay usuarios de triage.</div>}
            </div>
            {practicantesActual.length > 0 && (
              <div className="text-xs text-gray-500">Seleccionados: {practicantesActual.map((p) => p.nombre).join(', ')}</div>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="text-sm text-gray-600">
            Selecciona, arrastra o redimensiona bloques para registrar horarios de la especialidad.
          </div>
          <ScheduleCalendarEditor
            startDate={days[0] || ''}
            endDate={days[days.length - 1] || ''}
            value={(value.horarios || []).map((h: any) => ({
              ...h,
              intervalo: Number.isFinite(Number(h.intervalo)) ? Number(h.intervalo) : 60,
              cupoTotal: Number.isFinite(Number(h.cupoTotal)) ? Math.max(1, Math.floor(Number(h.cupoTotal))) : 1,
            }))}
            onChange={(next) => onChange({ ...value, horarios: next })}
            defaultIntervalo={(value.horarios?.[0]?.intervalo as number) || 60}
            eventoId={eventoId}
            especialidad={value.especialidad}
            citas={citas || []}
          />
        </div>
      </div>
    </section>
  );
}
