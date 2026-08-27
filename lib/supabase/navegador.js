import { createBrowserClient } from '@supabase/ssr'

// Las dos variables son públicas por diseño: la llave anónima no da acceso a
// nada por sí sola, porque quien decide qué se puede leer es RLS en Postgres.
// La service_role NUNCA aparece acá ni en ninguna variable NEXT_PUBLIC_.
export const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL
export const LLAVE_ANONIMA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Falso mientras no haya proyecto configurado: la app cae en modo muestra. */
export const hayNube = Boolean(URL_SUPABASE && LLAVE_ANONIMA)

let cliente = null

export function supabase() {
  if (!hayNube) return null
  if (!cliente) cliente = createBrowserClient(URL_SUPABASE, LLAVE_ANONIMA)
  return cliente
}
