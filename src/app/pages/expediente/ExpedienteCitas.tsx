import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useData } from '../../context/DataContext';
import { Paciente } from '../../types';
import { ExpedienteAppointmentHistory } from '../../components/expediente/ExpedienteAppointmentHistory';
import { obtenerDatosCompletoCita } from '../../components/expediente/obtenerDatosCompletoCita';

export function ExpedienteCitas() {
  const { paciente } = useOutletContext<{ paciente: Paciente }>();
  const navigate = useNavigate();
  const { citas, registrosTriage, consultasMedicas, expedientesCita } = useData();

  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<string>('todas');

  const citasPaciente = useMemo(() => {
    return citas.filter((c) => String(c.pacienteId) === String(paciente.id));
  }, [citas, paciente.id]);

  const triagesPaciente = useMemo(() => {
    return registrosTriage.filter((t) => String(t.pacienteId) === String(paciente.id));
  }, [registrosTriage, paciente.id]);

  const consultasPaciente = useMemo(() => {
    return consultasMedicas.filter((c) => String(c.pacienteId) === String(paciente.id));
  }, [consultasMedicas, paciente.id]);

  const filtro = useMemo(() => {
    const term = q.trim().toLowerCase();
    return citasPaciente.filter((c) => {
      if (estado !== 'todas' && String(c.estado) !== estado) return false;
      if (!term) return true;
      const hay = [
        c.especialidad,
        c.consultorio,
        c.hora,
        c.tipoCitaNombre,
        String(c.fecha || ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [citasPaciente, q, estado]);

  const obtener = (citaId: string) =>
    obtenerDatosCompletoCita({
      citaId,
      pacienteId: paciente.id,
      citasPaciente,
      triagesPaciente,
      consultasPaciente,
      expedientesCita,
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="w-full md:max-w-md">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por especialidad, tipo de cita, fecha, consultorio..."
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="programada">Programada</SelectItem>
              <SelectItem value="en_triage">En triage</SelectItem>
              <SelectItem value="en_consulta">En consulta</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ExpedienteAppointmentHistory
        citas={filtro}
        selectedCitaId={null}
        obtenerDatosCompletoCita={obtener}
        maxHeightClassName="max-h-[70vh]"
        onVerConsulta={(id) => navigate(`${id}`)}
      />
    </div>
  );
}

