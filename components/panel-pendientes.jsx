'use client'

import { useEffect, useRef } from 'react'
import { CalendarClock, Coins, MessageSquare, RefreshCw, X } from 'lucide-react'
import { useMirai } from '@/lib/store'
import { relativo } from '@/lib/fecha'

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const ICONOS = {
  cita_confirmada: CalendarClock,
  pago: Coins,
  reprogramacion: RefreshCw,
  recordatorio: MessageSquare,
}

/**
 * El buffer administrativo. Nada de esto interrumpe: se acumula acá y se lee
 * cuando la terapeuta decide abrirlo. Por eso no hay contador en el ícono.
 */
export default function PanelPendientes({ abierto, cerrar }) {
  const { pendientes, marcarPendientesLeidos } = useMirai()

  const caja = useRef(null)
  const cerrarRef = useRef(null)

  // Se comporta como un diálogo lateral: el foco entra al abrirse, no se
  // escapa al contenido de atrás y vuelve al botón que lo abrió.
  useEffect(() => {
    if (!abierto) return
    const anterior = document.activeElement

    const alPresionar = (e) => {
      if (e.key === 'Escape') {
        cerrar()
        return
      }
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
    cerrarRef.current?.focus()

    return () => {
      window.removeEventListener('keydown', alPresionar)
      if (anterior instanceof HTMLElement) anterior.focus()
    }
  }, [abierto, cerrar])

  const nuevos = pendientes.filter((p) => !p.read)

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar pendientes"
        aria-hidden={!abierto}
        tabIndex={-1}
        onClick={cerrar}
        className={`fixed inset-0 z-40 bg-inverse-surface/20 transition-opacity duration-300 ${
          abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        ref={caja}
        role="dialog"
        aria-modal={abierto || undefined}
        aria-label="Pendientes administrativos"
        // Cerrado sigue montado para poder deslizarse; sin `inert` seguiría
        // recibiendo el tabulador y anunciándose en los lectores de pantalla.
        inert={abierto ? undefined : true}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border-sand bg-surface transition-transform duration-500 ease-out ${
          abierto ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between border-b border-border-mist px-8 py-6">
          <div>
            <h2 className="font-serif text-headline-md text-primary">Pendientes</h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {nuevos.length === 0
                ? 'Nada nuevo desde la última vez que miraste.'
                : `${nuevos.length} ${nuevos.length === 1 ? 'cosa ocurrió' : 'cosas ocurrieron'} mientras trabajabas.`}
            </p>
          </div>
          <button
            ref={cerrarRef}
            type="button"
            onClick={cerrar}
            className="text-on-surface-variant hover:text-primary"
            aria-label="Cerrar pendientes"
          >
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-8 py-6">
          {pendientes.length === 0 && (
            <p className="text-body-md italic text-outline">Bandeja vacía.</p>
          )}
          {pendientes.map((p) => {
            const Icono = ICONOS[p.event_type] || MessageSquare
            return (
              <div
                key={p.id}
                className={`flex gap-4 rounded-lg border p-4 transition-colors ${
                  p.read
                    ? 'border-border-mist bg-transparent opacity-60'
                    : 'border-border-sand bg-surface-card'
                }`}
              >
                <span className="mt-0.5 text-secondary">
                  <Icono size={18} strokeWidth={1.6} />
                </span>
                <div className="min-w-0">
                  <p className="text-body-md text-on-surface">{p.payload.texto}</p>
                  <p className="mt-1 text-label-sm uppercase text-outline">{relativo(p.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-border-mist px-8 py-6">
          <button
            type="button"
            onClick={marcarPendientesLeidos}
            disabled={nuevos.length === 0}
            className="w-full rounded-md border border-border-sand py-3 text-label-md uppercase text-on-surface-variant transition-colors hover:bg-surface-variant/50 disabled:opacity-40"
          >
            Dar por visto
          </button>
          <p className="mt-4 text-center text-body-sm italic leading-relaxed text-outline">
            Notaluma nunca te interrumpe con esto. Lo administrativo espera acá hasta que tú lo abras.
          </p>
        </div>
      </aside>
    </>
  )
}
