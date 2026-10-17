import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { User, Heart, Pill, FileText, ClipboardList } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Paciente, EstudioSocioeconomico } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { formatDateSafe } from './ui/utils';

// Sub-components
import { ExpedienteHeader } from './expediente/ExpedienteHeader';
import { ExpedienteDatosGeneralesMedicos } from './expediente/ExpedienteDatosGeneralesMedicos';
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
    especialidadesCatalogo,
    expedientesCita
  } = useData();
  
  const [citaSeleccionadaId, setCitaSeleccionadaId] = useState<string | null>(null);
  const [cirugiaSeleccionadaId, setCirugiaSeleccionadaId] = useState<string | null>(null);
  const [vista, setVista] = useState<'paciente' | 'cita'>('paciente');
  const [modalCitaId, setModalCitaId] = useState<string | null>(null);
  const [auditoriaPaciente, setAuditoriaPaciente] = useState<any[]>([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);

  // Filter data for the specific patient — use loose string comparison to avoid number/string mismatch
  const citasPaciente = citas.filter((c) => String(c.pacienteId) === String(paciente.id));
  const triagesPaciente = registrosTriage.filter((t) => String(t.pacienteId) === String(paciente.id));
  const consultasPaciente = consultasMedicas.filter((c) => String(c.pacienteId) === String(paciente.id));
  const infoMedica = informacionMedica.find((i) => String(i.pacienteId) === String(paciente.id));
  const cirugiasPaciente = cirugias.filter((c) => String(c.pacienteId) === String(paciente.id));

  // Helper function to get full consultation data for a specific appointment
  // IMPORTANTE: El triaje SIEMPRE corresponde a LOS SIGNOS VITALES REGISTRADOS PARA ESTA CITA (no últimos del paciente)
  const obtenerDatosCompletoCita = (citaId: string) => {
    const exp = (expedientesCita || []).find(
      (e) => String(e.citaId) === String(citaId) && String(e.pacienteId) === String(paciente.id)
    );
    if (exp) {
      const triageData = exp.triageData || null;
      const consultaData = exp.consultaData || null;
      if (!triageData && !consultaData) return null;
      return { triageData, consultaData };
    }

    // Triage EXCLUSIVO de ESTA cita (por citaId). Si existen múltiples para la misma cita,
    // elegimos el más reciente por fechaHora (o fecha como fallback para datos históricos).
    const triajesParaCita = triagesPaciente.filter((t) => String(t.citaId) === String(citaId));
    const triage =
      triajesParaCita.length > 1
        ? [...triajesParaCita].sort((a, b) => {
            const fa = new Date(String((a as any).fechaHora || (a as any).fecha || (a as any).fechaTriaje || 0)).getTime();
            const fb = new Date(String((b as any).fechaHora || (b as any).fecha || (b as any).fechaTriaje || 0)).getTime();
            return fb - fa;
          })[0]
        : triajesParaCita[0] || undefined;

    const citaRef = citasPaciente.find((c) => String(c.id) === String(citaId)) || null;
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

  const ACCIONES_CITA = ['Completar Consulta', 'Registrar Triage', 'Agendar Cita', 'Consulta Médica', 'Triage Completado'];

  // Shared helper: extract a matching cita from a log entry
  const resolveCitaFromLog = (log: any) => {
    // 1. Extract explicit cita ID from text: supports both '(cita ID: cit123)' and 'cita ID: 45'
    const match = log.detalles.match(/cita ID:\s*([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      const found = citasPaciente.find(
        c => String(c.id) === match[1] || String((c as any).id_cita) === match[1]
      );
      if (found) return found;
    }

    // 2. Backend triage logs use 'Paciente ID: X' — already contain cita id in match group 0 via pattern
    const matchB = log.detalles.match(/para cita ID:\s*(\d+)/i);
    if (matchB && matchB[1]) {
      const found = citasPaciente.find(
        c => String(c.id) === matchB[1] || String((c as any).id_cita) === matchB[1]
      );
      if (found) return found;
    }

    // 3. Fallback: match by action type + date of the log vs cita date
    if (ACCIONES_CITA.includes(log.accion)) {
      const logDate = new Date(log.fechaHora).toISOString().split('T')[0];
      return citasPaciente.find(c => {
        const cDate = String(c.fecha || (c as any).fecha_cita || '').split('T')[0];
        return cDate === logDate;
      }) || null;
    }

    return null;
  };

  const handleLogClick = (log: any) => {
    const cita = resolveCitaFromLog(log);
    if (cita) {
      setModalCitaId(String(cita.id));
    }
  };

  const isLogClickable = (log: any) => !!resolveCitaFromLog(log);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setCargandoAuditoria(true);
      try {
        const res = await fetch(`/api/auditoria?pacienteId=${encodeURIComponent(String(paciente.id))}`);
        if (!res.ok) {
          if (!cancelled) setAuditoriaPaciente([]);
          return;
        }
        const data = await res.json();
        const next = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setAuditoriaPaciente(next.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()));
        }
      } catch {
        if (!cancelled) setAuditoriaPaciente([]);
      } finally {
        if (!cancelled) setCargandoAuditoria(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [paciente.id]);

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

            {/* [NOTA / CAMBIO]: En la pestaña paciente se muestra ExpedienteDatosGeneralesMedicos sin signos vitales ni auditoría */}
            <TabsContent value="paciente">
              <div className="space-y-6">
                <ExpedienteDatosGeneralesMedicos
                  paciente={paciente}
                  infoMedica={infoMedica}
                />

                {cirugiasPaciente.length > 0 && (
                  <ExpedienteSurgeryHistory 
                    cirugias={cirugiasPaciente}
                    onVerDetalle={setCirugiaSeleccionadaId}
                  />
                )}
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

      {/* Modal de detalle de consulta desde Historial de Cambios */}
      {modalCitaId && (() => {
        const citaModal = citas.find(c => String(c.id) === modalCitaId);
        const datosModal = obtenerDatosCompletoCita(modalCitaId);
        if (!citaModal) return null;
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Detalle de Consulta</h2>
                <button
                  onClick={() => setModalCitaId(null)}
                  className="text-gray-500 hover:text-gray-800 text-xl font-bold leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6">
                {datosModal ? (
                  <DetalleCitaCompleta
                    cita={citaModal}
                    paciente={paciente}
                    triageData={datosModal.triageData}
                    consultaData={datosModal.consultaData}
                    especialidadesCatalogo={especialidadesCatalogo as any}
                    onBack={() => setModalCitaId(null)}
                  />
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Esta cita aún no tiene triage ni consulta médica registrada.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
