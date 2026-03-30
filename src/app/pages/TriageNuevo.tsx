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
  Activity,
  Heart,
  Thermometer,
  User,
  Search,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Edit2,
  Plus,
  UserPlus,
} from 'lucide-react';
import { RegistroTriage, SignosVitales } from '../types';

export function TriageNuevo() {
  const {
    registrosTriage,
    citas,
    pacientes,
    eventos,
    addCita,
    addRegistroTriage,
    updateCita,
    addRegistroAuditoria,
  } = useData();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [triageEnProceso, setTriageEnProceso] = useState<{ [key: string]: Partial<SignosVitales> }>({});
  const [showAddPacienteModal, setShowAddPacienteModal] = useState(false);
  const [pacienteSearch, setPacienteSearch] = useState('');


  const [signosForm, setSignosForm] = useState<SignosVitales>({
    temperatura: 36.5,
    presionArterial: '120/80',
    ritmoCardiaco: 70,
    frecuenciaRespiratoria: 16,
    saturacionOxigeno: 98,
    peso: 70,
    altura: 170,
    azucarEnSangre: 100,
  });

  const [observaciones, setObservaciones] = useState('');

  // Obtener el evento activo del usuario (simplificado: toma el primer evento activo)
  const eventoActivo = eventos.find((e) => e.estado === 'activo' && e.ciudad === user?.ciudad);

  const hoy = new Date().toISOString().split('T')[0];

  // Comparación de fechas segura contra zona horaria:
  // c.fecha viene como "2026-03-22" o "2026-03-22T07:00:00.000Z"
  // Tomamos solo los primeros 10 caracteres para evitar conversión UTC
  const normalizarFecha = (f: string | undefined) => (f ? String(f).substring(0, 10) : '');

  // Obtener todas las citas del evento activo para hoy
  const citasHoy = citas.filter(
    (c) =>
      c.eventoId === eventoActivo?.id &&
      normalizarFecha(c.fecha) === hoy &&
      (c.estado === 'programada' || c.estado === 'en_triage' || c.estado === 'en_consulta')
  );

  // Obtener pacientes con citas hoy
  const pacientesDisponibles = citasHoy.map((cita) => {
    const paciente = pacientes.find((p) => p.id === cita.pacienteId);
    const triageCompletado = registrosTriage.find((t) => t.citaId === cita.id);
    const enProceso = triageEnProceso[cita.id];

    let estado: 'sin_captura' | 'en_proceso' | 'completado' = 'sin_captura';
    if (triageCompletado) {
      estado = 'completado';
    } else if (enProceso && Object.keys(enProceso).length > 0) {
      estado = 'en_proceso';
    }

    return {
      ...paciente,
      cita,
      estado,
      triageCompletado,
    };
  });

  // Filtrar pacientes por búsqueda
  const pacientesFiltrados = pacientesDisponibles.filter(
    (p) =>
      p?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p?.numeroExpediente?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSeleccionarPaciente = (paciente: any) => {
    setSelectedPaciente(paciente);

    // Si ya tiene datos en proceso, cargarlos
    if (triageEnProceso[paciente.cita.id]) {
      const datosEnProceso = triageEnProceso[paciente.cita.id];
      setSignosForm({
        temperatura: datosEnProceso.temperatura || 36.5,
        presionArterial: datosEnProceso.presionArterial || '120/80',
        ritmoCardiaco: datosEnProceso.ritmoCardiaco || 70,
        frecuenciaRespiratoria: datosEnProceso.frecuenciaRespiratoria || 16,
        saturacionOxigeno: datosEnProceso.saturacionOxigeno || 98,
        peso: datosEnProceso.peso || 70,
        altura: datosEnProceso.altura || 170,
        azucarEnSangre: datosEnProceso.azucarEnSangre || 100,
      });
    } else if (paciente.triageCompletado) {
      // Si ya está completado, mostrar los datos
      setSignosForm(paciente.triageCompletado.signosVitales);
      setObservaciones(paciente.triageCompletado.observaciones || '');
    } else {
      resetForm();
    }

    setShowModal(true);
  };

  const handleQuickAddCita = async (idPaciente: string) => {
    if (!eventoActivo) return;

    try {
      const hoyStr = new Date().toISOString().split('T')[0];
      const horaStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

      await addCita({
        id: `cita${Date.now()}`,
        eventoId: eventoActivo.id,
        pacienteId: idPaciente,
        fecha: hoyStr,
        hora: horaStr,
        estado: 'programada',
        especialidad: 'medicina_familiar', // Default
        consultorio: 'Consultorio 1',
        costoPagado: 0,
        fechaCreacion: new Date().toISOString()
      });

      setShowAddPacienteModal(false);
      setPacienteSearch('');
      
      addRegistroAuditoria({
        id: `aud${Date.now()}`,
        usuarioId: user?.id || '',
        nombreUsuario: user?.nombre || '',
        rol: user?.rol || 'triage',
        accion: 'Cita Rápida',
        detalles: `Agregó paciente a lista de hoy desde triage`,
        fechaHora: new Date().toISOString(),
        ciudad: user?.ciudad || 'puerto_penasco',
      });
    } catch (err) {
      console.error('Error al agregar cita rápida:', err);
    }
  };

  const handleGuardarEnProceso = () => {
    if (!selectedPaciente) return;

    setTriageEnProceso({
      ...triageEnProceso,
      [selectedPaciente.cita.id]: signosForm,
    });

    updateCita(selectedPaciente.cita.id, { estado: 'en_triage' });

    setShowModal(false);
    setSelectedPaciente(null);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaciente) return;

    const nuevoRegistro: RegistroTriage = {
      id: `tri${Date.now()}`,
      pacienteId: selectedPaciente.id,
      citaId: selectedPaciente.cita.id,
      fechaHora: new Date().toISOString(),
      signosVitales: signosForm,
      observaciones: observaciones || undefined,
      realizadoPor: user?.nombre || '',
    };

    addRegistroTriage(nuevoRegistro);
    updateCita(selectedPaciente.cita.id, { estado: 'en_consulta' });

    // Limpiar datos en proceso si existen
    const nuevoTriageEnProceso = { ...triageEnProceso };
    delete nuevoTriageEnProceso[selectedPaciente.cita.id];
    setTriageEnProceso(nuevoTriageEnProceso);

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'triage',
      accion: 'Registrar Triage',
      detalles: `Registró signos vitales para ${selectedPaciente.nombre}`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    setShowModal(false);
    setSelectedPaciente(null);
    resetForm();
  };

  const resetForm = () => {
    setSignosForm({
      temperatura: 36.5,
      presionArterial: '120/80',
      ritmoCardiaco: 70,
      frecuenciaRespiratoria: 16,
      saturacionOxigeno: 98,
      peso: 70,
      altura: 170,
      azucarEnSangre: 100,
    });
    setObservaciones('');
  };

  const calcularIMC = (peso: number, altura: number) => {
    const alturaMetros = altura / 100;
    return (peso / (alturaMetros * alturaMetros)).toFixed(1);
  };

  const getIMCCategoria = (imc: number) => {
    if (imc < 18.5) return { texto: 'Bajo peso', color: 'text-blue-600' };
    if (imc < 25) return { texto: 'Normal', color: 'text-green-600' };
    if (imc < 30) return { texto: 'Sobrepeso', color: 'text-yellow-600' };
    return { texto: 'Obesidad', color: 'text-red-600' };
  };

  const evaluarSignosVitales = (signos: SignosVitales) => {
    const alertas = [];

    if (signos.temperatura < 36 || signos.temperatura > 37.5) {
      alertas.push('Temperatura fuera de rango');
    }
    if (signos.ritmoCardiaco < 60 || signos.ritmoCardiaco > 100) {
      alertas.push('Ritmo cardíaco anormal');
    }
    if (signos.saturacionOxigeno && signos.saturacionOxigeno < 95) {
      alertas.push('Saturación de oxígeno baja');
    }
    if (signos.azucarEnSangre && (signos.azucarEnSangre < 70 || signos.azucarEnSangre > 140)) {
      alertas.push('Glucosa fuera de rango');
    }

    return alertas;
  };

  const getEstadoBadge = (estado: string) => {
    if (estado === 'completado') {
      return (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completado
        </Badge>
      );
    } else if (estado === 'en_proceso') {
      return (
        <Badge className="bg-yellow-100 text-yellow-700">
          <Clock className="w-3 h-3 mr-1" />
          En Proceso
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-700">
          <Activity className="w-3 h-3 mr-1" />
          Sin Captura
        </Badge>
      );
    }
  };

  const contadores = {
    sinCaptura: pacientesDisponibles.filter((p) => p.estado === 'sin_captura').length,
    enProceso: pacientesDisponibles.filter((p) => p.estado === 'en_proceso').length,
    completados: pacientesDisponibles.filter((p) => p.estado === 'completado').length,
    total: pacientesDisponibles.length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Estación de Triage</h1>
          <p className="text-gray-600 mt-1">
            Pacientes con cita para hoy - {eventoActivo?.nombre || 'Sin evento activo'}
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Pacientes Hoy</p>
                  <p className="text-2xl font-semibold text-gray-900">{contadores.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sin Captura</p>
                  <p className="text-2xl font-semibold text-gray-900">{contadores.sinCaptura}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">En Proceso</p>
                  <p className="text-2xl font-semibold text-gray-900">{contadores.enProceso}</p>
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
                  <p className="text-sm text-gray-600">Completados</p>
                  <p className="text-2xl font-semibold text-gray-900">{contadores.completados}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de búsqueda */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar paciente en la lista de hoy..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => setShowAddPacienteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Registrar Paciente a Triaje
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de pacientes disponibles */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Pacientes Disponibles ({pacientesFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pacientesFiltrados.map((paciente) => (
                <Card
                  key={paciente?.id}
                  className={`cursor-pointer hover:shadow-lg transition-all border-2 ${
                    paciente.estado === 'completado'
                      ? 'border-green-200 bg-green-50'
                      : paciente.estado === 'en_proceso'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handleSeleccionarPaciente(paciente)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-12 h-12 rounded-lg ${
                          paciente.estado === 'completado'
                            ? 'bg-green-500'
                            : paciente.estado === 'en_proceso'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        } flex items-center justify-center flex-shrink-0`}
                      >
                        <User className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{paciente?.nombre}</h3>
                        <p className="text-sm text-gray-600 mt-1">{paciente?.numeroExpediente}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          <span>{paciente.cita.hora}</span>
                        </div>
                        <div className="mt-2">{getEstadoBadge(paciente.estado)}</div>
                      </div>
                    </div>

                    {paciente.triageCompletado && (
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                        <div className="text-xs">
                          <p className="text-gray-600">Temperatura</p>
                          <p className="font-semibold text-gray-900">
                            {paciente.triageCompletado.signosVitales.temperatura}°C
                          </p>
                        </div>
                        <div className="text-xs">
                          <p className="text-gray-600">Presión</p>
                          <p className="font-semibold text-gray-900">
                            {paciente.triageCompletado.signosVitales.presionArterial}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {pacientesFiltrados.length === 0 && (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No hay pacientes disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal para capturar signos vitales */}
      {showModal && selectedPaciente && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl my-8 gap-0">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Signos Vitales - Triage</h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-gray-600">{selectedPaciente.nombre}</p>
                  <Badge variant="outline">{selectedPaciente.numeroExpediente}</Badge>
                  <span className="text-sm text-gray-600">Cita: {selectedPaciente.cita.hora}</span>
                  {getEstadoBadge(selectedPaciente.estado)}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedPaciente(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Signos vitales */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <h3 className="font-medium text-gray-900 mb-3">Signos Vitales</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="temperatura">
                        <div className="flex items-center gap-2 mb-1">
                          <Thermometer className="w-4 h-4 text-red-500" />
                          <span>Temperatura (°C) *</span>
                        </div>
                      </Label>
                      <Input
                        id="temperatura"
                        type="number"
                        step="0.1"
                        value={signosForm.temperatura}
                        onChange={(e) =>
                          setSignosForm({ ...signosForm, temperatura: Number(e.target.value) })
                        }
                        required
                        disabled={selectedPaciente.estado === 'completado'}
                      />
                      <p className="text-xs text-gray-500 mt-1">Normal: 36.0 - 37.5</p>
                    </div>

                    <div>
                      <Label htmlFor="presion">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart className="w-4 h-4 text-pink-500" />
                          <span>Presión Arterial *</span>
                        </div>
                      </Label>
                      <Input
                        id="presion"
                        value={signosForm.presionArterial}
                        onChange={(e) =>
                          setSignosForm({ ...signosForm, presionArterial: e.target.value })
                        }
                        placeholder="120/80"
                        required
                        disabled={selectedPaciente.estado === 'completado'}
                      />
                      <p className="text-xs text-gray-500 mt-1">Normal: 120/80</p>
                    </div>

                    <div>
                      <Label htmlFor="ritmo">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <span>Ritmo Cardíaco (bpm) *</span>
                        </div>
                      </Label>
                      <Input
                        id="ritmo"
                        type="number"
                        value={signosForm.ritmoCardiaco}
                        onChange={(e) =>
                          setSignosForm({ ...signosForm, ritmoCardiaco: Number(e.target.value) })
                        }
                        required
                        disabled={selectedPaciente.estado === 'completado'}
                      />
                      <p className="text-xs text-gray-500 mt-1">Normal: 60 - 100</p>
                    </div>

                    <div>
                      <Label htmlFor="respiracion">Frecuencia Respiratoria (rpm) *</Label>
                      <Input
                        id="respiracion"
                        type="number"
                        value={signosForm.frecuenciaRespiratoria}
                        onChange={(e) =>
                          setSignosForm({
                            ...signosForm,
                            frecuenciaRespiratoria: Number(e.target.value),
                          })
                        }
                        required
                        disabled={selectedPaciente.estado === 'completado'}
                      />
                      <p className="text-xs text-gray-500 mt-1">Normal: 12 - 20</p>
                    </div>

                    <div>
                      <Label htmlFor="oxigeno">Saturación de Oxígeno (%)</Label>
                      <Input
                        id="oxigeno"
                        type="number"
                        value={signosForm.saturacionOxigeno}
                        onChange={(e) =>
                          setSignosForm({
                            ...signosForm,
                            saturacionOxigeno: Number(e.target.value),
                          })
                        }
                        disabled={selectedPaciente.estado === 'completado'}
                      />
                      <p className="text-xs text-gray-500 mt-1">Normal: &gt;95%</p>
                    </div>

                    <div>
                      <Label htmlFor="glucosa">Glucosa (mg/dL)</Label>
                      <Input
                        id="glucosa"
                        type="number"
                        value={signosForm.azucarEnSangre}
                        onChange={(e) =>
                          setSignosForm({
                            ...signosForm,
                            azucarEnSangre: Number(e.target.value),
                          })
                        }
                        disabled={selectedPaciente.estado === 'completado'}
                      />
                      <p className="text-xs text-gray-500 mt-1">Normal: 70 - 140</p>
                    </div>
                  </div>
                </div>

                {/* Antropometría */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <h3 className="font-medium text-gray-900 mb-3">Antropometría</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="peso">Peso (kg) *</Label>
                      <Input
                        id="peso"
                        type="number"
                        step="0.1"
                        value={signosForm.peso}
                        onChange={(e) =>
                          setSignosForm({ ...signosForm, peso: Number(e.target.value) })
                        }
                        required
                        disabled={selectedPaciente.estado === 'completado'}
                      />
                    </div>

                    <div>
                      <Label htmlFor="altura">Altura (cm) *</Label>
                      <Input
                        id="altura"
                        type="number"
                        value={signosForm.altura}
                        onChange={(e) =>
                          setSignosForm({ ...signosForm, altura: Number(e.target.value) })
                        }
                        required
                        disabled={selectedPaciente.estado === 'completado'}
                      />
                    </div>

                    <div>
                      <Label>IMC Calculado</Label>
                      <div className="h-10 px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 flex items-center">
                        <span className="font-semibold text-gray-900">
                          {calcularIMC(signosForm.peso, signosForm.altura)}
                        </span>
                        <span
                          className={`ml-2 text-sm ${
                            getIMCCategoria(
                              Number(calcularIMC(signosForm.peso, signosForm.altura))
                            ).color
                          }`}
                        >
                          -{' '}
                          {
                            getIMCCategoria(
                              Number(calcularIMC(signosForm.peso, signosForm.altura))
                            ).texto
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <textarea
                    id="observaciones"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones adicionales sobre el estado del paciente..."
                    disabled={selectedPaciente.estado === 'completado'}
                  />
                </div>

                {/* Alertas */}
                {(() => {
                  const alertas = evaluarSignosVitales(signosForm);
                  if (alertas.length > 0) {
                    return (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-900 mb-1">
                              Signos Vitales Fuera de Rango
                            </p>
                            <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                              {alertas.map((alerta, idx) => (
                                <li key={idx}>{alerta}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {selectedPaciente.estado !== 'completado' && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowModal(false);
                        setSelectedPaciente(null);
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGuardarEnProceso}
                      className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Guardar en Proceso
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Completar y Enviar a Consulta
                    </Button>
                  </div>
                )}

                {selectedPaciente.estado === 'completado' && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setSelectedPaciente(null);
                        resetForm();
                      }}
                      className="w-full"
                    >
                      Cerrar
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Modal: Agregar Paciente a Lista de Hoy */}
      {showAddPacienteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col gap-0">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Agregar Paciente a Triaje</h2>
              <button
                onClick={() => setShowAddPacienteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-6 overflow-hidden flex flex-col">
              <p className="text-gray-600 mb-4">
                Busca un paciente registrado para agregarlo a la lista de atención de hoy.
              </p>
              
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Nombre o número de expediente..."
                  className="pl-10"
                  value={pacienteSearch}
                  onChange={(e) => setPacienteSearch(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {pacientes
                  .filter(p => !pacientesDisponibles.some(pd => pd.id === p.id)) // Solo pacientes que NO estén ya en la lista
                  .filter(p => 
                    p.nombre.toLowerCase().includes(pacienteSearch.toLowerCase()) || 
                    p.numeroExpediente.toLowerCase().includes(pacienteSearch.toLowerCase())
                  )
                  .slice(0, 50)
                  .map(p => (
                    <div 
                      key={p.id} 
                      className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer flex items-center justify-between group transition-colors"
                      onClick={() => handleQuickAddCita(p.id)}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{p.nombre}</p>
                        <p className="text-sm text-gray-500">{p.numeroExpediente}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar
                      </Button>
                    </div>
                  ))
                }
                {pacienteSearch && pacientes.filter(p => p.nombre.toLowerCase().includes(pacienteSearch.toLowerCase())).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron pacientes que coincidan con la búsqueda.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
