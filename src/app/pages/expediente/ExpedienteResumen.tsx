import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { useData } from '../../context/DataContext';
import { Paciente } from '../../types';
import { ExpedienteDatosGeneralesMedicos } from '../../components/expediente/ExpedienteDatosGeneralesMedicos';
import { ExpedienteSurgeryHistory } from '../../components/expediente/ExpedienteSurgeryHistory';
import { ModalDetalleCirugia } from '../../components/cirugias/ModalDetalleCirugia';

export function ExpedienteResumen() {
  const { paciente } = useOutletContext<{ paciente: Paciente }>();
  const {
    informacionMedica,
    cirugias,
    seguimientos,
    estudios,
    fetchInformacionMedica,
  } = useData();
  const [cirugiaSeleccionadaId, setCirugiaSeleccionadaId] = useState<string | null>(null);

  // [NOTA / CAMBIO]: Se consulta y refresca la información médica del paciente al montar la vista
  useEffect(() => {
    if (paciente?.id) {
      fetchInformacionMedica(String(paciente.id));
    }
  }, [paciente?.id]);

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

  return (
    <>
      {paciente.origenExpediente === 'captura_fisica' && (
        <Alert className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold">
            Expediente Capturado Digitalmente
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400/90">
            Este expediente fue digitizado a partir de registros físicos anteriores.
            {paciente.fechaCapturaDigitalPaciente && (
              <> Fecha de captura: <strong>{new Date(paciente.fechaCapturaDigitalPaciente).toLocaleString('es-MX')}</strong>.</>
            )}{' '}
            La información puede presentar omisiones o errores al ser transcripta de documentos originales.
          </AlertDescription>
        </Alert>
      )}

      {/* 
        [NOTA / CAMBIO]: 
        1. Se sustituyó la anterior tarjeta reducida "Datos Personales" por el componente completo 
           'ExpedienteDatosGeneralesMedicos' (Datos Generales + Info Médica + Antecedentes).
        2. Se eliminaron de esta vista las secciones de Signos Vitales e Historial de Auditoría 
           (los signos vitales continúan disponibles y funcionales en las citas médicas).
      */}
      <div className="space-y-8">
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
