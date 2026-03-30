import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  Evento,
  Paciente,
  Cita,
  InformacionMedica,
  InformacionMedicaDental,
  RegistroTriage,
  ConsultaMedica,
  ConsultaDental,
  Cirugia,
  Seguimiento,
  RegistroAuditoria,
  Usuario,
  EstudioSocioeconomico,
} from '../types';

interface DataContextType {
  // Eventos
  eventos: Evento[];
  addEvento: (evento: Evento) => void;
  updateEvento: (id: string, evento: Partial<Evento>) => void;

  // Pacientes
  pacientes: Paciente[];
  addPaciente: (paciente: Paciente) => void;
  updatePaciente: (id: string, paciente: Partial<Paciente>) => void;
  getPacienteByExpediente: (numeroExpediente: string) => Paciente | undefined;

  // Citas
  citas: Cita[];
  addCita: (cita: Cita) => void;
  updateCita: (id: string, cita: Partial<Cita>) => void;

  // Información Médica
  informacionMedica: InformacionMedica[];
  addInformacionMedica: (info: InformacionMedica) => void;
  updateInformacionMedica: (pacienteId: string, info: Partial<InformacionMedica>) => void;

  // Información Médica Dental
  informacionMedicaDental: InformacionMedicaDental[];
  addInformacionMedicaDental: (info: InformacionMedicaDental) => void;

  // Triage
  registrosTriage: RegistroTriage[];
  addRegistroTriage: (registro: RegistroTriage) => void;

  // Consultas Médicas
  consultasMedicas: ConsultaMedica[];
  addConsultaMedica: (consulta: ConsultaMedica) => void;

  // Consultas Dentales
  consultasDentales: ConsultaDental[];
  addConsultaDental: (consulta: ConsultaDental) => void;

  // Cirugías
  cirugias: Cirugia[];
  addCirugia: (cirugia: Cirugia) => void;
  updateCirugia: (id: string, cirugia: Partial<Cirugia>) => void;

  // Seguimientos
  seguimientos: Seguimiento[];
  addSeguimiento: (seguimiento: Seguimiento) => void;
  updateSeguimiento: (id: string, seguimiento: Partial<Seguimiento>) => void;

  // Auditoría
  registrosAuditoria: RegistroAuditoria[];
  addRegistroAuditoria: (registro: RegistroAuditoria) => void;

  // Usuarios
  usuarios: Usuario[];
  addUsuario: (usuario: Usuario) => void;
  updateUsuario: (id: string, usuario: Partial<Usuario>) => void;
  deleteUsuario: (id: string) => void;

