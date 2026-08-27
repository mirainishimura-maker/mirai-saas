import { supabase } from './supabase/navegador'

// ─────────────────────────────────────────────────────────────────────
// Adaptador de Supabase. Habla el mismo idioma que el adaptador local:
// recibe y devuelve exactamente las mismas formas de objeto, para que
// lib/store.jsx pueda cambiar de uno a otro sin que ninguna pantalla se
// entere de nada.
//
// Regla que se repite en todo el archivo: las narrativas clínicas no se
// leen ni se escriben con select/insert. Solo por las funciones RPC de
// 03-cifrado.sql, que descifran del lado del servidor.
// ─────────────────────────────────────────────────────────────────────

function reventar(error, quehacia) {
  if (!error) return
  console.error(`Mirai · ${quehacia}:`, error)
  throw new Error(error.message || 'No se pudo completar la operación')
}

/** Trae de golpe todo lo de la terapeuta que ha iniciado sesión. */
export async function cargarTodo() {
  const sb = supabase()
  const { data: sesion } = await sb.auth.getUser()
  const usuario = sesion?.user
  if (!usuario) throw new Error('Sin sesión')

  const [perfil, pacientes, citas, transacciones, mapas, pendientes, notas] = await Promise.all([
    sb.from('therapists').select('*').eq('id', usuario.id).single(),
    sb.from('patients').select('*').eq('archivado', false).order('created_at', { ascending: false }),
    sb.from('appointments').select('*').order('dia'),
    sb.from('financial_transactions').select('*').order('transaction_date', { ascending: false }),
    sb.from('alliance_maps').select('*'),
    sb.from('administrative_buffer').select('*').order('created_at', { ascending: false }).limit(50),
    sb.rpc('leer_notas', { p_patient_id: null }),
  ])

  reventar(perfil.error, 'cargando el perfil')
  reventar(pacientes.error, 'cargando pacientes')
  reventar(citas.error, 'cargando la agenda')
  reventar(transacciones.error, 'cargando los movimientos')
  reventar(mapas.error, 'cargando los mapas')
  reventar(pendientes.error, 'cargando los pendientes')
  reventar(notas.error, 'cargando las notas')

  return {
    terapeuta: { ...perfil.data, correo: usuario.email },
    pacientes: pacientes.data || [],
    citas: (citas.data || []).map(deCita),
    transacciones: transacciones.data || [],
    sesiones: notas.data || [],
    mapas: Object.fromEntries((mapas.data || []).map((m) => [m.patient_id, m.contenido])),
    pendientes: (pendientes.data || []).map((p) => ({ ...p, created_at: p.created_at.slice(0, 10) })),
  }
}

// Postgres devuelve las horas como '09:00:00'; la interfaz trabaja con '09:00'.
function deCita(c) {
  return { ...c, inicio: (c.inicio || '').slice(0, 5), fin: (c.fin || '').slice(0, 5) }
}

export async function guardarAjustes(cambios) {
  const sb = supabase()
  const { data: sesion } = await sb.auth.getUser()
  const { data, error } = await sb
    .from('therapists')
    .update(cambios)
    .eq('id', sesion.user.id)
    .select()
    .single()
  reventar(error, 'guardando los ajustes')
  return data
}

export async function crearPaciente(datos) {
  const sb = supabase()
  const { data: sesion } = await sb.auth.getUser()
  const { data, error } = await sb
    .from('patients')
    .insert({ ...datos, therapist_id: sesion.user.id })
    .select()
    .single()
  reventar(error, 'creando el paciente')
  return data
}

export async function actualizarPaciente(id, cambios) {
  const sb = supabase()
  const { data, error } = await sb.from('patients').update(cambios).eq('id', id).select().single()
  reventar(error, 'actualizando el paciente')
  return data
}

/**
 * Archivar, no borrar. Una historia clínica tiene plazos de conservación:
 * hacerla desaparecer de la lista es una cosa y destruirla es otra muy
 * distinta, y la segunda no debería estar a un clic de distancia.
 */
export async function archivarPaciente(id) {
  const sb = supabase()
  const { error } = await sb.from('patients').update({ archivado: true }).eq('id', id)
  reventar(error, 'archivando el paciente')
}

