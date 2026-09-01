import { claveDia, hoy, sumarDias } from './fecha'

// ─────────────────────────────────────────────────────────────────────
// Datos sembrados de DEMOSTRACIÓN. Personas y narrativas inventadas.
// Ningún dato aquí corresponde a un paciente real.
// Cuando se enchufe Supabase, este archivo se borra: la forma de los
// objetos ya es la de las tablas del blueprint (therapists, patients,
// clinical_sessions, appointments, financial_transactions,
// administrative_buffer), en inglés, para que el cambio sea directo.
// ─────────────────────────────────────────────────────────────────────

const H = hoy()
const d = (n) => claveDia(sumarDias(H, n))

export const terapeuta = {
  id: 'demo-terapeuta',
  full_name: 'Notaluma',
  professional_license: 'C.Ps.P. 00000',
  base_currency: 'PEN',
  target_salary_monthly: 3000,
  monthly_fixed_costs: 800,
  tarifa_sesion: 75,
  sesiones_semanales_sostenibles: 20,
  porcentaje_semilla: 10,
  friccion_reflexiva: true,
  modo_calma: false,
}

export const pacientes = [
  {
    id: 'p-elena',
    first_name: 'Elena',
    last_name: 'Márquez',
    email: 'elena.marquez@ejemplo.pe',
    phone_number: '+51 987 000 001',
    date_of_birth: '1996-04-12',
    alliance_status: 'Autoexploración',
    treatment_modality: 'TCC',
    frecuencia: 'Semanal',
    inferred_risk_level: 'Low',
    motivo: 'Ansiedad anticipatoria y dificultad para sostener límites en la familia.',
    notes: 'Prefiere sesiones virtuales los jueves. Trabaja hasta las 15:00.',
    created_at: d(-84),
  },
  {
    id: 'p-carlos',
    first_name: 'Carlos',
    last_name: 'Ríos',
    email: 'carlos.rios@ejemplo.pe',
    phone_number: '+51 987 000 002',
    date_of_birth: '1978-11-03',
    alliance_status: 'Rapport',
    treatment_modality: 'EMDR',
    frecuencia: 'Quincenal',
    inferred_risk_level: 'Low',
    motivo: 'Recuerdos intrusivos tras un accidente de tránsito.',
    notes: 'Llega directo del trabajo, suele necesitar cinco minutos para aterrizar.',
    created_at: d(-56),
  },
  {
    id: 'p-sofia',
    first_name: 'Sofía',
    last_name: 'Tello',
    email: 'sofia.tello@ejemplo.pe',
    phone_number: '+51 987 000 003',
    date_of_birth: '1962-07-22',
    alliance_status: 'Alta',
    treatment_modality: 'Sistémica',
    frecuencia: 'Mensual',
    inferred_risk_level: 'Low',
    motivo: 'Reorganización del rol familiar tras la jubilación.',
    notes: 'Fase de mantenimiento. Ya no requiere seguimiento semanal.',
    created_at: d(-400),
  },
  {
    id: 'p-marina',
    first_name: 'Marina',
    last_name: 'Vílchez',
    email: 'marina.vilchez@ejemplo.pe',
    phone_number: '+51 987 000 004',
    date_of_birth: '2001-02-09',
    alliance_status: 'Rapport',
    treatment_modality: 'TCC',
    frecuencia: 'Semanal',
    inferred_risk_level: 'High',
    motivo: 'Episodio depresivo con ideación pasiva. Derivada por medicina general.',
    notes: 'Contacto de emergencia registrado. Plan de seguridad firmado en sesión 2.',
    created_at: d(-21),
  },
  {
    id: 'p-david',
    first_name: 'David',
    last_name: 'Pacheco',
    email: 'david.pacheco@ejemplo.pe',
    phone_number: '+51 987 000 005',
    date_of_birth: '1990-09-30',
    alliance_status: 'Experimentos',
    treatment_modality: 'TCC',
    frecuencia: 'Semanal',
    inferred_risk_level: 'Low',
    motivo: 'Fobia social en contextos laborales.',
    notes: 'En exposición gradual. Registra sus intentos en una libreta propia.',
    created_at: d(-119),
  },
  {
    id: 'p-ana',
    first_name: 'Ana',
    last_name: 'Guzmán',
    email: 'ana.guzman@ejemplo.pe',
    phone_number: '+51 987 000 006',
    date_of_birth: '1985-01-17',
    alliance_status: 'Autoexploración',
    treatment_modality: 'TCC',
    frecuencia: 'Semanal',
    inferred_risk_level: 'Low',
    motivo: 'Agotamiento sostenido y culpa por delegar en el trabajo.',
    notes: '',
    created_at: d(-63),
  },
]

