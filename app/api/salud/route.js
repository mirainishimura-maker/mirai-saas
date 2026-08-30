import { NextResponse } from 'next/server'

// Ruta de salud para un monitor externo (UptimeRobot, BetterStack o similar).
//
// No basta con que Vercel responda: la aplicación puede estar impecable y la
// base pausada, que es justo el fallo silencioso que ya costó 33 días de
// caída en otro proyecto. Por eso esto toca Supabase de verdad.
//
// No devuelve nada que no se pueda leer en público: si responde o no, y
// cuánto tardó. Ni una fila, ni un nombre, ni un conteo.

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TIEMPO_LIMITE_MS = 5000

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !llave) {
    return respuesta(503, { estado: 'sin-base', motivo: 'faltan las variables de entorno' })
  }

  const arranque = Date.now()
  const corte = AbortSignal.timeout(TIEMPO_LIMITE_MS)

  try {
    // El endpoint de salud de GoTrue: contesta sin sesión y sin tocar datos.
    const r = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: llave },
      signal: corte,
      cache: 'no-store',
    })
    const tardo = Date.now() - arranque

    if (!r.ok) {
      return respuesta(503, { estado: 'base-caida', codigo: r.status, ms: tardo })
    }
    return respuesta(200, { estado: 'ok', ms: tardo })
  } catch (fallo) {
    // Un proyecto pausado por inactividad aterriza acá: no rechaza, no
    // responde. Por eso hay tiempo límite y no una espera infinita.
    const motivo = fallo?.name === 'TimeoutError' ? 'la base no respondió a tiempo' : 'no se pudo alcanzar la base'
    return respuesta(503, { estado: 'base-caida', motivo, ms: Date.now() - arranque })
  }
}

function respuesta(codigo, cuerpo) {
  return NextResponse.json(
    { ...cuerpo, hora: new Date().toISOString() },
    { status: codigo, headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
