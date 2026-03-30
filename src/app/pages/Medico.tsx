import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Stethoscope,
  User,
  Calendar,
  Clock,
  FileText,
  X,
  Plus,
  CheckCircle2,
  Activity,
  Pill,
  AlertCircle,
  Heart,
  Clipboard,
  Send,
} from 'lucide-react';
import { ConsultaMedica } from '../types';

export function Medico() {
  const {
    citas,
    pacientes,
    consultasMedicas,
    registrosTriage,
    informacionMedica,
    addConsultaMedica,
    updateCita,
    addCirugia,
    addRegistroAuditoria,
  } = useData();
  const { user } = useAuth();
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState<any>(null);

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
  const citasEnConsulta = citas.filter(
    (c) =>
      (c.estado === 'en_consulta' || c.estado === 'en_triage') &&
      (user?.rol === 'administrador' || user?.rol === 'medico' || c.especialidad === user?.especialidad)
  );

  const citasCompletadas = citas.filter(
    (c) =>
      c.estado === 'completada' &&
      (user?.rol === 'administrador' || user?.rol === 'medico' || c.especialidad === user?.especialidad)
  );

  const iniciarConsulta = (cita: any) => {
    const paciente = pacientes.find((p) => p.id === cita.pacienteId);
    const triage = registrosTriage.find((t) => t.citaId === cita.id);
    const infoMedica = informacionMedica.find((i) => i.pacienteId === cita.pacienteId);

    setSelectedCita({ ...cita, paciente, triage, infoMedica });
    setShowConsultaModal(true);
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
      medicoEncargado: user?.nombre || '',
      especialidad: selectedCita.especialidad,
      fechaHora: new Date().toISOString(),
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
    };

    addConsultaMedica(nuevaConsulta);
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
        fechaRegistro: new Date().toISOString().split('T')[0],
      });
    }

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'medico',
      accion: 'Completar Consulta',
      detalles: `Completó consulta para ${selectedCita.paciente.nombre} - Diagnóstico: ${consultaForm.diagnostico}`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    setShowConsultaModal(false);
    setSelectedCita(null);
    resetForm();
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
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Consultorio Médico</h1>
          <p className="text-gray-600 mt-1">
            Pacientes en espera y consultas completadas - {user?.especialidad?.replace('_', ' ')}
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">En Espera</p>
                  <p className="text-2xl font-semibold text-gray-900">{citasEnConsulta.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completadas Hoy</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {
                      citasCompletadas.filter(
                        (c) => c.fecha === new Date().toISOString().split('T')[0]
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
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Consultas</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {consultasMedicas.filter((c) => c.medicoEncargado === user?.nombre).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cirugías Iniciadas</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {
                      consultasMedicas.filter(
                        (c) => c.medicoEncargado === user?.nombre && c.requiereCirugia
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
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-white">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pacientes en Espera ({citasEnConsulta.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {citasEnConsulta.map((cita) => {
                const paciente = pacientes.find((p) => p.id === cita.pacienteId);
                const triage = registrosTriage.find((t) => t.citaId === cita.id);

                return (
                  <Card
                    key={cita.id}
                    className="border-2 border-purple-200 hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-7 h-7 text-white" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">
                                {paciente?.nombre}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                <Badge variant="outline">{paciente?.numeroExpediente}</Badge>
                                <span>{paciente?.edad} años</span>
                                <span>•</span>
                                <span>{paciente?.sexo}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>{cita.hora}</span>
                              </div>
                            </div>
                          </div>

                          {/* Signos vitales del triage */}
                          {triage && (
                            <div className="grid grid-cols-4 gap-3 mt-3">
                              <div className="p-2 bg-red-50 rounded">
                                <p className="text-xs text-gray-600">Temperatura</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {triage.signosVitales.temperatura}°C
                                </p>
                              </div>
                              <div className="p-2 bg-pink-50 rounded">
                                <p className="text-xs text-gray-600">Presión</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {triage.signosVitales.presionArterial}
                                </p>
                              </div>
                              <div className="p-2 bg-blue-50 rounded">
                                <p className="text-xs text-gray-600">Ritmo</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {triage.signosVitales.ritmoCardiaco} bpm
                                </p>
                              </div>
                              <div className="p-2 bg-purple-50 rounded">
                                <p className="text-xs text-gray-600">Glucosa</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {triage.signosVitales.azucarEnSangre || 'N/A'}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 mt-4">
                            <Button
                              onClick={() => iniciarConsulta(cita)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Stethoscope className="w-4 h-4 mr-2" />
                              Iniciar Consulta
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
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No hay pacientes en espera</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Consultas completadas hoy */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-white">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Consultas Completadas Hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {citasCompletadas
                .filter((c) => c.fecha === new Date().toISOString().split('T')[0])
                .map((cita) => {
                  const paciente = pacientes.find((p) => p.id === cita.pacienteId);
                  const consulta = consultasMedicas.find((c) => c.citaId === cita.id);

                  return (
                    <Card key={cita.id} className="border-l-4 border-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{paciente?.nombre}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Diagnóstico:</strong> {consulta?.diagnostico}
                            </p>
                            {consulta?.medicamentosRecetados &&
                              consulta.medicamentosRecetados.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-600">
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
                          <Badge className="bg-green-100 text-green-700">Completada</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

              {citasCompletadas.filter(
                (c) => c.fecha === new Date().toISOString().split('T')[0]
              ).length === 0 && (
                <div className="text-center py-8 text-gray-600">
                  No hay consultas completadas hoy
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de consulta médica */}
      {showConsultaModal && selectedCita && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col bg-white shadow-2xl overflow-hidden border-none">
            <CardHeader className="border-b bg-white sticky top-0 z-20 shadow-sm flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-blue-900">Consulta Médica</CardTitle>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-sm text-gray-600">{selectedCita.paciente.nombre}</p>
                    <Badge variant="outline">{selectedCita.paciente.numeroExpediente}</Badge>
                    <span className="text-sm text-gray-600">
                      {selectedCita.paciente.edad} años - {selectedCita.paciente.sexo}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowConsultaModal(false);
                    setSelectedCita(null);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-6">
                {/* Columna izquierda: Info del paciente */}
                <div className="space-y-4">
                  {/* Datos del paciente */}
                  <Card className="border-2">
                    <CardHeader className="bg-gray-50 p-3">
                      <h3 className="font-semibold text-sm">Datos del Paciente</h3>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2 text-sm">
                      <div>
                        <p className="text-gray-600">Teléfono</p>
                        <p className="font-medium">{selectedCita.paciente.telefono}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Edad</p>
                        <p className="font-medium">{selectedCita.paciente.edad} años</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Sexo</p>
                        <p className="font-medium">{selectedCita.paciente.sexo}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Signos vitales */}
                  {selectedCita.triage && (
                    <Card className="border-2">
                      <CardHeader className="bg-blue-50 p-3">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Signos Vitales
                        </h3>
                      </CardHeader>
                      <CardContent className="p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-red-50 rounded">
                            <p className="text-gray-600">Temperatura</p>
                            <p className="font-semibold">
                              {selectedCita.triage.signosVitales.temperatura}°C
                            </p>
                          </div>
                          <div className="p-2 bg-pink-50 rounded">
                            <p className="text-gray-600">Presión</p>
                            <p className="font-semibold">
                              {selectedCita.triage.signosVitales.presionArterial}
                            </p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded">
                            <p className="text-gray-600">Ritmo</p>
                            <p className="font-semibold">
                              {selectedCita.triage.signosVitales.ritmoCardiaco} bpm
                            </p>
                          </div>
                          <div className="p-2 bg-purple-50 rounded">
                            <p className="text-gray-600">Glucosa</p>
                            <p className="font-semibold">
                              {selectedCita.triage.signosVitales.azucarEnSangre || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 border-t text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-gray-600">Peso</p>
                              <p className="font-medium">
                                {selectedCita.triage.signosVitales.peso} kg
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Altura</p>
                              <p className="font-medium">
                                {selectedCita.triage.signosVitales.altura} cm
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Información médica */}
                  {selectedCita.infoMedica && (
                    <Card className="border-2 border-yellow-200">
                      <CardHeader className="bg-yellow-50 p-3">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Información Médica
                        </h3>
                      </CardHeader>
                      <CardContent className="p-3 space-y-2 text-sm">
                        {selectedCita.infoMedica.alergias.length > 0 && (
                          <div>
                            <p className="text-gray-600 font-medium">Alergias</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedCita.infoMedica.alergias.map(
                                (alergia: string, idx: number) => (
                                  <Badge key={idx} className="bg-red-100 text-red-700 text-xs">
                                    {alergia}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        {selectedCita.infoMedica.antecedentesMedicos && (
                          <div>
                            <p className="text-gray-600 font-medium">Antecedentes</p>
                            <p className="text-xs">{selectedCita.infoMedica.antecedentesMedicos}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Columna central y derecha: Formulario de consulta */}
                <div className="col-span-2">
                  <form onSubmit={handleSubmitConsulta} className="space-y-4">
                    {/* SOAP - Subjetivo */}
                    <Card className="border-2">
                      <CardHeader className="bg-gray-50 p-3">
                        <h3 className="font-semibold">Motivo de Consulta y Padecimiento Actual</h3>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <Label htmlFor="motivo">Motivo de Consulta *</Label>
                          <Input
                            id="motivo"
                            value={consultaForm.motivoConsulta}
                            onChange={(e) =>
                              setConsultaForm({ ...consultaForm, motivoConsulta: e.target.value })
                            }
                            placeholder="Ej: Dolor abdominal, fiebre, etc."
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="padecimiento">Padecimiento Actual *</Label>
                          <textarea
                            id="padecimiento"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            value={consultaForm.padecimientoActual}
                            onChange={(e) =>
                              setConsultaForm({
                                ...consultaForm,
                                padecimientoActual: e.target.value,
                              })
                            }
                            placeholder="Describe el padecimiento actual del paciente..."
                            required
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* SOAP - Objetivo */}
                    <Card className="border-2">
                      <CardHeader className="bg-gray-50 p-3">
                        <h3 className="font-semibold">Exploración Física</h3>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div>
                          <Label htmlFor="exploracion">Hallazgos de Exploración Física *</Label>
                          <textarea
                            id="exploracion"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            value={consultaForm.exploracionFisica}
                            onChange={(e) =>
                              setConsultaForm({
                                ...consultaForm,
                                exploracionFisica: e.target.value,
                              })
                            }
                            placeholder="Hallazgos relevantes de la exploración física..."
                            required
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* SOAP - Evaluación */}
                    <Card className="border-2">
                      <CardHeader className="bg-gray-50 p-3">
                        <h3 className="font-semibold">Diagnóstico</h3>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div>
                          <Label htmlFor="diagnostico">Diagnóstico Médico *</Label>
                          <Input
                            id="diagnostico"
                            value={consultaForm.diagnostico}
                            onChange={(e) =>
                              setConsultaForm({ ...consultaForm, diagnostico: e.target.value })
                            }
                            placeholder="Diagnóstico principal"
                            required
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* SOAP - Plan */}
                    <Card className="border-2">
                      <CardHeader className="bg-gray-50 p-3">
                        <h3 className="font-semibold">Plan de Tratamiento</h3>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <Label htmlFor="tratamiento">Tratamiento *</Label>
                          <textarea
                            id="tratamiento"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            value={consultaForm.tratamiento}
                            onChange={(e) =>
                              setConsultaForm({ ...consultaForm, tratamiento: e.target.value })
                            }
                            placeholder="Plan de tratamiento general..."
                            required
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Medicamentos Recetados</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={agregarMedicamento}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Agregar Medicamento
                            </Button>
                          </div>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Medicamento</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Dosis</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Frecuencia</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Duración</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 w-16"></th>
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
                                        onChange={(e) =>
                                          actualizarMedicamento(idx, 'frecuencia', e.target.value)
                                        }
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
                                          <X className="w-4 h-4 text-red-600" />
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
                          <div className="flex items-center justify-between mb-2">
                            <Label>Estudios o Análisis Indicados</Label>
                            <Button type="button" variant="outline" size="sm" onClick={agregarEstudio}>
                              <Plus className="w-4 h-4 mr-1" />
                              Agregar Estudio
                            </Button>
                          </div>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Tipo de Estudio</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Indicaciones</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 w-16"></th>
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
                                        onChange={(e) =>
                                          actualizarEstudio(idx, 'indicaciones', e.target.value)
                                        }
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
                                          <X className="w-4 h-4 text-red-600" />
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
                          <Label htmlFor="recomendaciones">Recomendaciones</Label>
                          <textarea
                            id="recomendaciones"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            value={consultaForm.recomendaciones}
                            onChange={(e) =>
                              setConsultaForm({ ...consultaForm, recomendaciones: e.target.value })
                            }
                            placeholder="Recomendaciones y cuidados para el paciente..."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="proximaConsulta">Próxima Consulta</Label>
                            <Input
                              id="proximaConsulta"
                              type="date"
                              value={consultaForm.proximaConsulta}
                              onChange={(e) =>
                                setConsultaForm({
                                  ...consultaForm,
                                  proximaConsulta: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="flex items-center gap-3 pt-6">
                            <input
                              type="checkbox"
                              id="requiereCirugia"
                              checked={consultaForm.requiereCirugia}
                              onChange={(e) =>
                                setConsultaForm({
                                  ...consultaForm,
                                  requiereCirugia: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-blue-600"
                            />
                            <Label htmlFor="requiereCirugia" className="cursor-pointer">
                              Requiere Proceso de Cirugía
                            </Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowConsultaModal(false);
                          setSelectedCita(null);
                          resetForm();
                        }}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Completar Consulta
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}