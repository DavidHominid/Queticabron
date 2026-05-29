import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../components/DashboardLayout';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { AgendaCalendar } from '../components/eventos/AgendaCalendar';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateSafe } from '../components/ui/utils';
import {
  Stethoscope,
  User,
  Clock,
  X,
  Plus,
  CheckCircle2,
  Activity,
  Pill,
  AlertCircle,
  Heart,
  FileText,
  Eye,
  Printer,
  FileOutput,
} from 'lucide-react';
import { DetalleCitaCompleta } from '../components/expediente/DetalleCitaCompleta';
import { ConsultaMedica } from '../types';
import { now, nowIso, todayYmd } from '../utils/clock';
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

const slotKeyForHorario = (h: { horaInicio: string; horaFin: string; intervalo?: number; tipoCitaId?: string }) => {
  const intervalo = Number.isFinite(Number(h.intervalo)) ? Math.max(1, Math.floor(Number(h.intervalo))) : 60;
  return `${h.horaInicio}|${h.horaFin}|${intervalo}|${h.tipoCitaId || ''}`;
};

export function Medico() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    eventos,
    citas,
    pacientes,
    consultasMedicas,
    registrosTriage,
    informacionMedica,
    especialidadesCatalogo,
    addConsultaMedica,
    addCita,
    updateCita,
    addCirugia,
    updateSeguimiento,
    addRegistroAuditoria,
    cirugias,
  } = useData();

  // Pending duplicate surgery confirmation
  const [showDuplicateSurgeryDialog, setShowDuplicateSurgeryDialog] = useState(false);
  const pendingSubmitRef = useRef<(() => void) | null>(null);
  const { user } = useAuth();
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [resumenConsulta, setResumenConsulta] = useState<any>(null);
  const consultaFormId = useId();
  const [tabConsulta, setTabConsulta] = useState<'consulta' | 'expediente'>('consulta');
  const especialidadesUsuario = (user?.especialidades?.length ? user.especialidades : user?.especialidad ? [user.especialidad] : []).filter(Boolean);
  const isCitaDelMedico = (c: any) => !c?.medicoEncargado || (c.medicoEncargado === user?.id || c.medicoEncargado === user?.nombre);

  const [consultaForm, setConsultaForm] = useState({
    motivoConsulta: '',
    padecimientoActual: '',
    exploracionFisica: '',
    diagnostico: '',
    tratamiento: '',
    medicamentos: [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }],
    estudios: [{ tipo: '', indicaciones: '' }],
    recomendaciones: '',
    requiereSeguimiento: false,
    notaSeguimiento: '',
    reagendacionRecomendadaDias: '',
    eventoSeguimientoId: '',
    requiereCirugia: false,
  });

  const hoy = useMemo(() => todayYmd(), []);
  const eventoSeguimiento = useMemo(() => {
    const key = String(consultaForm.eventoSeguimientoId || '').trim();
    if (!key) return null;
    return (eventos || []).find((e) => String(e.id) === key) || null;
  }, [consultaForm.eventoSeguimientoId, eventos]);

  const especialidadSeguimiento = useMemo(() => {
    return (selectedCita?.especialidad || especialidadesUsuario[0] || '').trim();
  }, [especialidadesUsuario, selectedCita?.especialidad]);

  const horariosSeguimiento = useMemo(() => {
    if (!eventoSeguimiento || !especialidadSeguimiento) return [];
    return eventoSeguimiento.especialidades?.find((e) => e.especialidad === especialidadSeguimiento)?.horarios || [];
  }, [especialidadSeguimiento, eventoSeguimiento]);

  const [segDesde, setSegDesde] = useState('');
  const [segHasta, setSegHasta] = useState('');
  const [seguimientoHorario, setSeguimientoHorario] = useState<any>(null);
  const [seguimientoMensaje, setSeguimientoMensaje] = useState('');
  const [seguimientoSelectedEventId, setSeguimientoSelectedEventId] = useState('');

  useEffect(() => {
    if (!eventoSeguimiento?.fechaInicio || !eventoSeguimiento?.fechaFin) {
      setSegDesde('');
      setSegHasta('');
      setSeguimientoHorario(null);
      setSeguimientoMensaje('');
      setSeguimientoSelectedEventId('');
      return;
    }
    const start = String(eventoSeguimiento.fechaInicio || '').trim();
    const end = String(eventoSeguimiento.fechaFin || '').trim();
    const startSafe = start && start > hoy ? start : hoy;
    const days = listDaysInclusive(startSafe, end);
    const limited = days.slice(0, 7);
    if (limited.length) {
      setSegDesde(limited[0]);
      setSegHasta(limited[limited.length - 1]);
      setSeguimientoHorario(null);
      setSeguimientoMensaje('');
      setSeguimientoSelectedEventId('');
      return;
    }
    setSegDesde('');
    setSegHasta('');
    setSeguimientoHorario(null);
    setSeguimientoMensaje('');
    setSeguimientoSelectedEventId('');
  }, [eventoSeguimiento?.fechaFin, eventoSeguimiento?.fechaInicio, hoy]);

  useEffect(() => {
    if (!consultaForm.requiereSeguimiento) {
      setSeguimientoHorario(null);
      setSeguimientoMensaje('');
      setSeguimientoSelectedEventId('');
    }
  }, [consultaForm.requiereSeguimiento]);

  // Obtener citas en consulta para el médico
  // Nota: el usuario medico NO tiene campo especialidad en la BD,
  // por lo que mostramos todas las citas en_consulta sin filtrar por especialidad.
  const citasEnConsulta = citas
    .filter(
      (c) =>
        (c.estado === 'en_consulta' || c.estado === 'en_triage') &&
        (user?.rol === 'administrador' ||
          (user?.rol === 'medico'
            ? (especialidadesUsuario.length ? especialidadesUsuario.includes(c.especialidad) : true) && isCitaDelMedico(c)
            : especialidadesUsuario.includes(c.especialidad)))
    )
    .sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')));

  const citasCompletadas = citas.filter(
    (c) =>
      c.estado === 'completada' &&
      (user?.rol === 'administrador' ||
        (user?.rol === 'medico'
          ? (especialidadesUsuario.length ? especialidadesUsuario.includes(c.especialidad) : true) && isCitaDelMedico(c)
          : especialidadesUsuario.includes(c.especialidad)))
  );

  const iniciarConsulta = (cita: any) => {
    const paciente = pacientes.find((p) => p.id === cita.pacienteId);
    const triage = registrosTriage.find((t) => t.citaId === cita.id);
    const infoMedica = informacionMedica.find((i) => i.pacienteId === cita.pacienteId);

    setSelectedCita({ ...cita, paciente, triage, infoMedica });
    setTabConsulta('consulta');
    resetForm();
  };

  const pacienteActual = useMemo(() => {
    const pid = String(selectedCita?.paciente?.id || selectedCita?.pacienteId || '').trim();
    if (!pid) return null;
    return selectedCita?.paciente || pacientes.find((p) => String(p.id) === pid) || null;
  }, [pacientes, selectedCita?.paciente, selectedCita?.pacienteId]);

  const citasPaciente = useMemo(() => {
    const pid = String(pacienteActual?.id || '').trim();
    if (!pid) return [];
    return (citas || []).filter((c) => String(c.pacienteId) === pid);
  }, [citas, pacienteActual?.id]);

  const triagesPaciente = useMemo(() => {
    const pid = String(pacienteActual?.id || '').trim();
    if (!pid) return [];
    return (registrosTriage || []).filter((r) => String(r.pacienteId) === pid);
  }, [pacienteActual?.id, registrosTriage]);

  const consultasPaciente = useMemo(() => {
    const pid = String(pacienteActual?.id || '').trim();
    if (!pid) return [];
    return (consultasMedicas || []).filter((c) => String(c.pacienteId) === pid);
  }, [consultasMedicas, pacienteActual?.id]);

  const infoMedicaPaciente = useMemo(() => {
    const pid = String(pacienteActual?.id || '').trim();
    if (!pid) return null;
    return (informacionMedica || []).find((i) => String(i.pacienteId) === pid) || null;
  }, [informacionMedica, pacienteActual?.id]);

  const [expedienteCitaId, setExpedienteCitaId] = useState<string | null>(null);

  const expedienteDatosPorCita = useMemo(() => {
    const out = new Map<string, { triageData: any; consultaData: any }>();
    const byCitaId = new Map<string, any>();
    for (const c of consultasPaciente) {
      const key = String((c as any).citaId || '').trim();
      if (key && !byCitaId.has(key)) byCitaId.set(key, c);
    }

    for (const cita of citasPaciente) {
      const cid = String(cita.id || '').trim();
      if (!cid) continue;
      const triageMatches = (registrosTriage || []).filter((t) => String(t.citaId) === cid);
      const triage =
        triageMatches.length > 1
          ? triageMatches.sort((a, b) => String(b.fechaHora || '').localeCompare(String(a.fechaHora || '')))[0]
          : triageMatches[0] || null;
      const triageData = triage
        ? {
            ...(triage.signosVitales || {}),
            observaciones: triage.observaciones || '',
            realizadoPor: triage.realizadoPor || '',
            fechaHora: triage.fechaHora || '',
          }
        : null;

      const direct = byCitaId.get(cid) || null;
      let consultaData = direct;

      if (!consultaData && cita.fecha) {
        const fechaCita = String(cita.fecha).substring(0, 10);
        const fallback =
          consultasPaciente
            .filter((c) => String(c.fechaHora || '').substring(0, 10) === fechaCita)
            .sort((a, b) => String(b.fechaHora || '').localeCompare(String(a.fechaHora || '')))[0] || null;
        consultaData = fallback;
      }

      if (triageData || consultaData) out.set(cid, { triageData, consultaData });
    }
    return out;
  }, [citasPaciente, consultasPaciente, registrosTriage]);

  const expedienteCitaSeleccionada = useMemo(() => {
    const id = String(expedienteCitaId || '').trim();
    if (!id) return null;
    return citasPaciente.find((c) => String(c.id) === id) || null;
  }, [citasPaciente, expedienteCitaId]);

  const expedienteDatosSeleccionados = useMemo(() => {
    const id = String(expedienteCitaId || '').trim();
    if (!id) return null;
    return expedienteDatosPorCita.get(id) || null;
  }, [expedienteCitaId, expedienteDatosPorCita]);

  const agregarMedicamento = () => {
    setConsultaForm({
      ...consultaForm,
      medicamentos: [...consultaForm.medicamentos, { nombre: '', dosis: '', frecuencia: '', duracion: '' }],
    });
  };

  const eliminarMedicamento = (index: number) => {
    setConsultaForm({
      ...consultaForm,
      medicamentos: consultaForm.medicamentos.filter((_, i) => i !== index),
    });
  };

  const actualizarMedicamento = (index: number, campo: 'nombre' | 'dosis' | 'frecuencia' | 'duracion', valor: string) => {
    const nuevosMedicamentos = [...consultaForm.medicamentos];
    nuevosMedicamentos[index][campo] = valor;
    setConsultaForm({ ...consultaForm, medicamentos: nuevosMedicamentos });
  };

  const agregarEstudio = () => {
    setConsultaForm({
      ...consultaForm,
      estudios: [...consultaForm.estudios, { tipo: '', indicaciones: '' }],
    });
  };

  const eliminarEstudio = (index: number) => {
    setConsultaForm({
      ...consultaForm,
      estudios: consultaForm.estudios.filter((_, i) => i !== index),
    });
  };

  const actualizarEstudio = (index: number, campo: 'tipo' | 'indicaciones', valor: string) => {
    const nuevosEstudios = [...consultaForm.estudios];
    nuevosEstudios[index][campo] = valor;
    setConsultaForm({ ...consultaForm, estudios: nuevosEstudios });
  };

  /** Builds and saves the consultation + optional surgery (async, supports seguimiento). */
  const handleSubmitConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCita) return;
    setSeguimientoMensaje('');

    const recDiasRaw = String(consultaForm.reagendacionRecomendadaDias || '').trim();
    const recDias = Number(recDiasRaw);
    const intentaraAgendar = Boolean(
      consultaForm.requiereSeguimiento &&
        String(consultaForm.eventoSeguimientoId || '').trim() &&
        seguimientoHorario &&
        especialidadSeguimiento,
    );
    const notaSegBase = String(consultaForm.notaSeguimiento || '').trim();
    let notaSegFinal = notaSegBase;
    if (consultaForm.requiereSeguimiento && !intentaraAgendar && Number.isFinite(recDias) && recDias > 0) {
      const d = new Date(`${hoy}T00:00:00`);
      d.setDate(d.getDate() + Math.floor(recDias));
      const fechaSug = d.toISOString().slice(0, 10);
      const linea = `Reagendar recomendado: ${Math.floor(recDias)} días (${fechaSug}).`;
      if (!notaSegFinal) notaSegFinal = linea;
      else if (!notaSegFinal.includes('Reagendar recomendado')) notaSegFinal = `${notaSegFinal}\n${linea}`;
    }

    const estudiosParaGuardar = consultaForm.estudios.filter(
      (e) => e.tipo.trim() !== '' || e.indicaciones.trim() !== ''
    );

    const nuevaConsulta: ConsultaMedica = {
      id: `con${Date.now()}`,
      citaId: selectedCita.id,
      pacienteId: selectedCita.pacienteId,
      medicoEncargado: user?.id || user?.nombre || '',
      especialidad: selectedCita.especialidad,
      fechaHora: nowIso(),
      motivoConsulta: consultaForm.motivoConsulta,
      padecimientoActual: consultaForm.padecimientoActual,
      exploracionFisica: consultaForm.exploracionFisica,
      diagnostico: consultaForm.diagnostico,
      tratamiento: consultaForm.tratamiento,
      medicamentosRecetados: consultaForm.medicamentos.filter(
        (m) => m.nombre.trim() !== '' || m.dosis.trim() !== '' || m.frecuencia.trim() !== '' || m.duracion.trim() !== ''
      ),
      estudiosIndicados: estudiosParaGuardar,
      recomendaciones: consultaForm.recomendaciones,
      requiereSeguimiento: consultaForm.requiereSeguimiento,
      notaSeguimiento: notaSegFinal,
      eventoSeguimientoId: String(consultaForm.eventoSeguimientoId || '').trim() || undefined,
      requiereCirugia: consultaForm.requiereCirugia,
    };

    const saved = await addConsultaMedica({
      ...nuevaConsulta,
      usuarioId: user?.id,
      nombreUsuario: user?.nombre,
      rol: user?.rol,
      ciudad: user?.ciudad,
    } as any);
    updateCita(selectedCita.id, { estado: 'completada' });

    // Si requiere cirugía, iniciar proceso
    if (consultaForm.requiereCirugia) {
      addCirugia({
        id: `cir${Date.now()}`,
        pacienteId: selectedCita.pacienteId,
        citaId: selectedCita.id,
        diagnostico: consultaForm.diagnostico,
        medicoACargo: user?.nombre || '',
        especialidad: selectedCita.especialidad,
        fechaCirugia: '',
        lugarCirugia: '',
        costoEstimado: 0,
        estado: 'pendiente_estudio',
        fechaRegistro: todayYmd(),
        estudiosRequeridos: estudiosParaGuardar.map(e => ({
          tipo: e.tipo,
          indicaciones: e.indicaciones,
        })),
      });
    }

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'medico',
      accion: 'Completar Consulta',
      detalles: `Completó consulta para ${selectedCita.paciente?.nombre || 'paciente'} (cita ID: ${selectedCita.id}) - Diagnóstico: ${consultaForm.diagnostico}`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    // Si el médico seleccionó un bloque del calendario, crear la cita de seguimiento directamente
    if (intentaraAgendar && seguimientoHorario) {
      const intervalo = Number.isFinite(Number(seguimientoHorario.intervalo))
        ? Math.max(1, Math.floor(Number(seguimientoHorario.intervalo)))
        : 60;
      const fechaSeg = String(seguimientoHorario.dia || '').trim();
      const horaSeg = String(seguimientoHorario.horaInicio || '').trim().slice(0, 5);
      if (fechaSeg && horaSeg) {
        try {
          const nuevaCita = await addCita({
            id: `seg${Date.now()}`,
            pacienteId: selectedCita.pacienteId,
            eventoId: String(consultaForm.eventoSeguimientoId).trim(),
            fecha: fechaSeg,
            hora: horaSeg,
            especialidad: especialidadSeguimiento,
            tipoCitaId: seguimientoHorario.tipoCitaId,
            duracionMinutos: intervalo,
            medicoEncargado: user?.id || user?.nombre || '',
            estado: 'programada',
          } as any);

          // Actualizar el seguimiento (nota_medica) para marcarlo como agendado
          if (saved?.id) {
            await updateSeguimiento(String(saved.id), {
              estado: 'agendada',
              fechaCita: fechaSeg,
              horaCita: horaSeg,
              citaId: nuevaCita?.id ? String(nuevaCita.id) : undefined,
            } as any);
          }
        } catch (err: any) {
          console.error('Error al agendar cita de seguimiento:', err?.message);
        }
      }
    }

    handleCerrarModal();
  };


  const handleCerrarModal = () => {
    setShowExitModal(false);
    setResumenConsulta(null);
    setSelectedCita(null); // Quita al paciente actual de la pantalla
    resetForm(); // Limpia el formulario
  };

  // Funciones placeholder para las impresiones
  const imprimirReceta = () => {
    // Aquí puedes usar una librería como jspdf o simplemente imprimir la ventana
    alert("Generando PDF de la receta...");
    // window.print(); // Solución rápida nativa del navegador
  };

  const imprimirEstudios = () => {
    alert("Generando PDF de la orden de estudios...");
  };

  const resetForm = () => {
    setConsultaForm({
      motivoConsulta: '',
      padecimientoActual: '',
      exploracionFisica: '',
      diagnostico: '',
      tratamiento: '',
      medicamentos: [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }],
      estudios: [{ tipo: '', indicaciones: '' }],
      recomendaciones: '',
      requiereSeguimiento: false,
      notaSeguimiento: '',
      reagendacionRecomendadaDias: '',
      eventoSeguimientoId: '',
      requiereCirugia: false,
    });
  };

  const onPickSeguimientoSlot = (payload: {
    source: 'bloque' | 'nuevo';
    day: string;
    slotKey: string;
    start: string;
    end: string;
    cupoTotal: number;
    cupoOcupado: number;
    disponibles: number;
  }) => {
    if (payload.source !== 'bloque') return;
    setSeguimientoMensaje('');
    if (!eventoSeguimiento || !especialidadSeguimiento) return;
    const horario =
      horariosSeguimiento.find((h: any) => String(h.dia) === String(payload.day) && slotKeyForHorario(h) === String(payload.slotKey)) || null;
    if (!horario) {
      setSeguimientoMensaje('No se encontró el bloque seleccionado.');
      return;
    }
    const nextId = `${payload.day}|${payload.slotKey}`;
    if (seguimientoSelectedEventId && seguimientoSelectedEventId === nextId) {
      setSeguimientoHorario(null);
      setSeguimientoSelectedEventId('');
      return;
    }
    if (payload.disponibles <= 0) {
      setSeguimientoMensaje('Este bloque ya no tiene cupos disponibles.');
      return;
    }
    setSeguimientoHorario(horario);
    setSeguimientoSelectedEventId(nextId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {selectedCita ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-foreground">{t('medico.form.title')}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {labelEspecialidad(selectedCita.especialidad, especialidadesCatalogo)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {String(selectedCita.tipoCitaNombre || '').trim() || t('medico.form.no_type')}
                  </Badge>
                  {selectedCita.hora ? (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      {selectedCita.hora}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedCita(null);
                    setTabConsulta('consulta');
                    resetForm();
                  }}
                >
                  {t('medico.form.back')}
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="border border-border">
                <CardHeader className="bg-muted/20 p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-semibold">{t('medico.form.patient_data')}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedCita.paciente?.numeroExpediente ? <Badge variant="outline">{selectedCita.paciente.numeroExpediente}</Badge> : null}
                      {selectedCita.paciente?.edad ? (
                        <Badge variant="outline" className="text-xs">
                          {selectedCita.paciente.edad} {t('medico.form.years')}
                        </Badge>
                      ) : null}
                      {selectedCita.paciente?.sexo ? (
                        <Badge variant="outline" className="text-xs">
                          {selectedCita.paciente.sexo}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-3 text-sm">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="sm:col-span-2 lg:col-span-4">
                      <p className="text-muted-foreground">{t('medico.form.patient')}</p>
                      <p className="font-medium">{selectedCita.paciente?.nombre || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('medico.form.phone')}</p>
                      <p className="font-medium">{selectedCita.paciente?.telefono || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha de nacimiento</p>
                      <p className="font-medium">{formatDateSafe(selectedCita.paciente?.fechaNacimiento) || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Identificación</p>
                      <p className="font-medium">{selectedCita.paciente?.identificacion || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ciudad</p>
                      <p className="font-medium capitalize">{String(selectedCita.paciente?.ciudad || '-').replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha de registro</p>
                      <p className="font-medium">{formatDateSafe(selectedCita.paciente?.fechaRegistro) || '-'}</p>
                    </div>
                  </div>

                  {selectedCita.triage && (
                    <div className="border-t border-border pt-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Activity className="h-4 w-4" />
                        {t('medico.form.vitals')}
                      </h3>
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                          <div className="rounded-md border border-border bg-muted/10 p-2">
                            <p className="text-muted-foreground">{t('medico.form.vitals.temp')}</p>
                            <p className="font-semibold">{selectedCita.triage.signosVitales.temperatura}°C</p>
                          </div>
                          <div className="rounded-md border border-border bg-muted/10 p-2">
                            <p className="text-muted-foreground">{t('medico.form.vitals.bp')}</p>
                            <p className="font-semibold">{selectedCita.triage.signosVitales.presionArterial}</p>
                          </div>
                          <div className="rounded-md border border-border bg-muted/10 p-2">
                            <p className="text-muted-foreground">{t('medico.form.vitals.hr')}</p>
                            <p className="font-semibold">{selectedCita.triage.signosVitales.ritmoCardiaco} bpm</p>
                          </div>
                          <div className="rounded-md border border-border bg-muted/10 p-2">
                            <p className="text-muted-foreground">{t('medico.form.vitals.rr')}</p>
                            <p className="font-semibold">{selectedCita.triage.signosVitales.frecuenciaRespiratoria} rpm</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                          <div className="rounded-md border border-border bg-muted/10 p-2">
                            <p className="text-muted-foreground">{t('medico.form.vitals.o2')}</p>
                            <p className="font-semibold">
                              {Number.isFinite(Number(selectedCita.triage.signosVitales.saturacionOxigeno))
                                ? `${selectedCita.triage.signosVitales.saturacionOxigeno}%`
                                : 'N/A'}
                            </p>
                          </div>
                          <div className="rounded-md border border-border bg-muted/10 p-2">
                            <p className="text-muted-foreground">{t('medico.form.vitals.glucose')}</p>
                            <p className="font-semibold">
                              {Number.isFinite(Number(selectedCita.triage.signosVitales.azucarEnSangre))
                                ? `${selectedCita.triage.signosVitales.azucarEnSangre}`
                                : 'N/A'}
                            </p>
                          </div>
                          <div className="rounded-md border border-border bg-muted/10 p-2">
                            <p className="text-muted-foreground">{t('medico.form.vitals.weight')}</p>
                            <p className="font-semibold">{selectedCita.triage.signosVitales.peso} kg</p>
                          </div>
                          <div className="rounded-md border border-border bg-muted/10 p-2">
                            <p className="text-muted-foreground">{t('medico.form.vitals.height')}</p>
                            <p className="font-semibold">{selectedCita.triage.signosVitales.altura} cm</p>
                          </div>
                        </div>
                        {(selectedCita.triage.observaciones || selectedCita.triage.realizadoPor) && (
                          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            {selectedCita.triage.observaciones ? (
                              <div className="rounded-md border border-border bg-muted/10 p-2 sm:col-span-2">
                                <p className="text-muted-foreground">Observaciones</p>
                                <p className="font-medium">{selectedCita.triage.observaciones}</p>
                              </div>
                            ) : null}
                            {selectedCita.triage.realizadoPor ? (
                              <div className="rounded-md border border-border bg-muted/10 p-2">
                                <p className="text-muted-foreground">Realizado por</p>
                                <p className="font-medium">{selectedCita.triage.realizadoPor}</p>
                              </div>
                            ) : null}
                            {selectedCita.triage.fechaHora ? (
                              <div className="rounded-md border border-border bg-muted/10 p-2">
                                <p className="text-muted-foreground">Fecha</p>
                                <p className="font-medium">{formatDateSafe(String(selectedCita.triage.fechaHora).substring(0, 10))}</p>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedCita.infoMedica && (
                    <div className="border-t border-border pt-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <AlertCircle className="h-4 w-4" />
                        {t('medico.form.medical_info')}
                      </h3>
                      <div className="mt-3 space-y-2">
                        {selectedCita.infoMedica.alergias.length > 0 && (
                          <div>
                            <p className="font-medium text-muted-foreground">{t('medico.form.allergies')}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {selectedCita.infoMedica.alergias.map((alergia: string, idx: number) => (
                                <Badge key={idx} variant="destructive" className="text-xs">
                                  {alergia}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedCita.infoMedica.antecedentesMedicos && (
                          <div>
                            <p className="font-medium text-muted-foreground">{t('medico.form.background')}</p>
                            <p className="text-xs">{selectedCita.infoMedica.antecedentesMedicos}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {expedienteCitaId ? (
                <div className="space-y-4">
                  {pacienteActual && expedienteCitaSeleccionada ? (
                    <DetalleCitaCompleta
                      cita={expedienteCitaSeleccionada as any}
                      paciente={pacienteActual as any}
                      triageData={expedienteDatosSeleccionados?.triageData || null}
                      consultaData={expedienteDatosSeleccionados?.consultaData || null}
                      especialidadesCatalogo={especialidadesCatalogo as any}
                      onBack={() => {
                        setExpedienteCitaId(null);
                        setTabConsulta('expediente');
                      }}
                      backLabel="Volver al historial"
                    />
                  ) : (
                    <div className="rounded-md border border-border bg-muted/10 p-3 text-sm text-muted-foreground">
                      No se pudo cargar el detalle de esta cita.
                    </div>
                  )}
                </div>
              ) : (
                <Tabs value={tabConsulta} onValueChange={(v) => setTabConsulta(v as any)} className="w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <TabsList className="w-full sm:w-auto">
                      <TabsTrigger value="consulta">Consulta</TabsTrigger>
                      <TabsTrigger value="expediente">Expediente</TabsTrigger>
                    </TabsList>
                    {pacienteActual ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => navigate(`/expediente/${pacienteActual.id}`)}
                      >
                        Ver expediente completo
                      </Button>
                    ) : null}
                  </div>

                  <TabsContent value="consulta">
                    <form id={consultaFormId} onSubmit={handleSubmitConsulta} className="space-y-4">
                  <Card className="border border-border shadow-sm">
                    <CardHeader className="border-b border-border bg-muted/20 p-4">
                      <h3 className="font-semibold">{t('medico.form.reason_current')}</h3>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <Label htmlFor="motivo">{t('medico.form.reason')}</Label>
                        <Input
                          id="motivo"
                          value={consultaForm.motivoConsulta}
                          onChange={(e) => setConsultaForm({ ...consultaForm, motivoConsulta: e.target.value })}
                          placeholder="Ej: Dolor de cabeza persistente, tos con flema, control de diabetes..."
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="padecimiento">{t('medico.form.current_illness')}</Label>
                        <Textarea
                          id="padecimiento"
                          rows={3}
                          value={consultaForm.padecimientoActual}
                          onChange={(e) => setConsultaForm({ ...consultaForm, padecimientoActual: e.target.value })}
                          placeholder="Inicio: hace 3 días. Características: sordo, 7/10 de intensidad, empeora con movimiento. Asociado a náuseas. Sin fiebre."
                          required
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border shadow-sm">
                    <CardHeader className="border-b border-border bg-muted/20 p-4">
                      <h3 className="font-semibold">{t('medico.form.physical_exam_title')}</h3>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div>
                        <Label htmlFor="exploracion">{t('medico.form.physical_exam')}</Label>
                        <Textarea
                          id="exploracion"
                          rows={3}
                          value={consultaForm.exploracionFisica}
                          onChange={(e) => setConsultaForm({ ...consultaForm, exploracionFisica: e.target.value })}
                          placeholder="Tórax: simétrico, sin tiraje. Abdomen: blando, depresible, doloroso en FID. FC 82bpm, FR 18rpm, Temp 36.8°C..."
                          required
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border shadow-sm">
                    <CardHeader className="border-b border-border bg-muted/20 p-4">
                      <h3 className="font-semibold">{t('medico.form.diagnosis_title')}</h3>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div>
                        <Label htmlFor="diagnostico">{t('medico.form.diagnosis')}</Label>
                        <Input
                          id="diagnostico"
                          value={consultaForm.diagnostico}
                          onChange={(e) => setConsultaForm({ ...consultaForm, diagnostico: e.target.value })}
                          placeholder="Ej: J18.9 Neumonía, E11 Diabetes Mellitus tipo 2, K29.7 Gastritis..."
                          required
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border shadow-sm">
                    <CardHeader className="border-b border-border bg-muted/20 p-4">
                      <h3 className="font-semibold">{t('medico.form.treatment_plan')}</h3>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                      <div>
                        <Label htmlFor="tratamiento">{t('medico.form.treatment')}</Label>
                        <Textarea
                          id="tratamiento"
                          rows={2}
                          value={consultaForm.tratamiento}
                          onChange={(e) => setConsultaForm({ ...consultaForm, tratamiento: e.target.value })}
                          placeholder="Ej: Reposo relativo 3 días, hidratación abundante, dieta blanda, control en 7 días..."
                          required
                        />
                      </div>

                      <div>
                        {/* ⚠️ Allergy Alert — fires when any medication name is being typed */}
                        {(() => {
                          const alergias: string[] = selectedCita?.infoMedica?.alergias || [];
                          const hayMedicamentos = consultaForm.medicamentos.some(m => m.nombre.trim().length > 0);
                          if (alergias.length === 0 || !hayMedicamentos) return null;
                          return (
                            <div className="mb-3 flex items-start gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 shadow-md animate-pulse" role="alert">
                              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                              <div>
                                <p className="font-bold text-red-800">&#9888;&#65039; ALERTA: Paciente con alergias conocidas</p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {alergias.map((a, i) => (
                                    <span key={i} className="inline-flex items-center rounded-full bg-red-100 border border-red-400 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                                      {a}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        <div className="mb-2 flex items-center justify-between">
                          <Label>{t('medico.form.medications')}</Label>
                          <Button type="button" variant="outline" size="sm" onClick={agregarMedicamento}>
                            <Plus className="mr-1 h-4 w-4" />
                            {t('medico.form.add_medication')}
                          </Button>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-border">
                          <table className="w-full">
                            <thead className="border-b border-border bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{t('medico.form.medication_name')}</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{t('medico.form.medication_dose')}</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{t('medico.form.medication_freq')}</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{t('medico.form.medication_duration')}</th>
                                <th className="w-16 px-3 py-2 text-center text-xs font-semibold text-muted-foreground"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {consultaForm.medicamentos.map((med, idx) => (
                                <tr key={idx} className="border-b last:border-b-0">
                                  <td className="px-2 py-2">
                                    <Input
                                      value={med.nombre}
                                      onChange={(e) => actualizarMedicamento(idx, 'nombre', e.target.value)}
                                      placeholder="Ej: Amoxicilina, Ibuprofeno, Metformina"
                                      className="h-9"
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Input
                                      value={med.dosis}
                                      onChange={(e) => actualizarMedicamento(idx, 'dosis', e.target.value)}
                                      placeholder="Ej: 500mg, 10ml, 1 tableta"
                                      className="h-9"
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Input
                                      value={med.frecuencia}
                                      onChange={(e) => actualizarMedicamento(idx, 'frecuencia', e.target.value)}
                                      placeholder="Ej: Cada 8h, 2 veces al día"
                                      className="h-9"
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Input
                                      value={med.duracion}
                                      onChange={(e) => actualizarMedicamento(idx, 'duracion', e.target.value)}
                                      placeholder="Ej: 5 días, 2 semanas, 1 mes"
                                      className="h-9"
                                    />
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    {consultaForm.medicamentos.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => eliminarMedicamento(idx)}
                                        className="h-9 w-9 p-0"
                                      >
                                        <X className="h-4 w-4 text-destructive" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <Label>{t('medico.form.studies')}</Label>
                          <Button type="button" variant="outline" size="sm" onClick={agregarEstudio}>
                            <Plus className="mr-1 h-4 w-4" />
                            {t('medico.form.add_study')}
                          </Button>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-border">
                          <table className="w-full">
                            <thead className="border-b border-border bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{t('medico.form.study_type')}</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{t('medico.form.study_indications')}</th>
                                <th className="w-16 px-3 py-2 text-center text-xs font-semibold text-muted-foreground"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {consultaForm.estudios.map((est, idx) => (
                                <tr key={idx} className="border-b last:border-b-0">
                                  <td className="px-2 py-2">
                                    <Input
                                      value={est.tipo}
                                      onChange={(e) => actualizarEstudio(idx, 'tipo', e.target.value)}
                                      placeholder="Ej: BH completa, QS, Radiografía PA de tórax, USG abdominal"
                                      className="h-9"
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Input
                                      value={est.indicaciones}
                                      onChange={(e) => actualizarEstudio(idx, 'indicaciones', e.target.value)}
                                      placeholder="Ej: PA y lateral, ayuno de 8h, con medio de contraste"
                                      className="h-9"
                                    />
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    {consultaForm.estudios.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => eliminarEstudio(idx)}
                                        className="h-9 w-9 p-0"
                                      >
                                        <X className="h-4 w-4 text-destructive" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="recomendaciones">{t('medico.form.recommendations')}</Label>
                        <Textarea
                          id="recomendaciones"
                          rows={2}
                          value={consultaForm.recomendaciones}
                          onChange={(e) => setConsultaForm({ ...consultaForm, recomendaciones: e.target.value })}
                          placeholder="Ej: Reposo, tomar mucha agua, evitar sol, no combinar con alcohol, regresar si hay fiebre >38.5°C o no mejora en 72h..."
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                        <div className="flex items-center gap-3 pt-1 sm:pt-6">
                          <Checkbox
                            id="requiereSeguimiento"
                            checked={consultaForm.requiereSeguimiento}
                            onCheckedChange={(next) => {
                              const enabled = Boolean(next);
                              setConsultaForm({
                                ...consultaForm,
                                requiereSeguimiento: enabled,
                                eventoSeguimientoId: enabled ? consultaForm.eventoSeguimientoId : '',
                                notaSeguimiento: enabled ? consultaForm.notaSeguimiento : '',
                                reagendacionRecomendadaDias: enabled ? consultaForm.reagendacionRecomendadaDias : '',
                              });
                            }}
                          />
                          <Label htmlFor="requiereSeguimiento" className="cursor-pointer">
                            {t('medico.form.requires_followup')}
                          </Label>
                        </div>

                        <div className="flex items-center gap-3 pt-1 sm:pt-6">
                          <Checkbox
                            id="requiereCirugia"
                            checked={consultaForm.requiereCirugia}
                            onCheckedChange={(next) => setConsultaForm({ ...consultaForm, requiereCirugia: Boolean(next) })}
                          />
                          <Label htmlFor="requiereCirugia" className="cursor-pointer">
                            {t('medico.form.requires_surgery')}
                          </Label>
                        </div>
                      </div>

                      {consultaForm.requiereSeguimiento && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <Label htmlFor="eventoSeguimientoId">{t('medico.form.followup_event')}</Label>
                              <select
                                id="eventoSeguimientoId"
                                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                                value={consultaForm.eventoSeguimientoId}
                                onChange={(e) => setConsultaForm({ ...consultaForm, eventoSeguimientoId: e.target.value })}
                              >
                                <option value="">{t('medico.form.followup_event_pending')}</option>
                                {(() => {
                                  const hoy = todayYmd();
                                  const agendables = [...(eventos || [])]
                                    .filter((ev) => String(ev?.fechaFin || '') >= hoy)
                                    .sort((a, b) => String(a.fechaInicio || '').localeCompare(String(b.fechaInicio || '')));
                                  return agendables.slice(0, 3).map((ev) => (
                                    <option key={ev.id} value={ev.id}>
                                      {ev.nombre} · {ev.fechaInicio}-{ev.fechaFin}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="notaSeguimiento">{t('medico.form.followup_note')}</Label>
                              <Textarea
                                id="notaSeguimiento"
                                rows={2}
                                value={consultaForm.notaSeguimiento}
                                onChange={(e) => setConsultaForm({ ...consultaForm, notaSeguimiento: e.target.value })}
                                placeholder={t('medico.form.followup_note_placeholder')}
                              />
                            </div>
                          </div>

                          {!seguimientoHorario && (
                            <div>
                              <Label htmlFor="reagendacionRecomendadaDias">Reagendación recomendada</Label>
                              <select
                                id="reagendacionRecomendadaDias"
                                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                                value={consultaForm.reagendacionRecomendadaDias || ''}
                                onChange={(e) => setConsultaForm({ ...consultaForm, reagendacionRecomendadaDias: e.target.value })}
                              >
                                <option value="">Sin recomendación</option>
                                <option value="15">En 15 días</option>
                                <option value="30">En 1 mes</option>
                                <option value="90">En 3 meses</option>
                                <option value="180">En 6 meses</option>
                              </select>
                            </div>
                          )}

                          {eventoSeguimiento && especialidadSeguimiento && horariosSeguimiento.length > 0 && segDesde && segHasta ? (
                            <div className="rounded-xl border border-border bg-muted/10 p-3">
                              <div className="mb-2 text-sm font-medium text-foreground">{t('medico.form.followup_calendar')}</div>
                              {seguimientoMensaje && <div className="mb-3 text-sm text-destructive">{seguimientoMensaje}</div>}
                              <AgendaCalendar
                                eventoId={eventoSeguimiento.id}
                                especialidad={especialidadSeguimiento}
                                desde={segDesde}
                                hasta={segHasta}
                                horarios={horariosSeguimiento}
                                citas={citas}
                                readOnly
                                allowPick
                                onSlotAction={onPickSeguimientoSlot}
                                selectedEventId={seguimientoSelectedEventId}
                                minDay={hoy}
                              />
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <div>Tipo de cita: {String(selectedCita?.tipoCitaNombre || '').trim() || t('medico.form.no_type')}</div>
                                {seguimientoHorario ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {String(seguimientoHorario.dia || '')} · {String(seguimientoHorario.horaInicio || '')}-{String(seguimientoHorario.horaFin || '')}
                                    </Badge>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSeguimientoHorario(null);
                                        setSeguimientoSelectedEventId('');
                                      }}
                                    >
                                      Quitar selección
                                    </Button>
                                  </div>
                                ) : (
                                  <div>Selecciona un bloque (clic) para agendar al completar la consulta.</div>
                                )}
                              </div>
                            </div>
                          ) : eventoSeguimiento ? (
                            <div className="rounded-xl border border-border bg-muted/10 p-3 text-sm text-muted-foreground">
                              {t('medico.form.followup_calendar_empty')}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedCita(null);
                        setTabConsulta('consulta');
                        resetForm();
                      }}
                    >
                      {t('medico.form.cancel')}
                    </Button>
                    <Button type="submit">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('medico.form.complete')}
                    </Button>
                  </div>
                  </form>
                  </TabsContent>

                <TabsContent value="expediente">
                  {pacienteActual ? (
                    <div className="space-y-4">
                      <Card className="border border-border">
                        <CardHeader className="border-b border-border bg-muted/20 p-4">
                          <CardTitle className="text-base">Historial de citas</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            {citasPaciente
                              .slice()
                              .sort((a, b) => {
                                const fa = String(a.fecha || '').substring(0, 10);
                                const fb = String(b.fecha || '').substring(0, 10);
                                if (fa !== fb) return fb.localeCompare(fa);
                                return String(b.hora || '').localeCompare(String(a.hora || ''));
                              })
                              .map((c) => {
                                const cid = String(c.id || '').trim();
                                const hasDetalle = Boolean(cid && expedienteDatosPorCita.has(cid));
                                return (
                                  <div
                                    key={c.id}
                                    className={`flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm ${hasDetalle ? 'cursor-pointer bg-muted/10 hover:bg-muted/20' : 'bg-muted/5'}`}
                                    onClick={() => {
                                      if (!hasDetalle) return;
                                      setTabConsulta('expediente');
                                      setExpedienteCitaId(cid);
                                    }}
                                  >
                                    <div className="min-w-0">
                                      <div className="font-medium capitalize">{labelEspecialidad(c.especialidad, especialidadesCatalogo)}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatDateSafe(String(c.fecha || '').substring(0, 10))} {c.hora ? `· ${c.hora}` : ''}{' '}
                                        {c.consultorio ? `· ${c.consultorio}` : ''}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {String(c.estado || '').replace('_', ' ')}
                                      </Badge>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={!hasDetalle}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!hasDetalle) return;
                                          setTabConsulta('expediente');
                                          setExpedienteCitaId(cid);
                                        }}
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Ver
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            {citasPaciente.length === 0 ? (
                              <div className="rounded-md border border-border bg-muted/10 p-3 text-sm text-muted-foreground">
                                No hay citas registradas para este paciente.
                              </div>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border bg-muted/10 p-3 text-sm text-muted-foreground">
                      No se encontró el paciente para mostrar el expediente.
                    </div>
                  )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{t('medico.title')}</h1>
              <p className="mt-1 text-muted-foreground">
                {t('medico.subtitle')}
                {especialidadesUsuario.length > 0 ? ` - ${especialidadesUsuario.map((e) => String(e).replaceAll('_', ' ')).join(', ')}` : ''}
              </p>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/10">
                      <Clock className="h-6 w-6 text-[color:var(--brand-secondary-strong)]" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('medico.stats.waiting')}</p>
                      <p className="text-2xl font-semibold text-foreground">{citasEnConsulta.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/10">
                      <CheckCircle2 className="h-6 w-6 text-[color:var(--brand-tertiary)]" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('medico.stats.completed')}</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {
                          citasCompletadas.filter(
                            (c) => c.fecha === todayYmd()
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/10">
                      <Stethoscope className="h-6 w-6 text-[color:var(--brand-primary-strong)]" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('medico.stats.total')}</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {consultasMedicas.filter((c) => c.medicoEncargado === user?.id || c.medicoEncargado === user?.nombre).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/10">
                      <Heart className="h-6 w-6 text-[color:var(--brand-secondary-strong)]" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('medico.stats.surgeries')}</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {
                          consultasMedicas.filter(
                            (c) => (c.medicoEncargado === user?.id || c.medicoEncargado === user?.nombre) && c.requiereCirugia
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pacientes en espera */}
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {t('medico.patients.waiting')} ({citasEnConsulta.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {citasEnConsulta.map((cita) => {
                    const paciente = pacientes.find((p) => p.id === cita.pacienteId);
                    const triage = registrosTriage.find((t) => t.citaId === cita.id);

                    let stateClasses = "border-border";
                    let clockColor = "text-muted-foreground";

                    if (cita.hora) {
                      const [citaH, citaM] = cita.hora.split(':').map(Number);
                      const base = now();
                      const citaTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), citaH, citaM);
                      const diffMinutos = (citaTime.getTime() - base.getTime()) / 60000;

                      if (diffMinutos < -10) {
                        stateClasses = "border-destructive/40 bg-destructive/10";
                        clockColor = "text-destructive font-semibold";
                      } else if (diffMinutos <= 15 && diffMinutos >= -10) {
                        stateClasses = "border-amber-400 bg-amber-50/30";
                        clockColor = "text-amber-600 font-semibold";
                      }
                    }

                    return (
                      <Card
                        key={cita.id}
                        className={`border transition-shadow hover:shadow-md ${stateClasses}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/10">
                              <User className="h-7 w-7 text-[color:var(--brand-secondary-strong)]" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {paciente?.nombre}
                                  </h3>
                                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                    <Badge variant="outline">{paciente?.numeroExpediente}</Badge>
                                    <span>{paciente?.edad} {t('medico.form.years')}</span>
                                    <span>•</span>
                                    <span>{paciente?.sexo}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Badge variant="secondary">
                                      {labelEspecialidad(cita.especialidad, especialidadesCatalogo)}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {String(cita.tipoCitaNombre || '').trim() || t('medico.form.no_type')}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`flex items-center gap-1 text-sm ${clockColor}`}>
                                    <Clock className="w-4 h-4" />
                                    <span>{cita.hora}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Signos vitales del triage */}
                              {triage && (
                                <div className="grid grid-cols-4 gap-3 mt-3">
                                  <div className="rounded-md border border-border bg-muted/10 p-2">
                                    <p className="text-xs text-muted-foreground">{t('medico.form.vitals.temp')}</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {triage.signosVitales.temperatura}°C
                                    </p>
                                  </div>
                                  <div className="rounded-md border border-border bg-muted/10 p-2">
                                    <p className="text-xs text-muted-foreground">{t('medico.form.vitals.bp')}</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {triage.signosVitales.presionArterial}
                                    </p>
                                  </div>
                                  <div className="rounded-md border border-border bg-muted/10 p-2">
                                    <p className="text-xs text-muted-foreground">{t('medico.form.vitals.hr')}</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {triage.signosVitales.ritmoCardiaco} bpm
                                    </p>
                                  </div>
                                  <div className="rounded-md border border-border bg-muted/10 p-2">
                                    <p className="text-xs text-muted-foreground">{t('medico.form.vitals.glucose')}</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {triage.signosVitales.azucarEnSangre || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2 mt-4">
                                <Button
                                  onClick={() => iniciarConsulta(cita)}
                                >
                                  <Stethoscope className="w-4 h-4 mr-2" />
                                  {t('medico.action.start_consultation')}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {citasEnConsulta.length === 0 && (
                    <div className="text-center py-12">
                      <Clock className="mx-auto mb-4 h-16 w-16 text-muted-foreground/40" />
                      <p className="text-muted-foreground">No hay pacientes en espera</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Consultas completadas hoy */}
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Consultas Completadas Hoy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {citasCompletadas
                    .filter((c) => c.fecha === todayYmd())
                    .map((cita) => {
                      const paciente = pacientes.find((p) => p.id === cita.pacienteId);
                      const consulta = consultasMedicas.find((c) => c.citaId === cita.id);

                      return (
                        <Card key={cita.id} className="border border-border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{paciente?.nombre}</h4>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  <strong>Diagnóstico:</strong> {consulta?.diagnostico}
                                </p>
                                {consulta?.medicamentosRecetados &&
                                  consulta.medicamentosRecetados.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-sm text-muted-foreground">
                                        <strong>Medicamentos:</strong>
                                      </p>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {consulta.medicamentosRecetados.map((med, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">
                                            <Pill className="w-3 h-3 mr-1" />
                                            {med.nombre} - {med.dosis} ({med.frecuencia} x {med.duracion})
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                              <Badge variant="secondary">Completada</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                  {citasCompletadas.filter((c) => c.fecha === todayYmd()).length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      No hay consultas completadas hoy
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ─── Duplicate Surgery Warning ─────────────────────────── */}
      {showDuplicateSurgeryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-4 bg-amber-50 border-b border-amber-200 px-6 py-5">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-amber-900">Cirugía Activa Detectada</h2>
                <p className="mt-1 text-sm text-amber-700">
                  Este paciente ya tiene un proceso de cirugía abierto en el sistema.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-3 text-sm text-gray-700">
              <p>
                Crear una segunda cirugía podría generar registros duplicados y confusión en el flujo quirúrgico.
              </p>
              <p className="font-medium text-gray-900">¿Qué deseas hacer?</p>
              <ul className="space-y-1 list-disc list-inside text-gray-600">
                <li><strong>Guardar sin cirugía</strong> — Completa la consulta normalmente sin abrir un nuevo expediente quirúrgico.</li>
                <li><strong>Crear de todas formas</strong> — Si el caso es distinto y justifica un nuevo proceso quirúrgico independiente.</li>
              </ul>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end px-6 pb-6">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateSurgeryDialog(false);
                  pendingSubmitRef.current = null;
                  // Save the consultation WITHOUT creating a new surgery
                  ejecutarGuardadoConsulta(false);
                }}
                className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Guardar sin cirugía
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateSurgeryDialog(false);
                  if (pendingSubmitRef.current) {
                    pendingSubmitRef.current();
                    pendingSubmitRef.current = null;
                  }
                }}
                className="w-full sm:w-auto rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Crear de todas formas
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
