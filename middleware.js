import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * Refresca el token de sesión en cada visita. Sin esto, la sesión caduca a
 * media mañana y a la terapeuta le salta el acceso en mitad de una nota.
 *
 * Mientras no haya proyecto de Supabase configurado, esto no hace nada y la
 * app funciona en modo muestra.
 */
export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !llave) return NextResponse.next()

  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient(url, llave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value))
        respuesta = NextResponse.next({ request })
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options))
      },
    },
  })

  // getUser() y no getSession(): este valida el token contra Supabase en vez
  // de creerse lo que traiga la cookie.
  //
  // Si Supabase no responde, la petición sigue: quedarse sin refrescar el
  // token es molesto, pero tumbar la navegación entera por una caída de red
  // es peor. Quien decide si hay sesión es la app, no este middleware.
  try {
    await supabase.auth.getUser()
  } catch (fallo) {
    console.error('Mirai · refrescando la sesión:', fallo)
  }

  return respuesta
}

export const config = {
  matcher: [
    // Todo menos los archivos estáticos, las imágenes y la ruta de salud: el
    // monitor la consulta cada pocos minutos y no tiene sesión que refrescar.
    '/((?!api/salud|agendar|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