export const sesiones = [
  {
    id: 's-1',
    patient_id: 'p-elena',
    session_date: d(-7),
    treatment_modality: 'TCC',
    inferred_risk_level: 'Low',
    tags: ['esquema', 'familia', 'límites'],
    is_completed: true,
    raw_narrative:
      'Elena llega diez minutos antes, algo que no había pasado antes. Cuenta la cena del domingo: su madre le pidió que cancelara un viaje ya pagado porque la familia se reúne. Aceptó, y recién a las dos horas sintió la rabia.\n\nAparece por primera vez la conexión entre la ansiedad de esta semana y la expectativa familiar no dicha: si no está disponible, algo malo pasa. La nombró ella, no yo.\n\nHacia el final baja la voz y dice que lleva veinte años pidiendo permiso. Le devolví la frase tal cual. Se quedó en silencio y asintió.\n\nPara la próxima: registro de situaciones donde diga que sí sintiendo que no.',
  },
  {
    id: 's-2',
    patient_id: 'p-elena',
    session_date: d(-14),
    treatment_modality: 'TCC',
    inferred_risk_level: 'Low',
    tags: ['ansiedad', 'evitación'],
    is_completed: true,
    raw_narrative:
      'Semana con dos episodios de ansiedad anticipatoria antes de reuniones de trabajo. Describe tensión en los hombros y un pensamiento repetido: van a notar que no sé.\n\nTrabajamos el registro de pensamientos. Le cuesta separar el hecho del juicio; lo hicimos juntas en pizarra y funcionó mejor que la ficha escrita.\n\nBuen rapport, se ríe con más soltura que en las primeras sesiones.',
  },
  {
    id: 's-3',
    patient_id: 'p-carlos',
    session_date: d(-12),
    treatment_modality: 'EMDR',
    inferred_risk_level: 'Low',
    tags: ['trauma', 'defensas'],
    is_completed: true,
    raw_narrative:
      'Carlos vuelve a explicar el accidente en tercera persona, con detalle técnico de la maniobra del otro auto. Cuando le pregunto qué sintió, responde con lo que objetivamente pasó.\n\nDecisión clínica: no forzar el procesamiento todavía. Primero instalar lugar seguro y ampliar ventana de tolerancia. Las defensas intelectuales son altas y aún no tenemos alianza suficiente para sostener la activación.\n\nBajar el ritmo. Es la nota para mí misma, no para él.',
  },
  {
    id: 's-4',
    patient_id: 'p-marina',
    session_date: d(-4),
    treatment_modality: 'TCC',
    inferred_risk_level: 'High',
    tags: ['riesgo', 'plan de seguridad', 'red de apoyo'],
    is_completed: true,
    raw_narrative:
      'Revisamos el plan de seguridad punto por punto. Marina lo tiene en el celular y lo usó una vez esta semana: llamó a su hermana en lugar de quedarse sola.\n\nIdeación pasiva presente pero sin plan ni intención. Sin acceso a medios. Dice que la idea aparece y se va, y que ahora la reconoce antes.\n\nSueño sigue fragmentado, cuatro o cinco horas. Coordinar con medicina general antes del control del mes.\n\nSeguimiento semanal se mantiene. No espaciar todavía aunque ella lo proponga.',
  },
  {
    id: 's-5',
    patient_id: 'p-david',
    session_date: d(-6),
    treatment_modality: 'TCC',
    inferred_risk_level: 'Low',
    tags: ['exposición', 'logro'],
    is_completed: true,
    raw_narrative:
      'Hizo la exposición: habló en la reunión de equipo, dos minutos, sin leer. Ansiedad subjetiva 7/10 antes, 3/10 después.\n\nLo que más le sorprendió no fue haberlo hecho, sino que nadie reaccionó de manera especial. Fue normal, dice. Ese es el dato que hay que sostener.\n\nSiguiente escalón: pedir una aclaración en voz alta cuando no entienda algo.',
  },
  {
    id: 's-6',
    patient_id: 'p-sofia',
    session_date: d(-24),
    treatment_modality: 'Sistémica',
    inferred_risk_level: 'Low',
    tags: ['cierre', 'recursos'],
    is_completed: true,
    raw_narrative:
      'Sesión de cierre de ciclo. Sofía repasa el año: llegó pensando que sobraba en su casa y hoy describe acuerdos concretos con sus hijos sobre los domingos.\n\nIntegró bien las herramientas de regulación. Acordamos pasar a control mensual y dejar la puerta abierta.',
  },
]

