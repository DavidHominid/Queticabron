// Tipos de usuario
export type UserRole = 'recepcion' | 'triage' | 'medico' | 'administrador';
export type Rol = UserRole;
export type Especialidad = string;
export type Ciudad = string;

export interface EspecialidadCatalogo {
  codigo: string;
  nombre: string;
  activa: boolean;
}

export interface CiudadCatalogo {
  codigo: string;
  nombre: string;
  activa: boolean;
}

export interface User {
  id: string;
  nombre: string;
  rol: UserRole;
  especialidad?: Especialidad;
  especialidades?: Especialidad[];
  ciudad: Ciudad;
  ciudades?: Ciudad[];
  activo?: boolean;
  activoDesde?: string | null;
  activoHasta?: string | null;
}

// Evento/Consultorio
export interface Evento {
  id: string;
  nombre: string;
  ciudad: Ciudad;
  fechaInicioInscripcion?: string;
  fechaFinInscripcion?: string;
  fechaInicio: string;
  fechaFin: string;
  fechaLimiteInscripcion?: string;
  especialidades: EspecialidadEvento[];
  estado: 'activo' | 'finalizado' | 'cancelado';
}

export interface EspecialidadEvento {
  especialidad: Especialidad;
  medicoEncargado: string;
  practicantes: string[];
  consultorio: string;
  horarios: HorarioDisponible[];
  costo: number;
  tiposCita?: TipoCitaEvento[];
}

export interface TipoCitaEvento {
  id?: string;
  nombre: string;
  duracionMinutos: number;
  precio: number;
  medicoEncargado: string;
}

export interface HorarioDisponible {
  dia: string;
  horaInicio: string;
  horaFin: string;
  intervalo?: number;
  cupoTotal?: number;
  tipoCitaId?: string;
}

// Paciente
export interface Paciente {
  id: string;
  numeroExpediente: string;
  nombre: string;
  apellido?: string;
  edad: number;
  fechaNacimiento: string;
  sexo: 'Masculino' | 'Femenino';
  telefono: string;
  ciudad: Ciudad;
  fechaRegistro: string;
  imagen?: string;
  nacionalidad?: string;
  identificacion?: string;
}

// Cita
export interface Cita {
  id: string;
  eventoId: string;
  pacienteId: string;
  especialidad: Especialidad;
  fecha: string;
  hora: string;
  consultorio: string;
  tipoCitaId?: string;
  tipoCitaNombre?: string;
  duracionMinutos?: number;
  medicoEncargado?: string;
  estado: 'programada' | 'cancelada' | 'cedida' | 'en_triage' | 'en_consulta' | 'completada' | 'no_asistio';
  costoPagado: number;
  cedidaA?: string; // ID del nuevo paciente si se cedió el cupo
  fechaCreacion: string;
}

// Información Médica General (para todas las especialidades excepto dentista)
export interface InformacionMedica {
  pacienteId: string;
  alergias: string[];
  medicamentosActuales: string[];
  antecedentes: AntecedentesGenerales;
  antecedentesPsicosociales: string;
  notas: string;
}

export interface AntecedentesGenerales {
  enfermedadesCorazon: boolean;
  diabetes: boolean;
  tuberculosis: boolean;
  altaPresion: boolean;
  rinones: boolean;
  asma: boolean;
  hemorragiaSevera: boolean;
  embarazada?: boolean;
  lactando?: boolean;
}

// Información Médica Dental (específica para dentista)
export interface InformacionMedicaDental {
  pacienteId: string;
  alergias: {
    tieneAlergias: boolean;
    medicamentos: string[];
  };
  medicamentos: {
    tomaMedicamentos: boolean;
    cuales: string[];
  };
  antecedentes: AntecedentesDentales;
  notas: string;
}

export interface AntecedentesDentales {
  enfermedadesCorazon: boolean;
  diabetes: boolean;
  tuberculosis: boolean;
  altaPresion: boolean;
  rinones: boolean;
  asma: boolean;
  hemorragiaSevera: boolean;
  embarazada?: boolean;
  lactando?: boolean;
}

// Signos Vitales
export interface SignosVitales {
  temperatura: number;
  presionArterial: string;
  ritmoCardiaco: number;
  frecuenciaRespiratoria: number;
  saturacionOxigeno?: number;
  azucarEnSangre?: number;
  altura: number;
  peso: number;
}

// Registro de Triage
export interface RegistroTriage {
  id: string;
  citaId: string;
  pacienteId: string;
  fechaHora: string;
  signosVitales: SignosVitales;
  observaciones?: string;
  realizadoPor: string;
}

// Consulta Médica General
export interface ConsultaMedica {
  id: string;
  citaId: string;
  pacienteId: string;
  medicoEncargado: string;
  especialidad: Especialidad;
  fechaHora: string;
  motivoConsulta: string;
  padecimientoActual: string;
  exploracionFisica: string;
  diagnostico: string;
  tratamiento: string;
  medicamentosRecetados?: Array<{
    nombre: string;
    dosis: string;
    frecuencia: string;
    duracion: string;
  }>;
  estudiosIndicados?: Array<{
    tipo: string;
    indicaciones: string;
  }>;
  recomendaciones?: string;
  proximaConsulta?: string;
  requiereCirugia?: boolean;
}

