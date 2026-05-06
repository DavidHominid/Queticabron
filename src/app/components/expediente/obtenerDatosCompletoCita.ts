import { Cita, ConsultaMedica, ExpedienteCita, RegistroTriage } from '../../types';

export function obtenerDatosCompletoCita(params: {
  citaId: string;
  pacienteId: string;
  citasPaciente: Cita[];
  triagesPaciente: RegistroTriage[];
  consultasPaciente: ConsultaMedica[];
  expedientesCita: ExpedienteCita[];
}) {
  const { citaId, pacienteId, citasPaciente, triagesPaciente, consultasPaciente, expedientesCita } = params;

  const exp = (expedientesCita || []).find(
    (e) => String(e.citaId) === String(citaId) && String(e.pacienteId) === String(pacienteId),
  );
  if (exp) {
    const triageData = exp.triageData || null;
    const consultaData = exp.consultaData || null;
    if (!triageData && !consultaData) return null;
    return { triageData, consultaData };
  }

  const triage = triagesPaciente.find((t) => String(t.citaId) === String(citaId));
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

  return { triageData, consultaData };
}

