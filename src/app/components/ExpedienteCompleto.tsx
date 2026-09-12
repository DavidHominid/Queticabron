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

            <TabsContent value="paciente">
              <div className="space-y-6">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Datos del paciente e información médica
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Información que se registra una sola vez por expediente.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      1 sola vez
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <Card className="rounded-xl">
                      <CardHeader className="pb-2 border-b flex flex-row items-center justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                          <User className="w-5 h-5 text-[color:var(--brand-primary-strong)]" />
                          Datos Generales del Paciente
                        </CardTitle>
                        <Badge className="bg-red-600 hover:bg-red-700 text-white text-[11px]">
                          Obligatorios
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre(s)</p>
                          <p className="mt-1 text-base font-medium text-foreground">
                            {String(paciente.nombre || '').trim() || <span className="text-muted-foreground italic">Sin capturar</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Apellidos</p>
                          <p className="mt-1 text-base font-medium text-foreground">
                            {String(paciente.apellido || '').trim() || <span className="text-muted-foreground italic">Sin capturar</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha de nacimiento</p>
                          <p className="mt-1 text-base font-medium text-foreground tabular-nums">
                            {formatDateSafe(paciente.fechaNacimiento)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sexo</p>
                          <p className="mt-1 text-base font-medium text-foreground capitalize">
                            {String(paciente.sexo || '').trim() ? String(paciente.sexo).toLowerCase() : <span className="text-muted-foreground italic">Sin capturar</span>}
                          </p>
                        </div>
                        <div className="md:col-span-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teléfono</p>
                          <p className="mt-1 text-base font-medium text-foreground tabular-nums">
                            {String(paciente.telefono || '').trim() || <span className="text-muted-foreground italic">Sin capturar</span>}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl">
                      <CardHeader className="pb-2 border-b flex flex-row items-center justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                          <Heart className="w-5 h-5 text-rose-500" />
                          Información Médica General
                        </CardTitle>
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          Opcional · 1 sola vez
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-5 space-y-5">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Alergias conocidas</p>
                          {infoMedica?.alergias && infoMedica.alergias.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {infoMedica.alergias.map((a: string, idx: number) => (
                                <Badge key={idx} className="bg-red-100 text-red-700 border-red-200">
                                  {a}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-muted-foreground italic">Sin alergias registradas.</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <Pill className="w-4 h-4 text-muted-foreground" />
                            Medicamentos actuales
                          </p>
                          {infoMedica?.medicamentosActuales && infoMedica.medicamentosActuales.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {infoMedica.medicamentosActuales.map((m: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="border-amber-300 bg-amber-50 text-amber-800"
                                >
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-muted-foreground italic">Sin medicamentos registrados.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-xl">
                    <CardHeader className="pb-2 border-b flex flex-row items-center justify-between gap-2">
                      <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                        <ClipboardList className="w-5 h-5 text-[color:var(--brand-secondary-strong)]" />
                        Antecedentes Patológicos y Familiares
                      </CardTitle>
                      <Badge variant="outline" className="text-[11px] text-muted-foreground">
                        Opcional · 1 sola vez por paciente
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            Antecedentes Patológicos
                          </p>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Texto libre
                          </Badge>
                        </div>
                        <Textarea
                          rows={5}
                          disabled
                          readOnly
                          value={infoMedica?.antecedentes?.patologicos?.trim() || ''}
                          placeholder="Sin antecedentes patológicos registrados."
                          className="resize-none text-xs bg-gray-50 leading-relaxed"
                        />
                        <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                          Incluye enfermedades crónicas, padecimientos diagnosticados, cirugías previas, transfusiones, alergias documentadas, hospitalizaciones.
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <Heart className="w-4 h-4 text-muted-foreground" />
                            Antecedentes Familiares
                          </p>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Texto libre
                          </Badge>
                        </div>
                        <Textarea
                          rows={5}
                          disabled
                          readOnly
                          value={infoMedica?.antecedentes?.familiares?.trim() || ''}
                          placeholder="Sin antecedentes familiares registrados."
                          className="resize-none text-xs bg-gray-50 leading-relaxed"
                        />
                        <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                          Incluye padecimientos de padres, abuelos, hermanos y causa de muerte de familiares directos. Factor hereditario, enfermedades genéticas.
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1.5">Antecedentes Psicosociales</p>
                        <Textarea
                          rows={4}
                          disabled
                          readOnly
                          value={infoMedica?.antecedentesPsicosociales?.trim() || ''}
                          placeholder="Sin antecedentes psicosociales registrados."
                          className="resize-none text-xs bg-gray-50 leading-relaxed"
                        />
                        <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                          Historial familiar, hábitos, tabaquismo, alcoholismo, situaciones psicosociales, estado civil, ocupación, escolaridad, vivienda, etc.
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1.5">Notas adicionales / Observaciones generales del expediente</p>
                        <Textarea
                          rows={4}
                          disabled
                          readOnly
                          value={infoMedica?.notas?.trim() || ''}
                          placeholder="Sin notas adicionales."
                          className="resize-none text-xs bg-gray-50 leading-relaxed"
                        />
                        <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                          Cualquier dato adicional relevante del expediente físico, contexto, aclaraciones de lectura...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <ExpedienteVitalSigns 
                  triages={triagesPaciente} 
                  calcularIMC={calcularIMC} 
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <div className="divide-y max-h-[420px] overflow-y-auto">
                        {auditoriaPaciente.map((log) => (
                            <div 
                              key={log.id} 
                              className={`p-4 transition-colors ${isLogClickable(log) ? 'cursor-pointer hover:bg-blue-50 relative group' : 'hover:bg-gray-50'}`}
                              onClick={() => handleLogClick(log)}
                            >
                              {isLogClickable(log) && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Ver Detalles</Badge>
                                </div>
                              )}
                              <div className="flex justify-between items-start gap-2 pr-24">
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
                        {auditoriaPaciente.length === 0 && (
                          <div className="p-8 text-center text-gray-400 text-sm italic">
                            {cargandoAuditoria ? 'Cargando registros...' : 'No hay registros de auditoría para este paciente.'}
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
