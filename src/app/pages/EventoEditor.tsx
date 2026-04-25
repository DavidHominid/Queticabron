import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { DashboardLayout } from '../components/DashboardLayout';
import { EspecialidadCardEditor } from '../components/eventos/EspecialidadCardEditor';
import { EventoInfoForm } from '../components/eventos/EventoInfoForm';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Ciudad, Especialidad, EspecialidadEvento, Evento } from '../types';
import { labelEspecialidad } from '../utils/especialidades';

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

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeWeekday = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const weekdayEs = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(d);
};

const timeToMinutes = (t: string) => {
  const [hh, mm] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const normalizeHorarios = (horarios: any[], daysLocal: string[]) => {
  const out: Array<{ dia: string; horaInicio: string; horaFin: string; intervalo: number; cupoTotal: number }> = [];

  for (const raw of horarios || []) {
    const intervalo = Number.isFinite(Number(raw?.intervalo)) ? Math.max(1, Math.floor(Number(raw.intervalo))) : 60;
    const diaRaw = String(raw?.dia || '').trim();
    const horaInicio = String(raw?.horaInicio || '').trim();
    const horaFin = String(raw?.horaFin || '').trim();
    if (!diaRaw || !horaInicio || !horaFin) continue;

    const durationHours = Math.max(1, Math.floor((timeToMinutes(horaFin) - timeToMinutes(horaInicio)) / 60) || 1);
    const cupoTotal = Number.isFinite(Number(raw?.cupoTotal)) ? Math.max(1, Math.floor(Number(raw.cupoTotal))) : durationHours;

    if (isIsoDate(diaRaw)) {
      if (!daysLocal.length || daysLocal.includes(diaRaw)) {
        out.push({ dia: diaRaw, horaInicio, horaFin, intervalo, cupoTotal });
      }
      continue;
    }

    const target = normalizeWeekday(diaRaw);
    if (!target || !daysLocal.length) continue;
    for (const day of daysLocal) {
      if (normalizeWeekday(weekdayEs(day)) === target) {
        out.push({ dia: day, horaInicio, horaFin, intervalo, cupoTotal });
      }
    }
  }

  const dedup: Record<string, (typeof out)[number]> = {};
  for (const h of out) {
    dedup[`${h.dia}|${h.horaInicio}|${h.horaFin}|${h.intervalo}`] = h;
  }
  return Object.values(dedup);
};

const emptyEvento = (ciudad: Ciudad): Evento => ({
  id: `evt${Date.now()}`,
  nombre: '',
  ciudad,
  fechaInicioInscripcion: '',
  fechaFinInscripcion: '',
  fechaInicio: '',
  fechaFin: '',
  fechaLimiteInscripcion: '',
  especialidades: [],
  estado: 'activo',
});

const createEspecialidad = (especialidad: Especialidad): EspecialidadEvento => ({
  especialidad,
  medicoEncargado: '',
  practicantes: [],
  consultorio: '',
  horarios: [],
  costo: 0,
});

const isEventoFinalizado = (fechaFin?: string | null) => {
  if (!fechaFin) return false;
  const end = new Date(`${fechaFin}T23:59:59`);
  if (Number.isNaN(end.getTime())) return false;
  return Date.now() > end.getTime();
};

export function EventoEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { eventos, usuarios, citas, especialidadesCatalogo, ciudadesCatalogo, addEvento, updateEvento, addRegistroAuditoria } = useData();

  const eventoOriginal = useMemo(() => (isEdit && id ? eventos.find((e) => e.id === id) || null : null), [eventos, id, isEdit]);
  const bloqueado = useMemo(() => isEventoFinalizado(eventoOriginal?.fechaFin || null), [eventoOriginal?.fechaFin]);

  const ciudadDefault =
    (user?.rol === 'recepcion' ? (user?.ciudad || '') : '') ||
    (Array.isArray((user as any)?.ciudades) ? (user as any).ciudades[0] : '') ||
    (ciudadesCatalogo || []).find((c) => c.activa)?.codigo ||
    'sonoyta';
  const [form, setForm] = useState<Evento>(() => emptyEvento(ciudadDefault as Ciudad));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeEspecialidad, setActiveEspecialidad] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (!isEdit) return;
    const found = eventos.find((e) => e.id === id);
    if (!found) return;

    const daysLocal = listDaysInclusive(found.fechaInicio || '', found.fechaFin || '');
    const especialidades = (found.especialidades || []).map((esp) => ({
      ...esp,
      practicantes: Array.isArray((esp as any).practicantes)
        ? (esp as any).practicantes
        : typeof (esp as any).practicante === 'string' && (esp as any).practicante.trim()
          ? [(esp as any).practicante.trim()]
          : [],
      horarios: normalizeHorarios(esp.horarios || [], daysLocal),
    }));

    setForm({
      ...found,
      fechaInicioInscripcion: found.fechaInicioInscripcion || '',
      fechaFinInscripcion: found.fechaFinInscripcion || found.fechaLimiteInscripcion || '',
      fechaLimiteInscripcion: found.fechaFinInscripcion || found.fechaLimiteInscripcion || '',
      especialidades,
    });
    setActiveEspecialidad(especialidades[0]?.especialidad || '');
    setCurrentStep(1);
  }, [eventos, id, isEdit]);

  const days = useMemo(() => listDaysInclusive(form.fechaInicio, form.fechaFin), [form.fechaInicio, form.fechaFin]);
  const especialidadesOptions = useMemo(
    () =>
      (especialidadesCatalogo || [])
        .filter((e) => e.activa)
        .map((e) => ({ value: e.codigo as Especialidad, label: e.nombre })),
    [especialidadesCatalogo],
  );

  const qp = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return {
      especialidad: sp.get('especialidad') || '',
      fecha: sp.get('fecha') || '',
      slot: sp.get('slot') || '',
    };
  }, [location.search]);

  useEffect(() => {
    if (!qp.especialidad || !qp.fecha || !qp.slot) return;
    if (!qp.fecha.includes('-')) return;
    if (days.length && !days.includes(qp.fecha)) return;

    const esp = qp.especialidad as Especialidad;

    const [horaInicio, horaFin, intervaloRaw] = qp.slot.split('|');
    const intervalo = Number(intervaloRaw);
    if (!horaInicio || !horaFin) return;
    const safeIntervalo = Number.isFinite(intervalo) ? Math.max(1, Math.floor(intervalo)) : 60;
    const durationHours = Math.max(1, Math.floor((timeToMinutes(horaFin) - timeToMinutes(horaInicio)) / 60) || 1);

    setForm((prev) => {
      const idx = prev.especialidades.findIndex((e) => e.especialidad === esp);
      const current = idx >= 0 ? prev.especialidades[idx] : createEspecialidad(esp);
      const exists = (current.horarios || []).some(
        (h) => h.dia === qp.fecha && h.horaInicio === horaInicio && h.horaFin === horaFin && (h.intervalo ?? 60) === safeIntervalo,
      );
      const merged = {
        ...current,
        horarios: exists
          ? current.horarios
          : [
              ...(current.horarios || []),
              { dia: qp.fecha, horaInicio, horaFin, intervalo: safeIntervalo, cupoTotal: durationHours },
            ],
      };

      if (idx >= 0) {
        return {
          ...prev,
          especialidades: prev.especialidades.map((item, i) => (i === idx ? merged : item)),
        };
      }

      return {
        ...prev,
        especialidades: [...prev.especialidades, merged],
      };
    });
    setActiveEspecialidad(esp);
    setCurrentStep(2);
  }, [days, qp.especialidad, qp.fecha, qp.slot]);

  const addEspecialidad = (especialidad: Especialidad) => {
    if (form.especialidades.some((item) => item.especialidad === especialidad)) {
      setActiveEspecialidad(especialidad);
      return;
    }
    setForm((prev) => ({
      ...prev,
      especialidades: [...prev.especialidades, createEspecialidad(especialidad)],
    }));
    setActiveEspecialidad(especialidad);
  };

  const updateEspecialidad = (idx: number, next: EspecialidadEvento) => {
    setForm((prev) => ({
      ...prev,
      especialidades: prev.especialidades.map((item, i) => (i === idx ? next : item)),
    }));
  };

  const removeEspecialidad = (idx: number) => {
    setForm((prev) => {
      const nextEspecialidades = prev.especialidades.filter((_, i) => i !== idx);
      const nextActive = nextEspecialidades[0]?.especialidad || '';
      setActiveEspecialidad((current) => {
        const removed = prev.especialidades[idx]?.especialidad;
        return current === removed ? nextActive : current;
      });
      return {
        ...prev,
        especialidades: nextEspecialidades,
      };
    });
  };

  const validateEventInfo = () => {
    if (!form.nombre.trim()) return 'El nombre del evento es requerido.';
    if (!form.fechaInicioInscripcion || !form.fechaFinInscripcion) return 'Debes seleccionar inicio y fin de inscripciones.';
    if (!form.fechaInicio || !form.fechaFin) return 'Debes seleccionar fecha de inicio y fin.';
    if (new Date(form.fechaInicioInscripcion) > new Date(form.fechaFinInscripcion)) {
      return 'La fecha inicial de inscripciones no puede ser mayor a la fecha final.';
    }
    if (new Date(form.fechaFinInscripcion) > new Date(form.fechaInicio)) {
      return 'El cierre de inscripciones no puede ser posterior al inicio del evento.';
    }
    if (days.length === 0) return 'El rango de fechas no es valido.';
    return '';
  };

  const validate = () => {
    const eventInfoError = validateEventInfo();
    if (eventInfoError) return eventInfoError;
    if (!form.especialidades.length) return 'Debes agregar al menos una especialidad.';

    for (const esp of form.especialidades) {
      if (!esp.medicoEncargado.trim()) return `Falta medico encargado en ${labelEspecialidad(esp.especialidad, especialidadesCatalogo)}.`;
      if (!esp.consultorio.trim()) return `Falta consultorio en ${labelEspecialidad(esp.especialidad, especialidadesCatalogo)}.`;
      if (!(esp.horarios || []).length) return `Debes asignar al menos un horario en ${labelEspecialidad(esp.especialidad, especialidadesCatalogo)}.`;
    }

    return '';
  };

  const goToStepTwo = () => {
    const validationError = validateEventInfo();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const onSave = async () => {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload: Evento = {
        ...form,
        fechaInicioInscripcion: form.fechaInicioInscripcion || '',
        fechaFinInscripcion: form.fechaFinInscripcion || form.fechaLimiteInscripcion || '',
        fechaLimiteInscripcion: form.fechaFinInscripcion || form.fechaLimiteInscripcion || form.fechaInicio,
        especialidades: form.especialidades.map((esp) => ({
          ...esp,
          practicantes: Array.isArray(esp.practicantes) ? esp.practicantes : [],
          horarios: (esp.horarios || []).map((h) => ({
            ...h,
            intervalo: Number.isFinite(Number(h.intervalo)) ? Number(h.intervalo) : 60,
            cupoTotal: Number.isFinite(Number(h.cupoTotal)) ? Math.max(1, Math.floor(Number(h.cupoTotal))) : 1,
          })),
        })),
      };

      if (isEdit && id) {
        await updateEvento(id, payload);
        addRegistroAuditoria({
          id: `aud${Date.now()}`,
          usuarioId: user?.id || '',
          nombreUsuario: user?.nombre || '',
          rol: user?.rol || 'recepcion',
          accion: 'Editar Evento',
          detalles: `Edito evento: ${payload.nombre}`,
          fechaHora: new Date().toISOString(),
          ciudad: user?.ciudad || 'sonoyta',
        });
      } else {
        await addEvento(payload);
        addRegistroAuditoria({
          id: `aud${Date.now()}`,
          usuarioId: user?.id || '',
          nombreUsuario: user?.nombre || '',
          rol: user?.rol || 'recepcion',
          accion: 'Crear Evento',
          detalles: `Creo evento: ${payload.nombre} con ${payload.especialidades.length} especialidades`,
          fechaHora: new Date().toISOString(),
          ciudad: user?.ciudad || 'sonoyta',
        });
      }

      navigate('/eventos');
    } catch {
      setError('No se pudo guardar. Revisa tu conexion e intentalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const activeValue = activeEspecialidad || form.especialidades[0]?.especialidad || '';

  if (isEdit && bloqueado) {
    return (
      <DashboardLayout>
        <Card className="shadow-sm">
          <CardContent className="p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">Evento finalizado</h2>
            <p className="mt-2 text-gray-600">Este evento ya finalizó y es de solo lectura. No se puede editar ni modificar.</p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Button type="button" onClick={() => navigate(`/eventos/${id}`)}>
                Ver evento
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/eventos')}>
                Volver a eventos
              </Button>
            </div>
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
            <h1 className="text-2xl font-semibold text-gray-900">{isEdit ? 'Editar evento' : 'Crear evento'}</h1>
            <p className="mt-1 text-gray-600">Completa primero la información del evento y después agrega especialidades con sus horarios.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/eventos')}>
              Cancelar
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className={`rounded-xl border px-4 py-3 ${currentStep === 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-semibold text-gray-900">Paso 1</div>
              <div className="text-sm text-gray-600">Información del evento</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${currentStep === 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-semibold text-gray-900">Paso 2</div>
              <div className="text-sm text-gray-600">Especialidades y horarios</div>
            </div>
          </div>
        </div>

        {currentStep === 1 ? (
          <div className="w-full space-y-6">
            <EventoInfoForm
              value={form}
              onChange={setForm}
              ciudadesCatalogo={ciudadesCatalogo || []}
              rolUsuario={user?.rol}
              ciudadBloqueada={user?.rol === 'recepcion' ? (user?.ciudad as any) : undefined}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/eventos')}>
                Cancelar
              </Button>
              <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={goToStepTwo}>
                Continuar a Especialidades
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b px-6 py-5">
                <h2 className="text-base font-semibold text-gray-900">Especialidades y horarios</h2>
              </div>
              <div className="space-y-6 p-6">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                  <div className="xl:max-w-sm xl:flex-1">
                    <label className="mb-2 block text-sm font-medium text-gray-900">Agregar especialidad</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value=""
                      onChange={(e) => {
                        const value = e.target.value as Especialidad;
                        if (!value) return;
                        addEspecialidad(value);
                        e.currentTarget.value = '';
                      }}
                    >
                      <option value="">Selecciona...</option>
                      {especialidadesOptions
                        .filter((option) => !form.especialidades.some((item) => item.especialidad === option.value))
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="text-sm text-gray-500">Las tabs se generan conforme agregas especialidades.</div>
                </div>

                {form.especialidades.length > 0 ? (
                  <Tabs value={activeValue} onValueChange={setActiveEspecialidad}>
                    <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
                      {form.especialidades.map((esp) => (
                        <TabsTrigger
                          key={esp.especialidad}
                          value={esp.especialidad}
                          className="h-10 flex-none rounded-lg border border-gray-200 px-4 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50"
                        >
                          {labelEspecialidad(esp.especialidad, especialidadesCatalogo)}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {form.especialidades.map((esp, idx) => (
                      <TabsContent key={esp.especialidad} value={esp.especialidad} className="mt-4">
                        <EspecialidadCardEditor
                          days={days}
                          value={esp}
                          usuarios={usuarios}
                          especialidadesCatalogo={especialidadesCatalogo}
                          eventoId={isEdit && id ? id : form.id}
                          citas={citas}
                          onChange={(next) => updateEspecialidad(idx, next)}
                          onRemove={() => removeEspecialidad(idx)}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-600">
                    Agrega una especialidad para comenzar a configurar medicos, practicantes, consultorio y horarios.
                  </div>
                )}
              </div>
            </section>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                Volver a Información
              </Button>
              <Button type="button" className="bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={onSave}>
                {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Evento'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