export const citas = [
  { id: 'c-1', patient_id: 'p-ana', dia: d(0), inicio: '09:00', fin: '10:00', status: 'Scheduled', modalidad: 'Virtual', intensidad: 'Normal', foco: 'Revisar el registro de la semana y el pedido de licencia en el trabajo.' },
  { id: 'c-2', patient_id: 'p-carlos', dia: d(0), inicio: '11:30', fin: '12:30', status: 'Scheduled', modalidad: 'Presencial', intensidad: 'Alta', foco: 'Instalar lugar seguro. No iniciar procesamiento todavía.' },
  { id: 'c-3', patient_id: 'p-marina', dia: d(0), inicio: '15:00', fin: '16:00', status: 'Scheduled', modalidad: 'Presencial', intensidad: 'Alta', foco: 'Revisar plan de seguridad y sueño. Coordinar con medicina general.' },
  { id: 'c-4', patient_id: 'p-david', dia: d(0), inicio: '17:15', fin: '18:15', status: 'Scheduled', modalidad: 'Virtual', intensidad: 'Normal', foco: 'Siguiente escalón de exposición.' },
  { id: 'c-5', patient_id: 'p-elena', dia: d(1), inicio: '16:00', fin: '17:00', status: 'Scheduled', modalidad: 'Virtual', intensidad: 'Normal', foco: 'Registro de los sí que en realidad eran no.' },
  { id: 'c-6', patient_id: 'p-ana', dia: d(2), inicio: '09:00', fin: '10:00', status: 'Scheduled', modalidad: 'Virtual', intensidad: 'Normal', foco: '' },
  { id: 'c-7', patient_id: 'p-marina', dia: d(3), inicio: '15:00', fin: '16:00', status: 'Scheduled', modalidad: 'Presencial', intensidad: 'Alta', foco: '' },
  { id: 'c-8', patient_id: 'p-david', dia: d(4), inicio: '17:15', fin: '18:15', status: 'Scheduled', modalidad: 'Virtual', intensidad: 'Normal', foco: '' },
  { id: 'c-9', patient_id: 'p-carlos', dia: d(11), inicio: '11:30', fin: '12:30', status: 'Scheduled', modalidad: 'Presencial', intensidad: 'Alta', foco: '' },
  { id: 'c-10', patient_id: 'p-sofia', dia: d(17), inicio: '10:00', fin: '11:00', status: 'Scheduled', modalidad: 'Presencial', intensidad: 'Baja', foco: 'Control mensual.' },
  { id: 'c-11', patient_id: 'p-elena', dia: d(-6), inicio: '16:00', fin: '17:00', status: 'Completed', modalidad: 'Virtual', intensidad: 'Normal', foco: '' },
  { id: 'c-12', patient_id: 'p-carlos', dia: d(-12), inicio: '11:30', fin: '12:30', status: 'Completed', modalidad: 'Presencial', intensidad: 'Alta', foco: '' },
  { id: 'c-13', patient_id: 'p-david', dia: d(-6), inicio: '17:15', fin: '18:15', status: 'Completed', modalidad: 'Virtual', intensidad: 'Normal', foco: '' },
  { id: 'c-14', patient_id: 'p-marina', dia: d(-4), inicio: '15:00', fin: '16:00', status: 'Completed', modalidad: 'Presencial', intensidad: 'Alta', foco: '' },
  { id: 'c-15', patient_id: 'p-ana', dia: d(-5), inicio: '09:00', fin: '10:00', status: 'No Show', modalidad: 'Virtual', intensidad: 'Normal', foco: '' },
]

