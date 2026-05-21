import { useState, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Plus,
  Calendar,
  User,
  Heart,
  Eye,
  ArrowRight,
  ClipboardList,
  Printer
} from 'lucide-react';
import { Cirugia, EstudioSocioeconomico, Seguimiento, Especialidad } from '../types';

// Modals
import { ModalNuevaCirugia } from '../components/cirugias/ModalNuevaCirugia';
import { ModalDetalleCirugia } from '../components/cirugias/ModalDetalleCirugia';
import { ModalNotaPostoperatoria } from '../components/cirugias/ModalNotaPostoperatoria';
import { VistaImpresionAlta } from '../components/cirugias/VistaImpresionAlta';
import { ModalSeguimiento } from '../components/cirugias/ModalSeguimiento';
import { ModalValidarEstudios } from '../components/cirugias/ModalValidarEstudios';
import { ModalProgramarCirugia } from '../components/cirugias/ModalProgramarCirugia';
import { nowIso, todayYmd } from '../utils/clock';

export function Cirugias() {
  const { 
    cirugias, 
    pacientes, 
    addCirugia, 
    updateCirugia, 
    estudios,
    seguimientos,
    addSeguimiento,
    addRegistroAuditoria,
    consultasMedicas
  } = useData();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [showModal, setShowModal] = useState(false);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [showNotaPostopModal, setShowNotaPostopModal] = useState(false);
  const [showSeguimientoModal, setShowSeguimientoModal] = useState(false);
  const [showValidarEstudios, setShowValidarEstudios] = useState(false);
  const [showProgramarModal, setShowProgramarModal] = useState(false);
  const [selectedCirugia, setSelectedCirugia] = useState<Cirugia | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const printRef = useRef<HTMLDivElement>(null);

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

  const handleStatusChange = async (cirugia: Cirugia, newStatus: string) => {
    if (newStatus === 'lista_programar') {
      setSelectedCirugia(cirugia);
      setShowValidarEstudios(true); // Abrimos validación de estudios
      return;
    }

    if (newStatus === 'programada') {
      setSelectedCirugia(cirugia);
      setShowProgramarModal(true);
      return;
    }

    if (newStatus === 'en_procedimiento') {
      const isToday = cirugia.fechaCirugia === todayYmd();
      let confirmMsg = '¿Estás seguro de ingresar a este paciente a Quirófano?';
      if (!isToday) {
        confirmMsg = `La fecha programada para esta cirugía (${cirugia.fechaCirugia || 'ninguna'}) NO coincide con el día de hoy. ¿Estás absolutamente seguro de continuar?`;
      }
      
      const confirm = window.confirm(confirmMsg);
      if (!confirm) return;
    }

    if (newStatus === 'postoperatorio') {
      setSelectedCirugia(cirugia);
      setShowNotaPostopModal(true);
      return;
    }
    
    if (newStatus === 'realizada') {
      setSelectedCirugia(cirugia);
      // Actualizamos estado en DB primero
      updateCirugia(cirugia.id, { estado: newStatus });
      // Y lanzamos el modal de seguimiento pre-llenado
      setShowSeguimientoModal(true);
      return;
    }

    try {
      await updateCirugia(cirugia.id, { estado: newStatus as any });
      addRegistroAuditoria({
        id: `aud${Date.now()}`,
        usuarioId: user?.id || '',
        nombreUsuario: user?.nombre || '',
        rol: user?.rol || 'medico',
        accion: 'Actualizar Estado Cirugía',
        detalles: `Cambió cirugía ${cirugia.id} a estado ${newStatus}`,
        fechaHora: nowIso(),
        ciudad: user?.ciudad || 'sonoyta',
      });
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el estado. Revisa los conflictos de agenda.');
    }
  };

  const handleNotaPostoperatoriaSubmit = async (data: Partial<Cirugia>) => {
    if (!selectedCirugia) return;
    try {
      await updateCirugia(selectedCirugia.id, { 
        estado: 'postoperatorio', 
        notaPostoperatoria: data.notaPostoperatoria 
      });
      setShowNotaPostopModal(false);
      setSelectedCirugia(null);
    } catch (err: any) {
      alert(err.message || 'Error al guardar la nota');
    }
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
    setShowSeguimientoModal(false);
    
    // Opcional: Podríamos llamar a window.print() aquí si queremos que imprima justo después de agendar
    // window.print();
  };

  const fases = [
    { id: 'pendiente_estudio', titulo: 'Pendiente Estudios', color: 'bg-slate-100', next: 'lista_programar', nextText: 'Aprobar' },
    { id: 'lista_programar', titulo: 'Lista Programar', color: 'bg-blue-50', next: 'programada', nextText: 'Programar' },
    { id: 'programada', titulo: 'Programadas', color: 'bg-indigo-50', next: 'en_procedimiento', nextText: 'Ingresar a Qx' },
    { id: 'en_procedimiento', titulo: 'En Quirófano', color: 'bg-orange-50', next: 'postoperatorio', nextText: 'Pasar a Recup.' },
    { id: 'postoperatorio', titulo: 'Recuperación', color: 'bg-green-50', next: 'realizada', nextText: 'Dar de Alta' }
  ];

  const renderCirugiaCard = (cirugia: Cirugia, fase: any) => {
    const paciente = pacientes.find((p) => p.id === cirugia.pacienteId);
    return (
      <Card key={cirugia.id} className="shadow-sm hover:shadow-md transition-shadow mb-3 border-l-4" style={{borderLeftColor: 'var(--primary)'}}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-sm line-clamp-2">{cirugia.diagnostico}</h4>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 mb-3">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" /> {paciente?.nombre} {paciente?.apellido}
            </div>
            {cirugia.fechaCirugia && (
              <div className="flex items-center gap-1 text-primary font-medium">
                <Calendar className="w-3 h-3" /> {cirugia.fechaCirugia} {cirugia.horaEstimada}
              </div>
            )}
            {cirugia.lugarCirugia && (
               <div className="text-xs font-mono bg-muted inline-block px-1 rounded">
                 {cirugia.lugarCirugia}
               </div>
            )}
          </div>
          <div className="flex gap-2 justify-between mt-3 pt-3 border-t">
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
              setSelectedCirugia(cirugia);
              setShowDetallesModal(true);
            }}>
              <Eye className="w-4 h-4" />
            </Button>
            
            {fase.next && (
              <Button size="sm" className="h-8 text-xs" onClick={() => handleStatusChange(cirugia, fase.next)}>
                {fase.nextText} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className="print:hidden">
        <DashboardLayout>
          <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Tablero Quirúrgico</h1>
                <p className="text-muted-foreground mt-1">
                  Control de flujo de pacientes desde consulta hasta recuperación.
                </p>
              </div>
              <div className="flex gap-3">
                <Input
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Cirugía
                </Button>
              </div>
            </div>

            {/* Tablero Kanban */}
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
              {fases.map(fase => {
                const cirugiasFase = cirugias.filter(c => c.estado === fase.id && 
                  (searchTerm === '' || 
                   (c.diagnostico || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                   (pacientes.find(p => p.id === c.pacienteId)?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
                  )
                );
                
                return (
                  <div key={fase.id} className={`flex-1 min-w-[280px] flex flex-col rounded-xl border ${fase.color}`}>
                    <div className="p-3 border-b bg-white/50 rounded-t-xl font-semibold flex justify-between items-center shrink-0">
                      <span>{fase.titulo}</span>
                      <Badge variant="secondary">{cirugiasFase.length}</Badge>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1">
                      {cirugiasFase.map(c => renderCirugiaCard(c, fase))}
                      {cirugiasFase.length === 0 && (
                        <div className="text-center p-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg border-muted">
                          Sin pacientes
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Columna especial para altas/historial rápido */}
              <div className="flex-1 min-w-[280px] flex flex-col rounded-xl border bg-gray-50">
                <div className="p-3 border-b bg-white/50 rounded-t-xl font-semibold flex justify-between items-center shrink-0">
                  <span>Altas Recientes</span>
                  <Badge variant="outline">
                    {cirugias.filter(c => c.estado === 'realizada').length}
                  </Badge>
                </div>
                <div className="p-3 overflow-y-auto flex-1">
                   {cirugias.filter(c => c.estado === 'realizada').slice(0, 10).map(cirugia => {
                      const paciente = pacientes.find((p) => p.id === cirugia.pacienteId);
                      return (
                        <Card key={cirugia.id} className="shadow-sm mb-3">
                          <CardContent className="p-4">
                            <h4 className="font-semibold text-sm line-clamp-1">{cirugia.diagnostico}</h4>
                            <div className="text-xs text-muted-foreground my-1">
                              {paciente?.nombre} {paciente?.apellido}
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => {
                                setSelectedCirugia(cirugia);
                                setTimeout(() => window.print(), 100);
                              }}>
                                <Printer className="w-3 h-3 mr-1" /> Imprimir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                   })}
                </div>
              </div>

            </div>
          </div>
        </DashboardLayout>
      </div>

      {/* Componente oculto para impresión */}
      {selectedCirugia && selectedCirugia.estado === 'realizada' && (
        <VistaImpresionAlta 
          ref={printRef}
          cirugia={selectedCirugia} 
          paciente={pacientes.find(p => p.id === selectedCirugia.pacienteId)} 
        />
      )}

      {/* Modals */}
      {showModal && (
        <ModalNuevaCirugia
          pacientes={pacientes}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitCirugia}
        />
      )}

      {showNotaPostopModal && selectedCirugia && (
         <ModalNotaPostoperatoria
          cirugia={selectedCirugia}
          paciente={pacientes.find(p => p.id === selectedCirugia.pacienteId)}
          onClose={() => setShowNotaPostopModal(false)}
          onSubmit={handleNotaPostoperatoriaSubmit}
         />
      )}

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
      
      {showSeguimientoModal && selectedCirugia && (
        <ModalSeguimiento
          cirugia={selectedCirugia}
          paciente={pacientes.find(p => p.id === selectedCirugia.pacienteId)}
          onClose={() => {
            setShowSeguimientoModal(false);
            // Optionally close selected if not needed for print
          }}
          onSubmit={(data) => {
             handleSubmitSeguimiento(data);
             // After scheduling follow-up, prompt print
             setTimeout(() => window.print(), 500);
          }}
        />
      )}

      {showValidarEstudios && selectedCirugia && (
        <ModalValidarEstudios
          cirugia={selectedCirugia}
          consultaRelacionada={consultasMedicas.find(c => c.citaId === selectedCirugia.citaId)}
          onClose={() => {
            setShowValidarEstudios(false);
            setSelectedCirugia(null);
          }}
          onValidar={async () => {
            await updateCirugia(selectedCirugia.id, { estado: 'lista_programar' });
            setShowValidarEstudios(false);
            setSelectedCirugia(null);
          }}
        />
      )}

      {showProgramarModal && selectedCirugia && (
        <ModalProgramarCirugia
          cirugia={selectedCirugia}
          onClose={() => {
            setShowProgramarModal(false);
            setSelectedCirugia(null);
          }}
          onSubmit={async (datos) => {
            try {
              await updateCirugia(selectedCirugia.id, {
                estado: 'programada',
                ...datos
              });
              setShowProgramarModal(false);
              setSelectedCirugia(null);
            } catch (err: any) {
              alert(err.message || 'Error al programar cirugía. Verifica disponibilidad de quirófano.');
            }
          }}
        />
      )}
    </>
  );
}
