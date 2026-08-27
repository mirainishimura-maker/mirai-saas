// Todo el manejo de fechas es LOCAL. Nunca toISOString() para guardar un día,
// porque en Perú (UTC-5) eso corre la fecha al día anterior.

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const DIAS_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** '2026-08-26' a partir de un Date, en hora local. */
export function claveDia(fecha) {
  const d = new Date(fecha)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/** Date a partir de '2026-08-26' y opcionalmente '16:00', sin saltos de zona. */
export function desdeClave(clave, hora = '00:00') {
  const [a, m, d] = clave.split('-').map(Number)
  const [hh, mm] = hora.split(':').map(Number)
  return new Date(a, m - 1, d, hh, mm, 0, 0)
}

export function hoy() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function sumarDias(fecha, dias) {
  const d = new Date(fecha)
  d.setDate(d.getDate() + dias)
  return d
}

export function mismoDia(a, b) {
  return claveDia(a) === claveDia(b)
}

export function horaCorta(fecha) {
  const d = new Date(fecha)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 'miércoles 26 de agosto' */
export function fechaLarga(fecha) {
  const d = new Date(fecha)
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** '26 de agosto' */
export function fechaMedia(fecha) {
  const d = new Date(fecha)
  return `${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** 'Jueves, 16:00' — para la próxima cita en tarjetas. */
export function diaYHora(fecha) {
  const d = new Date(fecha)
  const dia = DIAS[d.getDay()]
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${horaCorta(d)}`
}

/** 'hace 3 días' / 'hoy' / 'en 2 días' */
export function relativo(fecha) {
  const dif = Math.round((desdeClave(claveDia(fecha)) - hoy()) / 86400000)
  if (dif === 0) return 'hoy'
  if (dif === 1) return 'mañana'
  if (dif === -1) return 'ayer'
  if (dif < 0) return `hace ${Math.abs(dif)} días`
  return `en ${dif} días`
}

/** Lunes de la semana que contiene a `fecha`. */
export function inicioSemana(fecha) {
  const d = new Date(fecha)
  const diaSemana = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diaSemana)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Matriz de 6x7 días para pintar el mes de `fecha`, empezando en lunes. */
export function gridMes(fecha) {
  const d = new Date(fecha)
  const primero = new Date(d.getFullYear(), d.getMonth(), 1)
  const arranque = inicioSemana(primero)
  return Array.from({ length: 42 }, (_, i) => {
    const dia = sumarDias(arranque, i)
    return { fecha: dia, delMes: dia.getMonth() === d.getMonth() }
  })
}