function gastosFijos(mesAtras) {
  const base = sumarDias(H, -30 * mesAtras)
  const clave = claveDia(new Date(base.getFullYear(), base.getMonth(), 3))
  return [
    { id: 'g-alq-' + mesAtras, patient_id: null, amount: 420, transaction_type: 'Expense', category: 'Alquiler de consultorio', transaction_date: clave },
    { id: 'g-soft-' + mesAtras, patient_id: null, amount: 89, transaction_type: 'Expense', category: 'Software', transaction_date: clave },
    { id: 'g-sup-' + mesAtras, patient_id: null, amount: 180, transaction_type: 'Expense', category: 'Supervisión clínica', transaction_date: clave },
  ]
}

// Ingresos: una transacción por cada sesión atendida en las últimas 13 semanas.
const ingresosHistoricos = []
for (let semana = 0; semana < 13; semana++) {
  const sesionesEsaSemana = 12 + ((semana * 5) % 6)
  for (let i = 0; i < sesionesEsaSemana; i++) {
    ingresosHistoricos.push({
      id: 'i-' + semana + '-' + i,
      patient_id: null,
      amount: 75,
      transaction_type: 'Income',
      category: 'Sesión',
      transaction_date: claveDia(sumarDias(H, -(semana * 7) - (i % 5))),
    })
  }
}

export const transacciones = [
  ...ingresosHistoricos,
  ...gastosFijos(0),
  ...gastosFijos(1),
  ...gastosFijos(2),
]

// Mapa de conceptualización de Elena — el del prototipo, ya posicionado.
export const mapas = {
  'p-elena': {
    nodes: [
      { id: 'n1', tipo: 'Esquema nuclear', texto: 'No soy suficiente', x: 22, y: 10 },
      { id: 'n2', tipo: 'Emoción', texto: 'Ansiedad (8/10)', x: 64, y: 10 },
      { id: 'n3', tipo: 'Creencia central', texto: 'Debo complacer a otros', x: 40, y: 42 },
      { id: 'n4', tipo: 'Pensamiento automático', texto: 'Se va a enojar si no voy', x: 6, y: 44 },
      { id: 'n5', tipo: 'Conducta', texto: 'Evitación', x: 76, y: 44 },
      { id: 'n6', tipo: 'Conducta', texto: 'Complacer y resentirse después', x: 12, y: 76 },
      { id: 'n7', tipo: 'Respuesta fisiológica', texto: 'Tensión en hombros', x: 66, y: 76 },
    ],
    links: [['n1', 'n2'], ['n1', 'n3'], ['n3', 'n4'], ['n3', 'n5'], ['n4', 'n6'], ['n5', 'n7']],
  },
}

export const pendientes = [
  { id: 'b-1', event_type: 'cita_confirmada', read: false, created_at: d(0), payload: { texto: 'Ana Guzmán confirmó su sesión de mañana.' } },
  { id: 'b-2', event_type: 'pago', read: false, created_at: d(0), payload: { texto: 'Se registró un pago de S/ 75 de David Pacheco.' } },
  { id: 'b-3', event_type: 'reprogramacion', read: false, created_at: d(-1), payload: { texto: 'Carlos Ríos pidió mover su sesión del jueves a las 12:30.' } },
  { id: 'b-4', event_type: 'recordatorio', read: true, created_at: d(-2), payload: { texto: 'Se enviaron 4 recordatorios de WhatsApp para las sesiones de hoy.' } },
]
