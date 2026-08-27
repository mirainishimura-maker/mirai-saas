'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const LLAVE = 'mirai.aviso-muestra'

/**
 * Mientras Mirai no tenga cuentas ni servidor, quien la abra tiene derecho a
 * saber dos cosas antes de escribir nada: que los pacientes son inventados y
 * que lo que escriba vive solo en ese navegador. Se puede cerrar, pero vuelve
 * a aparecer en cada visita nueva: es una advertencia, no una notificación.
 */
export default function AvisoMuestra() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!window.sessionStorage.getItem(LLAVE)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const cerrar = () => {
    setVisible(false)
    try {
      window.sessionStorage.setItem(LLAVE, '1')
    } catch {}
  }

  return (
    <div className="border-b border-border-sand bg-secondary-fixed/50">
      <div className="mx-auto flex w-full max-w-content items-start gap-4 px-margin-mobile py-3 md:px-margin-desktop">
        <p className="flex-1 text-body-sm leading-relaxed text-on-secondary-fixed">
          <strong className="font-semibold">Esto es una muestra.</strong> Los pacientes que ves son
          inventados, y todo lo que escribas se guarda únicamente en este navegador: no hay cuenta ni
          servidor, y se pierde si limpias los datos de navegación.{' '}
          <span className="font-semibold">No registres pacientes reales todavía.</span>
        </p>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Ocultar el aviso"
          className="mt-0.5 shrink-0 text-on-secondary-fixed/70 transition-colors hover:text-on-secondary-fixed"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