export interface Medicamento {
  id: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
}

export interface Fisioterapia {
  indicaciones: string;
  medicoEncargado: string;
}

// Consulta Dental
export interface ConsultaDental {
  id: string;
  citaId: string;
  pacienteId: string;
  eventoId: string;
  fechaHora: string;
  dentistaId: string;
  nombreDentista: string;
  presion: string;
  sintomaPrincipal: string;
  expedienteDental: ExpedienteDental;
}

export interface ExpedienteDental {
  doctorEncargado: string;
  materiales: {
    tylenol: string;
    ibuprofeno: string;
    penicilina: string;
    eritromicina: string;
    alveoloplastia: string;
    suturas: string;
    cepilloDientes: string;
  };
}

// Seguimiento
export interface Seguimiento {
  id: string;
  pacienteId: string;
  citaId?: string | null;
  cirugiaId?: string; // Relation to surgery
  consultaPrevia?: string;
  citaNueva?: string;
  fecha?: string;
  fechaCreacion: string;
  fechaCita?: string;
  horaCita?: string;
  medicoEncargado?: string;
  estadoPaciente?: string;
  datosVitales?: {
    azucarEnSangre: number;
  };
  diagnostico?: string;
  observaciones?: string;
  examenesRequeridos?: string[];
  remisionFarmacia?: string;
  proximoSeguimiento?: string;
  estado: 'pendiente' | 'agendada' | 'completada' | 'pendiente_de_agendar';
}

// Cirugía
export interface Cirugia {
  id: string;
  pacienteId: string;
  consultaId?: string;
  diagnostico: string;
  medicoACargo: string;
  especialidad: Especialidad;
  estado: 'pendiente_estudio' | 'estudio_completado' | 'candidato' | 'estudios_pendientes' | 'cita_internista' | 'estudio_socioeconomico' | 'programada' | 'realizada' | 'seguimiento' | 'cancelada';
  estudios?: {
    requeridos: string[];
    completados: boolean;
    resultados?: string;
  };
  citaInternista?: {
    fecha: string;
    hora: string;
    lugar: string;
    completada: boolean;
  };
  estudioSocioeconomico?: Partial<EstudioSocioeconomico>;
  fechaCirugia?: string;
  horaCirugia?: string;
  horaEstimada?: string;
  lugarCirugia?: string;
  costoEstimado?: number;
  indicacionesPreoperatorias?: string;
  resultadoCirugia?: string;
  seguimientos?: string[]; // IDs de citas de seguimiento
  notas?: string;
  fechaRegistro?: string;
}

// Expediente Completo del Paciente
export interface ExpedienteCompleto {
  paciente: Paciente;
  informacionMedica?: InformacionMedica;
  informacionMedicaDental?: InformacionMedicaDental;
  citas: Cita[];
  consultas: ConsultaMedica[];
  consultasDentales: ConsultaDental[];
  cirugias: Cirugia[];
  seguimientos: Seguimiento[];
}

export interface ExpedienteCita {
  id: string;
  citaId: string;
  pacienteId: string;
  triageData: any;
  consultaData: any;
  createdAt: string;
  updatedAt: string;
}

// Auditoría
export interface RegistroAuditoria {
  id: string;
  usuarioId: string;
  nombreUsuario: string;
  rol: UserRole;
  accion: string;
  detalles: string;
  fechaHora: string;
  ciudad: Ciudad;
}

// Usuario del Sistema
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: UserRole;
  especialidad?: Especialidad;
  especialidades?: Especialidad[];
  ciudad: Ciudad;
  ciudades?: Ciudad[];
  activo: boolean;
  activoDesde?: string | null;
  activoHasta?: string | null;
}

// Estudio Socioeconómico
export interface EstudioSocioeconomico {
  id: string;
  cirugiaId?: string;
  pacienteId: string;
  fechaEstudio: string;
  ingresoMensual?: number;
  ingresos?: {
    trabajoFormal: boolean;
    montoMensual: number;
    otrosIngresos: string;
  };
  numeroPersonasDependientes?: number;
  vivienda?: {
    tipo: 'propia' | 'rentada' | 'prestada' | 'otro';
    servicios: string[];
    numHabitaciones?: number;
    numeroCuartos?: number;
  };
  dependientes?: {
    numPersonas: number;
    edades: string;
  };
  gastosMedicos?: {
    montoMensual: number;
    seguroMedico: boolean;
    tipoSeguro?: string;
  };
  completado?: boolean;
  candidatoBeca?: boolean;
  notas?: string;
  ocupacion?: string;
  situacionFamiliar?: string;
  necesidadesEspeciales?: string;
  apoyosGubernamentales?: string[];
  nivelSocioeconomico?: 'bajo' | 'medio' | 'alto';
  situacionEconomica?: string;
  porcentajeBeca?: number;
  observaciones?: string;
  realizadoPor: string;
}
