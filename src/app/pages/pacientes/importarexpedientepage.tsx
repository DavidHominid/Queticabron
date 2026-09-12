import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  User,
  Calendar,
  Heart,
  Pill,
  Stethoscope,
  AlertTriangle,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { AntecedentesGenerales, InformacionMedica, Paciente } from '../../types';
import { todayYmd } from '../../utils/clock';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';

interface AntecedentesGeneralesDraft extends AntecedentesGenerales {
  patologicos?: string;
  familiares?: string;
}

interface InfoMedicaDraft {
  alergias: string[];
  medicamentosActuales: string[];
  antecedentes: AntecedentesGeneralesDraft;
  antecedentesPsicosociales: string;
  notas: string;
}

interface SignosVitalesDraft {
  temperatura?: string;
  presionArterial?: string;
  ritmoCardiaco?: string;
  frecuenciaRespiratoria?: string;
  saturacionOxigeno?: string;
  azucarEnSangre?: string;
  altura?: string;
  peso?: string;
}

interface CitaHistoricaDraft {
  id: string;
  fechaCita: string;
  especialidad: string;
  especialidadOtraTexto?: string;
  encargadoTriage?: string;
  signosVitales: SignosVitalesDraft;
  motivoConsulta?: string;
  observacionesHpi?: string;
  doctorProveedor?: string;
  padecimientoActual?: string;
  medicamentosRx?: string;
  tratamientoPt?: string;
  planSeguimiento?: string;
}

interface PacienteDraft {
  id?: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  sexo: 'Masculino' | 'Femenino' | '';
  telefono: string;
}

interface ExpedienteDraft {
  paciente: PacienteDraft;
  infoMedica: InfoMedicaDraft;
  citas: CitaHistoricaDraft[];
}

const STORAGE_KEY = 'capture_expediente_draft';

const createEmptyAntecedentes = (): AntecedentesGeneralesDraft => ({
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
});

const createEmptyInfoMedica = (): InfoMedicaDraft => ({
  alergias: [],
  medicamentosActuales: [],
  antecedentes: createEmptyAntecedentes(),
  antecedentesPsicosociales: '',
  notas: '',
});

const createEmptyCita = (idx: number): CitaHistoricaDraft => ({
  id: `cita-draft-${Date.now()}-${idx}`,
  fechaCita: '',
  especialidad: ESPECIALIDAD_DEFAULT,
  especialidadOtraTexto: '',
  encargadoTriage: '',
  signosVitales: {},
  motivoConsulta: '',
  observacionesHpi: '',
  doctorProveedor: '',
  padecimientoActual: '',
  medicamentosRx: '',
  tratamientoPt: '',
  planSeguimiento: '',
});

const createEmptyDraft = (): ExpedienteDraft => ({
  paciente: {
    nombre: '',
    apellido: '',
    fechaNacimiento: '',
    sexo: '',
    telefono: '',
  },
  infoMedica: createEmptyInfoMedica(),
  citas: [createEmptyCita(0)],
});

const ESPECIALIDADES_OPTS: { value: string; label: string }[] = [
  { value: 'medicina_familiar', label: 'Medicina Familiar' },
  { value: 'General', label: 'General' },
  { value: 'pediatria', label: 'Pediatría' },
  { value: 'dentista', label: 'Dental / Dentista' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'oncologo', label: 'Oncología' },
  { value: 'podologo', label: 'Podología' },
  { value: 'chequeo', label: 'Chequeo General' },
  { value: 'vacunas', label: 'Esquema de Vacunas' },
  { value: '__otra__', label: 'Otra (no catalogada)' },
];

const ESPECIALIDAD_DEFAULT = 'medicina_familiar';
const ESPECIALIDAD_OTRA_KEY = '__otra__';

const FE_ESPECIALIDAD_FALLBACK: { value: string; label: string }[] = [
  { value: 'medicina_familiar', label: 'Medicina Familiar' },
  { value: 'General', label: 'General' },
  { value: 'pediatria', label: 'Pediatría' },
  { value: 'dentista', label: 'Dental / Dentista' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'oncologo', label: 'Oncología' },
  { value: 'podologo', label: 'Podología' },
  { value: 'chequeo', label: 'Chequeo General' },
  { value: 'vacunas', label: 'Esquema de Vacunas' },
];

