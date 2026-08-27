import * as seed from './seed'
import { claveDia } from './fecha'

// ─────────────────────────────────────────────────────────────────────
// Adaptador de la muestra. Vive en el navegador de quien la abre y sirve
// para recorrer Mirai sin cuenta y sin datos reales.
//
// Expone las mismas funciones que adaptador-nube.js y devuelve las mismas
// formas: el store no distingue con cuál está hablando.
// ─────────────────────────────────────────────────────────────────────

const LLAVE = 'mirai.muestra.v1'

export const estadoSemilla = () => ({
  terapeuta: seed.terapeuta,
  pacientes: seed.pacientes,
  sesiones: seed.sesiones,
  citas: seed.citas,
  transacciones: seed.transacciones,
  mapas: seed.mapas,
  pendientes: seed.pendientes,
})

function id(prefijo) {
  return prefijo + '-' + Math.random().toString(36).slice(2, 9)
}

function leer() {
  try {
    const crudo = window.localStorage.getItem(LLAVE)
    if (!crudo) return estadoSemilla()
    return { ...estadoSemilla(), ...JSON.parse(crudo) }
  } catch {
    return estadoSemilla()
  }
}

function escribir(estado) {
  try {
    window.localStorage.setItem(LLAVE, JSON.stringify(estado))
  } catch {
    // Modo incógnito o cuota llena: la muestra sigue en memoria.
  }
  return estado
}

function mutar(cambiar) {
  const estado = leer()
  const siguiente = cambiar(estado)
  return escribir(siguiente)
}

export async function cargarTodo() {
  return leer()
}

export async function guardarAjustes(cambios) {
  const estado = mutar((e) => ({ ...e, terapeuta: { ...e.terapeuta, ...cambios } }))
  return estado.terapeuta
}

export async function crearPaciente(datos) {
  const nuevo = {
    id: id('p'),
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    alliance_status: 'Rapport',
    treatment_modality: 'TCC',
    frecuencia: 'Semanal',
    inferred_risk_level: 'Low',
    motivo: '',
    notes: '',
    created_at: claveDia(new Date()),
    ...datos,
  }
  mutar((e) => ({ ...e, pacientes: [nuevo, ...e.pacientes] }))
  return nuevo
}

export async function actualizarPaciente(pacienteId, cambios) {
  const estado = mutar((e) => ({
    ...e,
    pacientes: e.pacientes.map((p) => (p.id === pacienteId ? { ...p, ...cambios } : p)),
  }))
  return estado.pacientes.find((p) => p.id === pacienteId)
}

export async function archivarPaciente(pacienteId) {
  mutar((e) => ({
    ...e,
    pacientes: e.pacientes.filter((p) => p.id !== pacienteId),
    sesiones: e.sesiones.filter((s) => s.patient_id !== pacienteId),
    citas: e.citas.filter((c) => c.patient_id !== pacienteId),
  }))
}

export async function guardarNota(datos) {
  const nota = {
    id: id('s'),
    patient_id: datos.patient_id,
    session_date: datos.session_date || claveDia(new Date()),
    raw_narrative: datos.raw_narrative || '',
    treatment_modality: datos.treatment_modality || 'TCC',
    inferred_risk_level: datos.inferred_risk_level || 'Low',
    tags: datos.tags || [],
    is_completed: true,
  }
  mutar((e) => ({
    ...e,
    sesiones: [nota, ...e.sesiones],
    pacientes:
      nota.inferred_risk_level === 'High'
        ? e.pacientes.map((p) =>
            p.id === nota.patient_id ? { ...p, inferred_risk_level: 'High' } : p,
          )
        : e.pacientes,
  }))
  return nota
}

export async function editarNota(notaId, cambios) {
  mutar((e) => ({
    ...e,
    sesiones: e.sesiones.map((s) => (s.id === notaId ? { ...s, ...cambios } : s)),
  }))
}

export async function eliminarNota(notaId) {
  mutar((e) => ({ ...e, sesiones: e.sesiones.filter((s) => s.id !== notaId) }))
}

export async function crearCita(datos) {
  const cita = {
    id: id('c'),
    status: 'Scheduled',
    modalidad: 'Presencial',
    intensidad: 'Normal',
    foco: '',
    ...datos,
  }
  mutar((e) => ({ ...e, citas: [...e.citas, cita] }))
  return cita
}

export async function cambiarEstadoCita(citaId, status, { tarifa, patient_id, dia }) {
  let actualizada = null
  mutar((e) => {
    const citas = e.citas.map((c) => {
      if (c.id !== citaId) return c
      actualizada = { ...c, status }
      return actualizada
    })
    const cobroId = 'ing-' + citaId
    const sinCobro = e.transacciones.filter((t) => t.id !== cobroId)
    if (status !== 'Completed') return { ...e, citas, transacciones: sinCobro }
    return {
      ...e,
      citas,
      transacciones: [
        {
          id: cobroId,
          patient_id,
          appointment_id: citaId,
          amount: tarifa,
          transaction_type: 'Income',
          category: 'Sesión',
          transaction_date: dia,
        },
        ...sinCobro,
      ],
    }
  })
  return actualizada
}

export async function eliminarCita(citaId) {
  mutar((e) => ({
    ...e,
    citas: e.citas.filter((c) => c.id !== citaId),
    transacciones: e.transacciones.filter((t) => t.id !== 'ing-' + citaId),
  }))
}

export async function registrarMovimiento(datos) {
  const mov = {
    id: id('t'),
    patient_id: null,
    transaction_date: claveDia(new Date()),
    ...datos,
  }
  mutar((e) => ({ ...e, transacciones: [mov, ...e.transacciones] }))
  return mov
}

export async function eliminarMovimiento(movId) {
  mutar((e) => ({ ...e, transacciones: e.transacciones.filter((t) => t.id !== movId) }))
}

export async function guardarMapa(pacienteId, contenido) {
  mutar((e) => ({ ...e, mapas: { ...e.mapas, [pacienteId]: contenido } }))
}

export async function marcarPendientesLeidos() {
  mutar((e) => ({ ...e, pendientes: e.pendientes.map((p) => ({ ...p, read: true })) }))
}

export async function exportarHistoria(pacienteId) {
  const e = leer()
  return {
    exportado_el: new Date().toISOString(),
    paciente: e.pacientes.find((p) => p.id === pacienteId) || null,
    sesiones: e.sesiones.filter((s) => s.patient_id === pacienteId),
    citas: e.citas.filter((c) => c.patient_id === pacienteId),
    mapa: e.mapas[pacienteId] || {},
  }
}

export async function exportarTodo() {
  return { exportado_el: new Date().toISOString(), ...leer() }
}

export function reiniciar() {
  try {
    window.localStorage.removeItem(LLAVE)
  } catch {}
  return estadoSemilla()
}
