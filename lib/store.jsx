'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as seed from './seed'
import { claveDia, desdeClave, hoy, inicioSemana, sumarDias } from './fecha'

// ─────────────────────────────────────────────────────────────────────
// Capa de datos. Hoy vive en el navegador (localStorage); mañana vive en
// Supabase. Toda la app consume ÚNICAMENTE lo que expone useMirai():
// ninguna pantalla sabe de dónde salen los datos. Para migrar, se
// reemplazan las funciones de este archivo por llamadas a Supabase y no
// se toca ni una pantalla.
// ─────────────────────────────────────────────────────────────────────

const LLAVE = 'mirai.demo.v1'

const estadoInicial = () => ({
  terapeuta: seed.terapeuta,
  pacientes: seed.pacientes,
  sesiones: seed.sesiones,
  citas: seed.citas,
  transacciones: seed.transacciones,
  mapas: seed.mapas,
  pendientes: seed.pendientes,
})

const MiraiContext = createContext(null)

function id(prefijo) {
  return prefijo + '-' + Math.random().toString(36).slice(2, 9)
}

export function MiraiProvider({ children }) {
  const [estado, setEstado] = useState(estadoInicial)
  const [hidratado, setHidratado] = useState(false)

  useEffect(() => {
    try {
      const crudo = window.localStorage.getItem(LLAVE)
      if (crudo) setEstado({ ...estadoInicial(), ...JSON.parse(crudo) })
    } catch {
      // Si el guardado local está corrupto o bloqueado, seguimos con la semilla.
    }
    setHidratado(true)
  }, [])

  useEffect(() => {
    if (!hidratado) return
    try {
      window.localStorage.setItem(LLAVE, JSON.stringify(estado))
    } catch {
      // Modo incógnito o cuota llena: la app sigue funcionando en memoria.
    }
  }, [estado, hidratado])

  // Modo Calma vive en el <html> para poder desaturar toda la interfaz.
  useEffect(() => {
    document.documentElement.dataset.calma = estado.terapeuta.modo_calma ? 'on' : 'off'
  }, [estado.terapeuta.modo_calma])

  const acciones = useMemo(() => {
    const actualizar = (parcial) => setEstado((e) => ({ ...e, ...parcial }))

    return {
      guardarAjustes(cambios) {
        setEstado((e) => ({ ...e, terapeuta: { ...e.terapeuta, ...cambios } }))
      },

      alternarModoCalma() {
        setEstado((e) => ({
          ...e,
          terapeuta: { ...e.terapeuta, modo_calma: !e.terapeuta.modo_calma },
        }))
      },

      crearPaciente(datos) {
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
        setEstado((e) => ({ ...e, pacientes: [nuevo, ...e.pacientes] }))
        return nuevo
      },

      actualizarPaciente(pacienteId, cambios) {
        setEstado((e) => ({
          ...e,
          pacientes: e.pacientes.map((p) => (p.id === pacienteId ? { ...p, ...cambios } : p)),
        }))
      },

      eliminarPaciente(pacienteId) {
        setEstado((e) => ({
          ...e,
          pacientes: e.pacientes.filter((p) => p.id !== pacienteId),
          sesiones: e.sesiones.filter((s) => s.patient_id !== pacienteId),
          citas: e.citas.filter((c) => c.patient_id !== pacienteId),
        }))
      },

      guardarNota({ patient_id, raw_narrative, treatment_modality, inferred_risk_level, tags, session_date }) {
        const nota = {
          id: id('s'),
          patient_id,
          session_date: session_date || claveDia(new Date()),
          raw_narrative,
          treatment_modality: treatment_modality || 'TCC',
          inferred_risk_level: inferred_risk_level || 'Low',
          tags: tags || [],
          is_completed: true,
        }
        setEstado((e) => {
          const pacientes =
            inferred_risk_level === 'High'
              ? e.pacientes.map((p) =>
                  p.id === patient_id ? { ...p, inferred_risk_level: 'High' } : p,
                )
              : e.pacientes
          return { ...e, sesiones: [nota, ...e.sesiones], pacientes }
        })
        return nota
      },

      eliminarNota(notaId) {
        setEstado((e) => ({ ...e, sesiones: e.sesiones.filter((s) => s.id !== notaId) }))
      },

      crearCita(datos) {
        const cita = {
          id: id('c'),
          status: 'Scheduled',
          modalidad: 'Presencial',
          intensidad: 'Normal',
          foco: '',
          ...datos,
        }
        setEstado((e) => ({ ...e, citas: [...e.citas, cita] }))
        return cita
      },

      cambiarEstadoCita(citaId, status) {
        setEstado((e) => {
          const cita = e.citas.find((c) => c.id === citaId)
          const citas = e.citas.map((c) => (c.id === citaId ? { ...c, status } : c))
          // Atender una sesión genera su ingreso. Es la regla que sostiene
          // el panel de Oxígeno Clínico: se cobra lo atendido, no lo agendado.
          if (status === 'Completed' && cita) {
            const yaCobrada = e.transacciones.some((t) => t.id === 'ing-' + citaId)
            if (!yaCobrada) {
              return {
                ...e,
                citas,
                transacciones: [
                  {
                    id: 'ing-' + citaId,
                    patient_id: cita.patient_id,
                    amount: e.terapeuta.tarifa_sesion,
                    transaction_type: 'Income',
                    category: 'Sesión',
                    transaction_date: cita.dia,
                  },
                  ...e.transacciones,
                ],
              }
            }
          }
          return { ...e, citas }
        })
      },

      eliminarCita(citaId) {
        setEstado((e) => ({ ...e, citas: e.citas.filter((c) => c.id !== citaId) }))
      },

      registrarMovimiento(datos) {
        const mov = {
          id: id('t'),
          patient_id: null,
          transaction_date: claveDia(new Date()),
          ...datos,
        }
        setEstado((e) => ({ ...e, transacciones: [mov, ...e.transacciones] }))
        return mov
      },

      eliminarMovimiento(movId) {
        setEstado((e) => ({ ...e, transacciones: e.transacciones.filter((t) => t.id !== movId) }))
      },

      guardarMapa(pacienteId, mapa) {
        setEstado((e) => ({ ...e, mapas: { ...e.mapas, [pacienteId]: mapa } }))
      },

      marcarPendientesLeidos() {
        setEstado((e) => ({
          ...e,
          pendientes: e.pendientes.map((p) => ({ ...p, read: true })),
        }))
      },

      reiniciarDemo() {
        const limpio = estadoInicial()
        actualizar(limpio)
        try {
          window.localStorage.removeItem(LLAVE)
        } catch {}
      },
    }
  }, [])

  const valor = useMemo(() => ({ ...estado, hidratado, ...acciones }), [estado, hidratado, acciones])

  return <MiraiContext.Provider value={valor}>{children}</MiraiContext.Provider>
}