export function ImportarExpedientePage() {
  const navigate = useNavigate();
  const today = useMemo(() => todayYmd(), []);
  const { user } = useAuth();
  const { fetchPacientePorId, fetchCitasPaciente } = useData();

  const [optsEspecialidades, setOptsEspecialidades] = useState<{ value: string; label: string }[]>(() => [
    ...FE_ESPECIALIDAD_FALLBACK,
    { value: ESPECIALIDAD_OTRA_KEY, label: 'Otra (no catalogada)' },
  ]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/citas/especialidades/catalogo')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data) || data.length === 0) return;
        const fromDB = data
          .filter((x) => x && x.codigo)
          .map((x) => ({ value: String(x.codigo), label: x.nombre ? String(x.nombre) : String(x.codigo) }));
        const codsValidos = new Set(fromDB.map((x) => x.value));
        const labelsMap = new Map<string, string>();
        for (const o of fromDB) {
          labelsMap.set(o.label.trim().toLowerCase(), o.value);
        }
        // Map labels antiguos usados al código del catálogo
        const alias: Record<string, string> = {
          'medicina familiar': 'medicina_familiar',
          'dental': 'dentista',
          'dentista': 'dentista',
          'fisioterapia': 'fisioterapia',
          'pediatría': 'pediatria',
          'pediatria': 'pediatria',
          'ginecología': ESPECIALIDAD_OTRA_KEY,
          'oftalmología': ESPECIALIDAD_OTRA_KEY,
          'otra': ESPECIALIDAD_OTRA_KEY,
          'general': 'General',
          'chequeo': 'chequeo',
          'chequeo general': 'chequeo',
          'oncología': 'oncologo',
          'oncologo': 'oncologo',
          'podología': 'podologo',
          'podologo': 'podologo',
          'vacunas': 'vacunas',
          'esquema de vacunas': 'vacunas',
        };
        setOptsEspecialidades([...fromDB, { value: ESPECIALIDAD_OTRA_KEY, label: 'Otra (no catalogada)' }]);
        setDraft((d) => {
          let changed = false;
          const nuevasCitas = d.citas.map((c) => {
            const espRaw = String(c.especialidad || '').trim();
            if (!espRaw) {
              changed = true;
              return { ...c, especialidad: ESPECIALIDAD_DEFAULT };
            }
            if (codsValidos.has(espRaw)) return c;
            if (espRaw === ESPECIALIDAD_OTRA_KEY) return c;
            const lc = espRaw.toLowerCase();
            const matchExacto = alias[lc];
            const matchLabel = labelsMap.get(lc);
            const fin = matchExacto || matchLabel || ESPECIALIDAD_OTRA_KEY;
            changed = true;
            const esOtraAhora = fin === ESPECIALIDAD_OTRA_KEY;
            const preservaTexto = esOtraAhora ? espRaw : '';
            return {
              ...c,
              especialidad: fin,
              especialidadOtraTexto: preservaTexto
                ? c.especialidadOtraTexto
                  ? `${preservaTexto}, ${c.especialidadOtraTexto}`
                  : preservaTexto
                : (c.especialidadOtraTexto || ''),
            };
          });
          if (!changed) return d;
          return { ...d, citas: nuevasCitas };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [draft, setDraft] = useState<ExpedienteDraft>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ExpedienteDraft;
          return parsed;
        } catch {
          return createEmptyDraft();
        }
      }
    } catch {}
    return createEmptyDraft();
  });

  const [activeCitaIdx, setActiveCitaIdx] = useState(0);
  const [newChip, setNewChip] = useState<{ alergia: string; medicamento: string }>({
    alergia: '',
    medicamento: '',
  });
  const confirmRef = useRef<{ hecho: boolean }>({ hecho: false });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sending, setSending] = useState(false);
  const [showDedupeDialog, setShowDedupeDialog] = useState(false);
  const [duplicatePaciente, setDuplicatePaciente] = useState<Paciente | null>(null);
  const [mergeOverrideId, setMergeOverrideId] = useState<string | null>(null);

  // 1-shot al montar: recuperación de borrador (useRef sin dependencias state, rompe loop 185).
  useEffect(() => {
    if (confirmRef.current.hecho) return;
    confirmRef.current.hecho = true;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      JSON.parse(raw);
    } catch {
      return;
    }
    // Desacoplamos interacción síncrona window.confirm con setTimeout(0) para
    // evitar loops 185 cuando el browser integrado (TRAE) re-ejecuta StrictMode.
    const idTimer = window.setTimeout(() => {
      const ok = window.confirm(
        'Se detectó un borrador anterior sin finalizar. ¿Deseas continuar con ese borrador? Si respondes "No" se empezará desde cero.'
      );
      if (!ok) {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        setDraft(createEmptyDraft());
        setActiveCitaIdx(0);
      }
    }, 0);
    return () => { window.clearTimeout(idTimer); };
  }, []);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch {}
    }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [draft]);

  const pacienteInvalido = useMemo(() => {
    const p = draft.paciente;
    return !(
      p.nombre.trim().length > 0 &&
      p.apellido.trim().length > 0 &&
      p.fechaNacimiento.trim().length > 0 &&
      (p.sexo === 'Masculino' || p.sexo === 'Femenino') &&
      p.telefono.trim().length > 0
    );
  }, [draft.paciente]);

  const citasInvalidas = useMemo(
    () => draft.citas.length < 1 || draft.citas.some((c) => !c.fechaCita),
    [draft.citas]
  );

  const puedeGuardar = useMemo(
    () => !pacienteInvalido && !citasInvalidas,
    [pacienteInvalido, citasInvalidas]
  );

  const tooltipMensaje = useMemo(() => {
    const msgs: string[] = [];
    if (pacienteInvalido) msgs.push('Completa los 5 campos obligatorios del paciente');
    if (citasInvalidas) msgs.push('Agrega al menos 1 cita histórica con fecha');
    return msgs.join(' · ') || 'Listo para guardar';
  }, [pacienteInvalido, citasInvalidas]);

  const sanitizeTitleNombre = (raw: string) => {
    const s = String(raw || '').normalize('NFC');
    const soloPermitidos = s.replace(
      /[^A-Za-zñÑáéíóúÁÉÍÓÚüÜ\u0301\u0308\u0303\s'’\-]/g,
      '',
    );
    const trimmed = soloPermitidos.trim();
    if (!trimmed) return '';
    const unidoEspacios = trimmed.replace(/\s{2,}/g, ' ');
    const palabras = unidoEspacios.split(/([\s'’\-]+)/);
    const titled = palabras
      .map((chunk) => {
        if (!chunk) return '';
        if (/^[\s'’\-]+$/.test(chunk)) return chunk;
        return (
          chunk.charAt(0).toLocaleUpperCase('es-MX') +
          chunk.slice(1).toLocaleLowerCase('es-MX')
        );
      })
      .join('');
    return titled;
  };

  const onCambioNombre = (v: string) => {
    actualizarPaciente('nombre', sanitizeTitleNombre(v));
  };
  const onCambioApellido = (v: string) => {
    actualizarPaciente('apellido', sanitizeTitleNombre(v));
  };

  const actualizarPaciente = <K extends keyof PacienteDraft>(
    key: K,
    value: PacienteDraft[K]
  ) => {
    setDraft((d) => ({ ...d, paciente: { ...d.paciente, [key]: value } }));
  };

  const actualizarInfoMedica = <K extends keyof InfoMedicaDraft>(
    key: K,
    value: InfoMedicaDraft[K]
  ) => {
    setDraft((d) => ({ ...d, infoMedica: { ...d.infoMedica, [key]: value } }));
  };

  const actualizarAntecedente = <K extends keyof AntecedentesGeneralesDraft>(
    key: K,
    value: AntecedentesGeneralesDraft[K]
  ) => {
    setDraft((d) => ({
      ...d,
      infoMedica: {
        ...d.infoMedica,
        antecedentes: {
          ...d.infoMedica.antecedentes,
          [key]: value,
        },
      },
    }));
  };

  const agregarAlergia = () => {
    const txt = newChip.alergia.trim();
    if (!txt) return;
    if (draft.infoMedica.alergias.includes(txt)) {
      setNewChip((s) => ({ ...s, alergia: '' }));
      return;
    }
    actualizarInfoMedica('alergias', [...draft.infoMedica.alergias, txt]);
    setNewChip((s) => ({ ...s, alergia: '' }));
  };

  const quitarAlergia = (v: string) => {
    actualizarInfoMedica(
      'alergias',
      draft.infoMedica.alergias.filter((a) => a !== v)
    );
  };

  const agregarMedicamento = () => {
    const txt = newChip.medicamento.trim();
    if (!txt) return;
    if (draft.infoMedica.medicamentosActuales.includes(txt)) {
      setNewChip((s) => ({ ...s, medicamento: '' }));
      return;
    }
    actualizarInfoMedica('medicamentosActuales', [
      ...draft.infoMedica.medicamentosActuales,
      txt,
    ]);
    setNewChip((s) => ({ ...s, medicamento: '' }));
  };

  const quitarMedicamento = (v: string) => {
    actualizarInfoMedica(
      'medicamentosActuales',
      draft.infoMedica.medicamentosActuales.filter((a) => a !== v)
    );
  };

  const agregarCita = () => {
    const nuevoIdx = draft.citas.length;
    setDraft((d) => ({
      ...d,
      citas: [...d.citas, createEmptyCita(nuevoIdx)],
    }));
    setActiveCitaIdx(nuevoIdx);
  };

  const eliminarCita = (idx: number) => {
    if (draft.citas.length <= 1) {
      toast.warning('Debe existir al menos una cita histórica');
      return;
    }
    setDraft((d) => ({
      ...d,
      citas: d.citas.filter((_, i) => i !== idx),
    }));
    setActiveCitaIdx((prev) => Math.min(Math.max(0, prev - 1), Math.max(0, draft.citas.length - 2)));
  };

  const actualizarCita = <K extends keyof CitaHistoricaDraft>(
    idx: number,
    key: K,
    value: CitaHistoricaDraft[K]
  ) => {
    setDraft((d) => ({
      ...d,
      citas: d.citas.map((c, i) => (i === idx ? { ...c, [key]: value } : c)),
    }));
  };

  const actualizarSV = (
    idx: number,
    key: keyof SignosVitalesDraft,
    value: string
  ) => {
    setDraft((d) => ({
      ...d,
      citas: d.citas.map((c, i) =>
        i === idx
          ? {
              ...c,
              signosVitales: { ...c.signosVitales, [key]: value },
            }
          : c
      ),
    }));
  };

  const formatearFechaTab = (f: string) => {
    if (!f) return 'sin fecha';
    try {
      const [y, m, d] = f.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return f;
    }
  };

  const parseNumOrNull = (v?: string) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const TR = (s: string | null | undefined, max = 50000) => {
    if (s === null || s === undefined) return s;
    const t = String(s);
    return t.length > max ? t.substring(0, max) : t;
  };

  const armarCuerpo = (mergePacienteId?: string | null) => {
    return {
      paciente: {
        id: mergePacienteId || undefined,
        nombre: TR(draft.paciente.nombre.trim(), 200)!,
        apellido: TR(draft.paciente.apellido.trim(), 200)!,
        fechaNacimiento: draft.paciente.fechaNacimiento.trim(),
        sexo: draft.paciente.sexo as 'Masculino' | 'Femenino',
        telefono: TR(draft.paciente.telefono.trim(), 50)!,
        capturadoPorUsuarioId: user?.id || undefined,
      },
      infoMedica: {
        alergias: draft.infoMedica.alergias.map((a) => TR(a, 500)!).filter(Boolean),
        medicamentosActuales: draft.infoMedica.medicamentosActuales.map((a) => TR(a, 500)!).filter(Boolean),
        antecedentes: {
          ...draft.infoMedica.antecedentes,
          patologicos: TR(draft.infoMedica.antecedentes.patologicos?.trim() || '', 50000) || undefined,
          familiares: TR(draft.infoMedica.antecedentes.familiares?.trim() || '', 50000) || undefined,
        },
        antecedentesPsicosociales: TR(draft.infoMedica.antecedentesPsicosociales.trim(), 50000) || undefined,
        notas: TR(draft.infoMedica.notas.trim(), 50000) || undefined,
      },
      citas: draft.citas.map((c) => {
        const esOtra = c.especialidad === ESPECIALIDAD_OTRA_KEY;
        const codigoEspecialidad = esOtra ? ESPECIALIDAD_DEFAULT : c.especialidad;
        const otraTexto = esOtra ? c.especialidadOtraTexto?.trim() : '';
        return {
          fechaCita: c.fechaCita,
          especialidad: TR(codigoEspecialidad, 200),
          especialidadOtra: esOtra && otraTexto ? TR(otraTexto, 500) : undefined,
          encargadoTriage: TR(c.encargadoTriage?.trim(), 500) || undefined,
          doctorProveedor: TR(c.doctorProveedor?.trim(), 500) || undefined,
          signosVitales: {
            temperatura: parseNumOrNull(c.signosVitales.temperatura),
            presionArterial: TR(c.signosVitales.presionArterial?.trim(), 200) || undefined,
            ritmoCardiaco: parseNumOrNull(c.signosVitales.ritmoCardiaco),
            frecuenciaRespiratoria: parseNumOrNull(c.signosVitales.frecuenciaRespiratoria),
            saturacionOxigeno: parseNumOrNull(c.signosVitales.saturacionOxigeno),
            azucarEnSangre: parseNumOrNull(c.signosVitales.azucarEnSangre),
            altura: parseNumOrNull(c.signosVitales.altura),
            peso: parseNumOrNull(c.signosVitales.peso),
          },
          motivoConsulta: TR(c.motivoConsulta?.trim(), 50000) || undefined,
          observacionesHpi: TR(c.observacionesHpi?.trim(), 50000) || undefined,
          padecimientoActual: TR(c.padecimientoActual?.trim(), 50000) || undefined,
          medicamentosRx: TR(c.medicamentosRx?.trim(), 50000) || undefined,
          tratamientoPt: TR(c.tratamientoPt?.trim(), 50000) || undefined,
          planSeguimiento: TR(c.planSeguimiento?.trim(), 50000) || undefined,
        };
      }),
    };
  };

  const doSubmit = async (mergePacienteId?: string | null) => {
    setSending(true);
    const toastId = toast.loading(
      mergePacienteId
        ? 'Agregando citas e información al paciente existente...'
        : 'Guardando expediente capturado...'
    );
    try {
      const body = armarCuerpo(mergePacienteId);
      const res = await fetch('/api/pacientes/expediente-captura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || `Error ${res.status} al guardar`;
        toast.error(String(msg), { id: toastId });
        return;
      }
      toast.success(
        `Expediente guardado · ${data.totalCitas || draft.citas.length} cita(s) histórica(s) registrada(s)`,
        { id: toastId }
      );
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      const pacienteId = data.pacienteId || mergePacienteId;
      if (pacienteId) {
        const pacienteIdStr = String(pacienteId);
        await Promise.all([
          fetchPacientePorId(pacienteIdStr),
          fetchCitasPaciente(pacienteIdStr),
        ]).catch(() => {});
        setTimeout(() => navigate(`/expediente/${pacienteIdStr}`), 250);
      }
    } catch (err: any) {
      toast.error(`Error de conexión: ${err?.message || err}`, { id: toastId });
    } finally {
      setSending(false);
      setMergeOverrideId(null);
      setDuplicatePaciente(null);
      setShowDedupeDialog(false);
    }
  };

  const handleGuardar = async () => {
    if (!puedeGuardar || sending) return;

    if (mergeOverrideId) {
      await doSubmit(mergeOverrideId);
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/pacientes/dedupe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: draft.paciente.nombre.trim(),
          apellido: draft.paciente.apellido.trim(),
          fechaNacimiento: draft.paciente.fechaNacimiento.trim(),
          telefono: draft.paciente.telefono.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.duplicado === true && data?.paciente) {
        setDuplicatePaciente(data.paciente as Paciente);
        setShowDedupeDialog(true);
        setSending(false);
        return;
      }
      await doSubmit(null);
    } catch (err: any) {
      toast.error(`Error al verificar duplicados: ${err?.message || err}`);
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div
        className="max-w-[1400px] w-full mx-auto"
        style={{
          ['--border-input' as any]: 'hsl(var(--border) / 0.65)',
          ['--input-background' as any]: '#ffffff',
        }}
      >
        <div className="sticky top-0 z-20 -mx-8 border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 py-3 sm:py-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/pacientes')}
                  className="shrink-0 self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-lg md:text-xl font-semibold text-foreground leading-tight truncate">
                      Capturar Expediente Histórico
                    </h1>
                    <Badge variant="outline" className="gap-1 border-border/50 bg-surface-tint/60 text-accent-foreground/80">
                      <FileText className="w-3 h-3" />
                      Origen físico
                    </Badge>
                  </div>
                  <p className="text-[13px] sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    Captura en una sola página: datos del paciente, información médica e historial de citas.
                  </p>
                </div>
              </div>
              <Tooltip delayDuration={400}>
                <TooltipTrigger asChild>
                  <div className="w-full sm:w-auto">
                    <Button
                      onClick={handleGuardar}
                      disabled={!puedeGuardar || sending}
                      className="shrink-0 w-full sm:w-auto"
                      size="sm"
                    >
                      <Save className={`w-4 h-4 mr-2 ${sending ? 'animate-spin' : ''}`} />
                      {sending ? 'Guardando…' : 'Guardar Expediente'}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-left">
                  {sending ? 'Enviando datos al servidor…' : tooltipMensaje}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="pt-5 sm:pt-7 pb-20 space-y-10 sm:space-y-12">
          {/* ===== SECCIÓN 1: DATOS PACIENTE ===== */}
          <section id="seccion-paciente" className="space-y-6">
            <header className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">
                  Sección 1
                </p>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight tracking-tight">
                  Datos del paciente e información médica
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                  Información que se registra una sola vez por expediente.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[11px] border-border/60">
                  1 sola vez
                </Badge>
              </div>
            </header>

              <div className="grid gap-5 sm:gap-6 grid-cols-1 xl:grid-cols-2">
                <Card className="shadow-[0_2px_8px_rgba(121,201,197,0.05)] border-border/70">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-[17px] leading-snug">
                      <User className="w-4.5 h-4.5 text-primary shrink-0" />
                      Datos Generales del Paciente
                      <Badge variant="destructive" className="ml-auto text-[11px]">
                        * Obligatorios
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="import-nombre">
                        Nombre(s) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="import-nombre"
                        value={draft.paciente.nombre}
                        onChange={(e) => onCambioNombre(e.target.value)}
                        inputMode="text"
                        autoComplete="given-name"
                        placeholder="Ej. María de los Ángeles"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="import-apellido">
                        Apellidos <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="import-apellido"
                        value={draft.paciente.apellido}
                        onChange={(e) => onCambioApellido(e.target.value)}
                        inputMode="text"
                        autoComplete="family-name"
                        placeholder="Ej. Pérez González"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="import-fecha-nac">
                        Fecha de nacimiento <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="import-fecha-nac"
                        type="date"
                        max={today}
                        value={draft.paciente.fechaNacimiento}
                        onChange={(e) => actualizarPaciente('fechaNacimiento', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="import-sexo">
                        Sexo <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={draft.paciente.sexo}
                        onValueChange={(v) =>
                          actualizarPaciente('sexo', v as 'Masculino' | 'Femenino')
                        }
                      >
                        <SelectTrigger id="import-sexo">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Femenino">Femenino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="import-telefono">
                        Teléfono <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="import-telefono"
                        value={draft.paciente.telefono}
                        onChange={(e) => actualizarPaciente('telefono', e.target.value)}
                        placeholder="Ej. 55 1234 5678"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                  <div className="space-y-2.5">
                    <Label className="text-[13px] leading-tight">Alergias conocidas</Label>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {draft.infoMedica.alergias.map((a) => (
                        <Badge
                          key={a}
                          variant="secondary"
                          className="gap-1 pr-1 pl-2 py-0.5 text-[12px]"
                        >
                          {a}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4.5 w-4.5 p-0 hover:bg-muted rounded-full"
                            onClick={() => quitarAlergia(a)}
                          >
                            <X className="w-2.5 h-2.5" />
                          </Button>
                        </Badge>
                      ))}
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
                      <Button variant="outline" onClick={agregarAlergia}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[13px] leading-tight flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 -mt-0.5" />
                      Medicamentos actuales
                    </Label>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {draft.infoMedica.medicamentosActuales.map((a) => (
                        <Badge
                          key={a}
                          variant="outline"
                          className="gap-1 pr-1 pl-2 py-0.5 text-[12px]"
                        >
                          {a}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4.5 w-4.5 p-0 hover:bg-muted rounded-full"
                            onClick={() => quitarMedicamento(a)}
                          >
                            <X className="w-2.5 h-2.5" />
                          </Button>
                        </Badge>
                      ))}
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
                      <Button variant="outline" onClick={agregarMedicamento}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="xl:col-span-2 shadow-[0_2px_8px_rgba(121,201,197,0.05)] border-border/70">
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
                        value={draft.infoMedica.antecedentes.patologicos || ''}
                        onChange={(e) =>
                          actualizarAntecedente('patologicos', e.target.value)
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
                        value={draft.infoMedica.antecedentes.familiares || ''}
                        onChange={(e) =>
                          actualizarAntecedente('familiares', e.target.value)
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
                        value={draft.infoMedica.antecedentesPsicosociales}
                        onChange={(e) =>
                          actualizarInfoMedica('antecedentesPsicosociales', e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[13px] leading-tight">Notas adicionales / Observaciones generales del expediente</Label>
                      <Textarea
                        rows={5}
                        placeholder="Cualquier dato adicional relevante del expediente físico, contexto, aclaraciones de lectura..."
                        value={draft.infoMedica.notas}
                        onChange={(e) => actualizarInfoMedica('notas', e.target.value)}
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>
              </div>
          </section>

          {/* ===== SECCIÓN 2: CITAS HISTÓRICAS ===== */}
          <section id="seccion-citas" className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">
                  Sección 2
                </p>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight tracking-tight flex items-center gap-2.5 flex-wrap">
                  Citas Históricas
                  <Badge variant="secondary" className="text-[12px] font-medium">
                    {draft.citas.length} registro{draft.citas.length !== 1 ? 's' : ''}
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                  Cada pestaña corresponde a una consulta histórica. Agrega todas las citas disponibles del expediente físico.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={agregarCita}
                      className="h-9"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Nueva Cita
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Agregar nueva cita histórica</TooltipContent>
                </Tooltip>
              </div>
            </header>

            {pacienteInvalido && (
              <Card className="border-amber-200/70 bg-amber-50/50 dark:bg-amber-950/10 shadow-[0_2px_8px_rgba(249,110,91,0.04)]">
                <CardContent className="py-3.5 px-4 flex items-start gap-3">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[13px] text-amber-800 dark:text-amber-200 leading-relaxed">
                    <strong className="font-semibold">Completa la sección 1 antes de guardar:</strong> llena los 5 campos obligatorios del paciente.
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        const el = document.getElementById('seccion-paciente');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }} className="h-8 text-[12px] border-amber-300/70 hover:bg-amber-100/60 text-amber-800 dark:text-amber-200">
                        ↑ Ir a Datos Paciente
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs value={String(activeCitaIdx)} onValueChange={(v) => setActiveCitaIdx(Number(v))}>
              <div
                role="tablist"
                className="tab-bar-citas group/tabbar
                           flex items-stretch
                           border-b border-border
                           overflow-x-auto overflow-y-hidden
                           scroll-smooth
                           [&::-webkit-scrollbar]:h-1.5
                           [&::-webkit-scrollbar]:w-1.5
                           [&::-webkit-scrollbar-thumb]:bg-border/80
                           [&::-webkit-scrollbar-thumb]:rounded-full
                           [&::-webkit-scrollbar-track]:bg-transparent
                           [scrollbar-width]:thin
                           [scrollbar-color]:hsl(var(--border)/0.8)_transparent"
              >
                {draft.citas.map((cita, i) => {
                  const isActive = activeCitaIdx === i;
                  const fechaMostrar = cita.fechaCita
                    ? new Date(cita.fechaCita).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                    : 'sin fecha';
                  return (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      tabIndex={isActive ? 0 : -1}
                      key={cita.id}
                      onClick={() => setActiveCitaIdx(i)}
                      onKeyDown={(e) => {
                        if (e.key === 'Delete' && draft.citas.length > 1) {
                          e.preventDefault();
                          eliminarCita(i);
                        }
                      }}
                      className={[
                        'group/tab relative flex items-center gap-2',
                        'flex-1 min-w-[92px] sm:min-w-[112px] md:min-w-[132px] max-w-[190px]',
                        'shrink',
                        'px-2.5 sm:px-3.5 py-2.5',
                        'rounded-t-lg',
                        'border border-b-0 border-border/80',
                        'transition-colors duration-150 ease-out',
                        isActive
                          ? 'bg-card text-foreground border-border -mb-px z-[1]'
                          : 'bg-transparent text-muted-foreground hover:text-foreground/85 hover:bg-muted/40 -mb-px',
                        i > 0 ? '-ml-px' : '',
                      ].join(' ')}
                    >
                      <Calendar className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover/tab:text-foreground/60'}`} />
                      <div className="flex flex-col items-start min-w-0 leading-tight flex-1">
                        <span className="truncate font-semibold text-[13px] tracking-tight w-full">
                          Cita {i + 1}
                        </span>
                        <span className={`truncate text-[11px] w-full ${!cita.fechaCita ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/75'}`}>
                          {fechaMostrar}
                        </span>
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (draft.citas.length > 1) eliminarCita(i);
                        }}
                        role={draft.citas.length > 1 ? 'button' : undefined}
                        tabIndex={draft.citas.length > 1 ? 0 : -1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (draft.citas.length > 1) eliminarCita(i);
                          }
                        }}
                        className={[
                          'shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full transition-colors ml-0.5',
                          draft.citas.length > 1
                            ? 'cursor-pointer hover:bg-muted/90 text-muted-foreground/70 hover:text-foreground'
                            : 'opacity-25 cursor-not-allowed text-muted-foreground',
                        ].join(' ')}
                        aria-label={draft.citas.length > 1 ? `Eliminar Cita ${i + 1}` : undefined}
                        title={draft.citas.length > 1 ? `Eliminar Cita ${i + 1}` : 'Debe haber al menos una cita'}
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}

                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={agregarCita}
                      className="shrink-0 inline-flex items-center justify-center
                                 h-[42px] min-w-[44px] px-2.5
                                 rounded-t-lg
                                 border border-b-0 border-border/80 -mb-px z-[1]
                                 ml-[-1px]
                                 bg-muted/10 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Nueva Cita Histórica"
                    >
                      <Plus className="w-4.5 h-4.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Nueva Cita Histórica</TooltipContent>
                </Tooltip>
              </div>

              {draft.citas.map((cita, i) => (
                <TabsContent key={cita.id} value={String(i)} className="mt-0">
                  <Card className="shadow-[0_2px_8px_rgba(121,201,197,0.05)] rounded-none rounded-b-xl border-border/80">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base sm:text-[17px] leading-snug flex items-center gap-2 flex-wrap">
                        <Calendar className="w-4.5 h-4.5 text-primary shrink-0" />
                        Cita Histórica #{i + 1}
                        {!cita.fechaCita && (
                          <Badge variant="outline" className="gap-1 text-[11px] text-amber-700 border-amber-200/80 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3" />
                            Falta fecha
                          </Badge>
                        )}
                        {cita.fechaCita && (
                          <Badge variant="secondary" className="font-normal text-[12px]">
                            {new Date(cita.fechaCita).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                          </Badge>
                        )}
                        <Badge variant="outline" className="ml-auto text-[11px]">
                          Exclusiva de esta cita
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 sm:space-y-6">
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <Label>
                            Fecha de la Cita{' '}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="date"
                            max={today}
                            value={cita.fechaCita}
                            onChange={(e) => actualizarCita(i, 'fechaCita', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                          <Label>Especialidad</Label>
                          <Select
                            value={cita.especialidad}
                            onValueChange={(v) => actualizarCita(i, 'especialidad', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {optsEspecialidades.map((e) => (
                                <SelectItem key={e.value} value={e.value}>
                                  {e.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {cita.especialidad === ESPECIALIDAD_OTRA_KEY && (
                          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                            <Label>Escribe la especialidad</Label>
                            <Input
                              placeholder="Ej. Ginecología, Oftalmología, Cardiología..."
                              value={cita.especialidadOtraTexto || ''}
                              onChange={(e) =>
                                actualizarCita(i, 'especialidadOtraTexto', e.target.value)
                              }
                            />
                          </div>
                        )}
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Doctor / Proveedor / Encargado (opcional)</Label>
                          <Input
                            placeholder="Ej. Dr. Fernando Pérez"
                            value={cita.doctorProveedor || ''}
                            onChange={(e) =>
                              actualizarCita(i, 'doctorProveedor', e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                          <Label>Encargado de Triage / Enfermería (opcional)</Label>
                          <Input
                            placeholder="Nombre de quien realizó la toma de signos vitales o triage"
                            value={cita.encargadoTriage || ''}
                            onChange={(e) =>
                              actualizarCita(i, 'encargadoTriage', e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4 sm:pt-5">
                        <div className="flex items-baseline justify-between gap-2 mb-3 sm:mb-4">
                          <h3 className="text-[12px] sm:text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80 flex items-center gap-2">
                            Signos Vitales
                          </h3>
                          <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
                            Todos opcionales para expedientes antiguos
                          </span>
                        </div>
                        <div className="grid gap-3 sm:gap-3.5 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
                          <div className="space-y-1.5">
                            <Label htmlFor={`sv-temp-${i}`} className="text-[11.5px] leading-tight text-muted-foreground/90">
                              Temp (°C)
                            </Label>
                            <Input
                              id={`sv-temp-${i}`}
                              placeholder="36.5"
                              value={cita.signosVitales.temperatura || ''}
                              onChange={(e) => actualizarSV(i, 'temperatura', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`sv-pa-${i}`} className="text-[11.5px] leading-tight text-muted-foreground/90">
                              PA (mmHg)
                            </Label>
                            <Input
                              id={`sv-pa-${i}`}
                              placeholder="120/80"
                              value={cita.signosVitales.presionArterial || ''}
                              onChange={(e) =>
                                actualizarSV(i, 'presionArterial', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`sv-hr-${i}`} className="text-[11.5px] leading-tight text-muted-foreground/90">
                              FC (lpm)
                            </Label>
                            <Input
                              id={`sv-hr-${i}`}
                              placeholder="78"
                              value={cita.signosVitales.ritmoCardiaco || ''}
                              onChange={(e) => actualizarSV(i, 'ritmoCardiaco', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`sv-rr-${i}`} className="text-[11.5px] leading-tight text-muted-foreground/90">
                              FR (rpm)
                            </Label>
                            <Input
                              id={`sv-rr-${i}`}
                              placeholder="18"
                              value={cita.signosVitales.frecuenciaRespiratoria || ''}
                              onChange={(e) =>
                                actualizarSV(i, 'frecuenciaRespiratoria', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`sv-o2-${i}`} className="text-[11.5px] leading-tight text-muted-foreground/90">
                              O2 Sat (%)
                            </Label>
                            <Input
                              id={`sv-o2-${i}`}
                              placeholder="98"
                              value={cita.signosVitales.saturacionOxigeno || ''}
                              onChange={(e) =>
                                actualizarSV(i, 'saturacionOxigeno', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`sv-glu-${i}`} className="text-[11.5px] leading-tight text-muted-foreground/90">
                              Glucosa
                            </Label>
                            <Input
                              id={`sv-glu-${i}`}
                              placeholder="95"
                              value={cita.signosVitales.azucarEnSangre || ''}
                              onChange={(e) =>
                                actualizarSV(i, 'azucarEnSangre', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`sv-alt-${i}`} className="text-[11.5px] leading-tight text-muted-foreground/90">
                              Altura (cm)
                            </Label>
                            <Input
                              id={`sv-alt-${i}`}
                              placeholder="165"
                              value={cita.signosVitales.altura || ''}
                              onChange={(e) => actualizarSV(i, 'altura', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`sv-peso-${i}`} className="text-[11.5px] leading-tight text-muted-foreground/90">
                              Peso (kg)
                            </Label>
                            <Input
                              id={`sv-peso-${i}`}
                              placeholder="68.5"
                              value={cita.signosVitales.peso || ''}
                              onChange={(e) => actualizarSV(i, 'peso', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4 sm:pt-5">
                        <div className="flex items-baseline justify-between gap-2 mb-3 sm:mb-4">
                          <h3 className="text-[12px] sm:text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80 flex items-center gap-2">
                            Nota Clínica de la Cita
                          </h3>
                        </div>
                        <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-tight">Motivo de Consulta (CC)</Label>
                            <Textarea
                              rows={3}
                              placeholder="Quéja principal del paciente en esta cita"
                              value={cita.motivoConsulta || ''}
                              onChange={(e) =>
                                actualizarCita(i, 'motivoConsulta', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-tight">Observaciones / Historia del Padecimiento (HPI)</Label>
                            <Textarea
                              rows={3}
                              placeholder="Descripción del padecimiento actual en esta consulta"
                              value={cita.observacionesHpi || ''}
                              onChange={(e) =>
                                actualizarCita(i, 'observacionesHpi', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2 lg:col-span-2">
                            <Label className="text-[13px] leading-tight">Padecimiento Actual (PE - detalle)</Label>
                            <Textarea
                              rows={3}
                              placeholder="Examen físico relevante, impresión diagnóstica o padecimiento actual documentado"
                              value={cita.padecimientoActual || ''}
                              onChange={(e) =>
                                actualizarCita(i, 'padecimientoActual', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-tight flex items-center gap-1.5">
                              <Pill className="w-3.5 h-3.5 -mt-0.5" />
                              Medicamentos Recetados (RX)
                            </Label>
                            <Textarea
                              rows={4}
                              placeholder="Medicinas recetadas en esta cita, dosis y duración. Un fármaco por línea o texto libre."
                              value={cita.medicamentosRx || ''}
                              onChange={(e) =>
                                actualizarCita(i, 'medicamentosRx', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-tight">Tratamiento / Procedimientos (PT)</Label>
                            <Textarea
                              rows={4}
                              placeholder="Tratamiento indicado, procedimientos realizados, curaciones, etc."
                              value={cita.tratamientoPt || ''}
                              onChange={(e) =>
                                actualizarCita(i, 'tratamientoPt', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2 lg:col-span-2">
                            <Label className="text-[13px] leading-tight">Plan y Seguimiento (A/P)</Label>
                            <Textarea
                              rows={3}
                              placeholder="Plan terapéutico, estudios a realizar, cita de seguimiento, recomendaciones."
                              value={cita.planSeguimiento || ''}
                              onChange={(e) =>
                                actualizarCita(i, 'planSeguimiento', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </section>
        </div>
      </div>

      <AlertDialog
        open={showDedupeDialog}
        onOpenChange={(v) => {
          if (sending) return;
          setShowDedupeDialog(v);
          if (!v) {
            setDuplicatePaciente(null);
            setMergeOverrideId(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Paciente existente detectado
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Los datos ingresados coinciden con un paciente ya registrado en el sistema.
                  Puedes usar el paciente existente y agregarle esta información e historial
                  de citas, o cancelar para revisar los datos.
                </p>
                {duplicatePaciente && (
                  <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant="outline">{duplicatePaciente.numeroExpediente}</Badge>
                        {duplicatePaciente.origenExpediente === 'captura_fisica' ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs">
                            📎 CAPTURADO PREVIAMENTE
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                            ORIGEN: SISTEMA
                          </Badge>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Paciente: </span>
                        <strong className="text-foreground">
                          {duplicatePaciente.nombre}
                          {duplicatePaciente.apellido ? ` ${duplicatePaciente.apellido}` : ''}
                        </strong>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Nacimiento: </span>
                          <span className="font-medium">
                            {duplicatePaciente.fechaNacimiento
                              ? new Date(duplicatePaciente.fechaNacimiento).toLocaleDateString('es-MX')
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tel: </span>
                          <span className="font-medium">{duplicatePaciente.telefono || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sexo: </span>
                          <span className="font-medium">{duplicatePaciente.sexo || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Edad: </span>
                          <span className="font-medium">
                            {duplicatePaciente.edad ?? 'N/A'} años
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 border">
                  <strong className="text-foreground">Qué hace la opción "Usar existente":</strong>{' '}
                  Fusiona alergias y medicamentos (sin duplicados), agrega los nuevos
                  antecedentes marcados, concatena notas/psicosociales no vacíos y agrega
                  todas las N citas históricas nuevas (como CAPTURADAS) sin modificar citas
                  anteriores del paciente.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
            <AlertDialogCancel disabled={sending}>Cancelar (revisar)</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(e) => {
                e.preventDefault();
                if (!duplicatePaciente) return;
                setMergeOverrideId(String(duplicatePaciente.id));
                setShowDedupeDialog(false);
                setTimeout(() => doSubmit(String(duplicatePaciente.id)), 100);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Usar paciente existente y agregar datos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
