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

export function ExpedienteResumen() {
  const { paciente } = useOutletContext<{ paciente: Paciente }>();
  const { registrosTriage, informacionMedica, cirugias, seguimientos, estudios, registrosAuditoria } = useData();
  const [cirugiaSeleccionadaId, setCirugiaSeleccionadaId] = useState<string | null>(null);

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
                {auditoriaPaciente.map((log) => (
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
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
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
    </>
  );
}

