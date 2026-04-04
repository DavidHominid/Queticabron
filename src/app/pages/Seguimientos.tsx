import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useData } from '../context/DataContext';
import {
  Calendar,
  Activity,
  FileText,
  Eye,
  Edit,
  Plus,
  Filter,
  Search,
  Clock,
  User,
  Pill,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
} from 'lucide-react';
import { Seguimiento } from '../types';

export function Seguimientos() {
  const { seguimientos, pacientes, addSeguimiento } = useData();
  const [selectedSeguimiento, setSelectedSeguimiento] = useState<Seguimiento | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    pacienteId: '',
    diagnostico: '',
    observaciones: '',
    fechaCita: '',
  });
  const [guardando, setGuardando] = useState(false);

  const handleOpenNew = (seg?: Seguimiento) => {
    if (seg) {
      setSelectedSeguimiento(seg);
      setFormData({
        pacienteId: seg.pacienteId || '',
        diagnostico: seg.diagnostico || '',
        observaciones: seg.observaciones || '',
        fechaCita: seg.fechaCita || '',
      });
    } else {
      setSelectedSeguimiento(null);
      setFormData({ pacienteId: '', diagnostico: '', observaciones: '', fechaCita: '' });
    }
    setShowNewModal(true);
  };

  const handleGuardar = async () => {
    if (!formData.diagnostico) return;
    setGuardando(true);
    try {
      const nuevo: Seguimiento = {
        id: selectedSeguimiento?.id || String(Date.now()),
        pacienteId: formData.pacienteId,
        citaId: selectedSeguimiento?.citaId || '',
        diagnostico: formData.diagnostico,
        observaciones: formData.observaciones,
        fechaCita: formData.fechaCita || null,
        fechaCreacion: selectedSeguimiento?.fechaCreacion || new Date().toISOString(),
        medicoEncargado: selectedSeguimiento?.medicoEncargado || null,
        estado: formData.fechaCita ? 'agendada' : 'pendiente',
      };
      await addSeguimiento(nuevo);
      setShowNewModal(false);
    } finally {
      setGuardando(false);
    }
  };

  // Filtrar seguimientos
  const seguimientosFiltrados = seguimientos.filter((seg) => {
    const paciente = pacientes.find((p) => p.id === seg.pacienteId || p.id === String((seg as any).id_paciente));
    const diag = seg.diagnostico || '';
    const matchSearch =
      !searchTerm ||
      paciente?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente?.numeroExpediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diag.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = estadoFilter === 'todos' || (seg.estado || 'pendiente') === estadoFilter;
    return matchSearch && matchEstado;
  });

  // Agrupar seguimientos por estado
  const seguimientosPendientes = seguimientosFiltrados.filter((s) => (s.estado || 'pendiente') === 'pendiente');
  const seguimientosAgendados = seguimientosFiltrados.filter((s) => s.estado === 'agendada');
  const seguimientosCompletados = seguimientosFiltrados.filter((s) => s.estado === 'completada');

  const estadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'agendada':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'completada':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const estadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente de Agendar';
      case 'agendada':
        return 'Cita Agendada';
      case 'completada':
        return 'Completado';
      default:
        return estado;
    }
  };

  const estadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <AlertCircle className="w-4 h-4" />;
      case 'agendada':
        return <CalendarClock className="w-4 h-4" />;
      case 'completada':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleViewDetails = (seguimiento: Seguimiento) => {
    setSelectedSeguimiento(seguimiento);
    setShowDetailsModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Seguimientos Médicos</h1>
            <p className="text-gray-600 mt-1">Gestión y control de seguimientos de pacientes</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenNew()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Seguimiento
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-sm border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                  <p className="text-3xl font-bold text-gray-900">{seguimientosPendientes.length}</p>
                </div>
                <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Agendados</p>
                  <p className="text-3xl font-bold text-gray-900">{seguimientosAgendados.length}</p>
                </div>
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CalendarClock className="w-7 h-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completados</p>
                  <p className="text-3xl font-bold text-gray-900">{seguimientosCompletados.length}</p>
                </div>
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Buscar por nombre, expediente o diagnóstico..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={estadoFilter === 'todos' ? 'default' : 'outline'}
                  onClick={() => setEstadoFilter('todos')}
                  className="whitespace-nowrap"
                >
                  Todos ({seguimientos.length})
                </Button>
                <Button
                  variant={estadoFilter === 'pendiente' ? 'default' : 'outline'}
                  onClick={() => setEstadoFilter('pendiente')}
                  className="whitespace-nowrap"
                >
                  Pendientes ({seguimientosPendientes.length})
                </Button>
                <Button
                  variant={estadoFilter === 'agendada' ? 'default' : 'outline'}
                  onClick={() => setEstadoFilter('agendada')}
                  className="whitespace-nowrap"
                >
                  Agendados ({seguimientosAgendados.length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Seguimientos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {seguimientosFiltrados.map((seguimiento) => {
            const paciente = pacientes.find((p) => String(p.id) === String(seguimiento.pacienteId) || String(p.id) === String((seguimiento as any).id_paciente));
            return (
              <Card
                key={seguimiento.id}
                className="shadow-sm hover:shadow-lg transition-all duration-300 border-l-4"
                style={{
                  borderLeftColor:
                    (seguimiento.estado || 'pendiente') === 'pendiente'
                      ? '#eab308'
                      : seguimiento.estado === 'agendada'
                      ? '#3b82f6'
                      : '#22c55e',
                }}
              >
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                          {paciente?.imagen ? (
                            <img src={paciente.imagen} alt={paciente.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-900">{paciente?.nombre}</CardTitle>
                          <p className="text-sm text-gray-500">{paciente?.numeroExpediente}</p>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${estadoBadgeColor(seguimiento.estado || 'pendiente')} border flex items-center gap-1.5`}>
                      {estadoIcon(seguimiento.estado || 'pendiente')}
                      {estadoLabel(seguimiento.estado || 'pendiente')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  {/* Diagnóstico */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-blue-900 mb-1">Diagnóstico</p>
                        <p className="text-sm text-blue-800 font-medium">{seguimiento.diagnostico}</p>
                      </div>
                    </div>
                  </div>

                  {/* Glucosa */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Activity className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-xs text-gray-600">Glucosa en sangre</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {seguimiento.datosVitales?.azucarEnSangre || '---'} mg/dL
                      </p>
                    </div>
                  </div>

                  {/* Exámenes */}
                  {(seguimiento.examenesRequeridos || []).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardList className="w-4 h-4 text-purple-600" />
                        <p className="text-sm font-medium text-gray-700">Exámenes requeridos</p>
                      </div>
                      <div className="space-y-1.5 ml-6">
                        {(seguimiento.examenesRequeridos || []).slice(0, 2).map((examen, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            <p className="text-sm text-gray-600">{examen}</p>
                          </div>
                        ))}
                        {(seguimiento.examenesRequeridos || []).length > 2 && (
                          <p className="text-xs text-gray-500 ml-3.5">
                            +{(seguimiento.examenesRequeridos || []).length - 2} más
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cita programada */}
                  {seguimiento.fechaCita && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-xs text-green-700 font-medium">Próxima cita</p>
                          <p className="text-sm font-semibold text-green-900">
                            {new Date(seguimiento.fechaCita).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                            - {seguimiento.horaCita}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Remisión a Farmacia */}
                  {seguimiento.remisionFarmacia && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Pill className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-amber-900 mb-1">Remisión a Farmacia</p>
                          <p className="text-sm text-amber-800">{seguimiento.remisionFarmacia}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => handleViewDetails(seguimiento)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalles
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleOpenNew(seguimiento)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {seguimientosFiltrados.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay seguimientos</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || estadoFilter !== 'todos'
                  ? 'No se encontraron seguimientos con los filtros aplicados'
                  : 'Los seguimientos de pacientes aparecerán aquí'}
              </p>
              {(searchTerm || estadoFilter !== 'todos') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setEstadoFilter('todos');
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal de Detalles */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles del Seguimiento</DialogTitle>
            </DialogHeader>
            {selectedSeguimiento && (
              <div className="space-y-6">
                {/* Información del Paciente */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                      {pacientes.find((p) => String(p.id) === String(selectedSeguimiento.pacienteId) || String(p.id) === String((selectedSeguimiento as any).id_paciente))?.imagen ? (
                        <img src={pacientes.find((p) => String(p.id) === String(selectedSeguimiento.pacienteId) || String(p.id) === String((selectedSeguimiento as any).id_paciente))?.imagen} alt="Paciente" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {pacientes.find((p) => String(p.id) === String(selectedSeguimiento.pacienteId) || String(p.id) === String((selectedSeguimiento as any).id_paciente))?.nombre}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {pacientes.find((p) => String(p.id) === String(selectedSeguimiento.pacienteId) || String(p.id) === String((selectedSeguimiento as any).id_paciente))?.numeroExpediente}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Motivo de Consulta y Padecimiento */}
                {(selectedSeguimiento as any).motivo_consulta && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Motivo de Consulta y Padecimiento</Label>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="font-semibold text-orange-900 text-sm mb-1">Motivo: {(selectedSeguimiento as any).motivo_consulta}</p>
                      <p className="text-orange-800 text-sm">{(selectedSeguimiento as any).padecimiento_actual}</p>
                    </div>
                  </div>
                )}

                {/* Exploración Física */}
                {(selectedSeguimiento as any).exploracion_fisica && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Exploración Física</Label>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-gray-900 text-sm whitespace-pre-line">{(selectedSeguimiento as any).exploracion_fisica}</p>
                    </div>
                  </div>
                )}

                {/* Diagnóstico */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Diagnóstico</Label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-gray-900">{selectedSeguimiento.diagnostico}</p>
                  </div>
                </div>

                {/* Tratamiento y Plan */}
                {((selectedSeguimiento as any).tratamiento || (selectedSeguimiento as any).plan_tratamiento) && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Plan de Tratamiento</Label>
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <p className="text-gray-900 text-sm whitespace-pre-line">{(selectedSeguimiento as any).plan_tratamiento || (selectedSeguimiento as any).tratamiento}</p>
                    </div>
                  </div>
                )}

                {/* Medicamentos Recetados */}
                {(() => {
                  let meds = [];
                  try {
                    meds = JSON.parse((selectedSeguimiento as any).medicamentos || '[]');
                  } catch(e) {}
                  if (meds.length > 0) {
                    return (
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Medicamentos Recetados</Label>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <ul className="space-y-3">
                            {meds.map((med: any, idx: number) => (
                              <li key={idx} className="flex items-start gap-3 text-gray-700">
                                <div className="mt-0.5">
                                  <Pill className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-purple-900 text-sm">{med.nombre} <span className="font-normal text-purple-700 block sm:inline sm:ml-2">{med.dosis}</span></p>
                                  <p className="text-xs text-purple-800 mt-0.5">{med.frecuencia} x {med.duracion}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Indicaciones Generales */}
                {(selectedSeguimiento as any).indicaciones && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Indicaciones / Recomendaciones</Label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-900 text-sm whitespace-pre-line">{(selectedSeguimiento as any).indicaciones}</p>
                    </div>
                  </div>
                )}

                {/* Signos Vitales */}
                {selectedSeguimiento.datosVitales && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-3 block">Signos Vitales</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs text-red-700 mb-1">Glucosa en sangre</p>
                        <p className="text-2xl font-bold text-red-900">
                          {selectedSeguimiento.datosVitales.azucarEnSangre || '---'}
                          <span className="text-sm ml-1">mg/dL</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Exámenes Requeridos */}
                {(selectedSeguimiento.examenesRequeridos || []).length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Exámenes Requeridos</Label>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <ul className="space-y-2">
                        {(selectedSeguimiento.examenesRequeridos || []).map((examen, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-gray-700">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            {examen}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Remisión a Farmacia */}
                {selectedSeguimiento.remisionFarmacia && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Remisión a Farmacia</Label>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-gray-800">{selectedSeguimiento.remisionFarmacia}</p>
                    </div>
                  </div>
                )}

                {/* Información de la Cita */}
                {selectedSeguimiento.fechaCita && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Cita Programada</Label>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedSeguimiento.fechaCita).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                          <p className="text-sm text-gray-600">Hora: {selectedSeguimiento.horaCita}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Estado */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Estado</Label>
                  <Badge className={`${estadoBadgeColor(selectedSeguimiento.estado || 'pendiente')} border text-base px-4 py-2`}>
                    {estadoLabel(selectedSeguimiento.estado || 'pendiente')}
                  </Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Nuevo/Editar Seguimiento */}
        <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedSeguimiento ? 'Editar Seguimiento' : 'Nuevo Seguimiento'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="seg-paciente">Paciente</Label>
                <select
                  id="seg-paciente"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={formData.pacienteId}
                  onChange={(e) => setFormData({ ...formData, pacienteId: e.target.value })}
                >
                  <option value="">Seleccionar paciente...</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="seg-diagnostico">Diagnóstico *</Label>
                <Input
                  id="seg-diagnostico"
                  value={formData.diagnostico}
                  onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                  placeholder="Ingrese el diagnóstico"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="seg-observaciones">Observaciones / Indicaciones</Label>
                <Textarea
                  id="seg-observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Indicaciones o notas adicionales"
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="seg-fecha">Próxima cita</Label>
                <Input
                  id="seg-fecha"
                  type="date"
                  value={formData.fechaCita}
                  onChange={(e) => setFormData({ ...formData, fechaCita: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowNewModal(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleGuardar}
                  disabled={guardando || !formData.diagnostico}
                >
                  {guardando ? 'Guardando...' : 'Guardar Seguimiento'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
