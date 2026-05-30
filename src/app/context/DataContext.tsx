import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Evento,
  Paciente,
  Cita,
  EspecialidadCatalogo,
  CiudadCatalogo,
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
  ExpedienteCita,
} from '../types';
import { SedeQuirurgica, PeriodoDisponibilidad } from '../types';

interface DataContextType {
  // Eventos
  eventos: Evento[];
  addEvento: (evento: Evento) => Promise<Evento>;
  updateEvento: (id: string, evento: Partial<Evento>) => Promise<Evento>;
  deleteEvento: (id: string, opts?: { force?: boolean }) => Promise<void>;

  // Pacientes
  pacientes: Paciente[];
  addPaciente: (paciente: Paciente) => Promise<any> | void;
  updatePaciente: (id: string, paciente: Partial<Paciente>) => Promise<any> | void;
  getPacienteByExpediente: (numeroExpediente: string) => Paciente | undefined;

  // Citas
  citas: Cita[];
  addCita: (cita: Cita) => Promise<Cita>;
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
  addConsultaMedica: (consulta: ConsultaMedica) => Promise<ConsultaMedica | null>;

  // Consultas Dentales
  consultasDentales: ConsultaDental[];
  addConsultaDental: (consulta: ConsultaDental) => void;

  expedientesCita: ExpedienteCita[];

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

  // Especialidades (catálogo)
  especialidadesCatalogo: EspecialidadCatalogo[];
  addEspecialidadCatalogo: (payload: { codigo: string; nombre: string }) => Promise<void>;
  updateEspecialidadCatalogo: (codigo: string, payload: Partial<Pick<EspecialidadCatalogo, 'nombre' | 'activa'>>) => Promise<void>;
  deleteEspecialidadCatalogo: (codigo: string) => Promise<void>;

  // Ciudades (catálogo)
  ciudadesCatalogo: CiudadCatalogo[];
  addCiudadCatalogo: (payload: { codigo: string; nombre: string }) => Promise<void>;
  updateCiudadCatalogo: (codigo: string, payload: Partial<Pick<CiudadCatalogo, 'nombre' | 'activa'>>) => Promise<void>;
  deleteCiudadCatalogo: (codigo: string) => Promise<void>;

  // Usuarios
  usuarios: Usuario[];
  addUsuario: (usuario: Usuario) => void;
  updateUsuario: (id: string, usuario: Partial<Usuario>) => void;
  deleteUsuario: (id: string) => void;

  estudios: EstudioSocioeconomico[];
  addEstudioSocioeconomico: (estudio: EstudioSocioeconomico) => void;

  // Sedes Quirúrgicas (catálogo admin)
  sedesQuirurgicas: SedeQuirurgica[];
  addSedeQuirurgica: (payload: Omit<SedeQuirurgica, 'id' | 'activa' | 'disponibleHoy' | 'periodos'>) => Promise<SedeQuirurgica>;
  updateSedeQuirurgica: (id: string, payload: Partial<SedeQuirurgica>) => Promise<SedeQuirurgica>;
  deleteSedeQuirurgica: (id: string) => Promise<void>;
  // Periodos de disponibilidad de sedes
  fetchPeriodosSede: (sedeId: string) => Promise<PeriodoDisponibilidad[]>;
  addPeriodoSede: (sedeId: string, payload: { fechaInicio: string; fechaFin: string; notas?: string }) => Promise<PeriodoDisponibilidad>;
  deletePeriodoSede: (periodoId: string) => Promise<void>;
  refreshSedesQuirurgicas: () => Promise<void>;

