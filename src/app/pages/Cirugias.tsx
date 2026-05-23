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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../components/ui/alert-dialog';
import {
  Plus,
  Calendar,
  User,
  Heart,
  Eye,
  ArrowRight,
  ClipboardList,
  Printer,
  AlertTriangle
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
import { toast } from 'sonner';

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
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    isWarning: boolean;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    isWarning: false,
    onConfirm: () => {},
  });
  
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

      const doIngresar = async () => {
        try {
          await updateCirugia(cirugia.id, { estado: 'en_procedimiento' as any });
          addRegistroAuditoria({
            id: `aud${Date.now()}`,
            usuarioId: user?.id || '',
            nombreUsuario: user?.nombre || '',
            rol: user?.rol || 'medico',
            accion: 'Actualizar Estado Cirugía',
            detalles: `Cambió cirugía ${cirugia.id} a estado en_procedimiento`,
            fechaHora: nowIso(),
            ciudad: user?.ciudad || 'sonoyta',
          });
        } catch (err: any) {
          toast.error(err.message || 'Error al actualizar el estado.');
        }
      };

      if (isToday) {
        setConfirmDialog({
          open: true,
          title: 'Ingresar a Quirófano',
          description: '¿Estás seguro de ingresar a este paciente a Quirófano?',
          isWarning: false,
          onConfirm: doIngresar,
        });
      } else {
        setConfirmDialog({
          open: true,
          title: '⚠️ Fecha diferente a hoy',
          description: `La fecha programada para esta cirugía (${cirugia.fechaCirugia || 'ninguna'}) NO coincide con el día de hoy. ¿Estás absolutamente seguro de continuar?`,
          isWarning: true,
          onConfirm: doIngresar,
        });
      }
      return;
    }

    if (newStatus === 'postoperatorio') {
      setSelectedCirugia(cirugia);
      setShowNotaPostopModal(true);
      return;
    }
    
    if (newStatus === 'realizada') {
      setSelectedCirugia(cirugia);
      // Lanzamos el modal de seguimiento pre-llenado ANTES de actualizar el estado
      // El estado se actualizará una vez que se guarde el formulario de seguimiento
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
      toast.error(err.message || 'Error al actualizar el estado. Revisa los conflictos de agenda.');
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

  const handleSubmitSeguimiento = async (data: Partial<Seguimiento>) => {
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
    
    // Actualizar estado en DB después de llenar el formulario
    try {
      await updateCirugia(selectedCirugia.id, { estado: 'realizada' as any });
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el estado a alta.');
    }

    setShowSeguimientoModal(false);
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
    const isPendienteSede = cirugia.requiereRentaExterna && cirugia.estatusRentaSede === 'pendiente_confirmar';

    // Find associated consultation to show ordered studies on the card
    const consultaAsociada = cirugia.citaId
      ? consultasMedicas.find(c => c.citaId === cirugia.citaId)
      : consultasMedicas.slice().reverse().find(c => c.pacienteId === cirugia.pacienteId && c.requiereCirugia) ||
        consultasMedicas.slice().reverse().find(c => c.pacienteId === cirugia.pacienteId);
    const estudiosSolicitados = consultaAsociada?.estudiosIndicados?.filter(e => e.tipo?.trim()) || [];

    return (
      <Card 
        key={cirugia.id} 
        className={`shadow-sm hover:shadow-md transition-shadow mb-3 border-l-4 ${isPendienteSede ? 'border-orange-500' : ''}`} 
        style={!isPendienteSede ? {borderLeftColor: 'var(--primary)'} : undefined}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-sm line-clamp-2">{cirugia.diagnostico}</h4>
            {isPendienteSede && (
              <span className="text-orange-500 flex items-center shrink-0 ml-2" title="Alerta: Quirófano sin confirmar">
                <AlertTriangle className="w-4 h-4" />
              </span>
            )}
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

          {/* Studies chip — only visible in pendiente_estudio phase */}
          {fase.id === 'pendiente_estudio' && (
            <div className="mb-3">
              {estudiosSolicitados.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <ClipboardList className="w-3 h-3" /> Estudios solicitados
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {estudiosSolicitados.map((est, i) => (
                      <span
                        key={i}
                        title={est.indicaciones}
                        className="inline-block rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                      >
                        {est.tipo}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] italic text-muted-foreground/70 flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" /> Sin estudios registrados
                </p>
              )}
            </div>
          )}

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
          }}
        />
      )}

      {showValidarEstudios && selectedCirugia && (
        <ModalValidarEstudios
          cirugia={selectedCirugia}
          consultaRelacionada={
            selectedCirugia.citaId 
              ? consultasMedicas.find(c => c.citaId === selectedCirugia.citaId)
              : consultasMedicas.slice().reverse().find(c => c.pacienteId === selectedCirugia.pacienteId && c.requiereCirugia) || consultasMedicas.slice().reverse().find(c => c.pacienteId === selectedCirugia.pacienteId)
          }
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
              toast.error(err.message || 'Error al programar cirugía. Verifica disponibilidad de quirófano.');
            }
          }}
        />
      )}

      {/* ── Diálogo de confirmación personalizado (reemplaza window.confirm) ── */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className={confirmDialog.isWarning ? 'text-amber-600' : ''}>
              {confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.isWarning
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-teal-600 hover:bg-teal-700 text-white'}
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
