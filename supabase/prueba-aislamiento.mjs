// Mirai · La prueba de las dos cuentas, automatizada.
//
// Es el paso 4 del README de supabase/: la configuración ya se verificó con
// SQL, pero lo que importa es el comportamiento. Esto entra como la cuenta A,
// escribe una nota, y luego intenta robarla como la cuenta B por todos los
// caminos que ofrece la API pública. Todos tienen que fallar.
//
// Uso:
//   node supabase/prueba-aislamiento.mjs correoA claveA correoB claveB
//
// Las dos cuentas se crean antes en el panel: Authentication → Users →
// Add user → Create new user, con "Auto Confirm User" marcado. Son cuentas
// de prueba: se borran al terminar.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Lee las variables de .env.local para no depender del entorno de la shell.
const env = {}
for (const linea of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = linea.match(/^([A-Z_]+)="?([^"\r]*)"?\r?$/)
  if (m) env[m[1]] = m[2]
}
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const LLAVE = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL_BASE || !LLAVE) {
  console.error('No encuentro las variables en .env.local')
  process.exit(1)
}

const [correoA, claveA, correoB, claveB] = process.argv.slice(2)
if (!claveB) {
  console.error('Uso: node supabase/prueba-aislamiento.mjs correoA claveA correoB claveB')
  process.exit(1)
}

let fallos = 0
const bien = (msg) => console.log(`  BIEN  ${msg}`)
const mal = (msg) => { fallos++; console.log(`  MAL   ${msg}`) }

function cliente() {
  return createClient(URL_BASE, LLAVE, { auth: { persistSession: false } })
}

async function entrar(correo, clave) {
  const c = cliente()
  const { data, error } = await c.auth.signInWithPassword({ email: correo, password: clave })
  if (error) throw new Error(`No pude entrar como ${correo}: ${error.message}`)
  return { c, uid: data.user.id }
}

// ── A: preparar el terreno ──────────────────────────────────────────
console.log('\nComo A: crear paciente y nota…')
const A = await entrar(correoA, claveA)

const { data: paciente, error: fp } = await A.c
  .from('patients')
  .insert({ therapist_id: A.uid, first_name: 'Paciente', last_name: 'De Prueba' })
  .select('id')
  .single()
if (fp) throw new Error(`A no pudo crear su paciente: ${fp.message}`)

const { data: notaId, error: fn } = await A.c.rpc('guardar_nota', {
  p_patient_id: paciente.id,
  p_narrativa: 'Narrativa secreta de la prueba de aislamiento.',
})
if (fn) throw new Error(`A no pudo escribir la nota: ${fn.message}`)
console.log(`  paciente ${paciente.id.slice(0, 8)}… nota ${String(notaId).slice(0, 8)}…`)

// La nota tiene que volver descifrada para su dueña.
{
  const { data, error } = await A.c.rpc('leer_notas', { p_patient_id: paciente.id })
  const propia = (data ?? []).find((n) => n.id === notaId)
  if (error) mal(`A no pudo leer sus notas: ${error.message}`)
  else if (propia?.raw_narrative?.includes('secreta')) bien('A lee su propia nota descifrada')
  else mal('la nota de A no volvió descifrada para ella misma')
}

// Y en la tabla tiene que estar CIFRADA: bytes, no texto.
{
  const { data } = await A.c.from('clinical_sessions').select('raw_narrative_encrypted').eq('id', notaId)
  const crudo = String(data?.[0]?.raw_narrative_encrypted ?? '')
  if (crudo && !crudo.includes('secreta')) bien('en la tabla la narrativa son bytes cifrados')
  else mal('¡la narrativa está EN CLARO en la tabla!')
}

// ── B: intentar robar ───────────────────────────────────────────────
console.log('\nComo B: intentar llegar a lo de A…')
const B = await entrar(correoB, claveB)

{ // leer la nota por id → array vacío, ni siquiera un error
  const { data, error } = await B.c.from('clinical_sessions').select('*').eq('id', notaId)
  if (error) mal(`leer la nota dio error en vez de vacío: ${error.message}`)
  else if (data.length === 0) bien('la nota de A no existe para B (0 filas)')
  else mal(`¡B PUEDE VER LA NOTA DE A! (${data.length} filas)`)
}

{ // leer al paciente por id
  const { data } = await B.c.from('patients').select('*').eq('id', paciente.id)
  if ((data ?? []).length === 0) bien('el paciente de A no existe para B')
  else mal('¡B PUEDE VER AL PACIENTE DE A!')
}

{ // leer_notas descifra → solo lo suyo
  const { data, error } = await B.c.rpc('leer_notas', { p_patient_id: null })
  const ajenas = (data ?? []).filter((n) => n.id === notaId)
  if (error) mal(`leer_notas falló para B: ${error.message}`)
  else if (ajenas.length === 0) bien(`leer_notas de B no incluye la nota de A (devolvió ${(data ?? []).length})`)
  else mal('¡leer_notas LE DESCIFRÓ A B LA NOTA DE A!')
}

{ // insertar un paciente a nombre de A → WITH CHECK lo rechaza
  const { error } = await B.c.from('patients').insert({ therapist_id: A.uid, first_name: 'Intruso' })
  if (error) bien(`B no puede crear pacientes a nombre de A (${error.code})`)
  else mal('¡B CREÓ UN PACIENTE A NOMBRE DE A!')
}

{ // guardar_nota sobre el paciente de A
  const { error } = await B.c.rpc('guardar_nota', { p_patient_id: paciente.id, p_narrativa: 'intrusa' })
  if (error) bien('B no puede escribir en la historia del paciente de A')
  else mal('¡B ESCRIBIÓ EN LA HISTORIA DEL PACIENTE DE A!')
}

{ // exportar la historia del paciente de A
  const { error } = await B.c.rpc('exportar_historia', { p_patient_id: paciente.id })
  if (error) bien('B no puede exportar la historia del paciente de A')
  else mal('¡B EXPORTÓ LA HISTORIA DEL PACIENTE DE A!')
}

{ // pedir la llave de cifrado por RPC
  const { error } = await B.c.rpc('clave_notas')
  if (error) bien('clave_notas no es invocable con sesión')
  else mal('¡¡clave_notas DEVOLVIÓ LA LLAVE DE CIFRADO!!')
}

// ── Sin sesión: el rol anónimo ──────────────────────────────────────
console.log('\nSin sesión (rol anónimo)…')
const anon = cliente()

{
  const { data, error } = await anon.from('patients').select('*').limit(1)
  if (error || (data ?? []).length === 0) bien('anón no lee pacientes')
  else mal('¡ANÓN LEE PACIENTES!')
}
{
  const { error } = await anon.rpc('leer_notas', { p_patient_id: null })
  if (error) bien('anón no puede llamar a leer_notas')
  else mal('¡ANÓN LLAMÓ A leer_notas!')
}
{
  const { error } = await anon.rpc('clave_notas')
  if (error) bien('anón no puede pedir la llave de cifrado')
  else mal('¡¡ANÓN OBTUVO LA LLAVE DE CIFRADO!!')
}

// ── Limpieza: A borra lo que creó ───────────────────────────────────
await A.c.from('clinical_sessions').delete().eq('id', notaId)
await A.c.from('patients').delete().eq('id', paciente.id)

console.log(fallos === 0
  ? '\n═══ TODO CERRADO: la prueba de las dos cuentas pasó entera ═══'
  : `\n═══ ${fallos} FALLO(S): NO SE ENTREGA hasta cerrarlos ═══`)
process.exit(fallos === 0 ? 0 : 1)
