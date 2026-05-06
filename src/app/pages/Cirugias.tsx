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
import { nowIso, todayYmd } from '../utils/clock';

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
      fechaRegistro: todayYmd(),
    };

    addCirugia(nuevaCirugia);
    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'medico',
      accion: 'Iniciar Proceso de Cirugía',
      detalles: `Inició proceso de cirugía para paciente: ${nuevaCirugia.diagnostico}`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    setShowModal(false);
  };

  const handleSubmitEstudio = (data: Partial<EstudioSocioeconomico>) => {
    if (!selectedCirugia) return;

    const nuevoEstudio: EstudioSocioeconomico = {
      id: `est${Date.now()}`,
      pacienteId: selectedCirugia.pacienteId,
      fechaEstudio: todayYmd(),
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
      fechaHora: nowIso(),
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
      fecha: data.fecha || todayYmd(),
      fechaCreacion: todayYmd(),
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
      fechaHora: nowIso(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    setShowSeguimientoModal(false);
  };
  const estadoBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'cancelada':
        return { variant: 'destructive' as const, className: '' };
      case 'realizada':
        return { variant: 'default' as const, className: '' };
      case 'programada':
      case 'estudio_completado':
        return { variant: 'secondary' as const, className: '' };
      case 'pendiente_estudio':
        return { variant: 'outline' as const, className: 'bg-accent text-accent-foreground border-transparent' };
      default:
        return { variant: 'outline' as const, className: 'bg-background' };
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
            <h1 className="text-2xl font-semibold text-foreground">Gestión de Cirugías</h1>
            <p className="text-muted-foreground mt-1">
              Procesos quirúrgicos, estudios socioeconómicos y seguimientos
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Iniciar Proceso de Cirugía
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-semibold text-foreground">{cirugias.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <Clock className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {cirugias.filter((c) => c.estado === 'pendiente_estudio').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Programadas</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {cirugias.filter((c) => c.estado === 'programada').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Realizadas</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {cirugias.filter((c) => c.estado === 'realizada').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <FileText className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seguimientos</p>
                  <p className="text-2xl font-semibold text-foreground">{seguimientos.length}</p>
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
              <select className="px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring">
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
                    <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                      <Heart className="w-8 h-8 text-accent-foreground" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground text-lg">{cirugia.diagnostico}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
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
                        <Badge variant={estadoBadgeStyle(cirugia.estado).variant} className={estadoBadgeStyle(cirugia.estado).className}>
                          {estadoTexto(cirugia.estado)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <p className="text-xs text-muted-foreground">Especialidad</p>
                          <p className="text-sm font-medium text-foreground capitalize mt-1">
                            {cirugia.especialidad?.replace('_', ' ') || 'No especificada'}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <p className="text-xs text-muted-foreground">Lugar</p>
                          <p className="text-sm font-medium text-foreground mt-1">
                            {cirugia.lugarCirugia || 'No asignado'}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <p className="text-xs text-muted-foreground">Costo Estimado</p>
                          <p className="text-sm font-medium text-foreground mt-1">
                            ${cirugia.costoEstimado?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <p className="text-xs text-muted-foreground">Seguimientos</p>
                          <p className="text-sm font-medium text-foreground mt-1">
                            {seguimientosCirugia.length}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
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
              <Heart className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No hay cirugías registradas
              </h3>
              <p className="text-muted-foreground mb-6">
                Comienza iniciando el primer proceso de cirugía
              </p>
              <Button onClick={() => setShowModal(true)}>
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
