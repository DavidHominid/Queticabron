import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, ClipboardList } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Paciente, EstudioSocioeconomico } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

// Sub-components
import { ExpedienteHeader } from './expediente/ExpedienteHeader';
import { ExpedientePersonalInfo } from './expediente/ExpedientePersonalInfo';
import { ExpedienteVitalSigns } from './expediente/ExpedienteVitalSigns';
import { ExpedienteMedicalInfo } from './expediente/ExpedienteMedicalInfo';
import { ExpedienteAppointmentHistory } from './expediente/ExpedienteAppointmentHistory';
import { ExpedienteSurgeryHistory } from './expediente/ExpedienteSurgeryHistory';
import { DetalleCitaCompleta } from './expediente/DetalleCitaCompleta';
import { ModalDetalleCirugia } from './cirugias/ModalDetalleCirugia';

interface ExpedienteCompletoProps {
  paciente: Paciente;
  onClose: () => void;
}

export function ExpedienteCompleto({ paciente, onClose }: ExpedienteCompletoProps) {
  const { 
    citas, 
    registrosTriage, 
    consultasMedicas, 
    informacionMedica, 
    cirugias, 
    seguimientos,
    estudios,
    registrosAuditoria,
    especialidadesCatalogo,
    expedientesCita
  } = useData();
  
  const [citaSeleccionadaId, setCitaSeleccionadaId] = useState<string | null>(null);
  const [cirugiaSeleccionadaId, setCirugiaSeleccionadaId] = useState<string | null>(null);
  const [vista, setVista] = useState<'paciente' | 'cita'>('paciente');

  // Filter data for the specific patient
  const citasPaciente = citas.filter((c) => c.pacienteId === paciente.id);
  const triagesPaciente = registrosTriage.filter((t) => t.pacienteId === paciente.id);
  const consultasPaciente = consultasMedicas.filter((c) => c.pacienteId === paciente.id);
  const infoMedica = informacionMedica.find((i) => i.pacienteId === paciente.id);
  const cirugiasPaciente = cirugias.filter((c) => c.pacienteId === paciente.id);

  // Helper function to get full consultation data for a specific appointment
  const obtenerDatosCompletoCita = (citaId: string) => {
    const exp = (expedientesCita || []).find((e) => String(e.citaId) === String(citaId) && String(e.pacienteId) === String(paciente.id));
    if (exp) {
      const triageData = exp.triageData || null;
      const consultaData = exp.consultaData || null;
      if (!triageData && !consultaData) return null;
      return { triageData, consultaData };
    }

    const triage = triagesPaciente.find(t => t.citaId === citaId);
    const citaRef = citasPaciente.find((c) => c.id === citaId) || null;
    const fechaCita = citaRef?.fecha ? String(citaRef.fecha).substring(0, 10) : '';
    const byCitaId = consultasPaciente.find((c) => String(c.citaId || '') === String(citaId));
    const byFecha =
      !byCitaId && fechaCita
        ? [...consultasPaciente]
            .filter((c) => String(c.fechaHora || '').substring(0, 10) === fechaCita)
            .sort((a, b) => String(b.fechaHora || '').localeCompare(String(a.fechaHora || '')))[0]
        : undefined;
    const consulta = byCitaId || byFecha;
    
    const triageData = triage?.signosVitales;
    const consultaData = consulta;

    if (!triageData && !consultaData) return null;

    return {
      triageData,
      consultaData,
    };
  };

  const calcularIMC = () => {
    if (triagesPaciente.length > 0) {
      const ultimoTriage = triagesPaciente[triagesPaciente.length - 1];
      const peso = ultimoTriage.signosVitales.peso;
      const altura = ultimoTriage.signosVitales.altura / 100; // convert cm to m
      if (peso && altura) {
        return (peso / (altura * altura)).toFixed(2);
      }
    }
    return 'N/A';
  };

  const citaActual = citaSeleccionadaId ? citas.find(c => c.id === citaSeleccionadaId) : null;
  const datosConsultaActual = citaSeleccionadaId ? obtenerDatosCompletoCita(citaSeleccionadaId) : null;

  const cirugiaActual = cirugiaSeleccionadaId ? cirugias.find(c => c.id === cirugiaSeleccionadaId) : null;
  const estudioActual = cirugiaActual ? estudios.find(e => e.cirugiaId === cirugiaActual.id) : undefined;
  const seguimientosActuales = cirugiaActual ? seguimientos.filter(s => s.cirugiaId === cirugiaActual.id) : [];

  return (
    <div className="w-full">
      <Card className="w-full shadow-sm overflow-hidden flex flex-col">
        <ExpedienteHeader paciente={paciente} onClose={onClose} />

        <CardContent className="p-6">
          <Tabs value={vista} onValueChange={(v) => setVista(v as any)} className="w-full">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="paciente">Paciente</TabsTrigger>
                <TabsTrigger value="cita">Citas</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="paciente">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                  <ExpedientePersonalInfo paciente={paciente} />
                  
                  <ExpedienteVitalSigns 
                    triages={triagesPaciente} 
                    calcularIMC={calcularIMC} 
                  />

                  <ExpedienteMedicalInfo infoMedica={infoMedica} />
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <ExpedienteSurgeryHistory 
                    cirugias={cirugiasPaciente}
                    onVerDetalle={setCirugiaSeleccionadaId}
                  />

                  <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50/50 border-b">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                        Historial de Cambios y Registro
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y max-h-[300px] overflow-y-auto">
                        {registrosAuditoria
                          .filter(a => 
                            a.detalles.includes(paciente.nombre) || 
                            a.detalles.includes(paciente.numeroExpediente) ||
                            (a.detalles.includes('Paciente ID') && a.detalles.includes(paciente.id))
                          )
                          .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
                          .map((log) => (
                            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{log.accion}</p>
                                  <p className="text-xs text-gray-600 mt-0.5">{log.detalles}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {log.rol}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <p className="text-[10px] text-gray-500 italic">Por: {log.nombreUsuario}</p>
                                <p className="text-[10px] text-gray-400">
                                  {new Date(log.fechaHora).toLocaleString('es-MX', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        {registrosAuditoria.filter(a => 
                            a.detalles.includes(paciente.nombre) || 
                            a.detalles.includes(paciente.numeroExpediente)
                          ).length === 0 && (
                          <div className="p-8 text-center text-gray-400 text-sm italic">
                            No hay registros de auditoría para este paciente.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="cita">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <ExpedienteAppointmentHistory
                    citas={citasPaciente}
                    onVerConsulta={(id) => setCitaSeleccionadaId(id)}
                    obtenerDatosCompletoCita={obtenerDatosCompletoCita}
                    selectedCitaId={citaSeleccionadaId}
                  />
                </div>
                <div className="lg:col-span-2">
                  {citaSeleccionadaId && citaActual ? (
                    datosConsultaActual ? (
                      <DetalleCitaCompleta
                        cita={citaActual}
                        paciente={paciente}
                        triageData={datosConsultaActual.triageData}
                        consultaData={datosConsultaActual.consultaData}
                        especialidadesCatalogo={especialidadesCatalogo as any}
                        onBack={() => setCitaSeleccionadaId(null)}
                      />
                    ) : (
                      <Card className="shadow-sm">
                        <CardContent className="p-10 text-center text-gray-600">
                          Esta cita solo está agendada. Aún no se ha capturado triage ni se ha registrado la consulta médica para esta cita.
                        </CardContent>
                      </Card>
                    )
                  ) : (
                    <Card className="shadow-sm">
                      <CardContent className="p-10 text-center text-gray-600">
                        Selecciona una cita del historial para ver el detalle completo.
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 pt-6 border-t flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="text-gray-900 border-gray-300">
              Cerrar
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <FileText className="w-4 h-4 mr-2" />
              Imprimir Expediente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consultation Detail Modal */}
      {/* Surgery Detail Modal */}
      {cirugiaSeleccionadaId && cirugiaActual && (
        <ModalDetalleCirugia
          cirugia={cirugiaActual}
          paciente={paciente}
          estudio={estudioActual}
          seguimientos={seguimientosActuales}
          onClose={() => setCirugiaSeleccionadaId(null)}
        />
      )}
    </div>
  );
}