  // Estudios Socioeconómicos
  estudios: EstudioSocioeconomico[];
  addEstudioSocioeconomico: (estudio: EstudioSocioeconomico) => void;
  fetchAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [informacionMedica, setInformacionMedica] = useState<InformacionMedica[]>([]);
  const [informacionMedicaDental, setInformacionMedicaDental] = useState<InformacionMedicaDental[]>([]);
  const [registrosTriage, setRegistrosTriage] = useState<RegistroTriage[]>([]);
  const [consultasMedicas, setConsultasMedicas] = useState<ConsultaMedica[]>([]);
  const [consultasDentales, setConsultasDentales] = useState<ConsultaDental[]>([]);
  const [cirugias, setCirugias] = useState<Cirugia[]>([]);
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [registrosAuditoria, setRegistrosAuditoria] = useState<RegistroAuditoria[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [estudios, setEstudios] = useState<EstudioSocioeconomico[]>([]);

  useEffect(() => {
    console.log('📊 Estado de pacientes actualizado:', pacientes.length, 'pacientes cargados.');
    if (pacientes.length > 0) {
      console.log('Primer paciente en estado:', pacientes[0]);
    }
  }, [pacientes]);

  const fetchAllData = async () => {
    try {
      const safeFetch = async (path: string, setter: (data: any) => void) => {
        try {
          const res = await fetch(`/api/${path}`);
          if (!res.ok) {
            console.error(`❌ Error HTTP ${res.status} al cargar ${path}`);
            return;
          }
          const data = await res.json();
          
          // Especial care for audit mapping
          if (path === 'auditoria') {
            console.log('🔍 Auditoría raw from server:', data.length, 'records');
            const mapped = data.map((a: any) => ({
              id: String(a.id || a.id_auditoria || ''),
              usuarioId: String(a.usuarioId || a.usuario_id || ''),
              nombreUsuario: a.nombreUsuario || a.nombre_usuario || 'Sistema',
              rol: a.rol || '---',
              accion: a.accion || '---',
              detalles: a.detalles || '---',
              fechaHora: a.fechaHora || a.fecha_hora || new Date().toISOString(),
              ciudad: a.ciudad || '---'
            }));
            console.log('🔍 Auditoría mapped:', mapped.length, 'records');
            setter(mapped);
            return;
          }

          setter(data);
        } catch (err: any) {
          console.error(`❌ Error de red al cargar ${path}:`, err.message);
        }
      };

      await Promise.all([
        safeFetch('pacientes', setPacientes),
        safeFetch('citas', setCitas),
        safeFetch('triage', setRegistrosTriage),
        safeFetch('consultas', setConsultasMedicas),
        safeFetch('cirugias', setCirugias),
        safeFetch('seguimientos', setSeguimientos),
        safeFetch('eventos', setEventos),
        safeFetch('usuarios', setUsuarios),
        safeFetch('estudios', setEstudios),
        safeFetch('auditoria', setRegistrosAuditoria)
      ]);
    } catch (err) {
      console.error('Error general cargando datos:', err);
    }
  };

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const addEvento = async (evento: Evento) => {
    try {
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evento),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setEventos([...eventos, nuevo]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateEvento = async (id: string, eventoUpdate: Partial<Evento>) => {
    try {
      const res = await fetch(`/api/eventos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventoUpdate),
      });
      if (res.ok) {
        const actualizado = await res.json();
        setEventos(eventos.map((e) => (e.id === id ? actualizado : e)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addPaciente = async (paciente: Paciente) => {
    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paciente),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setPacientes([...pacientes, nuevo]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updatePaciente = async (id: string, pacienteUpdate: Partial<Paciente>) => {
    try {
      const res = await fetch(`/api/pacientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pacienteUpdate),
      });
      if (res.ok) {
        const actualizado = await res.json();
        setPacientes(pacientes.map((p) => (p.id === id ? actualizado : p)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPacienteByExpediente = (numeroExpediente: string) => {
    return pacientes.find((p) => p.numeroExpediente === numeroExpediente);
  };

  const addCita = async (cita: Cita) => {
    try {
      const res = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cita),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setCitas([...citas, nuevo]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateCita = async (id: string, citaUpdate: Partial<Cita>) => {
    try {
      const res = await fetch(`/api/citas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(citaUpdate),
      });
      if (res.ok) {
        const actualizado = await res.json();
        setCitas(citas.map((c) => (c.id === id ? actualizado : c)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addInformacionMedica = (info: InformacionMedica) => {
    setInformacionMedica([...informacionMedica, info]);
  };

  const updateInformacionMedica = async (pacienteId: string, infoUpdate: Partial<InformacionMedica>) => {
    try {
      const res = await fetch(`/api/informacion-medica/${pacienteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(infoUpdate),
      });
      if (res.ok) {
        const actualizado = await res.json();
        setInformacionMedica(
          informacionMedica.map((i) => (i.pacienteId === pacienteId ? actualizado : i))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addInformacionMedicaDental = (info: InformacionMedicaDental) => {
    setInformacionMedicaDental([...informacionMedicaDental, info]);
  };

  const addRegistroTriage = async (registro: RegistroTriage) => {
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setRegistrosTriage([...registrosTriage, nuevo]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addConsultaMedica = async (consulta: ConsultaMedica) => {
    try {
      const res = await fetch('/api/consultas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consulta),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setConsultasMedicas([...consultasMedicas, nuevo]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addConsultaDental = (consulta: ConsultaDental) => {
    setConsultasDentales([...consultasDentales, consulta]);
  };

  const addCirugia = async (cirugia: Cirugia) => {
    try {
      const res = await fetch('/api/cirugias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cirugia),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setCirugias([...cirugias, nuevo]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateCirugia = async (id: string, cirugiaUpdate: Partial<Cirugia>) => {
    try {
      const res = await fetch(`/api/cirugias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cirugiaUpdate),
      });
      if (res.ok) {
        const actualizado = await res.json();
        setCirugias(cirugias.map((c) => (c.id === id ? actualizado : c)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addSeguimiento = async (seguimiento: Seguimiento) => {
    try {
      const res = await fetch('/api/seguimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seguimiento),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setSeguimientos([...seguimientos, nuevo]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateSeguimiento = async (id: string, seguimientoUpdate: Partial<Seguimiento>) => {
    try {
      const res = await fetch(`/api/seguimientos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seguimientoUpdate),
      });
      if (res.ok) {
        const actualizado = await res.json();
        setSeguimientos(seguimientos.map((s) => (s.id === id ? actualizado : s)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addRegistroAuditoria = async (registro: RegistroAuditoria) => {
    try {
      const res = await fetch('/api/auditoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro),
      });
      if (res.ok) {
        setRegistrosAuditoria([...registrosAuditoria, registro]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addUsuario = async (usuario: Usuario) => {
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setUsuarios([...usuarios, nuevo]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateUsuario = async (id: string, usuarioUpdate: Partial<Usuario>) => {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioUpdate),
      });
      if (res.ok) {
        const actualizado = await res.json();
        setUsuarios(usuarios.map((u) => (u.id === id ? actualizado : u)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUsuario = async (id: string) => {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setUsuarios(usuarios.filter((u) => u.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addEstudioSocioeconomico = async (estudio: EstudioSocioeconomico) => {
    try {
      const res = await fetch('/api/estudios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estudio),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setEstudios([...estudios, nuevo]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DataContext.Provider
      value={{
        eventos,
        addEvento,
        updateEvento,
        pacientes,
        addPaciente,
        updatePaciente,
        getPacienteByExpediente,
        citas,
        addCita,
        updateCita,
        informacionMedica,
        addInformacionMedica,
        updateInformacionMedica,
        informacionMedicaDental,
        addInformacionMedicaDental,
        registrosTriage,
        addRegistroTriage,
        consultasMedicas,
        addConsultaMedica,
        consultasDentales,
        addConsultaDental,
        cirugias,
        addCirugia,
        updateCirugia,
        seguimientos,
        addSeguimiento,
        updateSeguimiento,
        registrosAuditoria,
        addRegistroAuditoria,
        usuarios,
        addUsuario,
        updateUsuario,
        deleteUsuario,
        estudios,
        addEstudioSocioeconomico,
        fetchAllData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}