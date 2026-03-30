import {
  Evento,
  Paciente,
  Cita,
  InformacionMedica,
  RegistroTriage,
  ConsultaMedica,
  Cirugia,
  Seguimiento,
  RegistroAuditoria,
  Usuario,
  EstudioSocioeconomico,
} from '../types';

// Eventos activos
export const eventos: Evento[] = [
  {
    id: 'evt1',
    nombre: 'Consultorio Médico Comunitario - Marzo 2026',
    ciudad: 'sonoyta',
    fechaInicio: '2026-03-16',
    fechaFin: '2026-03-20',
    fechaLimiteInscripcion: '2026-03-01',
    especialidades: [
      {
        especialidad: 'medicina_familiar',
        medicoEncargado: 'Dr. Roberto García',
        practicantes: ['Enf. Laura Rodríguez', 'Enf. Carlos Méndez'],
        consultorio: 'Consultorio 1',
        horarios: [
          { dia: 'Lunes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Martes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Miércoles', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Jueves', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Viernes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
        ],
        costo: 50,
      },
      {
        especialidad: 'pediatria',
        medicoEncargado: 'Dra. Ana Martínez',
        practicantes: ['Enf. Laura Rodríguez'],
        consultorio: 'Consultorio 2',
        horarios: [
          { dia: 'Lunes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Martes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Miércoles', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Jueves', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Viernes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
        ],
        costo: 50,
      },
      {
        especialidad: 'dentista',
        medicoEncargado: 'Dr. Luis Hernández',
        practicantes: [],
        consultorio: 'Consultorio Dentista',
        horarios: [
          { dia: 'Lunes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Martes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Miércoles', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Jueves', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Viernes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
        ],
        costo: 100,
      },
      {
        especialidad: 'fisioterapia',
        medicoEncargado: 'Lic. Carmen Ruiz',
        practicantes: [],
        consultorio: 'Consultorio 3',
        horarios: [
          { dia: 'Lunes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Miércoles', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
          { dia: 'Viernes', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
        ],
        costo: 75,
      },
    ],
    estado: 'activo',
  },
];

// Pacientes
export const pacientes: Paciente[] = [
  {
    id: 'pac1',
    numeroExpediente: 'EXP-2026-001',
    nombre: 'María González López',
    edad: 45,
    fechaNacimiento: '1981-05-15',
    sexo: 'Femenino',
    telefono: '638-555-0101',
    ciudad: 'sonoyta',
    fechaRegistro: '2026-02-15',
  },
  {
    id: 'pac2',
    numeroExpediente: 'EXP-2026-002',
    nombre: 'Juan Pérez Ramírez',
    edad: 32,
    fechaNacimiento: '1994-03-22',
    sexo: 'Masculino',
    telefono: '638-555-0102',
    ciudad: 'sonoyta',
    fechaRegistro: '2026-02-20',
  },
  {
    id: 'pac3',
    numeroExpediente: 'EXP-2026-003',
    nombre: 'Ana Martínez Sánchez',
    edad: 28,
    fechaNacimiento: '1998-11-08',
    sexo: 'Femenino',
    telefono: '638-555-0103',
    ciudad: 'sonoyta',
    fechaRegistro: '2026-03-01',
  },
  {
    id: 'pac4',
    numeroExpediente: 'EXP-2026-004',
    nombre: 'Pedro Rodríguez',
    edad: 8,
    fechaNacimiento: '2018-06-12',
    sexo: 'Masculino',
    telefono: '638-555-0104',
    ciudad: 'sonoyta',
    fechaRegistro: '2026-03-05',
  },
  {
    id: 'pac5',
    numeroExpediente: 'EXP-2026-005',
    nombre: 'Carlos Fernández Torres',
    edad: 52,
    fechaNacimiento: '1974-09-18',
    sexo: 'Masculino',
    telefono: '638-555-0105',
    ciudad: 'sonoyta',
    fechaRegistro: '2026-01-10',
  },
];

// Información Médica de Pacientes
export const informacionMedica: InformacionMedica[] = [
  {
    pacienteId: 'pac1',
    alergias: ['Penicilina'],
    medicamentosActuales: ['Metformina 500mg - 2 veces al día'],
    antecedentes: {
      enfermedadesCorazon: false,
      diabetes: true,
      tuberculosis: false,
      altaPresion: true,
      rinones: false,
      asma: false,
      hemorragiaSevera: false,
      embarazada: false,
      lactando: false,
    },
    antecedentesPsicosociales: 'Padre con diabetes tipo 2, madre con hipertensión',
    notas: 'Paciente regular en control mensual de diabetes',
  },
  {
    pacienteId: 'pac2',
    alergias: [],
    medicamentosActuales: [],
    antecedentes: {
      enfermedadesCorazon: false,
      diabetes: false,
      tuberculosis: false,
      altaPresion: false,
      rinones: false,
      asma: true,
      hemorragiaSevera: false,
    },
    antecedentesPsicosociales: 'Asma desde la infancia, controlada con inhalador',
    notas: '',
  },
  {
    pacienteId: 'pac3',
    alergias: ['Ibuprofeno'],
    medicamentosActuales: ['Ácido fólico', 'Vitaminas prenatales'],
    antecedentes: {
      enfermedadesCorazon: false,
      diabetes: false,
      tuberculosis: false,
      altaPresion: false,
      rinones: false,
      asma: false,
      hemorragiaSevera: false,
      embarazada: true,
      lactando: false,
    },
    antecedentesPsicosociales: 'Primer embarazo, 14 semanas de gestación',
    notas: 'Embarazo de bajo riesgo, seguimiento prenatal regular',
  },
  {
    pacienteId: 'pac4',
    alergias: [],
    medicamentosActuales: [],
    antecedentes: {
      enfermedadesCorazon: false,
      diabetes: false,
      tuberculosis: false,
      altaPresion: false,
      rinones: false,
      asma: false,
      hemorragiaSevera: false,
    },
    antecedentesPsicosociales: 'Niño sano, calendario de vacunación al día',
    notas: '',
  },
];

// Citas
export const citas: Cita[] = [
  {
    id: 'cit1',
    eventoId: 'evt1',
    pacienteId: 'pac1',
    especialidad: 'medicina_familiar',
    fecha: '2026-03-09', // HOY
    hora: '09:00',
    consultorio: 'Consultorio 1',
    estado: 'programada',
    costoPagado: 50,
    fechaCreacion: '2026-03-05',
  },
  // Cita completada 1 de María - Gastritis
  {
    id: 'cit-maria-1',
    eventoId: 'evt1',
    pacienteId: 'pac1',
    especialidad: 'medicina_familiar',
    fecha: '2026-02-20',
    hora: '10:00',
    consultorio: 'Consultorio 1',
    estado: 'completada',
    costoPagado: 50,
    fechaCreacion: '2026-02-15',
  },
  // Cita completada 2 de María - Hipertensión
  {
    id: 'cit-maria-2',
    eventoId: 'evt1',
    pacienteId: 'pac1',
    especialidad: 'medicina_familiar',
    fecha: '2026-03-01',
    hora: '11:00',
    consultorio: 'Consultorio 1',
    estado: 'completada',
    costoPagado: 50,
    fechaCreacion: '2026-02-25',
  },
  // Cita completada 3 de María - Pediatría
  {
    id: 'cit-maria-3',
    eventoId: 'evt1',
    pacienteId: 'pac1',
    especialidad: 'pediatria',
    fecha: '2026-03-05',
    hora: '14:00',
    consultorio: 'Consultorio 2',
    estado: 'completada',
    costoPagado: 50,
    fechaCreacion: '2026-03-01',
  },
  {
    id: 'cit2',
    eventoId: 'evt1',
    pacienteId: 'pac2',
    especialidad: 'medicina_familiar',
    fecha: '2026-03-09', // HOY
    hora: '09:30',
    consultorio: 'Consultorio 1',
    estado: 'programada',
    costoPagado: 50,
    fechaCreacion: '2026-03-06',
  },
  {
    id: 'cit3',
    eventoId: 'evt1',
    pacienteId: 'pac3',
    especialidad: 'medicina_familiar',
    fecha: '2026-03-09', // HOY
    hora: '10:00',
    consultorio: 'Consultorio 1',
    estado: 'en_triage',
    costoPagado: 50,
    fechaCreacion: '2026-03-07',
  },
  {
    id: 'cit4',
    eventoId: 'evt1',
    pacienteId: 'pac4',
    especialidad: 'pediatria',
    fecha: '2026-03-09', // HOY
    hora: '09:00',
    consultorio: 'Consultorio 2',
    estado: 'programada',
    costoPagado: 50,
    fechaCreacion: '2026-03-07',
  },
];

// Registros de Triage
export const registrosTriage: RegistroTriage[] = [
  // Triage de María - Cita 1 (Gastritis)
  {
    id: 'tri-maria-1',
    citaId: 'cit-maria-1',
    pacienteId: 'pac1',
    fechaHora: '2026-02-20T09:45:00',
    signosVitales: {
      temperatura: 36.8,
      presionArterial: '130/85',
      ritmoCardiaco: 78,
      frecuenciaRespiratoria: 18,
      saturacionOxigeno: 98,
      azucarEnSangre: 125,
      altura: 162,
      peso: 68,
    },
    observaciones: 'Paciente refiere dolor abdominal y náuseas desde hace 3 días',
    realizadoPor: 'Enf. Laura Rodríguez',
  },
  // Triage de María - Cita 2 (Hipertensión)
  {
    id: 'tri-maria-2',
    citaId: 'cit-maria-2',
    pacienteId: 'pac1',
    fechaHora: '2026-03-01T10:45:00',
    signosVitales: {
      temperatura: 36.5,
      presionArterial: '145/92',
      ritmoCardiaco: 82,
      frecuenciaRespiratoria: 17,
      saturacionOxigeno: 97,
      azucarEnSangre: 132,
      altura: 162,
      peso: 69,
    },
    observaciones: 'Presión arterial elevada, paciente reporta cefalea ocasional',
    realizadoPor: 'Enf. Carlos Méndez',
  },
  // Triage de María - Cita 3 (Control general)
  {
    id: 'tri-maria-3',
    citaId: 'cit-maria-3',
    pacienteId: 'pac1',
    fechaHora: '2026-03-05T13:50:00',
    signosVitales: {
      temperatura: 36.7,
      presionArterial: '128/82',
      ritmoCardiaco: 75,
      frecuenciaRespiratoria: 16,
      saturacionOxigeno: 98,
      azucarEnSangre: 118,
      altura: 162,
      peso: 68,
    },
    observaciones: 'Control de rutina, paciente se encuentra estable',
    realizadoPor: 'Enf. Laura Rodríguez',
  },
  {
    id: 'tri1',
    citaId: 'cit3',
    pacienteId: 'pac3',
    fechaHora: '2026-03-09T09:50:00',
    signosVitales: {
      temperatura: 36.6,
      presionArterial: '110/70',
      ritmoCardiaco: 72,
      frecuenciaRespiratoria: 16,
      saturacionOxigeno: 99,
      azucarEnSangre: 90,
      altura: 165,
      peso: 62,
    },
    observaciones: 'Paciente embarazada de 14 semanas, sin molestias aparentes',
    realizadoPor: 'Enf. Laura Rodríguez',
  },
];

// Consultas Médicas
export const consultasMedicas: ConsultaMedica[] = [
  // Consulta 1 de María - Gastritis Aguda
  {
    id: 'cons-maria-1',
    citaId: 'cit-maria-1',
    pacienteId: 'pac1',
    medicoEncargado: 'Dr. Roberto García',
    especialidad: 'medicina_familiar',
    fechaHora: '2026-02-20T10:30:00',
    motivoConsulta: 'Dolor abdominal recurrente y malestar estomacal',
    padecimientoActual: 'Paciente refiere dolor abdominal de 3 días de evolución, localizado en epigastrio, tipo ardoroso, que aumenta con la ingesta de alimentos irritantes. Acompañado de náuseas ocasionales y sensación de plenitud. Sin vómito, sin diarrea, sin fiebre.',
    exploracionFisica: 'Abdomen blando, depresible, doloroso a la palpación superficial en epigastrio, sin datos de irritación peritoneal. Ruidos peristálticos presentes y normales. No se palpan masas ni visceromegalias.',
    diagnostico: 'Gastritis aguda',
    tratamiento: 'Dieta blanda, evitar irritantes (café, alcohol, picante, grasas). Tomar abundantes líquidos. Administrar medicamentos según indicaciones.',
    medicamentosRecetados: [
      {
        nombre: 'Omeprazol',
        dosis: '20 mg',
        frecuencia: 'Cada 24 horas antes del desayuno',
        duracion: '14 días'
      },
      {
        nombre: 'Ranitidina',
        dosis: '150 mg',
        frecuencia: 'Cada 12 horas',
        duracion: '7 días'
      },
      {
        nombre: 'Sucralfato',
        dosis: '1 g',
        frecuencia: 'Cada 6 horas antes de alimentos',
        duracion: '10 días'
      }
    ],
    estudiosIndicados: [
      {
        tipo: 'Endoscopia digestiva alta',
        indicaciones: 'Valorar presencia de úlcera gástrica o duodenal si no hay mejoría en 2 semanas'
      },
      {
        tipo: 'Biometría hemática',
        indicaciones: 'Control general, descartar anemia'
      }
    ],
    recomendaciones: 'Evitar consumo de AINES (ibuprofeno, aspirina). No fumar. Realizar comidas pequeñas y frecuentes. Evitar acostarse inmediatamente después de comer. Reducir estrés. Acudir a urgencias si presenta vómito con sangre, dolor intenso que no cede, o evacuaciones oscuras.',
    proximaConsulta: 'Control en 2 semanas o antes si persisten los síntomas',
    requiereCirugia: false,
  },
  // Consulta 2 de María - Hipertensión Arterial
  {
    id: 'cons-maria-2',
    citaId: 'cit-maria-2',
    pacienteId: 'pac1',
    medicoEncargado: 'Dr. Roberto García',
    especialidad: 'medicina_familiar',
    fechaHora: '2026-03-01T11:20:00',
    motivoConsulta: 'Control de hipertensión arterial y cefalea',
    padecimientoActual: 'Paciente con diagnóstico previo de hipertensión arterial desde hace 2 años, actualmente con cifras tensionales elevadas (145/92 mmHg). Refiere cefalea frontal intermitente de intensidad moderada, principalmente por las mañanas. Niega visión borrosa, mareos o dolor torácico.',
    exploracionFisica: 'Paciente consciente, orientada, bien hidratada. Campos pulmonares con adecuada entrada y salida de aire bilateral. Ruidos cardiacos rítmicos, sin soplos. Presión arterial 145/92 mmHg en ambos brazos. Pulsos periféricos presentes y simétricos. Fondo de ojo pendiente de valoración.',
    diagnostico: 'Hipertensión Arterial Sistémica descontrolada',
    tratamiento: 'Modificaciones en el estilo de vida: dieta baja en sodio (menos de 2g al día), ejercicio aeróbico 30 minutos diarios, control de peso. Medicación antihipertensiva ajustada.',
    medicamentosRecetados: [
      {
        nombre: 'Losartán',
        dosis: '50 mg',
        frecuencia: 'Cada 24 horas en la mañana',
        duracion: '30 días'
      },
      {
        nombre: 'Hidroclorotiazida',
        dosis: '25 mg',
        frecuencia: 'Cada 24 horas en la mañana',
        duracion: '30 días'
      },
      {
        nombre: 'Paracetamol',
        dosis: '500 mg',
        frecuencia: 'Cada 8 horas en caso de cefalea',
        duracion: '5 días'
      }
    ],
    estudiosIndicados: [
      {
        tipo: 'Electrocardiograma',
        indicaciones: 'Valorar hipertrofia ventricular izquierda'
      },
      {
        tipo: 'Química sanguínea',
        indicaciones: 'Evaluar función renal (creatinina, BUN) y electrolitos'
      },
      {
        tipo: 'Examen general de orina',
        indicaciones: 'Descartar daño renal'
      },
      {
        tipo: 'Perfil lipídico',
        indicaciones: 'Evaluar riesgo cardiovascular'
      }
    ],
    recomendaciones: 'Monitoreo diario de presión arterial en casa, preferentemente en las mañanas. Llevar registro escrito de las cifras. Reducir consumo de sal y alimentos procesados. Evitar cafeína en exceso. Realizar caminatas diarias. Tomar medicamentos de forma continua sin suspenderlos.',
    proximaConsulta: 'Control en 2 semanas con resultados de laboratorio',
    requiereCirugia: false,
  },
  // Consulta 3 de María - Control Diabetes
  {
    id: 'cons-maria-3',
    citaId: 'cit-maria-3',
    pacienteId: 'pac1',
    medicoEncargado: 'Dra. Ana Martínez',
    especialidad: 'pediatria',
    fechaHora: '2026-03-05T14:15:00',
    motivoConsulta: 'Control de diabetes mellitus tipo 2',
    padecimientoActual: 'Paciente con diabetes mellitus tipo 2 diagnosticada hace 3 años. Actualmente en tratamiento con metformina. Refiere adherencia adecuada al tratamiento. Glucemia en ayuno hoy de 118 mg/dL. Niega poliuria, polidipsia o pérdida de peso. Refiere fatiga ocasional.',
    exploracionFisica: 'Paciente en buen estado general. Peso: 68 kg, IMC: 25.9 (sobrepeso). Examen de pies: sensibilidad conservada, pulsos pedios presentes, sin lesiones dérmicas. Agudeza visual conservada. No acantosis nigricans.',
    diagnostico: 'Diabetes Mellitus tipo 2 en control aceptable',
    tratamiento: 'Continuar con manejo actual. Reforzar plan de alimentación y actividad física. Se solicitan estudios de control metabólico.',
    medicamentosRecetados: [
      {
        nombre: 'Metformina',
        dosis: '850 mg',
        frecuencia: 'Cada 12 horas con alimentos',
        duracion: '90 días'
      }
    ],
    estudiosIndicados: [
      {
        tipo: 'Hemoglobina glicosilada (HbA1c)',
        indicaciones: 'Control metabólico de los últimos 3 meses'
      },
      {
        tipo: 'Perfil lipídico completo',
        indicaciones: 'Colesterol total, HDL, LDL, triglicéridos'
      },
      {
        tipo: 'Microalbuminuria',
        indicaciones: 'Detección temprana de nefropatía diabética'
      },
      {
        tipo: 'Fondo de ojo',
        indicaciones: 'Tamizaje de retinopatía diabética - PENDIENTE VALORACIÓN OFTALMOLÓGICA'
      }
    ],
    recomendaciones: 'Mantener dieta de 1500-1800 calorías al día, rica en fibra y baja en carbohidratos simples. Evitar refrescos y jugos azucarados. Realizar ejercicio aeróbico 150 minutos a la semana. Automonitoreo de glucosa capilar 3 veces por semana en ayuno. Examen de pies diario. Mantener hidratación adecuada.',
    proximaConsulta: 'Control en 3 meses con resultados de laboratorio',
    requiereCirugia: true, // Requiere valoración oftalmológica por sospecha de catarata
  },
];

// Cirugías
export const cirugias: Cirugia[] = [
  {
    id: 'cir1',
    pacienteId: 'pac1',
    consultaId: 'cons-maria-3',
    diagnostico: 'Catarata en ojo derecho',
    especialidad: 'medicina_familiar',
    medicoACargo: 'Dr. Roberto García',
    estado: 'programada',
    fechaRegistro: '2026-03-05',
    fechaCirugia: '2026-04-15',
    horaCirugia: '08:00',
    horaEstimada: '2 horas',
    lugarCirugia: 'Hospital General de Sonoyta - Quirófano 2',
    costoEstimado: 25000,
    estudios: {
      requeridos: [
        'Electrocardiograma',
        'Biometría hemática completa',
        'Química sanguínea (glucosa, urea, creatinina)',
        'Tiempos de coagulación (TP, TPT)',
        'Valoración cardiológica',
        'Ultrasonido ocular'
      ],
      completados: true,
      resultados: 'Todos los estudios prequirúrgicos dentro de parámetros normales. Glucosa en ayuno: 115 mg/dL (controlada). Función renal normal. ECG sin alteraciones. Valoración cardiológica: Riesgo quirúrgico ASA II (aceptable). Ultrasonido ocular confirma catarata madura en ojo derecho.',
    },
    citaInternista: {
      fecha: '2026-03-20',
      hora: '10:00',
      lugar: 'Consultorio de Medicina Interna - Hospital General',
      completada: true,
    },
    estudioSocioeconomico: {
      completado: true,
      candidatoBeca: true,
      notas: 'Familia de recursos limitados. Paciente pensionada con ingreso mensual de $3,500 MXN. Vive en casa propia con servicios básicos. Dos dependientes económicos. Se aprueba beca del 60% por condición socioeconómica y enfermedad crónica (diabetes).',
    },
    indicacionesPreoperatorias: 'AYUNO de 8 horas (sin alimentos ni líquidos desde las 00:00 del día de la cirugía). Suspender Metformina 24 horas antes. Continuar con medicamento para hipertensión con un sorbo de agua. Presentarse a las 06:00 AM en admisión. Traer estudios preoperatorios completos. Acudir acompañada. Baño completo la noche anterior. No usar maquillaje, joyas ni esmalte de uñas.',
    resultadoCirugia: '',
    seguimientos: ['seg6'],
    notas: 'Paciente candidata para facoemulsificación con implante de lente intraocular. Cirugía programada por el Dr. Hernández (Oftalmólogo). Se realizará bajo anestesia local con sedación. Recuperación esperada: 2-4 semanas. Costo total: $25,000 MXN. Con beca del 60% = $10,000 MXN a pagar por la paciente.',
    duracion: '1-2 horas'
  },
];

// Seguimientos
export const seguimientos: Seguimiento[] = [
  {
    id: 'seg1',
    pacienteId: 'pac1',
    consultaPrevia: 'cons1',
    fechaCreacion: '2026-02-20',
    fechaCita: '2026-03-15',
    horaCita: '10:00',
    datosVitales: {
      azucarEnSangre: 145,
    },
    diagnostico: 'Diabetes Mellitus Tipo 2 - Control',
    examenesRequeridos: ['Hemoglobina Glicosilada', 'Perfil lipídico', 'Examen general de orina'],
    remisionFarmacia: 'Metformina 850mg - 1 tableta cada 12 horas con alimentos',
    estado: 'agendada',
  },
  {
    id: 'seg2',
    pacienteId: 'pac2',
    consultaPrevia: 'cons2',
    fechaCreacion: '2026-03-01',
    fechaCita: '2026-03-20',
    horaCita: '09:00',
    datosVitales: {
      azucarEnSangre: 98,
    },
    diagnostico: 'Hipertensión Arterial - Seguimiento',
    examenesRequeridos: ['Perfil renal', 'Electrolitos séricos', 'ECG'],
    remisionFarmacia: 'Losartán 50mg - 1 tableta cada 24 horas',
    estado: 'agendada',
  },
  {
    id: 'seg3',
    pacienteId: 'pac3',
    consultaPrevia: 'cons3',
    fechaCreacion: '2026-02-28',
    datosVitales: {
      azucarEnSangre: 92,
    },
    diagnostico: 'Control prenatal - Semana 14',
    examenesRequeridos: ['Biometría hemática', 'Examen general de orina', 'VDRL', 'Ultrasonido obstétrico'],
    remisionFarmacia: 'Ácido fólico 400mcg + Sulfato ferroso 300mg - 1 tableta diaria',
    estado: 'pendiente',
  },
  {
    id: 'seg4',
    pacienteId: 'pac4',
    consultaPrevia: 'cons4',
    fechaCreacion: '2026-03-05',
    fechaCita: '2026-03-18',
    horaCita: '11:30',
    datosVitales: {
      azucarEnSangre: 85,
    },
    diagnostico: 'Asma bronquial - Control',
    examenesRequeridos: ['Espirometría', 'Biometría hemática'],
    remisionFarmacia: 'Salbutamol inhalador - 2 disparos cada 6 horas según necesidad',
    estado: 'agendada',
  },
  {
    id: 'seg5',
    pacienteId: 'pac5',
    consultaPrevia: 'cons5',
    fechaCreacion: '2026-01-15',
    fechaCita: '2026-02-28',
    horaCita: '14:00',
    datosVitales: {
      azucarEnSangre: 110,
    },
    diagnostico: 'Gastritis crónica - Evaluación post-tratamiento',
    examenesRequeridos: ['Prueba de Helicobacter pylori', 'Biometría hemática'],
    remisionFarmacia: 'Omeprazol 20mg - 1 cápsula antes del desayuno',
    estado: 'completada',
  },
  {
    id: 'seg6',
    pacienteId: 'pac1',
    consultaPrevia: 'cons6',
    fechaCreacion: '2026-03-08',
    fechaCita: '2026-03-25',
    horaCita: '15:00',
    datosVitales: {
      azucarEnSangre: 138,
    },
    diagnostico: 'Retinopatía diabética - Seguimiento oftalmológico',
    examenesRequeridos: ['Fondo de ojo', 'Tomografía de coherencia óptica'],
    remisionFarmacia: 'Referencia a oftalmología especializada',
    estado: 'agendada',
  },
];

// Registros de Auditoría
export const registrosAuditoria: RegistroAuditoria[] = [
  {
    id: 'aud1',
    usuarioId: 'usr1',
    nombreUsuario: 'Recepcionista María',
    rol: 'recepcion',
    accion: 'Crear Paciente',
    detalles: 'Creó paciente EXP-2026-004 - Pedro Rodríguez',
    fechaHora: '2026-03-05T10:30:00',
    ciudad: 'sonoyta',
  },
  {
    id: 'aud2',
    usuarioId: 'usr1',
    nombreUsuario: 'Recepcionista María',
    rol: 'recepcion',
    accion: 'Agendar Cita',
    detalles: 'Agendó cita para Pedro Rodríguez - Pediatría - 11/03/2026 09:00',
    fechaHora: '2026-03-05T10:35:00',
    ciudad: 'sonoyta',
  },
  {
    id: 'aud3',
    usuarioId: 'usr2',
    nombreUsuario: 'Enf. Laura Rodríguez',
    rol: 'triage',
    accion: 'Completar Triage',
    detalles: 'Completó triage para Juan Pérez Ramírez - Cita 10/03/2026 09:30',
    fechaHora: '2026-03-10T09:20:00',
    ciudad: 'sonoyta',
  },
];

// Estadísticas del día (para dashboard)
export interface EstadisticasDia {
  totalCitas: number;
  citasCompletadas: number;
  citasPendientes: number;
  citasCanceladas: number;
  pacientesNuevos: number;
  pacientesRecurrentes: number;
}

export const estadisticasHoy: EstadisticasDia = {
  totalCitas: 12,
  citasCompletadas: 3,
  citasPendientes: 8,
  citasCanceladas: 1,
  pacientesNuevos: 5,
  pacientesRecurrentes: 7,
};

// Usuarios del Sistema
export const usuarios: Usuario[] = [
  {
    id: 'usr1',
    nombre: 'Recepcionista María',
    email: 'recepcion@nuevaesperanza.org',
    password: 'recepcion123',
    rol: 'recepcion',
    ciudad: 'sonoyta',
    activo: true,
  },
  {
    id: 'usr2',
    nombre: 'Enf. Laura Rodríguez',
    email: 'triage@nuevaesperanza.org',
    password: 'triage123',
    rol: 'triage',
    ciudad: 'sonoyta',
    activo: true,
  },
  {
    id: 'usr3',
    nombre: 'Dr. Roberto García',
    email: 'medico@nuevaesperanza.org',
    password: 'medico123',
    rol: 'medico',
    especialidad: 'medicina_familiar',
    ciudad: 'sonoyta',
    activo: true,
  },
  {
    id: 'usr4',
    nombre: 'Administrador General',
    email: 'admin@nuevaesperanza.org',
    password: 'admin123',
    rol: 'administrador',
    ciudad: 'sonoyta',
    activo: true,
  },
];

// Estudios Socioeconómicos
export const estudios: EstudioSocioeconomico[] = [];