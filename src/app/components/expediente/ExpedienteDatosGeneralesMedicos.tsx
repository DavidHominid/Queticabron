import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  User,
  Heart,
  Pill,
  Stethoscope,
  FileText,
  Plus,
  X,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Paciente, InformacionMedica, AntecedentesGenerales } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

/**
 * [NOTA / CAMBIO]:
 * Componente que reemplaza la antigua tarjeta reducida de "Datos Personales".
 * 
 * Integra la vista completa de:
 * 1. Datos Generales del Paciente
 * 2. Información Médica General (alergias y medicamentos en chips)
 * 3. Antecedentes Patológicos y Familiares (texto libre)
 * 
 * No crea variables nuevas: reutiliza exactamente los campos y estructuras
 * de 'importarexpedientepage.tsx' y 'Medico.tsx' para máxima coherencia.
 */
interface ExpedienteDatosGeneralesMedicosProps {
  paciente: Paciente;
  infoMedica?: InformacionMedica | null;
  onPacienteUpdated?: (paciente: Paciente) => void;
  onInfoMedicaUpdated?: (info: InformacionMedica) => void;
}

interface PacienteDraft {
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  sexo: 'Masculino' | 'Femenino';
  telefono: string;
}

interface InfoMedicaDraft {
  alergias: string[];
  medicamentosActuales: string[];
  antecedentes: AntecedentesGenerales;
  antecedentesPsicosociales: string;
  notas: string;
}

const parseDateToYmd = (val?: string): string => {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {}
  return s.slice(0, 10);
};

const splitNombreApellido = (rawNombre: string = '', rawApellido: string = '') => {
  let nombre = (rawNombre || '').trim();
  let apellido = (rawApellido || '').trim();
  if (!apellido && nombre) {
    const spaceIdx = nombre.indexOf(' ');
    if (spaceIdx !== -1) {
      apellido = nombre.substring(spaceIdx + 1).trim();
      nombre = nombre.substring(0, spaceIdx).trim();
    }
  }
  return { nombre, apellido };
};

const createInitialPacienteDraft = (p: Paciente): PacienteDraft => {
  const { nombre, apellido } = splitNombreApellido(p.nombre, p.apellido);
  return {
    nombre,
    apellido,
    fechaNacimiento: parseDateToYmd(p.fechaNacimiento),
    sexo: (p.sexo === 'Femenino' ? 'Femenino' : 'Masculino') as 'Masculino' | 'Femenino',
    telefono: p.telefono || '',
  };
};

const createInitialInfoMedicaDraft = (info?: InformacionMedica | null): InfoMedicaDraft => ({
  alergias: Array.isArray(info?.alergias) ? info.alergias.filter(Boolean) : [],
  medicamentosActuales: Array.isArray(info?.medicamentosActuales)
    ? info.medicamentosActuales.filter(Boolean)
    : [],
  antecedentes: {
    enfermedadesCorazon: Boolean(info?.antecedentes?.enfermedadesCorazon),
    diabetes: Boolean(info?.antecedentes?.diabetes),
    tuberculosis: Boolean(info?.antecedentes?.tuberculosis),
    altaPresion: Boolean(info?.antecedentes?.altaPresion),
    rinones: Boolean(info?.antecedentes?.rinones),
    asma: Boolean(info?.antecedentes?.asma),
    hemorragiaSevera: Boolean(info?.antecedentes?.hemorragiaSevera),
    embarazada: Boolean(info?.antecedentes?.embarazada),
    lactando: Boolean(info?.antecedentes?.lactando),
    patologicos: info?.antecedentes?.patologicos || '',
    familiares: info?.antecedentes?.familiares || '',
  },
  antecedentesPsicosociales: info?.antecedentesPsicosociales || '',
  notas: info?.notas || '',
});