export async function guardarNota({
  patient_id,
  raw_narrative,
  treatment_modality,
  inferred_risk_level,
  tags,
  session_date,
}) {
  const sb = supabase()
  const { data, error } = await sb.rpc('guardar_nota', {
    p_patient_id: patient_id,
    p_narrativa: raw_narrative,
    p_modalidad: treatment_modality || 'TCC',
    p_riesgo: inferred_risk_level || 'Low',
    p_tags: tags || [],
    p_fecha: session_date,
  })
  reventar(error, 'guardando la nota')
  return {
    id: data,
    patient_id,
    raw_narrative,
    treatment_modality: treatment_modality || 'TCC',
    inferred_risk_level: inferred_risk_level || 'Low',
    tags: tags || [],
    session_date,
  }
}

export async function editarNota(id, { raw_narrative, inferred_risk_level, tags }) {
  const sb = supabase()
  const { error } = await sb.rpc('editar_nota', {
    p_id: id,
    p_narrativa: raw_narrative,
    p_riesgo: inferred_risk_level || null,
    p_tags: tags || null,
  })
  reventar(error, 'editando la nota')
}

export async function eliminarNota(id) {
  const sb = supabase()
  const { error } = await sb.from('clinical_sessions').delete().eq('id', id)
  reventar(error, 'eliminando la nota')
}

export async function crearCita(datos) {
  const sb = supabase()
  const { data: sesion } = await sb.auth.getUser()
  const { data, error } = await sb
    .from('appointments')
    .insert({ ...datos, therapist_id: sesion.user.id })
    .select()
    .single()
  reventar(error, 'agendando la sesión')
  return deCita(data)
}

/**
 * Atender una sesión genera su cobro; revertirla lo quita. El índice único
 * sobre appointment_id impide que una misma cita se cobre dos veces aunque
 * se pulse el botón varias veces seguidas.
 */
export async function cambiarEstadoCita(citaId, status) {
  const sb = supabase()
  // Una sola llamada: el cambio de estado y el cobro viajan juntos y se
  // deshacen juntos si algo falla a mitad de camino.
  const { error } = await sb.rpc('atender_cita', { p_cita_id: citaId, p_status: status })
  reventar(error, 'cambiando el estado de la sesión')
}

export async function eliminarCita(id) {
  const sb = supabase()
  const { error } = await sb.from('appointments').delete().eq('id', id)
  reventar(error, 'quitando la sesión de la agenda')
}

export async function registrarMovimiento(datos) {
  const sb = supabase()
  const { data: sesion } = await sb.auth.getUser()
  const { data, error } = await sb
    .from('financial_transactions')
    .insert({ ...datos, therapist_id: sesion.user.id })
    .select()
    .single()
  reventar(error, 'registrando el movimiento')
  return data
}

export async function eliminarMovimiento(id) {
  const sb = supabase()
  const { error } = await sb.from('financial_transactions').delete().eq('id', id)
  reventar(error, 'quitando el movimiento')
}

export async function guardarMapa(pacienteId, contenido) {
  const sb = supabase()
  const { data: sesion } = await sb.auth.getUser()
  const { error } = await sb.from('alliance_maps').upsert(
    { patient_id: pacienteId, therapist_id: sesion.user.id, contenido },
    { onConflict: 'patient_id' },
  )
  reventar(error, 'guardando el mapa')
}

export async function marcarPendientesLeidos() {
  const sb = supabase()
  const { data: sesion } = await sb.auth.getUser()
  const { error } = await sb
    .from('administrative_buffer')
    .update({ read: true })
    .eq('therapist_id', sesion.user.id)
    .eq('read', false)
  reventar(error, 'marcando los pendientes')
}

/** La historia completa de un paciente, descifrada, para que ella se la lleve. */
export async function exportarHistoria(pacienteId) {
  const sb = supabase()
  const { data, error } = await sb.rpc('exportar_historia', { p_patient_id: pacienteId })
  reventar(error, 'exportando la historia')
  return data
}

/** Todo lo de la cuenta, para un respaldo propio. */
export async function exportarTodo() {
  const estado = await cargarTodo()
  return { exportado_el: new Date().toISOString(), ...estado }
}

export async function cerrarSesion() {
  const sb = supabase()
  await sb.auth.signOut()
}
