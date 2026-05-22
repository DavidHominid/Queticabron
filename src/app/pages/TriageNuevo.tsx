import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { nowIso, todayYmd } from '../utils/clock';
import { pickEventoActivoParaTriageConCitas, triageCanSeeCita } from '../utils/triageAccess';
import { normalizeCiudad } from '../utils/ciudades';
import { labelEspecialidad } from '../utils/especialidades';
import {
  Activity,
  Heart,
  Thermometer,
  User,
  Search,
  X,
  CheckCircle2,
  Clock,
  Calendar,
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
    especialidadesCatalogo,
    addCita,
    addRegistroTriage,
    updateCita,
    addRegistroAuditoria,
  } = useData();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [triageEnProceso, setTriageEnProceso] = useState<{ [key: string]: Partial<SignosVitales> }>({});



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
  const ciudadesUsuario =
    Array.isArray((user as any)?.ciudades) && (user as any).ciudades.length
      ? ((user as any).ciudades as string[])
      : user?.ciudad
        ? [user.ciudad]
        : [];
  const ciudadesNorm = Array.from(new Set(ciudadesUsuario.map(normalizeCiudad).filter(Boolean)));
  const hoy = todayYmd();
  const eventoActivo = pickEventoActivoParaTriageConCitas(eventos, citas, user, hoy, ciudadesNorm);

  // Comparación de fechas segura contra zona horaria:
  // c.fecha viene como "2026-03-22" o "2026-03-22T07:00:00.000Z"
  // Tomamos solo los primeros 10 caracteres para evitar conversión UTC
  const normalizarFecha = (f: string | undefined) => (f ? String(f).substring(0, 10) : '');

  // Filtramos por todas las citas del día aplicables
  const citasHoy = citas.filter(
    (c) =>
      normalizarFecha(c.fecha) === hoy &&
      (c.estado === 'programada' || c.estado === 'agendada' || c.estado === 'en_triage' || c.estado === 'en_consulta')
  );

  const citasVisibles = citasHoy.filter((c) => {
    const eventoDeLaCita = c.eventoId === 'general' ? null : (eventos.find(e => e.id === c.eventoId) || null);
    return triageCanSeeCita(eventoDeLaCita, c, user);
  });

  // Obtener pacientes con citas hoy
  const pacientesDisponibles = citasVisibles
    .map((cita) => {
    const paciente = pacientes.find((p) => p.id === cita.pacienteId);
    if (!paciente) return null;
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
    })
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  // Filtrar pacientes por búsqueda (mostrar todos, incluyendo completados) y ORDENAR POR HORA
  const pacientesFiltrados = pacientesDisponibles
    .filter(
      (p) =>
        p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numeroExpediente?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const horaA = a.cita?.hora || '23:59';
      const horaB = b.cita?.hora || '23:59';
      return horaA.localeCompare(horaB);
    });

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
      fechaHora: nowIso(),
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
      detalles: `Registró signos vitales para ${selectedPaciente.nombre} (cita ID: ${selectedPaciente.cita.id})`,
      fechaHora: nowIso(),
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
    if (imc < 18.5) return { texto: t('triage.underweight'), color: 'text-blue-600' };
    if (imc < 25) return { texto: t('triage.normal_weight'), color: 'text-green-600' };
    if (imc < 30) return { texto: t('triage.overweight'), color: 'text-yellow-600' };
    return { texto: t('triage.obesity'), color: 'text-red-600' };
  };

  const evaluarSignosVitales = (signos: SignosVitales, edad: number = 30) => {
    const alertas = [];

    // Temperatura (general)
    if (signos.temperatura < 36 || signos.temperatura > 37.5) {
      alertas.push(`Temperatura fuera de rango (Actual: ${signos.temperatura}°C)`);
    }

    // Ritmo Cardíaco por edad
    let minCardio = 60, maxCardio = 100;
    if (edad < 1) { minCardio = 100; maxCardio = 160; }
    else if (edad < 12) { minCardio = 70; maxCardio = 120; }
    if (signos.ritmoCardiaco < minCardio || signos.ritmoCardiaco > maxCardio) {
      alertas.push(`Ritmo cardíaco anormal para su edad (${minCardio}-${maxCardio} bpm)`);
    }

    // Frecuencia Respiratoria por edad
    let minResp = 12, maxResp = 20;
    if (edad < 1) { minResp = 30; maxResp = 60; }
    else if (edad < 12) { minResp = 18; maxResp = 30; }
    if (signos.frecuenciaRespiratoria < minResp || signos.frecuenciaRespiratoria > maxResp) {
      alertas.push(`Frecuencia respiratoria anormal para su edad (${minResp}-${maxResp} rpm)`);
    }

    // Presión Arterial por edad
    if (signos.presionArterial && signos.presionArterial.includes('/')) {
      const parts = signos.presionArterial.split('/');
      const sys = parseInt(parts[0]);
      const dia = parseInt(parts[1]);
      if (!isNaN(sys) && !isNaN(dia)) {
        let maxSys = 120, maxDia = 80;
        let minSys = 90, minDia = 60;
        
        if (edad < 12) { maxSys = 110; maxDia = 75; minSys = 80; minDia = 50; }
        
        if (sys < minSys || sys > maxSys || dia < minDia || dia > maxDia) {
          alertas.push(`Presión arterial anormal para su edad (Esperada: ~${minSys}-${maxSys} / ${minDia}-${maxDia})`);
        }
      }
    }

    // Saturación O2
    if (signos.saturacionOxigeno && signos.saturacionOxigeno < 95) {
      alertas.push(`Saturación de oxígeno baja (<95%)`);
    }

    // Glucosa
    if (signos.azucarEnSangre && (signos.azucarEnSangre < 70 || signos.azucarEnSangre > 140)) {
      alertas.push(`Glucosa fuera de rango normal (70-140 mg/dL)`);
    }

    return alertas;
  };

  const getEstadoBadge = (estado: string) => {
    if (estado === 'completado') {
      return (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {t('triage.completed')}
        </Badge>
      );
    } else if (estado === 'en_proceso') {
      return (
        <Badge className="bg-yellow-100 text-yellow-700">
          <Clock className="w-3 h-3 mr-1" />
          {t('triage.in_progress')}
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-700">
          <Activity className="w-3 h-3 mr-1" />
          {t('triage.no_capture')}
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
          <h1 className="text-2xl font-semibold text-gray-900">{t('triage.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('triage.subtitle')} {eventoActivo?.nombre || t('triage.no_event')}
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
                  <p className="text-sm text-gray-600">{t('triage.total_today')}</p>
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
                  <p className="text-sm text-gray-600">{t('triage.no_capture')}</p>
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
                  <p className="text-sm text-gray-600">{t('triage.in_progress')}</p>
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
                  <p className="text-sm text-gray-600">{t('triage.completed')}</p>
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
                  placeholder={t('triage.search')}
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de pacientes disponibles */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('triage.available_patients')} ({pacientesFiltrados.length})
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
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className="bg-blue-100 text-blue-700">
                            {labelEspecialidad(paciente.cita.especialidad, especialidadesCatalogo)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {String(paciente.cita.tipoCitaNombre || '').trim() || t('triage.no_appt_type')}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-blue-500" />
                            <span>{t('triage.scheduled_for')} {new Date(paciente.cita.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-purple-500" />
                            <span>{t('triage.assigned_time')} {paciente.cita.hora}</span>
                          </div>
                        </div>
                        <div className="mt-2">{getEstadoBadge(paciente.estado)}</div>
                      </div>
                    </div>

                    {paciente.triageCompletado && (
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                        <div className="text-xs">
                          <p className="text-gray-600">{t('triage.temp')}</p>
                          <p className="font-semibold text-gray-900">
                            {paciente.triageCompletado.signosVitales.temperatura}°C
                          </p>
                        </div>
                        <div className="text-xs">
                          <p className="text-gray-600">{t('triage.pressure')}</p>
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
                <p className="text-gray-600">{t('triage.empty_patients')}</p>
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
                <h2 className="text-lg font-semibold text-gray-900">{t('triage.modal_title')}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-gray-600">{selectedPaciente.nombre}</p>
                  <Badge variant="outline">{selectedPaciente.numeroExpediente}</Badge>
                  <span className="text-sm text-gray-600">{t('triage.appt')} {selectedPaciente.cita.hora}</span>
                  {getEstadoBadge(selectedPaciente.estado)}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className="bg-blue-100 text-blue-700">
                    {labelEspecialidad(selectedPaciente.cita.especialidad, especialidadesCatalogo)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {String(selectedPaciente.cita.tipoCitaNombre || '').trim() || 'Sin tipo de cita'}
                  </Badge>
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
                  <h3 className="font-medium text-gray-900 mb-3">{t('triage.vitals')}</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="temperatura">
                        <div className="flex items-center gap-2 mb-1">
                          <Thermometer className="w-4 h-4 text-red-500" />
                          <span>{t('triage.temp_input')}</span>
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
                      <p className="text-xs text-gray-500 mt-1">{t('triage.normal')} 36.0 - 37.5</p>
                    </div>

                    <div>
                      <Label htmlFor="presion">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart className="w-4 h-4 text-pink-500" />
                          <span>{t('triage.pressure_input')}</span>
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
                      <p className="text-xs text-gray-500 mt-1">{t('triage.normal')} 120/80</p>
                    </div>

                    <div>
                      <Label htmlFor="ritmo">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <span>{t('triage.hr_input')}</span>
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
                      <p className="text-xs text-gray-500 mt-1">{t('triage.normal')} 60 - 100</p>
                    </div>

                    <div>
                      <Label htmlFor="respiracion">{t('triage.resp_input')}</Label>
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
                      <p className="text-xs text-gray-500 mt-1">{t('triage.normal')} 12 - 20</p>
                    </div>

                    <div>
                      <Label htmlFor="oxigeno">{t('triage.o2_input')}</Label>
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
                      <p className="text-xs text-gray-500 mt-1">{t('triage.normal')} &gt;95%</p>
                    </div>

                    <div>
                      <Label htmlFor="glucosa">{t('triage.glucose_input')}</Label>
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
                      <p className="text-xs text-gray-500 mt-1">{t('triage.normal')} 70 - 140</p>
                    </div>
                  </div>
                </div>

                {/* Antropometría */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <h3 className="font-medium text-gray-900 mb-3">{t('triage.anthropometry')}</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="peso">{t('triage.weight_input')}</Label>
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
                      <Label htmlFor="altura">{t('triage.height_input')}</Label>
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
                      <Label>{t('triage.imc_calc')}</Label>
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
                  <Label htmlFor="observaciones">{t('triage.observations')}</Label>
                  <textarea
                    id="observaciones"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder={t('triage.obs_placeholder')}
                    disabled={selectedPaciente.estado === 'completado'}
                  />
                </div>

                {/* Alertas */}
                {(() => {
                  const alertas = evaluarSignosVitales(signosForm, selectedPaciente?.edad);
                  if (alertas.length > 0) {
                    return (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-900 mb-1">
                              {t('triage.out_of_range')}
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
                      {t('triage.cancel')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGuardarEnProceso}
                      className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      {t('triage.save_progress')}
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t('triage.complete_send')}
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
                      {t('triage.close')}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
