'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BellOff,
  CalendarDays,
  Droplets,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  NotebookPen,
  PenLine,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { citasDelDia, useMirai } from '@/lib/store'
import { hoy } from '@/lib/fecha'
import PanelPendientes from './panel-pendientes'
import AvisoMuestra from './aviso-muestra'

const RUTAS = [
  { href: '/refugio', etiqueta: 'El Refugio', Icono: Home },
  { href: '/pacientes', etiqueta: 'Pacientes', Icono: Users },
  { href: '/calendario', etiqueta: 'Calendario', Icono: CalendarDays },
  { href: '/notas', etiqueta: 'Notas', Icono: NotebookPen },
  { href: '/oxigeno', etiqueta: 'Oxígeno clínico', Icono: Droplets },
  { href: '/ajustes', etiqueta: 'Ajustes', Icono: Settings },
]

export default function Shell({ children }) {
  const { terapeuta, citas, alternarModoCalma } = useMirai()
  const ruta = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [pendientesAbierto, setPendientesAbierto] = useState(false)

  const [escritorio, setEscritorio] = useState(true)

  useEffect(() => {
    setMenuAbierto(false)
  }, [ruta])

  useEffect(() => {
    const consulta = window.matchMedia('(min-width: 1024px)')
    const sincronizar = () => setEscritorio(consulta.matches)
    sincronizar()
    consulta.addEventListener('change', sincronizar)
    return () => consulta.removeEventListener('change', sincronizar)
  }, [])

  const delDia = citasDelDia(citas, hoy())
  const atendidas = delDia.filter((c) => c.status === 'Completed').length

  return (
    <div className="min-h-screen">
      <aside
        id="navegacion-principal"
        // En pantalla ancha siempre está visible; en móvil, cerrada, queda fuera
        // del viewport y no debe seguir capturando el tabulador.
        inert={escritorio || menuAbierto ? undefined : true}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border-sand bg-sage-bg p-6 transition-transform duration-300 lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center gap-3">
          <Marca />
          <div className="min-w-0">
            <p className="font-serif text-headline-md leading-tight text-secondary">Mirai</p>
            <p className="text-body-sm text-on-surface-variant">
              {delDia.length === 0
                ? 'Hoy sin sesiones'
                : `Sesión ${Math.min(atendidas + 1, delDia.length)} de ${delDia.length} hoy`}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {RUTAS.map(({ href, etiqueta, Icono }) => {
            const activa = ruta === href || ruta.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-md px-4 py-3 transition-all duration-200 ${
                  activa
                    ? 'translate-x-1 border border-border-mist bg-secondary-fixed text-on-secondary-fixed'
                    : 'text-on-surface-variant hover:bg-surface-variant/50'
                }`}
              >
                <Icono size={18} strokeWidth={1.6} />
                <span className="text-label-md uppercase">{etiqueta}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <Link
            href="/notas/nueva"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-container px-4 py-3 text-label-md uppercase text-on-primary-container transition-colors hover:bg-primary hover:text-on-primary"
          >
            <PenLine size={16} strokeWidth={1.6} />
            Escribir una nota
          </Link>

          <div className="space-y-1 border-t border-border-sand pt-4">
            <Link
              href="/ayuda"
              className="flex items-center gap-3 rounded-md px-4 py-2 text-on-surface-variant transition-all hover:bg-surface-variant/50"
            >
              <HelpCircle size={16} strokeWidth={1.6} />
              <span className="text-label-md uppercase">Ayuda</span>
            </Link>
            <Link
              href="/bienvenida"
              className="flex items-center gap-3 rounded-md px-4 py-2 text-on-surface-variant transition-all hover:bg-surface-variant/50"
            >
              <LogOut size={16} strokeWidth={1.6} />
              <span className="text-label-md uppercase">Cerrar sesión</span>
            </Link>
          </div>
        </div>
      </aside>

      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
          className="fixed inset-0 z-30 bg-inverse-surface/20 lg:hidden"
        />
      )}

      <div className="lg:ml-64">
        <AvisoMuestra />
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border-mist bg-bg-warm/90 px-margin-mobile py-4 backdrop-blur-sm md:px-margin-desktop">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              className="text-primary lg:hidden"
              aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuAbierto}
              aria-controls="navegacion-principal"
            >
              {menuAbierto ? <X size={22} strokeWidth={1.6} /> : <Menu size={22} strokeWidth={1.6} />}
            </button>
            <span className="font-serif text-headline-md text-primary lg:hidden">Mirai</span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              onClick={alternarModoCalma}
              aria-pressed={terapeuta.modo_calma}
              className={`rounded-full px-4 py-2 text-label-md uppercase transition-colors ${
                terapeuta.modo_calma
                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
              title="Quita el color de toda la interfaz. El indicador de riesgo alto lo conserva."
            >
              <span className="hidden sm:inline">Modo </span>calma
            </button>
            <button
              type="button"
              onClick={() => setPendientesAbierto(true)}
              className="flex items-center gap-2 rounded-full border border-border-mist bg-surface-card px-4 py-2 text-on-surface-variant transition-colors hover:text-primary"
              title="Lo administrativo te espera aquí. No te interrumpe."
            >
              <BellOff size={16} strokeWidth={1.6} />
              <span className="hidden text-label-md uppercase md:inline">Pendientes</span>
            </button>
          </div>
        </header>

        <main className="mirai-entra">{children}</main>
      </div>

      <PanelPendientes abierto={pendientesAbierto} cerrar={() => setPendientesAbierto(false)} />
    </div>
  )
}

function Marca() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-mist bg-surface-card">
      <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden="true">
        <path
          d="M20 33c0-8 0-13 0-13"
          stroke="var(--color-primary-container)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M20 21c-6 0-9-4-9-9 6 0 9 4 9 9Z"
          fill="var(--color-secondary-fixed-dim)"
        />
        <path
          d="M20 21c6 0 9-4 9-9-6 0-9 4-9 9Z"
          fill="var(--color-primary-fixed-dim)"
        />
      </svg>
    </span>
  )
}
