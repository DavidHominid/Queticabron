import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, ClipboardList } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Paciente, EstudioSocioeconomico } from '../types';

// Sub-components
import { ExpedienteHeader } from './expediente/ExpedienteHeader';
import { ExpedientePersonalInfo } from './expediente/ExpedientePersonalInfo';
import { ExpedienteVitalSigns } from './expediente/ExpedienteVitalSigns';
import { ExpedienteMedicalInfo } from './expediente/ExpedienteMedicalInfo';
import { ExpedienteAppointmentHistory } from './expediente/ExpedienteAppointmentHistory';
import { ExpedienteSurgeryHistory } from './expediente/ExpedienteSurgeryHistory';
import { ModalDetalleConsulta } from './expediente/ModalDetalleConsulta';
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
    registrosAuditoria
  } = useData();
  
  const [citaSeleccionadaId, setCitaSeleccionadaId] = useState<string | null>(null);
  const [cirugiaSeleccionadaId, setCirugiaSeleccionadaId] = useState<string | null>(null);

  // Filter data for the specific patient
  const citasPaciente = citas.filter((c) => c.pacienteId === paciente.id);
  const triagesPaciente = registrosTriage.filter((t) => t.pacienteId === paciente.id);
  const consultasPaciente = consultasMedicas.filter((c) => c.pacienteId === paciente.id);
  const infoMedica = informacionMedica.find((i) => i.pacienteId === paciente.id);
  const cirugiasPaciente = cirugias.filter((c) => c.pacienteId === paciente.id);

  // Helper function to get full consultation data for a specific appointment
  const obtenerDatosCompletoCita = (citaId: string) => {
    const triage = triagesPaciente.find(t => t.citaId === citaId);
    const consulta = consultasPaciente.find(c => c.citaId === citaId);
    
    if (triage && consulta) {
      return {
        triageData: triage.signosVitales,
        consultaData: consulta
      };
    }
    return null;
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-6xl my-8 shadow-2xl">
        <ExpedienteHeader paciente={paciente} onClose={onClose} />

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Personal Info & Vital Signs */}
            <div className="space-y-6">
              <ExpedientePersonalInfo paciente={paciente} />
              
              <ExpedienteVitalSigns 
                triages={triagesPaciente} 
                calcularIMC={calcularIMC} 
              />

              <ExpedienteMedicalInfo infoMedica={infoMedica} />
            </div>

            {/* Center and Right Columns: Histories */}
            <div className="lg:col-span-2 space-y-6">
              <ExpedienteAppointmentHistory 
                citas={citasPaciente}
                onVerConsulta={setCitaSeleccionadaId}
                obtenerDatosCompletoCita={obtenerDatosCompletoCita}
              />

              <ExpedienteSurgeryHistory 
                cirugias={cirugiasPaciente}
                onVerDetalle={setCirugiaSeleccionadaId}
              />

              {/* Patient Audit History */}
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
      {citaSeleccionadaId && citaActual && datosConsultaActual && (
        <ModalDetalleConsulta 
          cita={citaActual}
          paciente={paciente}
          triageData={datosConsultaActual.triageData}
          consultaData={datosConsultaActual.consultaData}
          onClose={() => setCitaSeleccionadaId(null)}
        />
      )}

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