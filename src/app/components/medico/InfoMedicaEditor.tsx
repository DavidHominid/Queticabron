import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  AlertCircle,
  Edit3,
  Save,
  X,
  Plus,
  Pill,
  FileText,
  HeartHandshake,
  BrainCircuit,
  ClipboardList,
} from 'lucide-react';
import { InformacionMedica, AntecedentesGenerales } from '../../types';
import { toast } from 'sonner';

interface InfoMedicaEditorProps {
  pacienteId: string;
  initialInfoMedica?: InformacionMedica | null;
  onSaved?: (actualizada: InformacionMedica) => void;
  usuario?: { id?: string | number; nombre?: string; rol?: string };
  className?: string;
}

interface AntecedentesDraft extends AntecedentesGenerales {}

interface InfoMedicaDraft {
  alergias: string[];
  medicamentosActuales: string[];
  antecedentes: AntecedentesDraft;
  antecedentesPsicosociales: string;
  notas: string;
}

const ANTECEDENTES_BOOL: { key: keyof AntecedentesDraft; label: string; group?: 'cardio' | 'infecto' | 'otros' }[] = [
  { key: 'enfermedadesCorazon', label: 'Cardiopatías / Enfermedades del corazón', group: 'cardio' },
  { key: 'altaPresion', label: 'Hipertensión Arterial (HTA)', group: 'cardio' },
  { key: 'diabetes', label: 'Diabetes Mellitus', group: 'otros' },
  { key: 'asma', label: 'Asma / EPOC', group: 'otros' },
  { key: 'rinones', label: 'Enfermedad Renal', group: 'otros' },
  { key: 'tuberculosis', label: 'Tuberculosis (TB)', group: 'infecto' },
  { key: 'hemorragiaSevera', label: 'Hemorragia severa previa / Riesgo sangrado', group: 'otros' },
  { key: 'embarazada', label: 'Embarazo actual' },
  { key: 'lactando', label: 'Lactancia materna actual' },
];

const emptyDraft = (): InfoMedicaDraft => ({
  alergias: [],
  medicamentosActuales: [],
  antecedentes: {
    enfermedadesCorazon: false,
    diabetes: false,
    tuberculosis: false,
    altaPresion: false,
    rinones: false,
    asma: false,
    hemorragiaSevera: false,
    embarazada: false,
    lactando: false,
    patologicos: '',
    familiares: '',
  },
  antecedentesPsicosociales: '',
  notas: '',
});

const draftFromInfo = (inf?: InformacionMedica | null): InfoMedicaDraft => {
  if (!inf) return emptyDraft();
  return {
    alergias: Array.isArray(inf.alergias) ? inf.alergias.filter(Boolean) : [],
    medicamentosActuales: Array.isArray(inf.medicamentosActuales) ? inf.medicamentosActuales.filter(Boolean) : [],
    antecedentes: {
      enfermedadesCorazon: Boolean(inf.antecedentes?.enfermedadesCorazon),
      diabetes: Boolean(inf.antecedentes?.diabetes),
      tuberculosis: Boolean(inf.antecedentes?.tuberculosis),
      altaPresion: Boolean(inf.antecedentes?.altaPresion),
      rinones: Boolean(inf.antecedentes?.rinones),
      asma: Boolean(inf.antecedentes?.asma),
      hemorragiaSevera: Boolean(inf.antecedentes?.hemorragiaSevera),
      embarazada: Boolean(inf.antecedentes?.embarazada),
      lactando: Boolean(inf.antecedentes?.lactando),
      patologicos: inf.antecedentes?.patologicos || '',
      familiares: inf.antecedentes?.familiares || '',
    },
    antecedentesPsicosociales: inf.antecedentesPsicosociales || '',
    notas: inf.notas || '',
  };
};

