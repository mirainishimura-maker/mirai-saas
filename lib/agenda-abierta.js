// Agenda abierta (Premium): servicios, token del enlace y pre-reservas.
//
// Módulo aparte del store a propósito: la agenda abierta es una capa
// Premium que se monta sola en Ajustes y en el calendario, sin engordar
// el arranque de toda la app. Habla directo con Supabase; RLS decide.

import { supabase } from './supabase/navegador'

function reventar(error, haciendo) {
  if (error) throw new Error(`Fallo ${haciendo}: ${error.message}`)
}

/* ── Servicios ──────────────────────────────────────────────────────── */

export async function listarServicios() {
  const { data, error } = await supabase()
    .from('services')
    .select('*')
    .order('orden')
    .order('created_at')
  reventar(error, 'cargando los servicios')
  return data
}

export async function crearServicio(datos) {
  const sb = supabase()
  const { data: sesion } = await sb.auth.getUser()
  const { data, error } = await sb
    .from('services')
    .insert({ ...datos, therapist_id: sesion.user.id })
    .select()
    .single()
  reventar(error, 'creando el servicio')
  return data
}

export async function actualizarServicio(id, cambios) {
  const { data, error } = await supabase()
    .from('services')
    .update(cambios)
    .eq('id', id)
    .select()
    .single()
  reventar(error, 'actualizando el servicio')
  return data
}

export async function eliminarServicio(id) {
  const { error } = await supabase().from('services').delete().eq('id', id)
  reventar(error, 'eliminando el servicio')
}

/* ── El token del enlace ────────────────────────────────────────────── */

export async function generarTokenAgenda() {
  const { data, error } = await supabase().rpc('generar_token_agenda')
  reventar(error, 'generando el enlace')
  return data
}

/* ── Pre-reservas ───────────────────────────────────────────────────── */

export async function listarReservasPendientes() {
  const { data, error } = await supabase()
    .from('web_bookings')
    .select('*')
    .eq('estado', 'pendiente')
    .order('inicio')
  reventar(error, 'cargando las reservas')
  return data
}

/** Fecha y horas de la reserva en hora de Lima: { dia: 'YYYY-MM-DD', inicio: 'HH:MM', fin: 'HH:MM' } */
export function horarioLima(reserva) {
  const d = new Date(reserva.inicio)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]))
  const finD = new Date(d.getTime() + reserva.duracion_min * 60000)
  const pf = Object.fromEntries(fmt.formatToParts(finD).map((x) => [x.type, x.value]))
  return {
    dia: `${p.year}-${p.month}-${p.day}`,
    inicio: `${p.hour}:${p.minute}`,
    fin: `${pf.hour}:${pf.minute}`,
  }
}

/** Los últimos 9 dígitos identifican a la persona — la misma regla del sistema de Ítaca. */
export function pacienteQueCoincide(reserva, pacientes) {
  const clave = (reserva.telefono || '').replace(/\D/g, '').slice(-9)
  if (clave.length < 6) return null
  return (
    pacientes.find((p) => (p.phone_number || '').replace(/\D/g, '').slice(-9) === clave) || null
  )
}

/**
 * Confirmar: si la reserva no coincide con nadie, crea el paciente; luego
 * crea la cita real en la agenda y marca la reserva. Recibe crearPaciente y
 * crearCita DEL STORE para que el calendario se actualice al instante, sin
 * recargar. La cita nace con la
 * duración del servicio — no con una hora fija.
 */
export async function confirmarReserva(reserva, pacienteExistente, { crearPaciente, crearCita }) {
  let paciente = pacienteExistente
  if (!paciente) {
    const partes = (reserva.nombre || '').trim().split(/\s+/)
    paciente = await crearPaciente({
      first_name: partes[0] || reserva.nombre,
      last_name: partes.slice(1).join(' '),
      phone_number: reserva.telefono,
      email: reserva.correo || null,
    })
  }
  const { dia, inicio, fin } = horarioLima(reserva)
  const cita = await crearCita({
    patient_id: paciente.id,
    dia,
    inicio,
    fin,
    modalidad: 'Presencial',
    foco: [reserva.servicio_nombre, reserva.motivo].filter(Boolean).join(' — '),
  })
  const { error } = await supabase()
    .from('web_bookings')
    .update({ estado: 'confirmada', cita_id: cita.id })
    .eq('id', reserva.id)
  reventar(error, 'marcando la reserva')
  return { paciente, cita, pacienteNuevo: !pacienteExistente }
}

export async function rechazarReserva(id) {
  const { error } = await supabase()
    .from('web_bookings')
    .update({ estado: 'rechazada' })
    .eq('id', id)
  reventar(error, 'rechazando la reserva')
}
