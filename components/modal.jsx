'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ abierto, cerrar, titulo, bajada, children, ancho = 'max-w-lg' }) {
  const caja = useRef(null)
  const tituloId = useId()

  useEffect(() => {
    if (!abierto) return

    // Quien tenía el foco antes de abrir, para devolvérselo al cerrar.
    const anterior = document.activeElement

    const alPresionar = (e) => {
      if (e.key === 'Escape') {
        cerrar()
        return
      }
      // aria-modal promete que lo de fuera está inerte; sin esto el tabulador
      // se escapa igual a la página de atrás.
      if (e.key !== 'Tab' || !caja.current) return
      const focusables = [...caja.current.querySelectorAll(FOCUSABLES)]
      if (focusables.length === 0) return
      const primero = focusables[0]
      const ultimo = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    window.addEventListener('keydown', alPresionar)
    document.body.style.overflow = 'hidden'
    caja.current?.querySelector(FOCUSABLES)?.focus()

    return () => {
      window.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = ''
      if (anterior instanceof HTMLElement) anterior.focus()
    }
  }, [abierto, cerrar])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={cerrar}
        className="fixed inset-0 bg-inverse-surface/25 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        ref={caja}
        className={`mirai-entra relative w-full ${ancho} rounded-t-xl border border-border-sand bg-surface-card sm:rounded-xl`}
      >
        <div className="flex items-start justify-between border-b border-border-mist px-8 py-6">
          <div>
            <h2 id={tituloId} className="font-serif text-headline-md text-primary">
              {titulo}
            </h2>
            {bajada && <p className="mt-1 text-body-sm text-on-surface-variant">{bajada}</p>}
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="text-on-surface-variant hover:text-primary"
          >
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-8 py-6">{children}</div>
      </div>
    </div>
  )
}
