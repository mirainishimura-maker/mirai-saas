// Notaluma · Prueba del enlace público (F1), contra producción.
//
// Golpea las tres funciones públicas como lo haría un desconocido con la
// llave anónima: lee la agenda, pide cupos, aparta uno, intenta apartar
// EL MISMO otra vez (debe rebotar con «ocupado») y prueba un token falso.
//
// Uso:  node supabase/prueba-agenda.mjs <token-del-enlace>
//
// La reserva que crea queda PENDIENTE a nombre de «Prueba Enlace» — se
// rechaza desde el panel de reservas al terminar.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = {}
for (const linea of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = linea.match(/^([A-Z_]+)="?([^"\r]*)"?\r?$/)
  if (m) env[m[1]] = m[2]
}
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

const token = process.argv[2]
if (!token) { console.error('Uso: node supabase/prueba-agenda.mjs <token>'); process.exit(1) }

let fallos = 0
const bien = (m) => console.log(`  BIEN  ${m}`)
const mal = (m) => { fallos++; console.log(`  MAL   ${m}`) }

// 1 · token falso: silencio
{
  const { data } = await c.rpc('agenda_publica', { p_token: 'token-falso-123' })
  data === null ? bien('token falso devuelve nada') : mal('¡un token falso devolvió datos!')
}

// 2 · la agenda real
const { data: agenda, error: e1 } = await c.rpc('agenda_publica', { p_token: token })
if (e1 || !agenda) { mal(`agenda_publica no respondió: ${e1?.message || 'null (¿enlace pausado?)'}`); process.exit(1) }
bien(`agenda de «${agenda.nombre}» con ${agenda.servicios.length} servicio(s)`)
if (!agenda.servicios.length) { mal('sin servicios reservables: crea uno en Ajustes'); process.exit(1) }
const servicio = agenda.servicios[0]

// 3 · cupos
const { data: slots, error: e2 } = await c.rpc('slots_publicos', { p_token: token, p_servicio: servicio.id })
if (e2 || !Array.isArray(slots)) { mal(`slots_publicos falló: ${e2?.message}`); process.exit(1) }
slots.length > 0
  ? bien(`${slots.length} cupos en 14 días (primero: ${slots[0]})`)
  : mal('cero cupos: ¿el horario semanal está vacío?')
if (!slots.length) process.exit(1)
const cupo = slots[slots.length - 1] // el último, para estorbar lo menos posible

// 4 · reservar
const datos = {
  p_token: token, p_servicio: servicio.id, p_inicio: cupo,
  p_nombre: 'Prueba Enlace', p_telefono: '900000001',
  p_correo: '', p_motivo: 'reserva de prueba — rechazar',
}
const { data: r1, error: e3 } = await c.rpc('reservar_web', datos)
if (e3 || !r1?.ok) mal(`no se pudo reservar: ${e3?.message || JSON.stringify(r1)}`)
else bien(`cupo apartado (${cupo})`)

// 5 · el MISMO cupo otra vez → ocupado
{
  const { data: r2 } = await c.rpc('reservar_web', { ...datos, p_nombre: 'Prueba Dos' })
  r2?.ok === false && r2?.motivo === 'ocupado'
    ? bien('el doble intento rebotó: «justo tomaron ese horario»')
    : mal(`¡el mismo cupo se reservó dos veces! ${JSON.stringify(r2)}`)
}

// 6 · el cupo ya no aparece en la lista
{
  const { data: s2 } = await c.rpc('slots_publicos', { p_token: token, p_servicio: servicio.id })
  Array.isArray(s2) && !s2.includes(cupo)
    ? bien('el cupo apartado desapareció de los disponibles')
    : mal('el cupo apartado sigue ofreciéndose')
}

// 7 · datos malos
{
  const { data: r3 } = await c.rpc('reservar_web', { ...datos, p_inicio: slots[0], p_nombre: 'X', p_telefono: '12' })
  r3?.ok === false && r3?.motivo === 'datos'
    ? bien('nombre/teléfono inválidos rebotan')
    : mal(`datos malos no rebotaron: ${JSON.stringify(r3)}`)
}

// 8 · anón sigue sin poder tocar las tablas nuevas
{
  const { data, error } = await c.from('web_bookings').select('*').limit(1)
  error || (data ?? []).length === 0 ? bien('anón no lee web_bookings') : mal('¡ANÓN LEE LAS RESERVAS!')
}
{
  const { data, error } = await c.from('services').select('*').limit(1)
  error || (data ?? []).length === 0 ? bien('anón no lee services') : mal('¡ANÓN LEE EL CATÁLOGO POR TABLA!')
}

console.log(fallos === 0
  ? '\n═══ ENLACE CERRADO Y FUNCIONANDO: recuerda RECHAZAR la reserva «Prueba Enlace» en el panel ═══'
  : `\n═══ ${fallos} FALLO(S) ═══`)
process.exit(fallos === 0 ? 0 : 1)
