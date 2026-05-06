import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { Cita, EspecialidadCatalogo, EspecialidadEvento, TipoCitaEvento, Usuario } from '../../types';
import { Checkbox } from '../ui/checkbox';
import { ScheduleCalendarEditor } from './ScheduleCalendarEditor';
import { labelEspecialidad } from '../../utils/especialidades';
import { todayYmd } from '../../utils/clock';

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

const tipoPalette = [
  'var(--primary)',
  'var(--secondary)',
  'var(--brand-tertiary)',
  'var(--brand-soft-peach)',
  'var(--brand-primary-strong)',
  'var(--brand-secondary-strong)',
];

const labelUsuario = (u: Usuario) => `${u.nombre} (${u.rol})`;

const findUsuario = (usuarios: Usuario[], idOrName: string) => {
  if (!idOrName) return undefined;
  return usuarios.find((u) => u.id === idOrName) || usuarios.find((u) => u.nombre === idOrName);
};

const createTipoCita = (): TipoCitaEvento => ({
  id: `tmp${Date.now()}${Math.floor(Math.random() * 10000)}`,
  nombre: '',
  duracionMinutos: 60,
  precio: 0,
  medicoEncargado: '',
});

type TipoCitaDraft = {
  nombre: string;
  duracionHoras: string;
  precio: string;
  medicoEncargado: string;
};

const createTipoCitaDraft = (): TipoCitaDraft => ({
  nombre: '',
  duracionHoras: '1',
  precio: '0',
  medicoEncargado: '',
});

const formatHoras = (duracionMinutos: unknown) => {
  const m = Number(duracionMinutos);
  if (!Number.isFinite(m) || m <= 0) return '';
  const h = m / 60;
  const rounded = Math.round(h * 100) / 100;
  return String(rounded).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
};

const parseHorasToMinutos = (raw: string, fallback: number) => {
  const v = Number(String(raw).trim());
  if (!Number.isFinite(v)) return fallback;
  return Math.max(5, Math.round(v * 60));
};

const parsePrecio = (raw: string, fallback: number) => {
  const v = Number(String(raw).trim());
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.floor(v));
};

