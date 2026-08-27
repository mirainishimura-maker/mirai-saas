'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as local from './adaptador-local'
import * as nube from './adaptador-nube'
import { hayNube, supabase } from './supabase/navegador'
import { claveDia, desdeClave, hoy, inicioSemana, sumarDias } from './fecha'

// ─────────────────────────────────────────────────────────────────────
// El único sitio del que las pantallas sacan datos. Por debajo hay dos
// adaptadores con la misma forma:
//
//   nube    → Supabase. Datos reales, cuenta propia, notas cifradas.
//   muestra → localStorage. Datos inventados, para recorrer Mirai sin cuenta.
//
// Ninguna pantalla sabe cuál está activo, y esa es toda la gracia: cuando
// una terapeuta inicia sesión, las nueve pantallas empiezan a hablar con
// Postgres sin que se les haya tocado una línea.
// ─────────────────────────────────────────────────────────────────────

const LLAVE_MUESTRA = 'mirai.modo-muestra'

const MiraiContext = createContext(null)

const VACIO = {
  terapeuta: null,
  pacientes: [],
  sesiones: [],
  citas: [],
  transacciones: [],
  mapas: {},
  pendientes: [],
}

export function MiraiProvider({ children }) {
  const [modo, setModo] = useState('cargando') // cargando | nube | muestra | sin-sesion
  const [estado, setEstado] = useState(VACIO)
  const [error, setError] = useState(null)

  const adaptador = modo === 'nube' ? nube : local
  const adaptadorRef = useRef(adaptador)
  adaptadorRef.current = adaptador

  // Arranque: manda la sesión de Supabase. Si no hay, se mira si la persona
  // pidió expresamente ver la muestra. Si tampoco, no hay datos que enseñar.
  useEffect(() => {
    let vivo = true

    async function arrancar() {
      try {
        if (hayNube) {
          const { data } = await supabase().auth.getSession()
          if (data?.session) {
            const cargado = await nube.cargarTodo()
            if (!vivo) return
            setEstado(cargado)
            setModo('nube')
            return
          }
        }

        const quiereMuestra =
          !hayNube || window.localStorage.getItem(LLAVE_MUESTRA) === '1'

        if (quiereMuestra) {
          const cargado = await local.cargarTodo()
          if (!vivo) return
          setEstado(cargado)
          setModo('muestra')
          return
        }

        if (vivo) setModo('sin-sesion')
      } catch (e) {
        console.error('Mirai · arrancando:', e)
        if (vivo) {
          setError(e.message)
          setModo('sin-sesion')
        }
      }
    }

    arrancar()
    return () => {
      vivo = false
    }
  }, [])

  // Cerrar sesión en otra pestaña tiene que cerrarla acá también.
  useEffect(() => {
    if (!hayNube) return
    const { data } = supabase().auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setEstado(VACIO)
        setModo('sin-sesion')
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!estado.terapeuta) return
    document.documentElement.dataset.calma = estado.terapeuta.modo_calma ? 'on' : 'off'
  }, [estado.terapeuta])

  const recargar = useCallback(async () => {
    const cargado = await adaptadorRef.current.cargarTodo()
    setEstado(cargado)
  }, [])

  const acciones = useMemo(() => {
    // Cada acción escribe primero donde toque y luego refleja el cambio en
    // pantalla. Si la escritura falla, la pantalla no miente: se queda como
    // estaba y el error sube.
    const a = () => adaptadorRef.current

    return {
      async guardarAjustes(cambios) {
        const terapeuta = await a().guardarAjustes(sanearTerapeuta(cambios))
        setEstado((e) => ({ ...e, terapeuta: { ...e.terapeuta, ...terapeuta } }))
      },

      async alternarModoCalma() {
        const valor = !estadoActual().terapeuta?.modo_calma
        const terapeuta = await a().guardarAjustes({ modo_calma: valor })
        setEstado((e) => ({ ...e, terapeuta: { ...e.terapeuta, ...terapeuta } }))
      },

      async crearPaciente(datos) {
        const nuevo = await a().crearPaciente(datos)
        setEstado((e) => ({ ...e, pacientes: [nuevo, ...e.pacientes] }))
        return nuevo
      },

      async actualizarPaciente(id, cambios) {
        await a().actualizarPaciente(id, cambios)
        setEstado((e) => ({
          ...e,
          pacientes: e.pacientes.map((p) => (p.id === id ? { ...p, ...cambios } : p)),
        }))
      },

      async archivarPaciente(id) {
        await a().archivarPaciente(id)
        setEstado((e) => ({
          ...e,
          pacientes: e.pacientes.filter((p) => p.id !== id),
          sesiones: e.sesiones.filter((s) => s.patient_id !== id),
          citas: e.citas.filter((c) => c.patient_id !== id),
        }))
      },

      async guardarNota(datos) {
        const nota = await a().guardarNota(datos)
        setEstado((e) => ({
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
      },

      async editarNota(id, cambios) {
        await a().editarNota(id, cambios)
        setEstado((e) => ({
          ...e,
          sesiones: e.sesiones.map((s) => (s.id === id ? { ...s, ...cambios } : s)),
        }))
      },

      async eliminarNota(id) {
        await a().eliminarNota(id)
        setEstado((e) => ({ ...e, sesiones: e.sesiones.filter((s) => s.id !== id) }))
      },

      async crearCita(datos) {
        if (!citaValida(datos)) return null
        const cita = await a().crearCita(datos)
        setEstado((e) => ({ ...e, citas: [...e.citas, cita] }))
        return cita
      },

      async cambiarEstadoCita(citaId, status) {
        const actual = estadoActual()
        const cita = actual.citas.find((c) => c.id === citaId)
        if (!cita) return
        await a().cambiarEstadoCita(citaId, status, {
          tarifa: actual.terapeuta.tarifa_sesion,
          patient_id: cita.patient_id,
          dia: cita.dia,
        })
        await recargar()
      },

      async eliminarCita(citaId) {
        await a().eliminarCita(citaId)
        setEstado((e) => ({
          ...e,
          citas: e.citas.filter((c) => c.id !== citaId),
          transacciones: e.transacciones.filter((t) => t.appointment_id !== citaId),
        }))
      },

      async registrarMovimiento(datos) {
        const mov = await a().registrarMovimiento(datos)
        setEstado((e) => ({ ...e, transacciones: [mov, ...e.transacciones] }))
        return mov
      },

      async eliminarMovimiento(id) {
        await a().eliminarMovimiento(id)
        setEstado((e) => ({ ...e, transacciones: e.transacciones.filter((t) => t.id !== id) }))
      },

      async guardarMapa(pacienteId, contenido) {
        setEstado((e) => ({ ...e, mapas: { ...e.mapas, [pacienteId]: contenido } }))
        await a().guardarMapa(pacienteId, contenido)
      },

      async marcarPendientesLeidos() {
        await a().marcarPendientesLeidos()
        setEstado((e) => ({ ...e, pendientes: e.pendientes.map((p) => ({ ...p, read: true })) }))
      },

      exportarHistoria: (id) => a().exportarHistoria(id),
      exportarTodo: () => a().exportarTodo(),

      async cerrarSesion() {
        if (modoActual() === 'nube') {
          await nube.cerrarSesion()
        } else {
          try {
            window.localStorage.removeItem(LLAVE_MUESTRA)
          } catch {}
        }
        setEstado(VACIO)
        setModo('sin-sesion')
      },

      reiniciarMuestra() {
        setEstado(local.reiniciar())
      },

      recargar,
    }
  }, [recargar])

  // Las acciones se crean una vez; para leer lo último sin recrearlas, se
  // consultan estas dos referencias.
  const estadoRef = useRef(estado)
  estadoRef.current = estado
  const modoRef = useRef(modo)
  modoRef.current = modo
  function estadoActual() {
    return estadoRef.current
  }
  function modoActual() {
    return modoRef.current
  }

  const valor = useMemo(
    () => ({
      ...estado,
      modo,
      error,
      esMuestra: modo === 'muestra',
      listo: modo === 'nube' || modo === 'muestra',
      ...acciones,
    }),
    [estado, modo, error, acciones],
  )

  return <MiraiContext.Provider value={valor}>{children}</MiraiContext.Provider>
}

export function useMirai() {
  const ctx = useContext(MiraiContext)
  if (!ctx) throw new Error('useMirai debe usarse dentro de <MiraiProvider>')
  return ctx
}

/** Entrar a la muestra sin cuenta. */
export function activarMuestra() {
  try {
    window.localStorage.setItem(LLAVE_MUESTRA, '1')
  } catch {}
}

// ── Reglas del negocio ───────────────────────────────────────────────

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/

export function minutosDelDia(hhmm) {
  if (typeof hhmm !== 'string' || !HORA.test(hhmm)) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function citaValida(datos) {
  if (!datos?.patient_id || !datos?.dia) return false
  const inicio = minutosDelDia(datos.inicio)
  const fin = minutosDelDia(datos.fin)
  return inicio !== null && fin !== null && fin > inicio
}

function numeroSeguro(valor, reserva, minimo = 0) {
  const n = Number(valor)
  if (!Number.isFinite(n) || n < minimo) return reserva
  return n
}

/**
 * Los ajustes son divisores de medio panel: si la tarifa o el techo de
 * sesiones quedan en cero, la carga semanal sale Infinity y el mes
 * "cubierto" sale NaN. Se sanean acá, al entrar, y no en cada pantalla.
 */
function sanearTerapeuta(t) {
  const salida = { ...t }
  if ('tarifa_sesion' in t) salida.tarifa_sesion = numeroSeguro(t.tarifa_sesion, 75, 1)
  if ('target_salary_monthly' in t)
    salida.target_salary_monthly = numeroSeguro(t.target_salary_monthly, 0)
  if ('monthly_fixed_costs' in t)
    salida.monthly_fixed_costs = numeroSeguro(t.monthly_fixed_costs, 0)
  if ('sesiones_semanales_sostenibles' in t)
    salida.sesiones_semanales_sostenibles = numeroSeguro(t.sesiones_semanales_sostenibles, 20, 1)
  if ('porcentaje_semilla' in t)
    salida.porcentaje_semilla = Math.min(100, numeroSeguro(t.porcentaje_semilla, 10))
  return salida
}

// ── Selectores ───────────────────────────────────────────────────────

export function nombrePaciente(p) {
  if (!p) return 'Paciente'
  return `${p.first_name} ${p.last_name || ''}`.trim()
}

export function iniciales(p) {
  if (!p) return '··'
  return `${(p.first_name || '?').charAt(0)}${(p.last_name || '').charAt(0)}`.toUpperCase()
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
    .sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)))
}

