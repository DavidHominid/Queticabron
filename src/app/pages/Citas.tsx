import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Cita, Especialidad } from '../types';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { Dialog } from 'primereact/dialog';
import { Button as PrimeButton } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Badge } from 'primereact/badge';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Message } from 'primereact/message';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { AutoComplete } from 'primereact/autocomplete';
import './citas-calendar-styles.css';

export function Citas() {
  const { citas, pacientes, eventos, addCita, updateCita, getPacienteByExpediente, addRegistroAuditoria, addPaciente } = useData();
  const { user } = useAuth();
  
  // Estados para modal de creación/edición
  const [showModal, setShowModal] = useState(false);
  const [showCederModal, setShowCederModal] = useState(false);
  const [tipoCesion, setTipoCesion] = useState<'existente' | 'nuevo' | null>(null);
  const [searchExpediente, setSearchExpediente] = useState('');
  const [searchExpedienteCeder, setSearchExpedienteCeder] = useState('');
  const [pacienteEncontrado, setPacienteEncontrado] = useState<any>(null);
  const [pacienteCeder, setPacienteCeder] = useState<any>(null);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [citaACeder, setCitaACeder] = useState<Cita | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Estados para autocompletado
  const [filteredPacientes, setFilteredPacientes] = useState<any[]>([]);
  const [filteredPacientesCeder, setFilteredPacientesCeder] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<Partial<Cita>>({
    eventoId: '',
    especialidad: 'medicina_familiar',
    fecha: '',
    hora: '',
    consultorio: '',
    estado: 'programada',
    costoPagado: 50,
  });

  // Formulario para crear nuevo paciente al ceder
  const [nuevoPacienteForm, setNuevoPacienteForm] = useState({
    nombre: '',
    edad: 0,
    fechaNacimiento: '',
    sexo: 'Masculino' as 'Masculino' | 'Femenino',
    telefono: '',
  });

  // Convertir citas a eventos de calendario
  const calendarEvents = citas.map((cita) => {
    const paciente = pacientes.find((p) => p.id === cita.pacienteId);
    const especialidadTexto = cita.especialidad.replace('_', ' ');
    
    return {
      id: cita.id,
      title: `${paciente?.nombre || 'Paciente'} - ${especialidadTexto}`,
      start: `${cita.fecha}T${cita.hora}`,
      extendedProps: {
        cita,
        paciente,
      },
      backgroundColor: getColorByEstado(cita.estado),
      borderColor: getColorByEstado(cita.estado),
      textColor: '#fff',
    };
  });

  function getColorByEstado(estado: string): string {
    switch (estado) {
      case 'programada': return '#3B82F6'; // blue
      case 'en_triage': return '#F59E0B'; // yellow
      case 'en_consulta': return '#A855F7'; // purple
      case 'completada': return '#10B981'; // green
      case 'cancelada': return '#EF4444'; // red
      case 'cedida': return '#F97316'; // orange
      default: return '#6B7280'; // gray
    }
  }

  // Manejar clic en un slot de tiempo vacío (crear cita)
  const handleDateClick = (info: any) => {
    const clickedDate = new Date(info.dateStr);
    setSelectedDate(clickedDate);
    
    // Si es una vista de tiempo, extraer la hora
    if (info.dateStr.includes('T')) {
      const timeString = info.dateStr.split('T')[1].substring(0, 5);
      setSelectedTime(timeString);
      setFormData({
        ...formData,
        fecha: info.dateStr.split('T')[0],
        hora: timeString,
      });
    } else {
      setSelectedTime('09:00');
      setFormData({
        ...formData,
        fecha: info.dateStr,
        hora: '09:00',
      });
    }
    
    setShowModal(true);
  };

  // Manejar clic en un evento existente (ver detalles)
  const handleEventClick = (info: any) => {
    const cita = info.event.extendedProps.cita;
    setSelectedCita(cita);
  };

  // Buscar paciente
  const buscarPaciente = () => {
    let paciente = getPacienteByExpediente(searchExpediente);
    
    if (!paciente) {
      paciente = pacientes.find(p => 
        p.nombre.toLowerCase().includes(searchExpediente.toLowerCase())
      );
    }
    
    if (paciente) {
      setPacienteEncontrado(paciente);
    } else {
      alert('No se encontró ningún paciente con ese nombre o número de expediente');
      setPacienteEncontrado(null);
    }
  };

  // Función para autocompletar pacientes
  const searchPacientes = (event: any) => {
    const query = event.query.toLowerCase();
    const filtered = pacientes.filter(p => 
      p.nombre.toLowerCase().includes(query) || 
      p.numeroExpediente.toLowerCase().includes(query)
    );
    setFilteredPacientes(filtered);
  };

  // Función para autocompletar pacientes al ceder
  const searchPacientesCeder = (event: any) => {
    const query = event.query.toLowerCase();
    const filtered = pacientes.filter(p => 
      p.nombre.toLowerCase().includes(query) || 
      p.numeroExpediente.toLowerCase().includes(query)
    );
    setFilteredPacientesCeder(filtered);
  };

  // Seleccionar paciente del autocompletado
  const handleSelectPaciente = (e: any) => {
    const paciente = e.value;
    if (typeof paciente === 'object') {
      setPacienteEncontrado(paciente);
      setSearchExpediente(`${paciente.nombre} - ${paciente.numeroExpediente}`);
    } else {
      setSearchExpediente(paciente);
    }
  };

  // Seleccionar paciente al ceder del autocompletado
  const handleSelectPacienteCeder = (e: any) => {
    const paciente = e.value;
    if (typeof paciente === 'object') {
      setPacienteCeder(paciente);
      setSearchExpedienteCeder(`${paciente.nombre} - ${paciente.numeroExpediente}`);
    } else {
      setSearchExpedienteCeder(paciente);
    }
  };

  // Template para mostrar pacientes en el dropdown
  const pacienteTemplate = (item: any) => {
    return (
      <div className="flex flex-col">
        <span className="font-medium">{item.nombre}</span>
        <span className="text-sm text-gray-600">{item.numeroExpediente} - {item.edad} años</span>
      </div>
    );
  };

  // Calcular cupos disponibles para una fecha, especialidad y evento
  const calcularCuposDisponibles = (eventoId: string, especialidad: Especialidad, fecha: string): { total: number, ocupados: number, disponibles: number } => {
    const evento = eventos.find(e => e.id === eventoId);
    if (!evento) return { total: 0, ocupados: 0, disponibles: 0 };

    const especialidadEvento = evento.especialidades.find(e => e.especialidad === especialidad);
    if (!especialidadEvento) return { total: 0, ocupados: 0, disponibles: 0 };

    // Obtener el día de la semana
    const diaSemana = new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    // Buscar horario para ese día
    const horario = especialidadEvento.horarios.find(h => h.dia === diaCapitalizado);
    if (!horario) return { total: 0, ocupados: 0, disponibles: 0 };

    // Calcular total de cupos basado en el intervalo
    const [horaInicio] = horario.horaInicio.split(':').map(Number);
    const [horaFin] = horario.horaFin.split(':').map(Number);
    const minutosDisponibles = (horaFin - horaInicio) * 60;
    const totalCupos = Math.floor(minutosDisponibles / horario.intervalo);

    // Contar cupos ocupados (citas programadas para esa fecha, especialidad y evento)
    const citasOcupadas = citas.filter(c => 
      c.eventoId === eventoId &&
      c.especialidad === especialidad &&
      c.fecha === fecha &&
      c.estado !== 'cancelada'
    ).length;

    return {
      total: totalCupos,
      ocupados: citasOcupadas,
      disponibles: totalCupos - citasOcupadas
    };
  };

  // Verificar si una fecha está dentro del rango del evento
  const fechaDentroDelEvento = (eventoId: string, fecha: string): boolean => {
    const evento = eventos.find(e => e.id === eventoId);
    if (!evento) return false;

    const fechaConsulta = new Date(fecha);
    const fechaInicio = new Date(evento.fechaInicio);
    const fechaFin = new Date(evento.fechaFin);

    return fechaConsulta >= fechaInicio && fechaConsulta <= fechaFin;
  };

  // Crear nueva cita
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteEncontrado) {
      alert('Primero busca un paciente por su número de expediente');
      return;
    }

    const nuevaCita: Cita = {
      id: `cit${Date.now()}`,
      eventoId: formData.eventoId || eventos[0]?.id || '',
      pacienteId: pacienteEncontrado.id,
      especialidad: (formData.especialidad as Especialidad) || 'medicina_familiar',
      fecha: formData.fecha || '',
      hora: formData.hora || '',
      consultorio: formData.consultorio || '',
      estado: 'programada',
      costoPagado: formData.costoPagado || 50,
      fechaCreacion: new Date().toISOString().split('T')[0],
    };

    addCita(nuevaCita);
    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Agendar Cita',
      detalles: `Agendó cita para ${pacienteEncontrado.nombre} - ${formData.especialidad} - ${formData.fecha} ${formData.hora}`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    resetForm();
  };

  // Cancelar cita
  const handleCancelarCita = (citaId: string) => {
    confirmDialog({
      message: '¿Estás seguro de cancelar esta cita? No hay reembolsos.',
      header: 'Confirmar Cancelación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        updateCita(citaId, { estado: 'cancelada' });
        addRegistroAuditoria({
          id: `aud${Date.now()}`,
          usuarioId: user?.id || '',
          nombreUsuario: user?.nombre || '',
          rol: user?.rol || 'recepcion',
          accion: 'Cancelar Cita',
          detalles: `Canceló cita ID: ${citaId}`,
          fechaHora: new Date().toISOString(),
          ciudad: user?.ciudad || 'sonoyta',
        });
        setSelectedCita(null);
      },
    });
  };

  // Ceder cita a paciente existente
  const handleCederCitaExistente = () => {
    if (!citaACeder || !pacienteCeder) return;

    updateCita(citaACeder.id, {
      pacienteId: pacienteCeder.id,
      estado: 'cedida',
      cedidaA: pacienteCeder.id,
    });

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Ceder Cita',
      detalles: `Cedió cita de ${pacientes.find(p => p.id === citaACeder.pacienteId)?.nombre} a ${pacienteCeder.nombre}`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    setShowCederModal(false);
    setTipoCesion(null);
    setPacienteCeder(null);
    setSearchExpedienteCeder('');
    setCitaACeder(null);
    setSelectedCita(null);
  };

  // Ceder cita a nuevo paciente
  const handleCederCitaNuevo = () => {
    if (!citaACeder) return;
    if (!nuevoPacienteForm.nombre || !nuevoPacienteForm.telefono) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    // Crear nuevo paciente
    const nuevoExpediente = `EXP${Date.now()}`;
    const nuevoPaciente = {
      id: `pac${Date.now()}`,
      numeroExpediente: nuevoExpediente,
      nombre: nuevoPacienteForm.nombre,
      edad: nuevoPacienteForm.edad,
      fechaNacimiento: nuevoPacienteForm.fechaNacimiento,
      sexo: nuevoPacienteForm.sexo,
      telefono: nuevoPacienteForm.telefono,
      ciudad: user?.ciudad || 'sonoyta',
      fechaRegistro: new Date().toISOString().split('T')[0],
    };

    addPaciente(nuevoPaciente);

    updateCita(citaACeder.id, {
      pacienteId: nuevoPaciente.id,
      estado: 'cedida',
      cedidaA: nuevoPaciente.id,
    });

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Ceder Cita a Nuevo Paciente',
      detalles: `Cedió cita y creó nuevo paciente: ${nuevoPaciente.nombre} (${nuevoExpediente})`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || 'sonoyta',
    });

    setShowCederModal(false);
    setTipoCesion(null);
    setNuevoPacienteForm({ nombre: '', edad: 0, fechaNacimiento: '', sexo: 'Masculino', telefono: '' });
    setCitaACeder(null);
    setSelectedCita(null);
  };

  const resetForm = () => {
    setShowModal(false);
    setPacienteEncontrado(null);
    setSearchExpediente('');
    setSelectedDate(null);
    setSelectedTime('');
    setFormData({
      eventoId: '',
      especialidad: 'medicina_familiar',
      fecha: '',
      hora: '',
      consultorio: '',
      estado: 'programada',
      costoPagado: 50,
    });
  };

  const especialidadesOptions = [
    { label: 'Medicina Familiar', value: 'medicina_familiar' },
    { label: 'Pediatría', value: 'pediatria' },
    { label: 'Fisioterapia', value: 'fisioterapia' },
    { label: 'Vacunas', value: 'vacunas' },
    { label: 'Detección Oportuna de Cáncer', value: 'deteccion_cancer' },
    { label: 'Dentista', value: 'dentista' },
  ];

  const consultoriosOptions = [
    { label: 'Consultorio 1', value: 'Consultorio 1' },
    { label: 'Consultorio 2', value: 'Consultorio 2' },
    { label: 'Consultorio 3', value: 'Consultorio 3' },
    { label: 'Consultorio 4', value: 'Consultorio 4' },
    { label: 'Consultorio 5', value: 'Consultorio 5' },
    { label: 'Consultorio 6', value: 'Consultorio 6' },
    { label: 'Consultorio 7', value: 'Consultorio 7' },
    { label: 'Consultorio 8', value: 'Consultorio 8' },
    { label: 'Consultorio Dentista', value: 'Consultorio Dentista' },
  ];

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'programada':
        return { label: 'Programada', severity: 'info' as const };
      case 'en_triage':
        return { label: 'En Triage', severity: 'warning' as const };
      case 'en_consulta':
        return { label: 'En Consulta', severity: 'help' as const };
      case 'completada':
        return { label: 'Completada', severity: 'success' as const };
      case 'cancelada':
        return { label: 'Cancelada', severity: 'danger' as const };
      case 'cedida':
        return { label: 'Cedida', severity: 'warning' as const };
      default:
        return { label: estado, severity: 'secondary' as const };
    }
  };

  return (
    <DashboardLayout>
      <ConfirmDialog />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Calendario de Citas</h1>
            <p className="text-gray-600 mt-1">Gestiona las citas médicas de forma visual e interactiva</p>
          </div>
          <PrimeButton
            label="Nueva Cita"
            icon="pi pi-plus"
            onClick={() => setShowModal(true)}
            className="p-button-primary"
          />
        </div>

        {/* Leyenda de estados */}
        <Card>
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-medium text-gray-700">Estados:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
              <span className="text-sm">Programada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
              <span className="text-sm">En Triage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#A855F7' }}></div>
              <span className="text-sm">En Consulta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
              <span className="text-sm">Completada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></div>
              <span className="text-sm">Cancelada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
              <span className="text-sm">Cedida</span>
            </div>
          </div>
        </Card>
        {/* Información de eventos activos */}
        {eventos.length > 0 && (
          <Card title="Eventos Activos" className="bg-gradient-to-r from-blue-50 to-indigo-50">
            {eventos.map(evento => (
              <div key={evento.id} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{evento.nombre}</h3>
                  <Badge
                    value={evento.estado === 'activo' ? 'ACTIVO' : evento.estado.toUpperCase()}
                    severity={evento.estado === 'activo' ? 'success' : 'secondary'}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-600 mb-1">📅 Inscripciones hasta</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(evento.fechaLimiteInscripcion).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-600 mb-1">🏥 Fecha del evento</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(evento.fechaInicio).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      {' - '}
                      {new Date(evento.fechaFin).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-600 mb-1">⏰ Horarios</p>
                    <p className="font-semibold text-gray-900">8:00 AM - 4:00 PM</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Especialidades disponibles:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {evento.especialidades.map(esp => {
                      // Calcular cupos para hoy o próxima fecha del evento
                      const hoy = new Date().toISOString().split('T')[0];
                      const cuposHoy = calcularCuposDisponibles(evento.id, esp.especialidad, hoy);
                      
                      return (
                        <div key={esp.especialidad} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 capitalize text-sm">
                              {esp.especialidad.replace('_', ' ')}
                            </h4>
                            <Badge
                              value={`$${esp.costo}`}
                              severity="info"
                              className="text-xs"
                            />
                          </div>
                          <p className="text-xs text-gray-600 mb-1">👨‍⚕️ {esp.medicoEncargado}</p>
                          <p className="text-xs text-gray-600 mb-2">📍 {esp.consultorio}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{
                                  width: `${cuposHoy.total > 0 ? (cuposHoy.ocupados / cuposHoy.total) * 100 : 0}%`
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                              {cuposHoy.disponibles}/{cuposHoy.total}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Cupos por día ({esp.horarios[0]?.intervalo || 60} min/cita)
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Calendario */}
        <Card>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="timeGridWeek"
            locale={esLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              list: 'Lista',
            }}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
            allDaySlot={false}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            events={calendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height="auto"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false,
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false,
            }}
          />
        </Card>
      </div>

      {/* Modal para crear/editar cita */}
      <Dialog
        header="Agendar Nueva Cita"
        visible={showModal}
        style={{ width: '50vw' }}
        breakpoints={{ '960px': '75vw', '641px': '90vw' }}
        onHide={resetForm}
        footer={
          <div>
            <PrimeButton label="Cancelar" icon="pi pi-times" onClick={resetForm} className="p-button-text" />
            <PrimeButton
              label="Agendar Cita"
              icon="pi pi-check"
              onClick={handleSubmit}
              disabled={!pacienteEncontrado}
            />
          </div>
        }
      >
        <div className="space-y-4">
          {/* Buscar paciente */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">1. Buscar Paciente</h3>
            <div className="p-inputgroup">
              <AutoComplete
                placeholder="Nombre o número de expediente"
                value={searchExpediente}
                onChange={(e) => setSearchExpediente(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && buscarPaciente()}
                suggestions={filteredPacientes}
                completeMethod={searchPacientes}
                field="nombre"
                itemTemplate={pacienteTemplate}
                onSelect={handleSelectPaciente}
              />
              <PrimeButton
                icon="pi pi-search"
                onClick={buscarPaciente}
              />
            </div>
            {pacienteEncontrado && (
              <Message
                severity="success"
                text={`${pacienteEncontrado.nombre} - ${pacienteEncontrado.edad} años - ${pacienteEncontrado.telefono}`}
                className="mt-3 w-full"
              />
            )}
          </div>

          {/* Datos de la cita */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900 mb-3">2. Datos de la Cita</h3>

            <div className="field">
              <label htmlFor="evento" className="block mb-2 font-medium">Evento *</label>
              <Dropdown
                id="evento"
                value={formData.eventoId}
                options={eventos.map(e => ({ label: e.nombre, value: e.id }))}
                onChange={(e) => setFormData({ ...formData, eventoId: e.value })}
                placeholder="Selecciona un evento"
                className="w-full"
              />
            </div>

            <div className="field">
              <label htmlFor="especialidad" className="block mb-2 font-medium">Especialidad *</label>
              <Dropdown
                id="especialidad"
                value={formData.especialidad}
                options={especialidadesOptions}
                onChange={(e) => {
                  const newEspecialidad = e.value;
                  setFormData({ 
                    ...formData, 
                    especialidad: newEspecialidad,
                    consultorio: newEspecialidad === 'dentista' ? 'Consultorio Dentista' : formData.consultorio
                  });
                }}
                placeholder="Selecciona especialidad"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label htmlFor="fecha" className="block mb-2 font-medium">Fecha *</label>
                <input
                  id="fecha"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="hora" className="block mb-2 font-medium">Hora *</label>
                <input
                  id="hora"
                  type="time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label htmlFor="consultorio" className="block mb-2 font-medium">Consultorio *</label>
                <Dropdown
                  id="consultorio"
                  value={formData.consultorio}
                  options={consultoriosOptions}
                  onChange={(e) => setFormData({ ...formData, consultorio: e.value })}
                  placeholder="Ej: Consultorio 1"
                  className="w-full"
                />
              </div>
              <div className="field">
                <label htmlFor="costo" className="block mb-2 font-medium">Costo *</label>
                <InputNumber
                  id="costo"
                  value={formData.costoPagado}
                  onValueChange={(e) => setFormData({ ...formData, costoPagado: e.value || 50 })}
                  mode="currency"
                  currency="USD"
                  locale="en-US"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <Message
            severity="warn"
            text="No hay reembolsos en caso de cancelación o no asistencia. El paciente puede ceder su cupo a otra persona."
          />
        </div>
      </Dialog>

      {/* Modal de detalles de cita */}
      <Dialog
        header="Detalles de la Cita"
        visible={!!selectedCita}
        style={{ width: '50vw' }}
        breakpoints={{ '960px': '75vw', '641px': '90vw' }}
        onHide={() => setSelectedCita(null)}
      >
        {selectedCita && (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">
                  {pacientes.find(p => p.id === selectedCita.pacienteId)?.nombre}
                </h3>
                <p className="text-gray-600">
                  {pacientes.find(p => p.id === selectedCita.pacienteId)?.numeroExpediente}
                </p>
              </div>
              <Badge
                value={estadoBadge(selectedCita.estado).label}
                severity={estadoBadge(selectedCita.estado).severity}
              />
            </div>

            <Divider />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Especialidad</p>
                <p className="font-medium capitalize">
                  {selectedCita.especialidad.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Doctor</p>
                <p className="font-medium">
                  {(() => {
                    const evento = eventos.find(e => e.id === selectedCita.eventoId);
                    const especialidadEvento = evento?.especialidades.find(
                      esp => esp.especialidad === selectedCita.especialidad
                    );
                    return especialidadEvento?.medicoEncargado || 'No asignado';
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Consultorio</p>
                <p className="font-medium">{selectedCita.consultorio}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Evento</p>
                <p className="font-medium">
                  {eventos.find(e => e.id === selectedCita.eventoId)?.nombre}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p className="font-medium">
                  {new Date(selectedCita.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Hora</p>
                <p className="font-medium">{selectedCita.hora}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Costo Pagado</p>
                <p className="font-medium">${selectedCita.costoPagado}</p>
              </div>
            </div>

            {selectedCita.estado === 'programada' && (
              <>
                <Divider />
                <div className="flex gap-3">
                  <PrimeButton
                    label="Cancelar Cita"
                    icon="pi pi-times"
                    className="p-button-danger flex-1"
                    onClick={() => handleCancelarCita(selectedCita.id)}
                  />
                  <PrimeButton
                    label="Ceder Cupo"
                    icon="pi pi-user-plus"
                    className="p-button-outlined flex-1"
                    onClick={() => {
                      setShowCederModal(true);
                      setCitaACeder(selectedCita);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Dialog>

      {/* Modal para ceder cita */}
      <Dialog
        header="Ceder Cupo de Cita"
        visible={showCederModal}
        style={{ width: '50vw' }}
        breakpoints={{ '960px': '75vw', '641px': '90vw' }}
        onHide={() => {
          setShowCederModal(false);
          setTipoCesion(null);
          setPacienteCeder(null);
          setSearchExpedienteCeder('');
          setNuevoPacienteForm({ nombre: '', edad: 0, fechaNacimiento: '', sexo: 'Masculino', telefono: '' });
        }}
      >
        {citaACeder && (
          <div className="space-y-4">
            {/* Información de la cita */}
            <Card title="Información de la Cita">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Paciente Original: </span>
                  <span className="font-semibold">
                    {pacientes.find(p => p.id === citaACeder.pacienteId)?.nombre}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Especialidad: </span>
                  <span className="font-semibold capitalize">
                    {citaACeder.especialidad.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Fecha: </span>
                  <span className="font-semibold">
                    {new Date(citaACeder.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Hora: </span>
                  <span className="font-semibold">{citaACeder.hora}</span>
                </div>
              </div>
            </Card>

            {/* Seleccionar tipo de cesión */}
            {!tipoCesion && (
              <div>
                <h3 className="font-medium mb-3">¿A quién deseas ceder el cupo?</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setTipoCesion('existente')}
                  >
                    <div className="text-center p-4">
                      <i className="pi pi-user text-4xl text-blue-500 mb-3"></i>
                      <h4 className="font-medium">Paciente Existente</h4>
                      <p className="text-sm text-gray-600 mt-1">Buscar en el sistema</p>
                    </div>
                  </Card>
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setTipoCesion('nuevo')}
                  >
                    <div className="text-center p-4">
                      <i className="pi pi-user-plus text-4xl text-green-500 mb-3"></i>
                      <h4 className="font-medium">Nuevo Paciente</h4>
                      <p className="text-sm text-gray-600 mt-1">Crear desde cero</p>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Buscar paciente existente */}
            {tipoCesion === 'existente' && (
              <div className="space-y-4">
                <h3 className="font-medium">Buscar Paciente Existente</h3>
                <div className="p-inputgroup">
                  <AutoComplete
                    placeholder="Nombre o número de expediente"
                    value={searchExpedienteCeder}
                    onChange={(e) => setSearchExpedienteCeder(e.target.value)}
                    suggestions={filteredPacientesCeder}
                    completeMethod={searchPacientesCeder}
                    field="nombre"
                    itemTemplate={pacienteTemplate}
                    onSelect={handleSelectPacienteCeder}
                  />
                  <PrimeButton
                    icon="pi pi-search"
                    onClick={() => {
                      let paciente = getPacienteByExpediente(searchExpedienteCeder);
                      if (!paciente) {
                        paciente = pacientes.find(p =>
                          p.nombre.toLowerCase().includes(searchExpedienteCeder.toLowerCase())
                        );
                      }
                      if (paciente) {
                        setPacienteCeder(paciente);
                      } else {
                        alert('No se encontró ningún paciente');
                        setPacienteCeder(null);
                      }
                    }}
                  />
                </div>
                {pacienteCeder && (
                  <Message
                    severity="success"
                    text={`${pacienteCeder.nombre} - ${pacienteCeder.numeroExpediente} - ${pacienteCeder.edad} años`}
                    className="w-full"
                  />
                )}
                <div className="flex gap-3 pt-4">
                  <PrimeButton
                    label="Volver"
                    icon="pi pi-arrow-left"
                    className="p-button-outlined flex-1"
                    onClick={() => {
                      setTipoCesion(null);
                      setPacienteCeder(null);
                    }}
                  />
                  <PrimeButton
                    label="Ceder Cita"
                    icon="pi pi-check"
                    className="flex-1"
                    onClick={handleCederCitaExistente}
                    disabled={!pacienteCeder}
                  />
                </div>
              </div>
            )}

            {/* Crear nuevo paciente */}
            {tipoCesion === 'nuevo' && (
              <div className="space-y-4">
                <h3 className="font-medium">Crear Nuevo Paciente</h3>
                
                <div className="field">
                  <label htmlFor="nombreNuevo" className="block mb-2">Nombre Completo *</label>
                  <InputText
                    id="nombreNuevo"
                    value={nuevoPacienteForm.nombre}
                    onChange={(e) => setNuevoPacienteForm({ ...nuevoPacienteForm, nombre: e.target.value })}
                    placeholder="Juan Pérez García"
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="field">
                    <label htmlFor="fechaNacNuevo" className="block mb-2">Fecha de Nacimiento *</label>
                    <input
                      id="fechaNacNuevo"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={nuevoPacienteForm.fechaNacimiento}
                      onChange={(e) => {
                        const edad = new Date().getFullYear() - new Date(e.target.value).getFullYear();
                        setNuevoPacienteForm({
                          ...nuevoPacienteForm,
                          fechaNacimiento: e.target.value,
                          edad,
                        });
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="edadNuevo" className="block mb-2">Edad</label>
                    <InputNumber
                      id="edadNuevo"
                      value={nuevoPacienteForm.edad}
                      onValueChange={(e) => setNuevoPacienteForm({ ...nuevoPacienteForm, edad: e.value || 0 })}
                      className="w-full"
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="field">
                    <label htmlFor="sexoNuevo" className="block mb-2">Sexo *</label>
                    <Dropdown
                      id="sexoNuevo"
                      value={nuevoPacienteForm.sexo}
                      options={[
                        { label: 'Masculino', value: 'Masculino' },
                        { label: 'Femenino', value: 'Femenino' },
                      ]}
                      onChange={(e) => setNuevoPacienteForm({ ...nuevoPacienteForm, sexo: e.value })}
                      className="w-full"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="telefonoNuevo" className="block mb-2">Teléfono *</label>
                    <InputText
                      id="telefonoNuevo"
                      value={nuevoPacienteForm.telefono}
                      onChange={(e) => setNuevoPacienteForm({ ...nuevoPacienteForm, telefono: e.target.value })}
                      placeholder="123-456-7890"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <PrimeButton
                    label="Volver"
                    icon="pi pi-arrow-left"
                    className="p-button-outlined flex-1"
                    onClick={() => {
                      setTipoCesion(null);
                      setNuevoPacienteForm({ nombre: '', edad: 0, fechaNacimiento: '', sexo: 'Masculino', telefono: '' });
                    }}
                  />
                  <PrimeButton
                    label="Crear y Ceder"
                    icon="pi pi-check"
                    className="flex-1"
                    onClick={handleCederCitaNuevo}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </DashboardLayout>
  );
}