export function useMirai() {
  const ctx = useContext(MiraiContext)
  if (!ctx) throw new Error('useMirai debe usarse dentro de <MiraiProvider>')
  return ctx
}

// ── Selectores ───────────────────────────────────────────────────────

export function nombrePaciente(p) {
  if (!p) return 'Paciente'
  return `${p.first_name} ${p.last_name}`.trim()
}

export function nombreCorto(p) {
  if (!p) return '—'
  return `${p.first_name} ${p.last_name ? p.last_name.charAt(0) + '.' : ''}`.trim()
}

export function iniciales(p) {
  if (!p) return '··'
  return `${p.first_name.charAt(0)}${p.last_name.charAt(0) || ''}`.toUpperCase()
}

export const FASES = [
  { valor: 'Rapport', etiqueta: 'Construyendo alianza', descripcion: 'Rapport y evaluación inicial' },
  { valor: 'Autoexploración', etiqueta: 'Exploración profunda', descripcion: 'Autoexploración y conceptualización' },
  { valor: 'Experimentos', etiqueta: 'Experimentos', descripcion: 'Puesta a prueba en la vida real' },
  { valor: 'Alta', etiqueta: 'Cierre y consolidación', descripcion: 'Alta y mantenimiento' },
]

export function faseDe(valor) {
  return FASES.find((f) => f.valor === valor) || FASES[0]
}

