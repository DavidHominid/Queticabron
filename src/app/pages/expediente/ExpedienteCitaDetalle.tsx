import { useMemo } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { useData } from '../../context/DataContext';
import { Paciente } from '../../types';
import { DetalleCitaCompleta } from '../../components/expediente/DetalleCitaCompleta';
import { obtenerDatosCompletoCita } from '../../components/expediente/obtenerDatosCompletoCita';

export function ExpedienteCitaDetalle() {
  const { paciente } = useOutletContext<{ paciente: Paciente }>();
  const { citaId } = useParams();
  const navigate = useNavigate();
  const { citas, registrosTriage, consultasMedicas, expedientesCita, especialidadesCatalogo } = useData();

  const citasPaciente = useMemo(() => {
    return citas.filter((c) => String(c.pacienteId) === String(paciente.id));
  }, [citas, paciente.id]);

  const triagesPaciente = useMemo(() => {
    return registrosTriage.filter((t) => String(t.pacienteId) === String(paciente.id));
  }, [registrosTriage, paciente.id]);

  const consultasPaciente = useMemo(() => {
    return consultasMedicas.filter((c) => String(c.pacienteId) === String(paciente.id));
  }, [consultasMedicas, paciente.id]);

  const citaActual = useMemo(() => {
    const id = String(citaId || '').trim();
    if (!id) return null;
    return citasPaciente.find((c) => String(c.id) === id) || null;
  }, [citaId, citasPaciente]);

  const datos = useMemo(() => {
    const id = String(citaId || '').trim();
    if (!id) return null;
    return obtenerDatosCompletoCita({
      citaId: id,
      pacienteId: paciente.id,
      citasPaciente,
      triagesPaciente,
      consultasPaciente,
      expedientesCita,
    });
  }, [citaId, paciente.id, citasPaciente, triagesPaciente, consultasPaciente, expedientesCita]);

  if (!citaActual) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-10 text-center text-gray-600">No se encontró la cita solicitada.</CardContent>
      </Card>
    );
  }

  if (!datos) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-10 text-center text-gray-600">
          Esta cita solo está agendada. Aún no se ha capturado triage ni se ha registrado la consulta médica para esta cita.
        </CardContent>
      </Card>
    );
  }

  return (
    <DetalleCitaCompleta
      cita={citaActual}
      paciente={paciente}
      triageData={datos.triageData}
      consultaData={datos.consultaData}
      especialidadesCatalogo={especialidadesCatalogo as any}
      onBack={() => navigate('../')}
    />
  );
}

