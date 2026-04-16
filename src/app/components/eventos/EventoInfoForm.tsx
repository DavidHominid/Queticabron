import { Ciudad, Evento } from '../../types';

export function EventoInfoForm({
  value,
  onChange,
}: {
  value: Evento;
  onChange: (next: Evento) => void;
}) {
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
          >
            <option value="sonoyta">Sonoyta</option>
            <option value="puerto_penasco">Puerto Peñasco</option>
            <option value="otra">Otra</option>
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

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">Fecha de inicio de inscripciones</label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value.fechaInicioInscripcion || ''}
            onChange={(e) => onChange({ ...value, fechaInicioInscripcion: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">Fecha final de inscripciones</label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value.fechaFinInscripcion || value.fechaLimiteInscripcion || ''}
            onChange={(e) => onChange({ ...value, fechaFinInscripcion: e.target.value, fechaLimiteInscripcion: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">Fecha de inicio del evento</label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value.fechaInicio || ''}
            onChange={(e) => onChange({ ...value, fechaInicio: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">Fecha de finalización del evento</label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value.fechaFin || ''}
            onChange={(e) => onChange({ ...value, fechaFin: e.target.value })}
          />
        </div>
      </div>
    </section>
  );
}
