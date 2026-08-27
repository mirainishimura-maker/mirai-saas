'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useMirai } from '@/lib/store'

// Veinte minutos sin tocar nada y la sesión se cierra sola. Es la única
// defensa contra el escenario más probable de todos: la laptop abierta y
// alguien más en la habitación.
const INACTIVIDAD_MS = 20 * 60 * 1000
const AVISO_MS = 60 * 1000

export default function Guardia({ children }) {
  const { modo, cerrarSesion } = useMirai()
  const router = useRouter()

  useEffect(() => {
    if (modo === 'sin-sesion') router.replace('/entrar')
  }, [modo, router])

  if (modo === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-warm">
        <p className="font-serif text-body-lg italic text-outline">Abriendo tu consultorio…</p>
      </div>
    )
  }

  if (modo === 'sin-sesion') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-warm">
        <p className="font-serif text-body-lg italic text-outline">Llevándote al acceso…</p>
      </div>
    )
  }

  return (
    <>
      {modo === 'nube' && <CierrePorInactividad cerrarSesion={cerrarSesion} />}
      {children}
    </>
  )
}

function CierrePorInactividad({ cerrarSesion }) {
  const [avisando, setAvisando] = useState(false)
  const temporizadores = useRef({})

  useEffect(() => {
    const reiniciar = () => {
      clearTimeout(temporizadores.current.aviso)
      clearTimeout(temporizadores.current.cierre)
      setAvisando(false)
      temporizadores.current.aviso = setTimeout(
        () => setAvisando(true),
        INACTIVIDAD_MS - AVISO_MS,
      )
      temporizadores.current.cierre = setTimeout(cerrarSesion, INACTIVIDAD_MS)
    }

    const eventos = ['pointerdown', 'keydown', 'scroll', 'focus']
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }))
    reiniciar()

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, reiniciar))
      clearTimeout(temporizadores.current.aviso)
      clearTimeout(temporizadores.current.cierre)
    }
  }, [cerrarSesion])

  if (!avisando) return null

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border-sand bg-surface-card p-5 shadow-lg"
    >
      <p className="mb-3 text-body-md leading-relaxed text-on-surface">
        Llevas un rato sin actividad. Por seguridad voy a cerrar la sesión en un minuto.
      </p>
      <p className="text-body-sm italic text-on-surface-variant">
        Toca cualquier parte de la pantalla para seguir trabajando.
      </p>
    </div>
  )
}
