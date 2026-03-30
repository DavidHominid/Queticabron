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
  Plus, Calendar, MapPin, Users, Clock, DollarSign, X, Trash2, 
  Edit, Eye, ChevronRight, AlertCircle, CheckCircle2, UserPlus 
} from 'lucide-react';
import { Evento, EspecialidadEvento, HorarioDisponible, Especialidad, Ciudad } from '../types';

export function Eventos() {
  const { eventos, addEvento, updateEvento, addRegistroAuditoria } = useData();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Evento>>({
    nombre: '',
    ciudad: user?.ciudad || 'sonoyta',
    fechaInicio: '',
    fechaFin: '',
    fechaLimiteInscripcion: '',
    especialidades: [],
    estado: 'activo',
  });

  const [especialidadForm, setEspecialidadForm] = useState<Partial<EspecialidadEvento>>({
    especialidad: 'medicina_familiar',
    medicoEncargado: '',
    practicante: '',
    consultorio: '',
    costo: 50,
    horarios: [],
  });

  const [horarioForm, setHorarioForm] = useState<HorarioDisponible>({
    dia: '',
    horaInicio: '',
    horaFin: '',
  });

  const especialidadesOptions = [
    { value: 'medicina_familiar', label: 'Medicina Familiar' },
    { value: 'pediatria', label: 'Pediatría' },
    { value: 'fisioterapia', label: 'Fisioterapia' },
    { value: 'vacunas', label: 'Vacunas' },
    { value: 'deteccion_cancer', label: 'Detección Oportuna de Cáncer' },
    { value: 'dentista', label: 'Dentista' },
  ];

  const resetForm = () => {
    setFormData({
      nombre: '',
      ciudad: user?.ciudad || 'sonoyta',
      fechaInicio: '',
      fechaFin: '',
      fechaLimiteInscripcion: '',
      especialidades: [],
      estado: 'activo',
    });
    setEspecialidadForm({
      especialidad: 'medicina_familiar',
      medicoEncargado: '',
      practicante: '',
      consultorio: '',
      costo: 50,
      horarios: [],
    });
    setStep(1);
  };

  const handleAgregarHorario = () => {
    if (horarioForm.dia && horarioForm.horaInicio && horarioForm.horaFin) {
      setEspecialidadForm({
        ...especialidadForm,
        horarios: [...(especialidadForm.horarios || []), horarioForm],
      });
      setHorarioForm({ dia: '', horaInicio: '', horaFin: '' });
    }
  };

  const handleEliminarHorario = (index: number) => {
    setEspecialidadForm({
      ...especialidadForm,
      horarios: especialidadForm.horarios?.filter((_, i) => i !== index) || [],
    });
  };

  const handleAgregarEspecialidad = () => {
    if (
      especialidadForm.especialidad &&
      especialidadForm.medicoEncargado &&
      especialidadForm.consultorio &&
      especialidadForm.horarios &&
      especialidadForm.horarios.length > 0
    ) {
      setFormData({
        ...formData,
        especialidades: [
          ...(formData.especialidades || []),
          especialidadForm as EspecialidadEvento,
        ],
      });
      setEspecialidadForm({
        especialidad: 'medicina_familiar',
        medicoEncargado: '',
        practicante: '',
        consultorio: '',
        costo: 50,
        horarios: [],
      });
    } else {
      alert('Por favor completa todos los campos requeridos y agrega al menos un horario');
    }
  };

  const handleEliminarEspecialidad = (index: number) => {
    setFormData({
      ...formData,
      especialidades: formData.especialidades?.filter((_, i) => i !== index) || [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.especialidades || formData.especialidades.length === 0) {
      alert('Debes agregar al menos una especialidad al evento');
      return;
    }

    const nuevoEvento: Evento = {
      id: `evt${Date.now()}`,
      nombre: formData.nombre || '',
      ciudad: (formData.ciudad as Ciudad) || user?.ciudad || 'sonoyta',
      fechaInicio: formData.fechaInicio || '',
      fechaFin: formData.fechaFin || '',
      fechaLimiteInscripcion: formData.fechaLimiteInscripcion || '',
      especialidades: formData.especialidades || [],
      estado: 'activo',
    };

    addEvento(nuevoEvento);
    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Crear Evento',
      detalles: `Creó evento: ${nuevoEvento.nombre} con ${nuevoEvento.especialidades.length} especialidades`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    setShowModal(false);
    resetForm();
  };

  const calcularDiasRestantes = (fechaLimite: string) => {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    const diff = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const verDetallesEvento = (evento: Evento) => {
    setSelectedEvento(evento);
    setShowDetailModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Gestión de Eventos Médicos</h1>
            <p className="text-gray-600 mt-1">Crea y administra eventos, consultorios y especialidades</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Crear Evento
          </Button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Eventos</p>
                  <p className="text-2xl font-semibold text-gray-900">{eventos.length}</p>
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
                  <p className="text-sm text-gray-600">Activos</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {eventos.filter((e) => e.estado === 'activo').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Especialidades</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {eventos.reduce((acc, e) => acc + e.especialidades.length, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ciudades</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {new Set(eventos.map((e) => e.ciudad)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de eventos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {eventos.map((evento) => {
            const diasRestantes = calcularDiasRestantes(evento.fechaLimiteInscripcion);
            return (
              <Card key={evento.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{evento.nombre}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span className="capitalize">{evento.ciudad.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(evento.fechaInicio).toLocaleDateString('es-MX', { 
                              day: 'numeric', 
                              month: 'short' 
                            })} - {new Date(evento.fechaFin).toLocaleDateString('es-MX', { 
                              day: 'numeric', 
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={
                        evento.estado === 'activo'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }
                    >
                      {evento.estado === 'activo' ? 'Activo' : 'Finalizado'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Información de límite de inscripción */}
                    <div className={`p-3 rounded-lg ${diasRestantes <= 3 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className="flex items-center gap-2">
                        {diasRestantes <= 3 ? (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-600" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${diasRestantes <= 3 ? 'text-red-900' : 'text-blue-900'}`}>
                            Límite de inscripción: {new Date(evento.fechaLimiteInscripcion).toLocaleDateString('es-MX')}
                          </p>
                          <p className={`text-xs ${diasRestantes <= 3 ? 'text-red-700' : 'text-blue-700'}`}>
                            {diasRestantes > 0 ? `${diasRestantes} días restantes` : 'Plazo vencido'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Especialidades */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Especialidades ({evento.especialidades.length})
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {evento.especialidades.slice(0, 4).map((esp, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                            <span className="text-sm text-gray-900 capitalize truncate">
                              {esp.especialidad.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                      {evento.especialidades.length > 4 && (
                        <p className="text-xs text-gray-500 mt-2">
                          +{evento.especialidades.length - 4} más
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => verDetallesEvento(evento)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalles
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {eventos.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay eventos registrados</h3>
              <p className="text-gray-600 mb-6">Comienza creando tu primer evento médico</p>
              <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Evento
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal para crear evento - Wizard de 3 pasos */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl my-8">
            <CardHeader className="border-b sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Crear Nuevo Evento Médico</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Paso {step} de 3</p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                  <span>Información Básica</span>
                  <span>Especialidades</span>
                  <span>Revisión</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit}>
                {/* Paso 1: Información Básica */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-medium text-blue-900 mb-1">Información del Evento</h3>
                      <p className="text-sm text-blue-700">
                        Completa la información general del evento médico
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="nombre">Nombre del Evento *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej: Consultorio Médico Comunitario - Marzo 2026"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ciudad">Ciudad *</Label>
                        <select
                          id="ciudad"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={formData.ciudad}
                          onChange={(e) => setFormData({ ...formData, ciudad: e.target.value as Ciudad })}
                        >
                          <option value="sonoyta">Sonoyta</option>
                          <option value="puerto_penasco">Puerto Peñasco</option>
                          <option value="otra">Otra</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="fechaLimite">Límite de Inscripción *</Label>
                        <Input
                          id="fechaLimite"
                          type="date"
                          value={formData.fechaLimiteInscripcion}
                          onChange={(e) =>
                            setFormData({ ...formData, fechaLimiteInscripcion: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fechaInicio">Fecha de Inicio *</Label>
                        <Input
                          id="fechaInicio"
                          type="date"
                          value={formData.fechaInicio}
                          onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="fechaFin">Fecha de Fin *</Label>
                        <Input
                          id="fechaFin"
                          type="date"
                          value={formData.fechaFin}
                          onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        type="button"
                        onClick={() => setStep(2)}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={
                          !formData.nombre ||
                          !formData.fechaInicio ||
                          !formData.fechaFin ||
                          !formData.fechaLimiteInscripcion
                        }
                      >
                        Siguiente: Especialidades
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Paso 2: Agregar Especialidades */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h3 className="font-medium text-purple-900 mb-1">Especialidades y Horarios</h3>
                      <p className="text-sm text-purple-700">
                        Agrega las especialidades médicas que estarán disponibles en este evento
                      </p>
                    </div>

                    {/* Formulario de especialidad */}
                    <Card className="border-2 border-dashed border-gray-300">
                      <CardContent className="p-6 space-y-4">
                        <h4 className="font-medium text-gray-900">Nueva Especialidad</h4>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="especialidad">Especialidad *</Label>
                            <select
                              id="especialidad"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={especialidadForm.especialidad}
                              onChange={(e) =>
                                setEspecialidadForm({
                                  ...especialidadForm,
                                  especialidad: e.target.value as Especialidad,
                                })
                              }
                            >
                              {especialidadesOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label htmlFor="costo">Costo *</Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input
                                id="costo"
                                type="number"
                                className="pl-10"
                                value={especialidadForm.costo}
                                onChange={(e) =>
                                  setEspecialidadForm({
                                    ...especialidadForm,
                                    costo: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="medico">Médico Encargado *</Label>
                            <Input
                              id="medico"
                              value={especialidadForm.medicoEncargado}
                              onChange={(e) =>
                                setEspecialidadForm({
                                  ...especialidadForm,
                                  medicoEncargado: e.target.value,
                                })
                              }
                              placeholder="Dr. Juan Pérez"
                            />
                          </div>

                          <div>
                            <Label htmlFor="practicante">Practicante (opcional)</Label>
                            <Input
                              id="practicante"
                              value={especialidadForm.practicante}
                              onChange={(e) =>
                                setEspecialidadForm({
                                  ...especialidadForm,
                                  practicante: e.target.value,
                                })
                              }
                              placeholder="Practicante"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="consultorio">Consultorio *</Label>
                          <Input
                            id="consultorio"
                            value={especialidadForm.consultorio}
                            onChange={(e) =>
                              setEspecialidadForm({
                                ...especialidadForm,
                                consultorio: e.target.value,
                              })
                            }
                            placeholder="Consultorio 1"
                          />
                        </div>

                        {/* Horarios */}
                        <div className="pt-4 border-t">
                          <h5 className="font-medium text-gray-900 mb-3">Horarios de Atención *</h5>

                          <div className="grid grid-cols-4 gap-3 mb-3">
                            <div className="col-span-2">
                              <Label htmlFor="dia">Día</Label>
                              <select
                                id="dia"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={horarioForm.dia}
                                onChange={(e) => setHorarioForm({ ...horarioForm, dia: e.target.value })}
                              >
                                <option value="">Selecciona...</option>
                                <option value="Lunes">Lunes</option>
                                <option value="Martes">Martes</option>
                                <option value="Miércoles">Miércoles</option>
                                <option value="Jueves">Jueves</option>
                                <option value="Viernes">Viernes</option>
                                <option value="Sábado">Sábado</option>
                                <option value="Domingo">Domingo</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="horaInicio">Inicio</Label>
                              <Input
                                id="horaInicio"
                                type="time"
                                value={horarioForm.horaInicio}
                                onChange={(e) =>
                                  setHorarioForm({ ...horarioForm, horaInicio: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="horaFin">Fin</Label>
                              <Input
                                id="horaFin"
                                type="time"
                                value={horarioForm.horaFin}
                                onChange={(e) =>
                                  setHorarioForm({ ...horarioForm, horaFin: e.target.value })
                                }
                              />
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAgregarHorario}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar Horario
                          </Button>

                          {especialidadForm.horarios && especialidadForm.horarios.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {especialidadForm.horarios.map((horario, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                                >
                                  <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium text-gray-900">{horario.dia}</span>
                                    <span className="text-gray-600">
                                      {horario.horaInicio} - {horario.horaFin}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarHorario(idx)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          onClick={handleAgregarEspecialidad}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar Especialidad al Evento
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Especialidades agregadas */}
                    {formData.especialidades && formData.especialidades.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">
                          Especialidades Agregadas ({formData.especialidades.length})
                        </h4>
                        <div className="space-y-3">
                          {formData.especialidades.map((esp, idx) => (
                            <Card key={idx} className="border-2 border-green-200 bg-green-50">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-gray-900 capitalize mb-1">
                                      {esp.especialidad.replace('_', ' ')}
                                    </h5>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                                      <p>
                                        <strong>Médico:</strong> {esp.medicoEncargado}
                                      </p>
                                      {esp.practicante && (
                                        <p>
                                          <strong>Practicante:</strong> {esp.practicante}
                                        </p>
                                      )}
                                      <p>
                                        <strong>Consultorio:</strong> {esp.consultorio}
                                      </p>
                                      <p>
                                        <strong>Costo:</strong> ${esp.costo}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {esp.horarios.map((h, hidx) => (
                                        <Badge key={hidx} variant="outline" className="text-xs">
                                          {h.dia}: {h.horaInicio}-{h.horaFin}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarEspecialidad(idx)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setStep(3)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        disabled={!formData.especialidades || formData.especialidades.length === 0}
                      >
                        Siguiente: Revisión
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Paso 3: Revisión */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-medium text-green-900 mb-1">Revisión Final</h3>
                      <p className="text-sm text-green-700">
                        Verifica que toda la información sea correcta antes de crear el evento
                      </p>
                    </div>

                    <Card>
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-lg">Información del Evento</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Nombre</p>
                            <p className="font-medium text-gray-900">{formData.nombre}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Ciudad</p>
                            <p className="font-medium text-gray-900 capitalize">
                              {formData.ciudad?.replace('_', ' ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Fecha de Inicio</p>
                            <p className="font-medium text-gray-900">
                              {formData.fechaInicio && new Date(formData.fechaInicio).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Fecha de Fin</p>
                            <p className="font-medium text-gray-900">
                              {formData.fechaFin && new Date(formData.fechaFin).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">Límite de Inscripción</p>
                            <p className="font-medium text-gray-900">
                              {formData.fechaLimiteInscripcion &&
                                new Date(formData.fechaLimiteInscripcion).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-lg">
                          Especialidades ({formData.especialidades?.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {formData.especialidades?.map((esp, idx) => (
                            <div key={idx} className="p-4 border rounded-lg">
                              <h5 className="font-semibold text-gray-900 capitalize mb-2">
                                {esp.especialidad.replace('_', ' ')}
                              </h5>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                <p>
                                  <strong>Médico:</strong> {esp.medicoEncargado}
                                </p>
                                <p>
                                  <strong>Costo:</strong> ${esp.costo}
                                </p>
                                <p>
                                  <strong>Consultorio:</strong> {esp.consultorio}
                                </p>
                                <p>
                                  <strong>Horarios:</strong> {esp.horarios.length}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                        Anterior
                      </Button>
                      <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Crear Evento
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de detalles del evento */}
      {showDetailModal && selectedEvento && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-5xl my-8">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedEvento.nombre}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    {selectedEvento.ciudad.replace('_', ' ')}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Información general */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Fecha de Inicio</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(selectedEvento.fechaInicio).toLocaleDateString('es-MX')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Fecha de Fin</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(selectedEvento.fechaFin).toLocaleDateString('es-MX')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Límite de Inscripción</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(selectedEvento.fechaLimiteInscripcion).toLocaleDateString('es-MX')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Especialidades detalladas */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Especialidades Disponibles ({selectedEvento.especialidades.length})
                  </h3>
                  <div className="space-y-4">
                    {selectedEvento.especialidades.map((esp, idx) => (
                      <Card key={idx} className="border-l-4 border-blue-600">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 capitalize">
                                {esp.especialidad.replace('_', ' ')}
                              </h4>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>{esp.medicoEncargado}</span>
                                </div>
                                {esp.practicante && (
                                  <>
                                    <span>•</span>
                                    <div className="flex items-center gap-1">
                                      <UserPlus className="w-4 h-4" />
                                      <span>{esp.practicante}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-700 text-lg px-4 py-1">
                              ${esp.costo}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Consultorio</p>
                              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                <MapPin className="w-5 h-5 text-gray-500" />
                                <span className="font-medium text-gray-900">{esp.consultorio}</span>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600 mb-2">Horarios de Atención</p>
                              <div className="space-y-2">
                                {esp.horarios.map((horario, hidx) => (
                                  <div
                                    key={hidx}
                                    className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm"
                                  >
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    <span className="font-medium text-gray-900">{horario.dia}:</span>
                                    <span className="text-gray-700">
                                      {horario.horaInicio} - {horario.horaFin}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
