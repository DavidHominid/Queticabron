import { useId, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
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
  Printer,
  FileOutput,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { ConsultaMedica } from '../types';
import { now, nowIso, todayYmd } from '../utils/clock';
import { labelEspecialidad } from '../utils/especialidades';

export function Medico() {
  const { t } = useLanguage();
  const {
    citas,
    pacientes,
    consultasMedicas,
    registrosTriage,
    informacionMedica,
    especialidadesCatalogo,
    addConsultaMedica,
    updateCita,
    addCirugia,
    addRegistroAuditoria,
  } = useData();
  const { user } = useAuth();
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [resumenConsulta, setResumenConsulta] = useState<any>(null);
  const consultaFormId = useId();
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
    proximaConsulta: '',
    requiereCirugia: false,
  });

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
    resetForm();
  };

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

  const handleSubmitConsulta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCita) return;

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
      estudiosIndicados: consultaForm.estudios.filter(
        (e) => e.tipo.trim() !== '' || e.indicaciones.trim() !== ''
      ),
      recomendaciones: consultaForm.recomendaciones,
      proximaConsulta: consultaForm.proximaConsulta || undefined,
      requiereCirugia: consultaForm.requiereCirugia,
    };

    addConsultaMedica({
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
        diagnostico: consultaForm.diagnostico,
        medicoACargo: user?.nombre || '',
        especialidad: selectedCita.especialidad,
        fechaCirugia: '',
        lugarCirugia: '',
        costoEstimado: 0,
        estado: 'pendiente_estudio',
        fechaRegistro: todayYmd(),
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

    // Cerrar y limpiar inmediatamente sin mostrar modal
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
      proximaConsulta: '',
      requiereCirugia: false,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {selectedCita ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-foreground">{t('medico.form.title')}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedCita.paciente?.nombre || t('medico.form.patient')}</span>
                  {selectedCita.paciente?.numeroExpediente ? <Badge variant="outline">{selectedCita.paciente.numeroExpediente}</Badge> : null}
                  {selectedCita.paciente?.edad ? (
                    <span className="text-sm text-muted-foreground">
                      {selectedCita.paciente.edad} {t('medico.form.years')}{selectedCita.paciente?.sexo ? ` · ${selectedCita.paciente.sexo}` : ''}
                    </span>
                  ) : null}
                </div>
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
                    resetForm();
                  }}
                >
                  {t('medico.form.back')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-4">
                <Card className="border border-border">
                  <CardHeader className="bg-muted/20 p-3">
                    <h3 className="text-sm font-semibold">{t('medico.form.patient_data')}</h3>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t('medico.form.phone')}</p>
                      <p className="font-medium">{selectedCita.paciente?.telefono || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('medico.form.age')}</p>
                      <p className="font-medium">{selectedCita.paciente?.edad ? `${selectedCita.paciente.edad} ${t('medico.form.years')}` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('medico.form.sex')}</p>
                      <p className="font-medium">{selectedCita.paciente?.sexo || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                {selectedCita.triage && (
                  <Card className="border border-border">
                    <CardHeader className="bg-muted/20 p-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Activity className="h-4 w-4" />
                        {t('medico.form.vitals')}
                      </h3>
                    </CardHeader>
                    <CardContent className="space-y-2 p-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
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
                          <p className="text-muted-foreground">{t('medico.form.vitals.glucose')}</p>
                          <p className="font-semibold">{selectedCita.triage.signosVitales.azucarEnSangre || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="border-t pt-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-muted-foreground">{t('medico.form.vitals.weight')}</p>
                            <p className="font-medium">{selectedCita.triage.signosVitales.peso} kg</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('medico.form.vitals.height')}</p>
                            <p className="font-medium">{selectedCita.triage.signosVitales.altura} cm</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedCita.infoMedica && (
                  <Card className="border border-border">
                    <CardHeader className="bg-muted/20 p-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <AlertCircle className="h-4 w-4" />
                        {t('medico.form.medical_info')}
                      </h3>
                    </CardHeader>
                    <CardContent className="space-y-2 p-3 text-sm">
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
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-2">
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
                          placeholder="Ej: Dolor abdominal, fiebre, etc."
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
                          placeholder="Describe el padecimiento actual del paciente..."
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
                          placeholder="Hallazgos relevantes de la exploración física..."
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
                          placeholder="Diagnóstico principal"
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
                          placeholder="Plan de tratamiento general..."
                          required
                        />
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <Label>{t('medico.form.medications')}</Label>
                          <Button type="button" variant="outline" size="sm" onClick={agregarMedicamento}>
                            <Plus className="mr-1 h-4 w-4" />
                            {t('medico.form.add_medication')}
                          </Button>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-border">
                          <table className="w-full">
                            <thead className="border-b border-border bg-muted/20">
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
                                      placeholder="Ej: Paracetamol"
                                      className="h-9"
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Input
                                      value={med.dosis}
                                      onChange={(e) => actualizarMedicamento(idx, 'dosis', e.target.value)}
                                      placeholder="Ej: 500mg"
                                      className="h-9"
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Input
                                      value={med.frecuencia}
                                      onChange={(e) => actualizarMedicamento(idx, 'frecuencia', e.target.value)}
                                      placeholder="Ej: Cada 8h"
                                      className="h-9"
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Input
                                      value={med.duracion}
                                      onChange={(e) => actualizarMedicamento(idx, 'duracion', e.target.value)}
                                      placeholder="Ej: 7 días"
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
                            <thead className="border-b border-border bg-muted/20">
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
                                      placeholder="Ej: Radiografía de tórax"
                                      className="h-9"
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Input
                                      value={est.indicaciones}
                                      onChange={(e) => actualizarEstudio(idx, 'indicaciones', e.target.value)}
                                      placeholder="Ej: Para descartar neumonía"
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
                          placeholder="Recomendaciones y cuidados para el paciente..."
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="proximaConsulta">{t('medico.form.next_consultation')}</Label>
                          <Input
                            id="proximaConsulta"
                            type="date"
                            value={consultaForm.proximaConsulta}
                            onChange={(e) => setConsultaForm({ ...consultaForm, proximaConsulta: e.target.value })}
                          />
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
                    </CardContent>
                  </Card>
                </form>
              </div>
            </div>

            <div className="sticky bottom-0 -mx-2 rounded-xl border border-border bg-background/85 px-4 py-3 backdrop-blur sm:mx-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedCita(null);
                    resetForm();
                  }}
                >
                  {t('medico.form.cancel')}
                </Button>
                <Button type="submit" form={consultaFormId}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('medico.form.complete')}
                </Button>
              </div>
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


    </DashboardLayout>
  );
}