export function ExpedienteDatosGeneralesMedicos({
  paciente,
  infoMedica,
  onPacienteUpdated,
  onInfoMedicaUpdated,
}: ExpedienteDatosGeneralesMedicosProps) {
  const { updatePaciente, updateInformacionMedica } = useData();
  const { user } = useAuth();

  const [pacienteDraft, setPacienteDraft] = useState<PacienteDraft>(() =>
    createInitialPacienteDraft(paciente)
  );
  const [infoDraft, setInfoDraft] = useState<InfoMedicaDraft>(() =>
    createInitialInfoMedicaDraft(infoMedica)
  );

  const [newChip, setNewChip] = useState({ alergia: '', medicamento: '' });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Sincronizar cuando cambia la prop externa
  useEffect(() => {
    setPacienteDraft(createInitialPacienteDraft(paciente));
  }, [paciente]);

  useEffect(() => {
    setInfoDraft(createInitialInfoMedicaDraft(infoMedica));
  }, [infoMedica]);

  // Detección de cambios (dirty)
  const isDirty = useMemo(() => {
    const origP = createInitialPacienteDraft(paciente);
    const origI = createInitialInfoMedicaDraft(infoMedica);

    const pacienteCambio =
      pacienteDraft.nombre.trim() !== origP.nombre.trim() ||
      pacienteDraft.apellido.trim() !== origP.apellido.trim() ||
      pacienteDraft.fechaNacimiento !== origP.fechaNacimiento ||
      pacienteDraft.sexo !== origP.sexo ||
      pacienteDraft.telefono.trim() !== origP.telefono.trim();

    if (pacienteCambio) return true;

    const arrEq = (a: string[], b: string[]) =>
      a.length === b.length && a.every((v, i) => v === b[i]);

    const infoCambio =
      !arrEq(infoDraft.alergias, origI.alergias) ||
      !arrEq(infoDraft.medicamentosActuales, origI.medicamentosActuales) ||
      (infoDraft.antecedentes.patologicos || '').trim() !== (origI.antecedentes.patologicos || '').trim() ||
      (infoDraft.antecedentes.familiares || '').trim() !== (origI.antecedentes.familiares || '').trim() ||
      infoDraft.antecedentesPsicosociales.trim() !== origI.antecedentesPsicosociales.trim() ||
      infoDraft.notas.trim() !== origI.notas.trim();

    return infoCambio;
  }, [pacienteDraft, infoDraft, paciente, infoMedica]);

  // [NOTA / CAMBIO]: Manejo de chips interactivos para Alergias (igual que en importación manual)
  const agregarAlergia = () => {
    const txt = newChip.alergia.trim();
    if (!txt) return;
    if (infoDraft.alergias.some((a) => a.toLowerCase() === txt.toLowerCase())) {
      toast.warning('Esta alergia ya está registrada');
      return;
    }
    setInfoDraft((prev) => ({
      ...prev,
      alergias: [...prev.alergias, txt],
    }));
    setNewChip((s) => ({ ...s, alergia: '' }));
  };

  const quitarAlergia = (v: string) => {
    setInfoDraft((prev) => ({
      ...prev,
      alergias: prev.alergias.filter((a) => a !== v),
    }));
  };

  // [NOTA / CAMBIO]: Manejo de chips interactivos para Medicamentos actuales
  const agregarMedicamento = () => {
    const txt = newChip.medicamento.trim();
    if (!txt) return;
    if (infoDraft.medicamentosActuales.some((m) => m.toLowerCase() === txt.toLowerCase())) {
      toast.warning('Este medicamento ya está registrado');
      return;
    }
    setInfoDraft((prev) => ({
      ...prev,
      medicamentosActuales: [...prev.medicamentosActuales, txt],
    }));
    setNewChip((s) => ({ ...s, medicamento: '' }));
  };

  const quitarMedicamento = (v: string) => {
    setInfoDraft((prev) => ({
      ...prev,
      medicamentosActuales: prev.medicamentosActuales.filter((m) => m !== v),
    }));
  };

  // Guardar cambios
  const handleGuardar = async () => {
    const nombre = pacienteDraft.nombre.trim();
    const apellido = pacienteDraft.apellido.trim();
    const fechaNacimiento = pacienteDraft.fechaNacimiento.trim();
    const sexo = pacienteDraft.sexo;
    const telefono = pacienteDraft.telefono.trim();

    if (!nombre) {
      toast.error('El nombre del paciente es obligatorio.');
      return;
    }
    if (!apellido) {
      toast.error('El apellido del paciente es obligatorio.');
      return;
    }
    if (!fechaNacimiento) {
      toast.error('La fecha de nacimiento es obligatoria.');
      return;
    }
    if (!telefono) {
      toast.error('El teléfono del paciente es obligatorio.');
      return;
    }

    setSaving(true);
    setSavedSuccess(false);

    try {
      // [NOTA / CAMBIO - Paso 1]: Guarda datos generales del paciente en /api/pacientes/:id
      const pacientePayload: Partial<Paciente> = {
        nombre,
        apellido,
        fechaNacimiento,
        sexo,
        telefono,
        ciudad: paciente.ciudad || 'Puerto Peñasco',
      };

      const resP: any = await updatePaciente(paciente.id, pacientePayload);
      if (resP && resP.success === false) {
        throw new Error(resP.error || 'Error al actualizar datos del paciente');
      }

      // [NOTA / CAMBIO - Paso 2]: Guarda información médica y antecedentes en /api/informacion-medica/:pacienteId
      // Preserva los booleanos existentes (diabetes, alta presión, etc.) capturados en consulta médica
      const infoPayload = {
        pacienteId: String(paciente.id),
        alergias: infoDraft.alergias,
        medicamentosActuales: infoDraft.medicamentosActuales,
        antecedentes: {
          enfermedadesCorazon: Boolean(infoDraft.antecedentes?.enfermedadesCorazon ?? infoMedica?.antecedentes?.enfermedadesCorazon),
          diabetes: Boolean(infoDraft.antecedentes?.diabetes ?? infoMedica?.antecedentes?.diabetes),
          tuberculosis: Boolean(infoDraft.antecedentes?.tuberculosis ?? infoMedica?.antecedentes?.tuberculosis),
          altaPresion: Boolean(infoDraft.antecedentes?.altaPresion ?? infoMedica?.antecedentes?.altaPresion),
          rinones: Boolean(infoDraft.antecedentes?.rinones ?? infoMedica?.antecedentes?.rinones),
          asma: Boolean(infoDraft.antecedentes?.asma ?? infoMedica?.antecedentes?.asma),
          hemorragiaSevera: Boolean(infoDraft.antecedentes?.hemorragiaSevera ?? infoMedica?.antecedentes?.hemorragiaSevera),
          embarazada: Boolean(infoDraft.antecedentes?.embarazada ?? infoMedica?.antecedentes?.embarazada),
          lactando: Boolean(infoDraft.antecedentes?.lactando ?? infoMedica?.antecedentes?.lactando),
          patologicos: (infoDraft.antecedentes.patologicos || '').trim(),
          familiares: (infoDraft.antecedentes.familiares || '').trim(),
        },
        antecedentesPsicosociales: infoDraft.antecedentesPsicosociales.trim(),
        notas: infoDraft.notas.trim(),
      };

      const resI = await updateInformacionMedica(paciente.id, infoPayload);
      if (resI && resI.success === false) {
        throw new Error(resI.error || 'Error al actualizar información médica');
      }

      // Notificar éxito
      toast.success('Información del expediente actualizada correctamente');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);

      onPacienteUpdated?.({
        ...paciente,
        ...pacientePayload,
      } as Paciente);

      if (resI && resI.data) {
        onInfoMedicaUpdated?.(resI.data);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Header idéntico a Importar Expediente */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight tracking-tight">
            Datos del paciente e información médica
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
            Información que se registra una sola vez por expediente.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[11px] border-border/60">
            1 sola vez
          </Badge>
          <Button
            size="sm"
            onClick={handleGuardar}
            disabled={saving || (!isDirty && !savedSuccess)}
            className={`gap-1.5 transition-all text-xs font-medium ${
              isDirty
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : savedSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Guardado
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Grid de 2 Cards superiores */}
      <div className="grid gap-5 sm:gap-6 grid-cols-1 xl:grid-cols-2">
        {/* [NOTA / CAMBIO]: Card 1 - Datos Generales del Paciente (campos obligatorios) */}
        <Card className="shadow-[0_2px_8px_rgba(121,201,197,0.05)] border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-[17px] leading-snug">
              <User className="w-4.5 h-4.5 text-primary shrink-0" />
              Datos Generales del Paciente
              <Badge variant="destructive" className="ml-auto text-[11px] bg-red-600 hover:bg-red-700 text-white">
                * Obligatorios
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exp-nombre">
                  Nombre(s) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="exp-nombre"
                  value={pacienteDraft.nombre}
                  onChange={(e) =>
                    setPacienteDraft((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  inputMode="text"
                  autoComplete="given-name"
                  placeholder="Ej. María de los Ángeles"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exp-apellido">
                  Apellidos <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="exp-apellido"
                  value={pacienteDraft.apellido}
                  onChange={(e) =>
                    setPacienteDraft((prev) => ({ ...prev, apellido: e.target.value }))
                  }
                  inputMode="text"
                  autoComplete="family-name"
                  placeholder="Ej. Pérez González"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exp-fecha-nac">
                  Fecha de nacimiento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="exp-fecha-nac"
                  type="date"
                  max={today}
                  value={pacienteDraft.fechaNacimiento}
                  onChange={(e) =>
                    setPacienteDraft((prev) => ({ ...prev, fechaNacimiento: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exp-sexo">
                  Sexo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={pacienteDraft.sexo}
                  onValueChange={(v) =>
                    setPacienteDraft((prev) => ({
                      ...prev,
                      sexo: v as 'Masculino' | 'Femenino',
                    }))
                  }
                >
                  <SelectTrigger id="exp-sexo">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="exp-telefono">
                  Teléfono <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="exp-telefono"
                  value={pacienteDraft.telefono}
                  onChange={(e) =>
                    setPacienteDraft((prev) => ({ ...prev, telefono: e.target.value }))
                  }
                  placeholder="Ej. 55 1234 5678"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* [NOTA / CAMBIO]: Card 2 - Información Médica General (alergias y medicamentos con chips) */}
        <Card className="shadow-[0_2px_8px_rgba(121,201,197,0.05)] border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-[17px] leading-snug">
              <Heart className="w-4.5 h-4.5 text-rose-500 shrink-0" />
              Información Médica General
              <Badge variant="outline" className="ml-auto text-[11px]">
                Opcional · 1 sola vez
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Alergias conocidas */}
            <div className="space-y-2.5">
              <Label className="text-[13px] leading-tight">Alergias conocidas</Label>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5 min-h-[28px]">
                {infoDraft.alergias.map((a) => (
                  <Badge
                    key={a}
                    variant="secondary"
                    className="gap-1 pr-1 pl-2 py-0.5 text-[12px]"
                  >
                    {a}
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      className="h-4.5 w-4.5 p-0 hover:bg-muted rounded-full"
                      onClick={() => quitarAlergia(a)}
                    >
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  </Badge>
                ))}
                {infoDraft.alergias.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">
                    Sin alergias registradas
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej. Penicilina, nueces, látex..."
                  value={newChip.alergia}
                  onChange={(e) =>
                    setNewChip((s) => ({ ...s, alergia: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      agregarAlergia();
                    }
                  }}
                />
                <Button variant="outline" onClick={agregarAlergia} type="button">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Medicamentos actuales */}
            <div className="space-y-2.5">
              <Label className="text-[13px] leading-tight flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 -mt-0.5" />
                Medicamentos actuales
              </Label>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5 min-h-[28px]">
                {infoDraft.medicamentosActuales.map((m) => (
                  <Badge
                    key={m}
                    variant="outline"
                    className="gap-1 pr-1 pl-2 py-0.5 text-[12px]"
                  >
                    {m}
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      className="h-4.5 w-4.5 p-0 hover:bg-muted rounded-full"
                      onClick={() => quitarMedicamento(m)}
                    >
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  </Badge>
                ))}
                {infoDraft.medicamentosActuales.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">
                    Sin medicamentos registrados
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej. Metformina 500mg, Losartán..."
                  value={newChip.medicamento}
                  onChange={(e) =>
                    setNewChip((s) => ({ ...s, medicamento: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      agregarMedicamento();
                    }
                  }}
                />
                <Button variant="outline" onClick={agregarMedicamento} type="button">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* [NOTA / CAMBIO]: Card 3 - Antecedentes Patológicos, Familiares, Psicosociales y Notas */}
      <Card className="shadow-[0_2px_8px_rgba(121,201,197,0.05)] border-border/70">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-[17px] leading-snug">
            <Stethoscope className="w-4.5 h-4.5 text-primary shrink-0" />
            Antecedentes Patológicos y Familiares
            <Badge variant="outline" className="ml-auto text-[11px]">
              Opcional · 1 sola vez por paciente
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 sm:space-y-6">
          <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-[13px] leading-tight">
                <FileText className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                Antecedentes Patológicos
                <Badge variant="outline" className="ml-auto text-[10.5px] font-normal">
                  Texto libre
                </Badge>
              </Label>
              <Textarea
                rows={6}
                placeholder="Ej. Hipertensión arterial diagnosticada en 2018, en tratamiento con Losartán 50mg/día. Diabetes Mellitus tipo II desde 2020, control con Metformina 850mg cada 12h. Cirugía de apéndice en 2015, sin complicaciones. Alergia documentada a penicilina (rash generalizado)."
                value={infoDraft.antecedentes.patologicos || ''}
                onChange={(e) =>
                  setInfoDraft((prev) => ({
                    ...prev,
                    antecedentes: {
                      ...prev.antecedentes,
                      patologicos: e.target.value,
                    },
                  }))
                }
              />
              <p className="text-[11.5px] text-muted-foreground/80 leading-relaxed">
                Incluye enfermedades crónicas, padecimientos diagnosticados, cirugías previas, transfusiones, alergias documentadas, hospitalizaciones.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-[13px] leading-tight">
                <Heart className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                Antecedentes Familiares
                <Badge variant="outline" className="ml-auto text-[10.5px] font-normal">
                  Texto libre
                </Badge>
              </Label>
              <Textarea
                rows={6}
                placeholder="Ej. Padre: falleció a los 72 años por infarto agudo de miocardio, tenía hipertensión y dislipidemia. Madre: viva de 68 años, diabetes tipo II y tiroides. Hermano mayor: 45 años, sano. No existen antecedentes de cáncer ni enfermedades neurológicas en la familia."
                value={infoDraft.antecedentes.familiares || ''}
                onChange={(e) =>
                  setInfoDraft((prev) => ({
                    ...prev,
                    antecedentes: {
                      ...prev.antecedentes,
                      familiares: e.target.value,
                    },
                  }))
                }
              />
              <p className="text-[11.5px] text-muted-foreground/80 leading-relaxed">
                Incluye padecimientos de padres, abuelos, hermanos y causa de muerte de familiares directos. Factor hereditario, enfermedades genéticas.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2 pt-0.5">
            <div className="space-y-2">
              <Label className="text-[13px] leading-tight">Antecedentes Psicosociales</Label>
              <Textarea
                rows={5}
                placeholder="Historial familiar, hábitos, tabaquismo, alcoholismo, situaciones psicosociales, estado civil, ocupación, escolaridad, vivienda, etc."
                value={infoDraft.antecedentesPsicosociales}
                onChange={(e) =>
                  setInfoDraft((prev) => ({
                    ...prev,
                    antecedentesPsicosociales: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] leading-tight">
                Notas adicionales / Observaciones generales del expediente
              </Label>
              <Textarea
                rows={5}
                placeholder="Cualquier dato adicional relevante del expediente físico, contexto, aclaraciones de lectura..."
                value={infoDraft.notas}
                onChange={(e) =>
                  setInfoDraft((prev) => ({
                    ...prev,
                    notas: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