export function InfoMedicaEditor({
  pacienteId,
  initialInfoMedica,
  onSaved,
  usuario,
  className,
}: InfoMedicaEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<InfoMedicaDraft>(() => draftFromInfo(initialInfoMedica));
  const [chipNuevaAlergia, setChipNuevaAlergia] = useState('');
  const [chipNuevoMed, setChipNuevoMed] = useState('');

  const dirty = useMemo(() => {
    const orig = draftFromInfo(initialInfoMedica);
    const eqArr = (a: string[], b: string[]) =>
      a.length === b.length && a.every((x, i) => x === b[i]);
    const eqBool = (a: AntecedentesDraft, b: AntecedentesDraft) => {
      for (const { key } of ANTECEDENTES_BOOL) {
        if (Boolean(a[key]) !== Boolean(b[key])) return false;
      }
      return (a.patologicos || '') === (b.patologicos || '') &&
        (a.familiares || '') === (b.familiares || '');
    };
    return (
      !eqArr(orig.alergias, draft.alergias) ||
      !eqArr(orig.medicamentosActuales, draft.medicamentosActuales) ||
      !eqBool(orig.antecedentes, draft.antecedentes) ||
      (orig.antecedentesPsicosociales || '') !== (draft.antecedentesPsicosociales || '') ||
      (orig.notas || '') !== (draft.notas || '')
    );
  }, [draft, initialInfoMedica]);

  // Sincronizar el draft con initialInfoMedica SI no estamos en modo edición.
  // El initializer de useState solo corre en mount; si el padre re-renderiza
  // con props actualizadas (SSE / onSaved padre actualiza contexto) el draft
  // se quedaría con data obsoleta y dirty=false positivo falso.
  useEffect(() => {
    if (editing || saving) return;
    setDraft(draftFromInfo(initialInfoMedica));
    setChipNuevaAlergia('');
    setChipNuevoMed('');
  }, [initialInfoMedica, editing, saving]);

  const habilitarEdicion = () => {
    setDraft(draftFromInfo(initialInfoMedica));
    setEditing(true);
  };

  const cancelar = () => {
    setDraft(draftFromInfo(initialInfoMedica));
    setChipNuevaAlergia('');
    setChipNuevoMed('');
    setEditing(false);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (usuario?.id) headers['x-usuario'] = String(usuario.id);
      const body = {
        pacienteId: String(pacienteId),
        alergias: draft.alergias,
        medicamentosActuales: draft.medicamentosActuales,
        antecedentes: draft.antecedentes,
        antecedentesPsicosociales: draft.antecedentesPsicosociales,
        notas: draft.notas,
      };
      const res = await fetch(`/api/informacion-medica/${pacienteId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar la información médica.');
      toast.success('Información médica actualizada ✅');
      onSaved?.(data as InformacionMedica);
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message || 'Error desconocido al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const agregarChip = (
    key: 'alergias' | 'medicamentosActuales',
    valor: string,
    setter: (v: string) => void,
  ) => {
    const v = valor.trim();
    if (!v) return;
    if (draft[key].some((x) => x.toLowerCase() === v.toLowerCase())) {
      toast.warning('Ya está registrado.');
      return;
    }
    setDraft({ ...draft, [key]: [...draft[key], v] });
    setter('');
  };

  const quitarChip = (key: 'alergias' | 'medicamentosActuales', idx: number) => {
    setDraft({ ...draft, [key]: draft[key].filter((_, i) => i !== idx) });
  };

  const toggleBool = (key: keyof AntecedentesDraft) => {
    setDraft({
      ...draft,
      antecedentes: { ...draft.antecedentes, [key]: !Boolean(draft.antecedentes[key]) },
    });
  };

  const hayAlgo = (draft: InfoMedicaDraft) =>
    draft.alergias.length > 0 ||
    draft.medicamentosActuales.length > 0 ||
    ANTECEDENTES_BOOL.some(({ key }) => draft.antecedentes[key]) ||
    (draft.antecedentes.patologicos || '').trim().length > 0 ||
    (draft.antecedentes.familiares || '').trim().length > 0 ||
    draft.antecedentesPsicosociales.trim().length > 0 ||
    draft.notas.trim().length > 0;

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            Información Médica · Antecedentes
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {editing
              ? 'Actualiza alergias, medicamentos actuales y antecedentes.'
              : 'Expediente médico. Haz clic en Editar para corregir o completar.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <Button type="button" size="sm" variant="outline" onClick={habilitarEdicion}>
              <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Editar
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={cancelar} disabled={saving}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={guardar}
                disabled={saving}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-5 text-sm">
        {/* Alergias */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="!mt-0 inline-flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-destructive/80" />
              Alergias conocidas
            </Label>
          </div>
          {editing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={chipNuevaAlergia}
                  onChange={(e) => setChipNuevaAlergia(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      agregarChip('alergias', chipNuevaAlergia, setChipNuevaAlergia);
                    }
                  }}
                  placeholder="Ej: Penicilina, yodo, mariscos, látex…"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => agregarChip('alergias', chipNuevaAlergia, setChipNuevaAlergia)}
                >
                  <Plus className="w-4 h-4 mr-1" /> Agregar
                </Button>
              </div>
            </div>
          ) : null}
          {draft.alergias.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {draft.alergias.map((a, idx) => (
                <Badge
                  key={idx}
                  variant="destructive"
                  className={`text-xs ${editing ? 'pr-1' : ''}`}
                >
                  {a}
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => quitarChip('alergias', idx)}
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/20"
                      aria-label="Quitar alergia"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-muted-foreground">Sin alergias registradas.</p>
          )}
        </div>

        {/* Medicamentos actuales */}
        <div>
          <Label className="!mt-0 inline-flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-[color:var(--chart-4)]/90" />
            Medicamentos actuales
          </Label>
          {editing ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={chipNuevoMed}
                  onChange={(e) => setChipNuevoMed(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      agregarChip('medicamentosActuales', chipNuevoMed, setChipNuevoMed);
                    }
                  }}
                  placeholder="Ej: Metformina 500mg 2v/d, Losartán 50mg 1v/d, AAS 100mg…"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => agregarChip('medicamentosActuales', chipNuevoMed, setChipNuevoMed)}
                >
                  <Plus className="w-4 h-4 mr-1" /> Agregar
                </Button>
              </div>
            </div>
          ) : null}
          {draft.medicamentosActuales.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {draft.medicamentosActuales.map((m, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className={`text-xs ${editing ? 'pr-1' : ''}`}
                >
                  {m}
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => quitarChip('medicamentosActuales', idx)}
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/20"
                      aria-label="Quitar medicamento"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-muted-foreground">Sin medicamentos registrados.</p>
          )}
        </div>

        {/* 9 Checkboxes */}
        <div>
          <Label className="!mt-0 inline-flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-[color:var(--chart-5)]/90" />
            Antecedentes personales
          </Label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ANTECEDENTES_BOOL.map(({ key, label }) => (
              <div key={key} className="flex items-start gap-2">
                <Checkbox
                  id={`ant-${key}`}
                  checked={Boolean(draft.antecedentes[key])}
                  onCheckedChange={() => editing && toggleBool(key)}
                  disabled={!editing}
                />
                <Label
                  htmlFor={`ant-${key}`}
                  className={`cursor-default text-xs ${
                    editing ? 'cursor-pointer select-none' : ''
                  } ${Boolean(draft.antecedentes[key]) ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Patológicos y Familiares (texto expandido) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="!mt-0 inline-flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
              Antecedentes patológicos (detalle)
            </Label>
            {editing ? (
              <Textarea
                rows={3}
                value={draft.antecedentes.patologicos || ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    antecedentes: { ...draft.antecedentes, patologicos: e.target.value },
                  })
                }
                placeholder="Detalle quirúrgicos, transfusiones, enfermedades crónicas, diagnósticos previos relevantes…"
                className="mt-1.5 text-xs"
              />
            ) : (
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-foreground">
                {draft.antecedentes.patologicos?.trim() || (
                  <span className="italic text-muted-foreground">Sin detalle.</span>
                )}
              </p>
            )}
          </div>
          <div>
            <Label className="!mt-0 inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              Antecedentes familiares (heredo-familiares)
            </Label>
            {editing ? (
              <Textarea
                rows={3}
                value={draft.antecedentes.familiares || ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    antecedentes: { ...draft.antecedentes, familiares: e.target.value },
                  })
                }
                placeholder="HTA, diabetes, cardiopatías o cáncer en padres/hermanos, edad de aparición…"
                className="mt-1.5 text-xs"
              />
            ) : (
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-foreground">
                {draft.antecedentes.familiares?.trim() || (
                  <span className="italic text-muted-foreground">Sin detalle.</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Psicosociales */}
        <div>
          <Label className="!mt-0 inline-flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-[color:var(--chart-3)]/90" />
            Antecedentes psicosociales
          </Label>
          {editing ? (
            <Textarea
              rows={2}
              value={draft.antecedentesPsicosociales}
              onChange={(e) => setDraft({ ...draft, antecedentesPsicosociales: e.target.value })}
              placeholder="Situación familiar, ocupación, tabaquismo/alcohol, adicciones, apoyo social, situación migratoria…"
              className="mt-1.5 text-xs"
            />
          ) : (
            <p className="mt-1.5 whitespace-pre-wrap text-xs text-foreground">
              {draft.antecedentesPsicosociales.trim() || (
                <span className="italic text-muted-foreground">Sin información psicosocial registrada.</span>
              )}
            </p>
          )}
        </div>

        {/* Notas */}
        <div>
          <Label className="!mt-0 inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            Notas / Observaciones clínicas permanentes
          </Label>
          {editing ? (
            <Textarea
              rows={2}
              value={draft.notas}
              onChange={(e) => setDraft({ ...draft, notas: e.target.value })}
              placeholder="Notas relevantes persistentes que todo médico debe conocer al ver al paciente."
              className="mt-1.5 text-xs"
            />
          ) : (
            <p className="mt-1.5 whitespace-pre-wrap text-xs text-foreground">
              {draft.notas.trim() || (
                <span className="italic text-muted-foreground">Sin notas permanentes.</span>
              )}
            </p>
          )}
        </div>
      </div>

      {editing && !dirty && hayAlgo(draft) ? (
        <div className="mt-5 flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Revisado · sin cambios pendientes.
        </div>
      ) : null}

      {editing && dirty ? (
        <div className="mt-5 flex items-center gap-2 rounded-md border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-700" />
          <span>
            Cambios sin guardar en antecedentes. Haz clic en <b>Guardar cambios</b> para actualizar el expediente.
          </span>
        </div>
      ) : null}
    </div>
  );
}