  fetchAllData: () => Promise<void>;
  isInitialized: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [informacionMedica, setInformacionMedica] = useState<InformacionMedica[]>([]);
  const [informacionMedicaDental, setInformacionMedicaDental] = useState<InformacionMedicaDental[]>([]);
  const [registrosTriage, setRegistrosTriage] = useState<RegistroTriage[]>([]);
  const [consultasMedicas, setConsultasMedicas] = useState<ConsultaMedica[]>([]);
  const [consultasDentales, setConsultasDentales] = useState<ConsultaDental[]>([]);
  const [expedientesCita, setExpedientesCita] = useState<ExpedienteCita[]>([]);
  const [cirugias, setCirugias] = useState<Cirugia[]>([]);
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [registrosAuditoria, setRegistrosAuditoria] = useState<RegistroAuditoria[]>([]);
  const [especialidadesCatalogo, setEspecialidadesCatalogo] = useState<EspecialidadCatalogo[]>([]);
  const [ciudadesCatalogo, setCiudadesCatalogo] = useState<CiudadCatalogo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [estudios, setEstudios] = useState<EstudioSocioeconomico[]>([]);
  const [sedesQuirurgicas, setSedesQuirurgicas] = useState<SedeQuirurgica[]>([]);

  useEffect(() => {
    console.log('📊 Estado de pacientes actualizado:', pacientes.length, 'pacientes cargados.');
    if (pacientes.length > 0) {
      console.log('Primer paciente en estado:', pacientes[0]);
    }
  }, [pacientes]);

  const fetchOperationalData = async () => {
    try {
      const safeFetch = async (path: string, setter: (data: any) => void) => {
        try {
          const res = await fetch(`/api/${path}`);
          if (!res.ok) return;
          const data = await res.json();
          setter(data);
        } catch (err: any) {
          console.error(`❌ Error de red al cargar ${path}:`, err.message);
        }
      };

      // Cargar solo lo que cambia constantemente en el día a día
      await Promise.all([
        safeFetch(`citas?desde=${(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); })()}&hasta=${(() => { const d = new Date(); d.setDate(d.getDate()+120); return d.toISOString().slice(0,10); })()}`, setCitas),
        safeFetch('triage', setRegistrosTriage),
        safeFetch('consultas', setConsultasMedicas),
        safeFetch('cirugias', setCirugias),
        safeFetch('seguimientos', setSeguimientos),
      ]);
    } catch (err) {
      console.error('Error cargando datos operativos:', err);
    }
  };