export function ultimaNota(sesiones, pacienteId) {
  return sesionesDe(sesiones, pacienteId)[0]
}

export function resumenNota(nota) {
  if (!nota) return null
  const limpio = (nota.raw_narrative || '').replace(/\s+/g, ' ').trim()
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
  const t = terapeuta || {}
  const hoyD = hoy()
  const claveMes = claveDia(new Date(hoyD.getFullYear(), hoyD.getMonth(), 1))
  const claveHoy = claveDia(hoyD)

  const delMes = (transacciones || []).filter(
    (x) => x.transaction_date >= claveMes && x.transaction_date <= claveHoy,
  )
  const ingresos = delMes
    .filter((x) => x.transaction_type === 'Income')
    .reduce((s, x) => s + Number(x.amount), 0)
  const egresos = delMes
    .filter((x) => x.transaction_type === 'Expense')
    .reduce((s, x) => s + Number(x.amount), 0)

  const neto = ingresos - egresos
  const margen = ingresos > 0 ? Math.round((neto / ingresos) * 100) : 0
  const porcentajeSemilla = numeroSeguro(t.porcentaje_semilla, 10)
  const semilla = Math.round((neto > 0 ? neto : 0) * (porcentajeSemilla / 100))
  const meta = numeroSeguro(t.target_salary_monthly, 0)
  const avanceMeta = meta > 0 ? Math.min(100, Math.round((neto / meta) * 100)) : 0

  const techo = numeroSeguro(t.sesiones_semanales_sostenibles, 20, 1)
  const tarifa = numeroSeguro(t.tarifa_sesion, 75, 1)
  const lunes = inicioSemana(hoyD)
  const sesionesSemana = sesionesEnRango(citas || [], lunes, sumarDias(lunes, 6)).length
  const carga = Math.round((sesionesSemana / techo) * 100)
  const sesionesParaLaMeta = Math.max(0, Math.ceil((meta - neto) / tarifa))

  const serie = []
  for (let i = 7; i >= 0; i--) {
    const desde = sumarDias(lunes, -7 * i)
    const a = claveDia(desde)
    const b = claveDia(sumarDias(desde, 6))
    const monto = (transacciones || [])
      .filter((x) => x.transaction_type === 'Income' && x.transaction_date >= a && x.transaction_date <= b)
      .reduce((s, x) => s + Number(x.amount), 0)
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
    cargaTexto: textoDeCarga(carga),
    sesionesParaLaMeta,
    techo,
    serie,
    movimientos: [...delMes].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)),
  }
}

const CARGA_AL_LIMITE = 100
const CARGA_ALTA = 85

export function textoDeCarga(carga) {
  if (carga > CARGA_AL_LIMITE)
    return 'Estás por encima de tu propio techo. Considera mover algo de la próxima semana.'
  if (carga > CARGA_ALTA) return 'Semana cargada. Deja una tarde libre si puedes.'
  return 'Tienes aire. La agenda respira.'
}

export function simularSostenibilidad({ terapeuta, sesionesPorSemana, tarifa }) {
  const t = terapeuta || {}
  const sesiones = numeroSeguro(sesionesPorSemana, 1, 1)
  const valor = numeroSeguro(tarifa, 1, 1)
  const bruto = sesiones * valor * 4
  const neto = bruto - numeroSeguro(t.monthly_fixed_costs, 0)
  const semilla = Math.round((neto > 0 ? neto : 0) * (numeroSeguro(t.porcentaje_semilla, 10) / 100))
  const techo = numeroSeguro(t.sesiones_semanales_sostenibles, 20, 1)
  return { bruto, neto, semilla, techo, excede: sesiones > techo }
}

export function soles(monto) {
  return 'S/ ' + Number(monto || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 })
}
