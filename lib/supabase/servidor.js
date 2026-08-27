import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Cliente para componentes y manejadores de servidor. */
export async function supabaseServidor() {
  const almacen = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => almacen.set(name, value, options))
          } catch {
            // Llamado desde un componente de servidor: las cookies las
            // refresca el middleware, así que acá se puede ignorar.
          }
        },
      },
    },
  )
}