  const fetchStaticData = async () => {
    try {
      const safeFetch = async (path: string, setter: (data: any) => void) => {
        try {
          const res = await fetch(`/api/${path}`);
          if (!res.ok) return;
          const data = await res.json();

          if (path === 'auditoria') {
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
            setter(mapped);
            return;
          }

          if (path === 'sedes') {
            setter((prev: any) => data.map((s: any) => {
              const old = (prev || []).find((p: any) => p.id === s.id);
              return old && old.periodos ? { ...s, periodos: old.periodos } : s;
            }));
            return;
          }

          setter(data);
        } catch (err: any) {
          console.error(`❌ Error de red al cargar ${path}:`, err.message);
        }
      };

      // Catálogos e históricos (se cargan una vez o muy rara vez)
      await Promise.all([
        safeFetch('pacientes', setPacientes),
        safeFetch('expediente', setExpedientesCita),
        safeFetch('eventos', setEventos),
        safeFetch('especialidades', setEspecialidadesCatalogo),
        safeFetch('ciudades', setCiudadesCatalogo),
        safeFetch('sedes', setSedesQuirurgicas),
        safeFetch('usuarios', setUsuarios),
        safeFetch('estudios', setEstudios),
        safeFetch('auditoria', setRegistrosAuditoria)
      ]);
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([fetchOperationalData(), fetchStaticData()]);
  };

  // ── Tiempo real: SSE + fallback polling ──────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    let es: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000; // ms, crece exponencialmente hasta 30s

    // Carga inicial
    fetchAllData().finally(() => {
      if (isMounted) setIsInitialized(true);
    });

    // Recargar todo cuando el usuario regresa a la pestaña
    const handleFocus = () => fetchAllData();
    window.addEventListener('focus', handleFocus);

    // ── Conectar al stream SSE ──────────────────────────────────────────────
    const connect = () => {
      if (!isMounted) return;
      es = new EventSource('/api/sse');

      // Confirmación de conexión exitosa
      es.addEventListener('connected', () => {
        console.log('📡 SSE conectado — actualizaciones en tiempo real activas.');
        reconnectDelay = 1000; // resetear delay al reconectar exitosamente
      });

      // ⚡ Evento principal: el servidor avisa que hay datos nuevos
      es.addEventListener('operacional', () => {
        if (isMounted) {
          console.log('📡 SSE: cambio operacional detectado → recargando datos...');
          fetchOperationalData();
        }
      });

      // Reconexión automática si la conexión se pierde
      es.onerror = () => {
        es?.close();
        es = null;
        if (!isMounted) return;
        console.warn(`📡 SSE desconectado. Reconectando en ${reconnectDelay / 1000}s...`);
        reconnectTimeout = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connect();
        }, reconnectDelay);
      };
    };

    connect();

    // Fallback polling de seguridad (5 min) — por si se pierde algún evento SSE
    const fallbackInterval = setInterval(() => {
      if (isMounted) fetchOperationalData();
    }, 300000);

    // Polling lento (3 min): catálogos, auditorías, usuarios, etc.
    const staticInterval = setInterval(() => {
      if (isMounted) fetchStaticData();
    }, 180000);

    return () => {
      isMounted = false;
      es?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(fallbackInterval);
      clearInterval(staticInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const addEvento = async (evento: Evento) => {
    const res = await fetch('/api/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evento),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo crear el evento.');
    }
    const nuevo = await res.json();
    setEventos((prev) => [...prev, nuevo]);
    return nuevo;
  };

  const updateEvento = async (id: string, eventoUpdate: Partial<Evento>) => {
    const res = await fetch(`/api/eventos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventoUpdate),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo actualizar el evento.');
    }
    const actualizado = await res.json();
    setEventos(eventos.map((e) => (e.id === id ? actualizado : e)));
    return actualizado;
  };

  const deleteEvento = async (id: string, opts?: { force?: boolean }) => {
    const url = opts?.force ? `/api/eventos/${id}?force=1` : `/api/eventos/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo eliminar el evento.');
    }
    await fetchAllData();
  };

  const addPaciente = async (paciente: Paciente) => {
    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paciente),
      });
      if (res.ok) {
        const text = await res.text();
        const nuevo = text ? JSON.parse(text) : {};
        setPacientes((prev) => [...prev, nuevo]);
        return { success: true, data: nuevo };
      } else {
        const text = await res.text();
        const errorData = text ? JSON.parse(text) : { error: 'Error desconocido' };
        return { success: false, error: errorData.error, duplicado: errorData.duplicado };
      }
    } catch (err: any) {
      console.error('❌ Error en addPaciente:', err);
      return { success: false, error: `Error de red o servidor: ${err.message}` };
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
        const text = await res.text();
        const actualizado = text ? JSON.parse(text) : null;
        // Si el servidor devuelve el paciente actualizado completo, usarlo.
        // Si no (ej. {success:true}), hacer merge local con los datos enviados.
        if (actualizado && actualizado.id) {
          setPacientes((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
        } else {
          setPacientes((prev) => prev.map((p) => (p.id === id ? { ...p, ...pacienteUpdate } : p)));
        }
        return { success: true };
      } else {
        const text = await res.text();
        const errorData = text ? JSON.parse(text) : { error: 'Error desconocido' };
        return { success: false, error: errorData.error, duplicado: errorData.duplicado };
      }
    } catch (err: any) {
      console.error('❌ Error en updatePaciente:', err);
      return { success: false, error: `Error de red o servidor: ${err.message}` };
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
      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const msg = payload?.error || 'No se pudo crear la cita.';
        throw new Error(msg);
      }
      setCitas((prev) => [...prev, payload]);
      return payload;
    } catch (err) {
      console.error(err);
      throw err;
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
        setCitas((prev) => prev.map((c) => (c.id === id ? actualizado : c)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addInformacionMedica = async (info: InformacionMedica) => {
    try {
      const res = await fetch('/api/informacion-medica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setInformacionMedica((prev) => {
          const filtered = prev.filter((i) => i.pacienteId !== info.pacienteId);
          return [...filtered, nuevo];
        });
      } else {
        setInformacionMedica((prev) => {
          const filtered = prev.filter((i) => i.pacienteId !== info.pacienteId);
          return [...filtered, info];
        });
      }
    } catch (err) {
      console.error(err);
      setInformacionMedica((prev) => {
        const filtered = prev.filter((i) => i.pacienteId !== info.pacienteId);
        return [...filtered, info];
      });
    }
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
        setConsultasMedicas((prev) => [...prev, nuevo]);
        if ((consulta as any)?.requiereSeguimiento) {
          const segRes = await fetch('/api/seguimientos');
          if (segRes.ok) {
            const segData = await segRes.json();
            if (Array.isArray(segData)) setSeguimientos(segData);
          }
        }
        return nuevo;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
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
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Backend error addCirugia:", err);
        toast.error(`Error al crear cirugía: ${err.error || 'Problema de conexión con el servidor'}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error de red al crear cirugía: ${err.message}`);
    }
  };

  const updateCirugia = async (id: string, campos: Partial<Cirugia>) => {
    try {
      const res = await fetch(`/api/cirugias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campos),
      });

      if (!res.ok) {
        let errorMsg = 'Error al actualizar la cirugía.';
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch(e) {
          errorMsg = `Error del servidor (HTTP ${res.status}).`;
        }
        throw new Error(errorMsg);
      }

      // Si todo salió bien, actualizamos el estado local de React
      setCirugias((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...campos } : c))
      );
    } catch (err) {
      console.error(err);
      throw err; // <--- SÚPER IMPORTANTE: Lanzar el error para que el componente lo atrape
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
        setSeguimientos((prev) => [...prev, nuevo]);
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
        setSeguimientos((prev) => prev.map((s) => (s.id === id ? actualizado : s)));
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
        setRegistrosAuditoria((prev) => [...prev, registro]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addEspecialidadCatalogo = async (payload: { codigo: string; nombre: string }) => {
    const res = await fetch('/api/especialidades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo crear la especialidad.');
    }
    const created = await res.json();
    setEspecialidadesCatalogo((prev) => {
      const next = [...prev.filter((e) => e.codigo !== created.codigo), created];
      return next.sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
  };

  const updateEspecialidadCatalogo = async (
    codigo: string,
    payload: Partial<Pick<EspecialidadCatalogo, 'nombre' | 'activa'>>,
  ) => {
    const res = await fetch(`/api/especialidades/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo actualizar la especialidad.');
    }
    const updated = await res.json();
    setEspecialidadesCatalogo((prev) => prev.map((e) => (e.codigo === updated.codigo ? updated : e)));
  };

  const deleteEspecialidadCatalogo = async (codigo: string) => {
    const res = await fetch(`/api/especialidades/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo eliminar la especialidad.');
    }
    const updated = await res.json();
    setEspecialidadesCatalogo((prev) => prev.map((e) => (e.codigo === updated.codigo ? updated : e)));
  };

  const addCiudadCatalogo = async (payload: { codigo: string; nombre: string }) => {
    const res = await fetch('/api/ciudades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo crear la ciudad.');
    }
    const created = await res.json();
    setCiudadesCatalogo((prev) => {
      const next = [...prev.filter((c) => c.codigo !== created.codigo), created];
      return next.sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
  };

  const updateCiudadCatalogo = async (
    codigo: string,
    payload: Partial<Pick<CiudadCatalogo, 'nombre' | 'activa'>>,
  ) => {
    const res = await fetch(`/api/ciudades/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo actualizar la ciudad.');
    }
    const updated = await res.json();
    setCiudadesCatalogo((prev) => prev.map((c) => (c.codigo === updated.codigo ? updated : c)));
  };

  const deleteCiudadCatalogo = async (codigo: string) => {
    const res = await fetch(`/api/ciudades/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo eliminar la ciudad.');
    }
    const updated = await res.json();
    setCiudadesCatalogo((prev) => prev.map((c) => (c.codigo === updated.codigo ? updated : c)));
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

  const addSedeQuirurgica = async (payload: Omit<SedeQuirurgica, 'id' | 'activa'>): Promise<SedeQuirurgica> => {
    const res = await fetch('/api/sedes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Error al crear sede'); }
    const nueva: SedeQuirurgica = await res.json();
    setSedesQuirurgicas(prev => [nueva, ...prev]);
    return nueva;
  };

  const updateSedeQuirurgica = async (id: string, payload: Partial<SedeQuirurgica>): Promise<SedeQuirurgica> => {
    const res = await fetch(`/api/sedes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Error al actualizar sede'); }
    const actualizada: SedeQuirurgica = await res.json();
    setSedesQuirurgicas(prev => prev.map(s => s.id === id ? actualizada : s));
    return actualizada;
  };

  const deleteSedeQuirurgica = async (id: string): Promise<void> => {
    const res = await fetch(`/api/sedes/${id}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Error al desactivar sede'); }
    setSedesQuirurgicas(prev => prev.map(s => s.id === id ? { ...s, activa: false, disponibleHoy: false } : s));
  };

  const refreshSedesQuirurgicas = async (): Promise<void> => {
    try {
      const res = await fetch('/api/sedes');
      if (res.ok) {
        const fetched: SedeQuirurgica[] = await res.json();
        setSedesQuirurgicas(prev => fetched.map(s => {
          const old = prev.find(p => p.id === s.id);
          return old && old.periodos ? { ...s, periodos: old.periodos } : s;
        }));
      }
    } catch (err) { console.error('Error refreshing sedes:', err); }
  };

  const fetchPeriodosSede = async (sedeId: string): Promise<PeriodoDisponibilidad[]> => {
    const res = await fetch(`/api/sedes/${sedeId}/periodos`);
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Error al cargar periodos'); }
    const periodos: PeriodoDisponibilidad[] = await res.json();
    // Merge periodos into the sede in state
    setSedesQuirurgicas(prev => prev.map(s => s.id === sedeId ? { ...s, periodos } : s));
    return periodos;
  };

  const addPeriodoSede = async (sedeId: string, payload: { fechaInicio: string; fechaFin: string; notas?: string }): Promise<PeriodoDisponibilidad> => {
    const res = await fetch(`/api/sedes/${sedeId}/periodos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Error al agregar periodo'); }
    const nuevo: PeriodoDisponibilidad = await res.json();
    // Refresh sedes so disponibleHoy is recalculated
    await refreshSedesQuirurgicas();
    return nuevo;
  };

  const deletePeriodoSede = async (periodoId: string): Promise<void> => {
    const res = await fetch(`/api/sedes/periodos/${periodoId}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Error al eliminar periodo'); }
    // Refresh to recalculate disponibleHoy
    await refreshSedesQuirurgicas();
  };

  return (
    <DataContext.Provider
      value={{
        eventos,
        addEvento,
        updateEvento,
        deleteEvento,
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
        expedientesCita,
        cirugias,
        addCirugia,
        updateCirugia,
        seguimientos,
        addSeguimiento,
        updateSeguimiento,
        registrosAuditoria,
        addRegistroAuditoria,
        especialidadesCatalogo,
        addEspecialidadCatalogo,
        updateEspecialidadCatalogo,
        deleteEspecialidadCatalogo,
        ciudadesCatalogo,
        addCiudadCatalogo,
        updateCiudadCatalogo,
        deleteCiudadCatalogo,
        usuarios,
        addUsuario,
        updateUsuario,
        deleteUsuario,
        estudios,
        addEstudioSocioeconomico,
        sedesQuirurgicas,
        addSedeQuirurgica,
        updateSedeQuirurgica,
        deleteSedeQuirurgica,
        fetchPeriodosSede,
        addPeriodoSede,
        deletePeriodoSede,
        refreshSedesQuirurgicas,
        fetchAllData,
        isInitialized,
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