export function citasDelDia(citas, dia) {
  const clave = claveDia(dia)
  return citas
    .filter((c) => c.dia === clave && c.status !== 'Cancelled')
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
}

export function proximaCita(citas, pacienteId) {
  const ahora = new Date()
  return citas
    .filter((c) => c.patient_id === pacienteId && c.status === 'Scheduled')
    .map((c) => ({ ...c, cuando: desdeClave(c.dia, c.inicio) }))
    .filter((c) => c.cuando >= ahora)
    .sort((a, b) => a.cuando - b.cuando)[0]
}

export function sesionesDe(sesiones, pacienteId) {
  return sesiones
    .filter((s) => s.patient_id === pacienteId)
    .sort((a, b) => b.session_date.localeCompare(a.session_date))
}

export function ultimaNota(sesiones, pacienteId) {
  return sesionesDe(sesiones, pacienteId)[0]
}

/** Primeras ~28 palabras de la nota, para las tarjetas del directorio. */
export function resumenNota(nota) {
  if (!nota) return null
  const limpio = nota.raw_narrative.replace(/\s+/g, ' ').trim()
  const palabras = limpio.split(' ')
  return palabras.length > 28 ? palabras.slice(0, 28).join(' ') + '…' : limpio
}

export function sesionesEnRango(citas, desde, hasta) {
  const a = claveDia(desde)
  const b = claveDia(hasta)
  return citas.filter((c) => c.dia >= a && c.dia <= b && c.status !== 'Cancelled')
}

/** Todo lo que necesita el panel de Oxígeno Clínico, calculado en un solo lugar. */
export function calcularOxigeno({ transacciones, citas, terapeuta }) {
  const hoyD = hoy()
  const primeroDelMes = new Date(hoyD.getFullYear(), hoyD.getMonth(), 1)
  const claveMes = claveDia(primeroDelMes)
  const claveHoy = claveDia(hoyD)

  const delMes = transacciones.filter(
    (t) => t.transaction_date >= claveMes && t.transaction_date <= claveHoy,
  )
  const ingresos = delMes
    .filter((t) => t.transaction_type === 'Income')
    .reduce((s, t) => s + Number(t.amount), 0)
  const egresos = delMes
    .filter((t) => t.transaction_type === 'Expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  const neto = ingresos - egresos
  const margen = ingresos > 0 ? Math.round((neto / ingresos) * 100) : 0
  const semilla = Math.round((neto > 0 ? neto : 0) * (terapeuta.porcentaje_semilla / 100))
  const meta = terapeuta.target_salary_monthly
  const avanceMeta = meta > 0 ? Math.min(100, Math.round((neto / meta) * 100)) : 0

  const lunes = inicioSemana(hoyD)
  const sesionesSemana = sesionesEnRango(citas, lunes, sumarDias(lunes, 6)).length
  const carga = Math.round((sesionesSemana / terapeuta.sesiones_semanales_sostenibles) * 100)

  // Últimas 8 semanas de ingresos, para la curva.
  const serie = []
  for (let i = 7; i >= 0; i--) {
    const desde = sumarDias(inicioSemana(hoyD), -7 * i)
    const hasta = sumarDias(desde, 6)
    const a = claveDia(desde)
    const b = claveDia(hasta)
    const monto = transacciones
      .filter((t) => t.transaction_type === 'Income' && t.transaction_date >= a && t.transaction_date <= b)
      .reduce((s, t) => s + Number(t.amount), 0)
    serie.push({ desde, monto })
  }

  return {
    ingresos,
    egresos,
    neto,
    margen,
    semilla,
    meta,
    avanceMeta,
    sesionesSemana,
    carga,
    serie,
    movimientos: [...delMes].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)),
  }
}

export function soles(monto) {
  return 'S/ ' + Number(monto).toLocaleString('es-PE', { maximumFractionDigits: 0 })
}