export function EspecialidadCardEditor({
  days,
  value,
  onChange,
  onRemove,
  usuarios,
  especialidadesCatalogo,
  modo,
  eventoId,
  citas,
}: {
  days: string[];
  value: EspecialidadEvento;
  onChange: (next: EspecialidadEvento) => void;
  onRemove: () => void;
  usuarios: Usuario[];
  especialidadesCatalogo?: EspecialidadCatalogo[];
  modo: 'config' | 'horarios';
  eventoId?: string;
  citas?: Cita[];
}) {
  const practicantesList = normalizePracticantes(value);
  const medicos = usuarios.filter((u) => u.rol === 'medico');
  const hoy = todayYmd();
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
  const triageUsers = usuarios.filter((u) => u.rol === 'triage').filter(esActivoEfectivo);
  const practicantesActual = practicantesList
    .map((idOrName) => findUsuario(usuarios, idOrName))
    .filter(Boolean) as Usuario[];
  const cuposRegistrados = (value.horarios || []).reduce((acc, horario) => {
    const cupo = Number.isFinite(Number(horario.cupoTotal)) ? Math.max(1, Math.floor(Number(horario.cupoTotal))) : 1;
    return acc + cupo;
  }, 0);

  const tiposCita = Array.isArray(value.tiposCita) ? value.tiposCita : [];
  const [tipoCitaIdActivo, setTipoCitaIdActivo] = useState<string>('');
  const [showNuevoTipo, setShowNuevoTipo] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState<TipoCitaDraft>(() => createTipoCitaDraft());
  const [editTipoKey, setEditTipoKey] = useState<string>('');
  const [editDraft, setEditDraft] = useState<TipoCitaDraft>(() => createTipoCitaDraft());

  const tiposCitaValidos = useMemo(
    () => tiposCita.filter((t) => t?.id && String(t.nombre || '').trim()).map((t) => ({ ...t, id: String(t.id) })),
    [tiposCita],
  );

  const tipoColorById = useMemo(() => {
    const map = new Map<string, string>();
    tiposCitaValidos.forEach((t, i) => map.set(String(t.id), tipoPalette[i % tipoPalette.length]));
    return map;
  }, [tiposCitaValidos]);

  useEffect(() => {
    if (!tiposCita.length) return;
    const first = tiposCita.find((t) => t?.id)?.id;
    if (!first) return;
    setTipoCitaIdActivo((prev) => (prev && tiposCita.some((t) => String(t?.id || '') === prev) ? prev : String(first)));
  }, [tiposCita]);

  useEffect(() => {
    if (!tiposCita.length) {
      setShowNuevoTipo(true);
    }
  }, [tiposCita.length]);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{labelEspecialidad(value.especialidad, especialidadesCatalogo)}</h3>
            <div className="text-sm text-muted-foreground">Cupos registrados: {cuposRegistrados}</div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/30 hover:text-destructive"
            aria-label="Eliminar especialidad"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {modo === 'config' ? (
        <div className="space-y-5 p-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Consultorio</label>
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
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

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-foreground">Tipos de cita</div>
              <button
                type="button"
                onClick={() => setShowNuevoTipo((v) => !v)}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/30"
              >
                {showNuevoTipo ? 'Ocultar' : 'Agregar tipo'}
              </button>
            </div>

            {showNuevoTipo && (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="text-sm font-semibold text-foreground">Nuevo tipo de cita</div>
                <div className="mt-3 grid grid-cols-1 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground">Nombre</label>
                    <input
                      value={nuevoTipo.nombre}
                      onChange={(e) => setNuevoTipo((prev) => ({ ...prev, nombre: e.target.value }))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                      placeholder="Ej. Limpieza"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground">Duración (horas)</label>
                      <input
                        inputMode="decimal"
                        value={nuevoTipo.duracionHoras}
                        onChange={(e) => setNuevoTipo((prev) => ({ ...prev, duracionHoras: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                        placeholder="Ej. 1"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground">Precio</label>
                      <input
                        inputMode="numeric"
                        value={nuevoTipo.precio}
                        onChange={(e) => setNuevoTipo((prev) => ({ ...prev, precio: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground">Médico encargado</label>
                    <select
                      className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                      value={nuevoTipo.medicoEncargado}
                      onChange={(e) => setNuevoTipo((prev) => ({ ...prev, medicoEncargado: e.target.value }))}
                    >
                      <option value="">Sin médico</option>
                      {medicosRecomendados.map((u) => (
                        <option key={u.id} value={u.id}>
                          {labelUsuario(u)}
                        </option>
                      ))}
                    </select>
                    {medicosRecomendados.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No hay médicos con esta especialidad asignada. Asigna especialidades en “Usuarios” para poder seleccionarlos aquí.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!nuevoTipo.nombre.trim()}
                      onClick={() => {
                        const base = createTipoCita();
                        const duracionMinutos = parseHorasToMinutos(nuevoTipo.duracionHoras, 60);
                        const precio = parsePrecio(nuevoTipo.precio, 0);
                        onChange({
                          ...value,
                          tiposCita: [
                            ...tiposCita,
                            { ...base, nombre: nuevoTipo.nombre, duracionMinutos, precio, medicoEncargado: nuevoTipo.medicoEncargado },
                          ],
                        });
                        setNuevoTipo(createTipoCitaDraft());
                        setShowNuevoTipo(false);
                      }}
                      className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition enabled:hover:bg-primary/90 disabled:opacity-50"
                    >
                      Crear tipo
                    </button>
                    <button
                      type="button"
                      onClick={() => setNuevoTipo(createTipoCitaDraft())}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/30"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tiposCita.length === 0 ? (
              <div className="text-sm text-muted-foreground">Agrega al menos un tipo (ej. Limpieza, Extracción, Relleno).</div>
            ) : (
              <div className="space-y-3">
                {tiposCita.map((t, idx) => {
                  const tipoKey = String(t?.id || `idx-${idx}`);
                  const isEditing = editTipoKey === tipoKey;
                  const medicoTipoActual = findUsuario(usuarios, String(t?.medicoEncargado || ''));
                  const medicoLabel = medicoTipoActual ? labelUsuario(medicoTipoActual) : String(t?.medicoEncargado || '').trim();
                  return (
                    <div key={tipoKey} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-foreground">{String(t?.nombre || '').trim() ? String(t.nombre).trim() : `Tipo ${idx + 1}`}</div>
                          {!isEditing && (
                            <div className="mt-1 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">{formatHoras(t?.duracionMinutos) || '1'} h</span> ·{' '}
                              <span className="font-medium text-foreground">${Number.isFinite(Number(t?.precio)) ? Number(t?.precio) : 0}</span> ·{' '}
                              <span className="text-muted-foreground">{medicoLabel ? medicoLabel : 'Sin médico'}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const index = tiposCita.findIndex((item, i) => String(item?.id || `idx-${i}`) === editTipoKey);
                                  if (index < 0) {
                                    setEditTipoKey('');
                                    return;
                                  }
                                  const current = tiposCita[index] || ({} as TipoCitaEvento);
                                  const duracionMinutos = parseHorasToMinutos(editDraft.duracionHoras, Number(current?.duracionMinutos) || 60);
                                  const precio = parsePrecio(editDraft.precio, Number(current?.precio) || 0);
                                  const next = tiposCita.map((item, i) =>
                                    i === index
                                      ? { ...item, nombre: editDraft.nombre, duracionMinutos, precio, medicoEncargado: editDraft.medicoEncargado }
                                      : item,
                                  );
                                  onChange({ ...value, tiposCita: next });
                                  setEditTipoKey('');
                                }}
                                className="rounded-md p-2 text-muted-foreground hover:bg-muted/30 hover:text-primary"
                                aria-label="Guardar cambios"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditTipoKey('')}
                                className="rounded-md p-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                aria-label="Cancelar edición"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditTipoKey(tipoKey);
                                setEditDraft({
                                  nombre: String(t?.nombre || ''),
                                  duracionHoras: formatHoras(t?.duracionMinutos) || '1',
                                  precio: String(Number.isFinite(Number(t?.precio)) ? Number(t?.precio) : 0),
                                  medicoEncargado: String(medicoTipoActual?.id || String(t?.medicoEncargado || '')),
                                });
                              }}
                              className="rounded-md p-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                              aria-label="Editar tipo de cita"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onChange({ ...value, tiposCita: tiposCita.filter((_, i) => i !== idx) });
                              if (editTipoKey === tipoKey) setEditTipoKey('');
                            }}
                            className="rounded-md p-2 text-muted-foreground hover:bg-muted/30 hover:text-destructive"
                            aria-label="Eliminar tipo de cita"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mt-4 grid grid-cols-1 gap-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-foreground">Nombre</label>
                            <input
                              value={editDraft.nombre}
                              onChange={(e) => setEditDraft((prev) => ({ ...prev, nombre: e.target.value }))}
                              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                              placeholder="Ej. Limpieza"
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-2">
                              <label className="text-sm font-semibold text-foreground">Duración (horas)</label>
                              <input
                                inputMode="decimal"
                                value={editDraft.duracionHoras}
                                onChange={(e) => setEditDraft((prev) => ({ ...prev, duracionHoras: e.target.value }))}
                                className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-sm font-semibold text-foreground">Precio</label>
                              <input
                                inputMode="numeric"
                                value={editDraft.precio}
                                onChange={(e) => setEditDraft((prev) => ({ ...prev, precio: e.target.value }))}
                                className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-foreground">Médico encargado</label>
                            <select
                              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                              value={editDraft.medicoEncargado}
                              onChange={(e) => setEditDraft((prev) => ({ ...prev, medicoEncargado: e.target.value }))}
                            >
                              <option value="">Sin médico</option>
                              {t?.medicoEncargado && !medicoTipoActual && <option value={t.medicoEncargado}>Actual: {t.medicoEncargado}</option>}
                              {medicosRecomendados.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {labelUsuario(u)}
                                </option>
                              ))}
                            </select>
                            {medicosRecomendados.length === 0 && (
                              <div className="text-sm text-muted-foreground">
                                No hay médicos con esta especialidad asignada. Asigna especialidades en “Usuarios” para poder seleccionarlos aquí.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="text-sm font-medium text-foreground">Practicantes</div>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {triageUsers.map((u) => {
                const checked = practicantesList.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        const isOn = Boolean(next);
                        const base = practicantesList.filter(Boolean);
                        const updated = isOn ? Array.from(new Set([...base, u.id])) : base.filter((id) => id !== u.id);
                        onChange({ ...value, practicantes: updated });
                      }}
                    />
                    <span className="truncate">{labelUsuario(u)}</span>
                  </label>
                );
              })}
              {triageUsers.length === 0 && <div className="text-sm text-muted-foreground">No hay usuarios de triage.</div>}
            </div>
            {practicantesActual.length > 0 && (
              <div className="text-xs text-muted-foreground/70">Seleccionados: {practicantesActual.map((p) => p.nombre).join(', ')}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            {tiposCitaValidos.length > 0 && (
              <aside className="h-fit rounded-xl border border-border bg-muted/20 p-4 lg:sticky lg:top-4">
                <div className="text-sm font-medium text-foreground">Tipos de cita</div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {tiposCitaValidos.map((t) => {
                    const id = String(t.id);
                    const selected = String(tipoCitaIdActivo || '') === id;
                    const color = tipoColorById.get(id) || 'var(--primary)';
                    const selectedTextColor =
                      color === 'var(--brand-soft-peach)' ? 'var(--accent-foreground)' : 'var(--primary-foreground)';
                    const secondaryTextColor = selected ? 'rgba(255,255,255,0.9)' : 'var(--muted-foreground)';
                    const durH = formatHoras(t.duracionMinutos) || '1';
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTipoCitaIdActivo(id)}
                        className="rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                        style={{
                          borderColor: color,
                          backgroundColor: selected ? color : 'var(--card)',
                          color: selected ? selectedTextColor : 'var(--foreground)',
                        }}
                      >
                        <div className="text-sm font-semibold">{String(t.nombre).trim()}</div>
                        <div style={{ color: secondaryTextColor }} className="mt-1 text-xs">
                          {durH} h · ${Number.isFinite(Number(t.precio)) ? Number(t.precio) : 0}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>
            )}
            <div className="min-w-0">
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
                tiposCita={tiposCita}
                tipoCitaIdActivo={tipoCitaIdActivo}
                eventoId={eventoId}
                especialidad={value.especialidad}
                citas={citas || []}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
