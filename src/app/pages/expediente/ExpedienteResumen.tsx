import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router';
import { ClipboardList } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useData } from '../../context/DataContext';
import { Paciente } from '../../types';
import { ExpedienteMedicalInfo } from '../../components/expediente/ExpedienteMedicalInfo';
import { ExpedientePersonalInfo } from '../../components/expediente/ExpedientePersonalInfo';
import { ExpedienteSurgeryHistory } from '../../components/expediente/ExpedienteSurgeryHistory';
import { ExpedienteVitalSigns } from '../../components/expediente/ExpedienteVitalSigns';
import { ModalDetalleCirugia } from '../../components/cirugias/ModalDetalleCirugia';
import { DetalleCitaCompleta } from '../../components/expediente/DetalleCitaCompleta';

export function ExpedienteResumen() {
  const { paciente } = useOutletContext<{ paciente: Paciente }>();
  const { registrosTriage, informacionMedica, cirugias, seguimientos, estudios, registrosAuditoria, citas, consultasMedicas, especialidadesCatalogo, expedientesCita } = useData();
  const [cirugiaSeleccionadaId, setCirugiaSeleccionadaId] = useState<string | null>(null);
  const [modalCitaId, setModalCitaId] = useState<string | null>(null);

  const triagesPaciente = useMemo(
    () => registrosTriage.filter((t) => String(t.pacienteId) === String(paciente.id)),
    [registrosTriage, paciente.id],
  );

  const infoMedica = useMemo(
    () => informacionMedica.find((i) => String(i.pacienteId) === String(paciente.id)),
    [informacionMedica, paciente.id],
  );

  const cirugiasPaciente = useMemo(
    () => cirugias.filter((c) => String(c.pacienteId) === String(paciente.id)),
    [cirugias, paciente.id],
  );

  const cirugiaActual = useMemo(
    () => (cirugiaSeleccionadaId ? cirugias.find((c) => String(c.id) === String(cirugiaSeleccionadaId)) : null),
    [cirugiaSeleccionadaId, cirugias],
  );
  const estudioActual = useMemo(
    () => (cirugiaActual ? estudios.find((e) => String(e.cirugiaId) === String(cirugiaActual.id)) : undefined),
    [cirugiaActual, estudios],
  );
  const seguimientosActuales = useMemo(
    () => (cirugiaActual ? seguimientos.filter((s) => String(s.cirugiaId) === String(cirugiaActual.id)) : []),
    [cirugiaActual, seguimientos],
  );

  const calcularIMC = () => {
    if (triagesPaciente.length > 0) {
      const ultimoTriage = triagesPaciente[triagesPaciente.length - 1];
      const peso = ultimoTriage.signosVitales.peso;
      const altura = ultimoTriage.signosVitales.altura / 100;
      if (peso && altura) {
        return (peso / (altura * altura)).toFixed(2);
      }
    }
    return 'N/A';
  };

  const auditoriaPaciente = useMemo(() => {
    return registrosAuditoria
      .filter(
        (a) =>
          a.detalles.includes(paciente.nombre) ||
          a.detalles.includes(paciente.numeroExpediente) ||
          (a.detalles.includes('Paciente ID') && a.detalles.includes(paciente.id)),
      )
      .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
  }, [registrosAuditoria, paciente.id, paciente.nombre, paciente.numeroExpediente]);

  const citasPaciente = useMemo(
    () => citas.filter((c) => String(c.pacienteId) === String(paciente.id)),
    [citas, paciente.id],
  );

  const consultasPaciente = useMemo(
    () => consultasMedicas.filter((c) => String(c.pacienteId) === String(paciente.id)),
    [consultasMedicas, paciente.id],
  );

  const ACCIONES_CITA = ['Completar Consulta', 'Registrar Triage', 'Agendar Cita', 'Consulta Médica', 'Triage Completado'];

  const resolveCitaFromLog = (log: any) => {
    const match = log.detalles.match(/cita ID:\s*([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      const found = citasPaciente.find(c => String(c.id) === match[1] || String((c as any).id_cita) === match[1]);
      if (found) return found;
    }
    const matchB = log.detalles.match(/para cita ID:\s*(\d+)/i);
    if (matchB && matchB[1]) {
      const found = citasPaciente.find(c => String(c.id) === matchB[1] || String((c as any).id_cita) === matchB[1]);
      if (found) return found;
    }
    if (ACCIONES_CITA.includes(log.accion)) {
      const logDate = new Date(log.fechaHora).toISOString().split('T')[0];
      return citasPaciente.find(c => String(c.fecha || '').split('T')[0] === logDate) || null;
    }
    return null;
  };

  const obtenerDatosConsulta = (citaId: string) => {
    const exp = (expedientesCita || []).find(
      (e) => String(e.citaId) === String(citaId) && String(e.pacienteId) === String(paciente.id)
    );
    if (exp && (exp.triageData || exp.consultaData)) {
      return { triageData: exp.triageData || null, consultaData: exp.consultaData || null };
    }
    const triage = triagesPaciente.find(t => String(t.citaId) === String(citaId));
    const byCitaId = consultasPaciente.find(c => String(c.citaId || '') === String(citaId));
    const triageData = triage?.signosVitales;
    const consultaData = byCitaId;
    if (!triageData && !consultaData) return null;
    return { triageData, consultaData };
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <ExpedientePersonalInfo paciente={paciente} />
          <ExpedienteVitalSigns triages={triagesPaciente} calcularIMC={calcularIMC} />
          <ExpedienteMedicalInfo infoMedica={infoMedica} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <ExpedienteSurgeryHistory cirugias={cirugiasPaciente} onVerDetalle={setCirugiaSeleccionadaId} />

          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                Historial de Cambios y Registro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {auditoriaPaciente.map((log) => {
                  const clickable = !!resolveCitaFromLog(log);
                  return (
                    <div
                      key={log.id}
                      className={`p-4 transition-colors relative group ${clickable ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => { if (clickable) { const c = resolveCitaFromLog(log); if (c) setModalCitaId(String(c.id)); } }}
                    >
                      {clickable && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Badge className="bg-blue-100 text-blue-700">Ver Consulta</Badge>
                        </div>
                      )}
                      <div className="flex justify-between items-start gap-2 pr-24">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.accion}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{log.detalles}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase flex-shrink-0">
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
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {auditoriaPaciente.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm italic">
                    No hay registros de auditoría para este paciente.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {cirugiaSeleccionadaId && cirugiaActual && (
        <ModalDetalleCirugia
          cirugia={cirugiaActual}
          paciente={paciente}
          estudio={estudioActual}
          seguimientos={seguimientosActuales}
          onClose={() => setCirugiaSeleccionadaId(null)}
        />
      )}

      {modalCitaId && (() => {
        const citaModal = citasPaciente.find(c => String(c.id) === modalCitaId);
        const datosModal = obtenerDatosConsulta(modalCitaId);
        if (!citaModal) return null;
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Detalle de Consulta</h2>
                <button onClick={() => setModalCitaId(null)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold leading-none">&times;</button>
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
                  <p className="text-center text-gray-500 py-8">Esta cita aún no tiene triage ni consulta médica registrada.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

