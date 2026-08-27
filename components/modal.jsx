'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ abierto, cerrar, titulo, bajada, children, ancho = 'max-w-lg' }) {
  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e) => e.key === 'Escape' && cerrar()
    window.addEventListener('keydown', alPresionar)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = ''
    }
  }, [abierto, cerrar])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
      <button
        aria-label="Cerrar"
        onClick={cerrar}
        className="fixed inset-0 bg-inverse-surface/25 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`mirai-entra relative w-full ${ancho} rounded-t-xl border border-border-sand bg-surface-card sm:rounded-xl`}
      >
        <div className="flex items-start justify-between border-b border-border-mist px-8 py-6">
          <div>
            <h2 className="font-serif text-headline-md text-primary">{titulo}</h2>
            {bajada && <p className="mt-1 text-body-sm text-on-surface-variant">{bajada}</p>}
          </div>
          <button onClick={cerrar} className="text-on-surface-variant hover:text-primary">
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-8 py-6">{children}</div>
      </div>
    </div>
  )
}
