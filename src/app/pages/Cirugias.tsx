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
  Plus,
  Search,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  Clock,
  Heart,
  ClipboardList,
  Eye,
} from 'lucide-react';
import { Cirugia, EstudioSocioeconomico, Seguimiento, Especialidad } from '../types';

// Extracted Modals
import { ModalNuevaCirugia } from '../components/cirugias/ModalNuevaCirugia';
import { ModalEstudioSocioeconomico } from '../components/cirugias/ModalEstudioSocioeconomico';
import { ModalSeguimiento } from '../components/cirugias/ModalSeguimiento';
import { ModalDetalleCirugia } from '../components/cirugias/ModalDetalleCirugia';

export function Cirugias() {
  const { 
    cirugias, 
    pacientes, 
    addCirugia, 
    updateCirugia, 
    addEstudioSocioeconomico,
    addSeguimiento,
    estudios,
    seguimientos,
    addRegistroAuditoria 
  } = useData();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showEstudioModal, setShowEstudioModal] = useState(false);
  const [showSeguimientoModal, setShowSeguimientoModal] = useState(false);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [selectedCirugia, setSelectedCirugia] = useState<Cirugia | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmitCirugia = (data: Partial<Cirugia>) => {
    const nuevaCirugia: Cirugia = {
      id: `cir${Date.now()}`,
      pacienteId: data.pacienteId || '',
      diagnostico: data.diagnostico || '',
      medicoACargo: data.medicoACargo || '',
      especialidad: (data.especialidad as Especialidad) || 'medicina_familiar',
      fechaCirugia: data.fechaCirugia || '',
      horaEstimada: data.horaEstimada,
      lugarCirugia: data.lugarCirugia || '',
      costoEstimado: data.costoEstimado || 0,
      estado: 'pendiente_estudio',
      notas: data.notas,
      fechaRegistro: new Date().toISOString().split('T')[0],
    };

    addCirugia(nuevaCirugia);
    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'medico',
      accion: 'Iniciar Proceso de Cirugía',
      detalles: `Inició proceso de cirugía para paciente: ${nuevaCirugia.diagnostico}`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    setShowModal(false);
  };

  const handleSubmitEstudio = (data: Partial<EstudioSocioeconomico>) => {
    if (!selectedCirugia) return;

    const nuevoEstudio: EstudioSocioeconomico = {
      id: `est${Date.now()}`,
      pacienteId: selectedCirugia.pacienteId,
      fechaEstudio: new Date().toISOString().split('T')[0],
      realizadoPor: user?.nombre || '',
      ingresoMensual: data.ingresoMensual || 0,
      numeroPersonasDependientes: data.numeroPersonasDependientes || 1,
      vivienda: data.vivienda || {
        tipo: 'propia',
        numeroCuartos: 1,
        servicios: [],
      },
      ocupacion: data.ocupacion || '',
      situacionFamiliar: data.situacionFamiliar || '',
      necesidadesEspeciales: data.necesidadesEspeciales,
      apoyosGubernamentales: data.apoyosGubernamentales || [],
      nivelSocioeconomico: data.nivelSocioeconomico || 'medio',
      observaciones: data.observaciones,
    };

    addEstudioSocioeconomico(nuevoEstudio);
    updateCirugia(selectedCirugia.id, { estado: 'estudio_completado' });

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Completar Estudio Socioeconómico',
      detalles: `Completó estudio socioeconómico para cirugía ${selectedCirugia.id}`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    setShowEstudioModal(false);
    setSelectedCirugia(null);
  };

  const handleSubmitSeguimiento = (data: Partial<Seguimiento>) => {
    if (!selectedCirugia) return;

    const nuevoSeguimiento: Seguimiento = {
      id: `seg${Date.now()}`,
      pacienteId: selectedCirugia.pacienteId,
      cirugiaId: selectedCirugia.id,
      fecha: data.fecha || new Date().toISOString().split('T')[0],
      fechaCreacion: new Date().toISOString().split('T')[0],
      medicoEncargado: data.medicoEncargado || '',
      estadoPaciente: data.estadoPaciente || '',
      observaciones: data.observaciones || '',
      proximoSeguimiento: data.proximoSeguimiento,
      estado: 'agendada',
    };

    addSeguimiento(nuevoSeguimiento);

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'medico',
      accion: 'Registrar Seguimiento',
      detalles: `Registró seguimiento para cirugía ${selectedCirugia.id}`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    setShowSeguimientoModal(false);
  };
  const estadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'pendiente_estudio': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'estudio_completado': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'programada': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'realizada': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelada': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const estadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente_estudio': return 'Pendiente de Estudio';
      case 'estudio_completado': return 'Estudio Completado';
      case 'programada': return 'Programada';
      case 'realizada': return 'Realizada';
      case 'cancelada': return 'Cancelada';
      default: return estado.replace('_', ' ');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Gestión de Cirugías</h1>
            <p className="text-gray-600 mt-1">
              Procesos quirúrgicos, estudios socioeconómicos y seguimientos
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Iniciar Proceso de Cirugía
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-semibold text-gray-900">{cirugias.length}</p>
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
                  <p className="text-sm text-gray-600">Pendientes</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {cirugias.filter((c) => c.estado === 'pendiente_estudio').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Programadas</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {cirugias.filter((c) => c.estado === 'programada').length}
                  </p>
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
                  <p className="text-sm text-gray-600">Realizadas</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {cirugias.filter((c) => c.estado === 'realizada').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Seguimientos</p>
                  <p className="text-2xl font-semibold text-gray-900">{seguimientos.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por paciente, diagnóstico o médico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos los estados</option>
                <option value="pendiente_estudio">Pendiente de Estudio</option>
                <option value="estudio_completado">Estudio Completado</option>
                <option value="programada">Programada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de cirugías */}
        <div className="grid grid-cols-1 gap-4">
          {cirugias.map((cirugia) => {
            const paciente = pacientes.find((p) => p.id === cirugia.pacienteId);
            const estudio = estudios.find((e) => e.pacienteId === cirugia.pacienteId);
            const seguimientosCirugia = seguimientos.filter((s) => s.cirugiaId === cirugia.id);

            return (
              <Card key={cirugia.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-8 h-8 text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{cirugia.diagnostico}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{paciente?.nombre}</span>
                            </div>
                            <span>•</span>
                            <span>Dr. {cirugia.medicoACargo}</span>
                            {cirugia.fechaCirugia && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(cirugia.fechaCirugia).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge className={estadoBadgeColor(cirugia.estado)}>
                          {estadoTexto(cirugia.estado)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">Especialidad</p>
                          <p className="text-sm font-medium text-gray-900 capitalize mt-1">
                            {cirugia.especialidad?.replace('_', ' ') || 'No especificada'}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">Lugar</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {cirugia.lugarCirugia || 'No asignado'}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">Costo Estimado</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            ${cirugia.costoEstimado?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">Seguimientos</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {seguimientosCirugia.length}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCirugia(cirugia);
                            setShowDetallesModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalles
                        </Button>

                        {cirugia.estado === 'pendiente_estudio' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCirugia(cirugia);
                              setShowEstudioModal(true);
                            }}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Realizar Estudio
                          </Button>
                        )}

                        {(cirugia.estado === 'programada' || cirugia.estado === 'realizada') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCirugia(cirugia);
                              setShowSeguimientoModal(true);
                            }}
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            <ClipboardList className="w-4 h-4 mr-2" />
                            Agregar Seguimiento
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {cirugias.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay cirugías registradas
              </h3>
              <p className="text-gray-600 mb-6">
                Comienza iniciando el primer proceso de cirugía
              </p>
              <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Iniciar Proceso de Cirugía
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal components are called here */}

      {/* New Surgery Modal */}
      {showModal && (
        <ModalNuevaCirugia
          pacientes={pacientes}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitCirugia}
        />
      )}

      {/* Socio-economic Study Modal */}
      {showEstudioModal && selectedCirugia && (
        <ModalEstudioSocioeconomico
          cirugia={selectedCirugia}
          paciente={pacientes.find(p => p.id === selectedCirugia.pacienteId)}
          onClose={() => {
            setShowEstudioModal(false);
            setSelectedCirugia(null);
          }}
          onSubmit={handleSubmitEstudio}
        />
      )}

      {/* Follow-up Modal */}
      {showSeguimientoModal && selectedCirugia && (
        <ModalSeguimiento
          cirugia={selectedCirugia}
          paciente={pacientes.find(p => p.id === selectedCirugia.pacienteId)}
          onClose={() => {
            setShowSeguimientoModal(false);
            setSelectedCirugia(null);
          }}
          onSubmit={handleSubmitSeguimiento}
        />
      )}

      {/* Details Modal */}
      {showDetallesModal && selectedCirugia && (
        <ModalDetalleCirugia
          cirugia={selectedCirugia}
          paciente={pacientes.find(p => p.id === selectedCirugia.pacienteId)}
          estudio={estudios.find(e => e.pacienteId === selectedCirugia.pacienteId)}
          seguimientos={seguimientos.filter(s => s.cirugiaId === selectedCirugia.id)}
          onClose={() => {
            setShowDetallesModal(false);
            setSelectedCirugia(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
