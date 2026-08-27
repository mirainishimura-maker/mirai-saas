'use client'

import { TriangleAlert } from 'lucide-react'
import { faseDe, iniciales } from '@/lib/store'

export function Avatar({ paciente, size = 44 }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-border-mist bg-surface-container-low font-serif text-secondary"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {iniciales(paciente)}
    </span>
  )
}

export function ChipFase({ valor }) {
  const fase = faseDe(valor)
  const tono =
    valor === 'Alta'
      ? 'bg-secondary-container/50 text-on-secondary-container border-secondary-container/40'
      : valor === 'Rapport'
        ? 'bg-surface-variant text-on-surface-variant border-border-mist'
        : 'bg-secondary-fixed/40 text-on-secondary-container border-secondary-fixed'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-label-sm uppercase ${tono}`}
      title={fase.descripcion}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {fase.etiqueta}
    </span>
  )
}

/** Único elemento de la interfaz al que se le permite gritar. */
export function ChipRiesgo({ nivel, compacto = false }) {
  if (nivel !== 'High') return null
  return (
    <span
      data-preserva-color
      className={`inline-flex items-center gap-1.5 rounded-sm border border-error-container bg-error-container/40 text-alert-clinical ${
        compacto ? 'px-2 py-0.5 text-label-sm' : 'px-2.5 py-1 text-label-md'
      } uppercase`}
    >
      <TriangleAlert size={compacto ? 12 : 14} strokeWidth={2} />
      Riesgo alto
    </span>
  )
}

export function ChipModalidad({ valor }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-border-mist bg-surface-variant px-2 py-1 text-label-sm uppercase text-on-surface-variant">
      {valor}
    </span>
  )
}

export function Encabezado({ sobretitulo, titulo, bajada, acciones }) {
  return (
    <header className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        {sobretitulo && (
          <p className="mb-2 text-label-sm uppercase text-outline">{sobretitulo}</p>
        )}
        <h1 className="font-serif text-headline-lg text-ink-deep md:text-display-lg">{titulo}</h1>
        {bajada && (
          <p className="mt-2 max-w-xl text-body-lg text-on-surface-variant">{bajada}</p>
        )}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-3">{acciones}</div>}
    </header>
  )
}

export function Tarjeta({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-lg border border-border-mist bg-surface-card p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function Rotulo({ children }) {
  return <h3 className="mb-4 text-label-sm uppercase text-on-surface-variant">{children}</h3>
}

export function BotonPrimario({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-label-md uppercase text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:bg-surface-variant disabled:text-outline ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function BotonSuave({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md border border-border-sand bg-surface-card px-5 py-2.5 text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-primary disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Campo({ etiqueta, ayuda, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-label-md uppercase text-on-surface-variant">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-2 block text-body-sm text-outline">{ayuda}</span>}
    </label>
  )
}

export const claseInput =
  'w-full rounded-md border border-border-sand bg-surface-card px-4 py-3 text-body-md text-on-surface placeholder:text-outline-variant focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary'

export function Vacio({ titulo, texto, children }) {
  return (
    <div className="rounded-lg border border-dashed border-border-sand px-8 py-16 text-center">
      <p className="font-serif text-headline-md text-ink-deep">{titulo}</p>
      {texto && <p className="mx-auto mt-3 max-w-md text-body-md text-on-surface-variant">{texto}</p>}
      {children && <div className="mt-6 flex justify-center">{children}</div>}
    </div>
  )
}
