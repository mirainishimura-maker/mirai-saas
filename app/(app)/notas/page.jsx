'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PenLine, Search } from 'lucide-react'
import { nombrePaciente, useMirai } from '@/lib/store'
import { fechaLarga, relativo } from '@/lib/fecha'
import { Avatar, ChipRiesgo, claseInput, Encabezado, Vacio } from '@/components/ui'

export default function Notas() {
  const { sesiones, pacientes } = useMirai()
  const [busqueda, setBusqueda] = useState('')
  const [pacienteId, setPacienteId] = useState('todos')

  const resultado = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return sesiones
      .filter((s) => (pacienteId === 'todos' ? true : s.patient_id === pacienteId))
      .filter((s) =>
        q
          ? s.raw_narrative.toLowerCase().includes(q) ||
            (s.tags || []).some((t) => t.includes(q))
          : true,
      )
      .sort((a, b) => b.session_date.localeCompare(a.session_date))
  }, [sesiones, busqueda, pacienteId])

  return (
    <div className="mx-auto w-full max-w-content px-margin-mobile py-10 md:px-margin-desktop">
      <Encabezado
        titulo="Notas"
        bajada="Todo lo que escribiste, en un solo hilo. Busca por una palabra que recuerdes."
        acciones={
          <Link
            href="/notas/nueva"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-label-md uppercase text-on-primary transition-colors hover:bg-primary-container"
          >
            <PenLine size={16} strokeWidth={1.6} />
            Escribir una nota
          </Link>
        }
      />

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            strokeWidth={1.6}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar dentro de las notas…"
            className={claseInput + ' pl-10'}
          />
        </div>
        <select
          value={pacienteId}
          onChange={(e) => setPacienteId(e.target.value)}
          className={claseInput + ' sm:w-64'}
        >
          <option value="todos">Todos los pacientes</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {nombrePaciente(p)}
            </option>
          ))}
        </select>
      </div>

      {resultado.length === 0 ? (
        <Vacio
          titulo={busqueda ? 'Nada coincide con esa palabra.' : 'Todavía no hay notas.'}
          texto={
            busqueda
              ? 'Prueba con una palabra que hayas usado tú al escribir, no con un término técnico.'
              : 'Cuando escribas la primera, aparecerá aquí junto a todas las demás.'
          }
        />
      ) : (
        <ol className="space-y-4">
          {resultado.map((nota) => {
            const p = pacientes.find((x) => x.id === nota.patient_id)
            return (
              <li key={nota.id}>
                <Link
                  href={`/pacientes/${nota.patient_id}`}
                  className="flex gap-5 rounded-lg border border-border-mist bg-surface-card p-6 transition-colors hover:border-border-sand"
                >
                  <Avatar paciente={p} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-serif text-headline-md leading-tight text-ink-deep">
                        {nombrePaciente(p)}
                      </span>
                      <span className="text-label-sm uppercase text-outline">
                        {fechaLarga(nota.session_date + 'T00:00:00')} · {relativo(nota.session_date)}
                      </span>
                      <ChipRiesgo nivel={nota.inferred_risk_level} compacto />
                    </div>
                    <p className="line-clamp-2 font-serif text-body-md leading-relaxed text-on-surface-variant">
                      {nota.raw_narrative}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      )}

      <p className="mt-12 pb-6 text-center text-label-sm uppercase text-outline">
        {resultado.length} {resultado.length === 1 ? 'nota' : 'notas'}
      </p>
    </div>
  )
}
