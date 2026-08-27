'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle2, DoorOpen, Leaf, PenLine, Video } from 'lucide-react'
import { citasDelDia, nombrePaciente, sesionesDe, useMirai, calcularOxigeno } from '@/lib/store'
import { fechaLarga, hoy } from '@/lib/fecha'
import { Avatar, ChipRiesgo, Encabezado, Rotulo, Tarjeta, Vacio } from '@/components/ui'

export default function Refugio() {
  const { citas, pacientes, sesiones, terapeuta, cambiarEstadoCita } = useMirai()

  const delDia = citasDelDia(citas, hoy())
  const paciente = (pid) => pacientes.find((p) => p.id === pid)
  const atendidas = delDia.filter((c) => c.status === 'Completed')
  const oxigeno = calcularOxigeno({ transacciones: [], citas, terapeuta })

  // Sesiones ya atendidas que todavía no tienen nota escrita.
  const porEscribir = atendidas.filter((c) => {
    const previas = sesionesDe(sesiones, c.patient_id)
    return !previas.some((s) => s.session_date === c.dia)
  })

  // El saludo y la fecha se resuelven después de montar. Si se leyeran durante
  // el render, el HTML generado en el build diría una hora y el navegador otra,
  // y React se quejaría de que no coinciden.
  const [momento, setMomento] = useState(null)
  useEffect(() => {
    const hora = new Date().getHours()
    const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
    setMomento(`${saludo} · ${fechaLarga(new Date())}`)
  }, [])

  return (
    <div className="mx-auto w-full max-w-content px-margin-mobile py-10 md:px-margin-desktop">
      <Encabezado
        sobretitulo={momento}
        titulo="El Refugio"
        bajada="Lo único que necesitas ver antes de la primera sesión."
      />

      <div className="grid gap-gutter lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="flex items-baseline justify-between">
            <Rotulo>Tus sesiones de hoy</Rotulo>
            {delDia.length > 0 && (
              <span className="text-label-sm uppercase text-outline">
                {atendidas.length} de {delDia.length} atendidas
              </span>
            )}
          </div>

          {delDia.length === 0 ? (
            <Vacio
              titulo="Hoy no hay sesiones."
              texto="Un día sin agenda también es parte del trabajo. Si quieres, aprovecha para cerrar notas pendientes."
            >
              <Link
                href="/notas/nueva"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-label-md uppercase text-on-primary transition-colors hover:bg-primary-container"
              >
                <PenLine size={16} strokeWidth={1.6} />
                Escribir una nota
              </Link>
            </Vacio>
          ) : (
            <ol className="space-y-2">
              {delDia.map((cita, i) => {
                const p = paciente(cita.patient_id)
                const anterior = delDia[i - 1]
                const hueco = anterior ? minutos(cita.inicio) - minutos(anterior.fin) : 0
                return (
                  <li key={cita.id}>
                    {hueco >= 90 && <EspacioDeCalma minutos={hueco} />}
                    <BloqueSesion
                      cita={cita}
                      paciente={p}
                      onAtendida={() => cambiarEstadoCita(cita.id, 'Completed')}
                    />
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <Tarjeta>
            <Rotulo>Notas por escribir</Rotulo>
            {porEscribir.length === 0 ? (
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                {atendidas.length === 0
                  ? 'Aparecerán acá cuando marques una sesión como atendida.'
                  : 'Todo lo de hoy ya está escrito. Puedes cerrar la laptop.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {porEscribir.map((c) => {
                  const p = paciente(c.patient_id)
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/notas/nueva?paciente=${c.patient_id}`}
                        className="flex items-center gap-3 rounded-md border border-border-mist px-4 py-3 transition-colors hover:bg-bg-warm"
                      >
                        <Avatar paciente={p} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-md text-on-surface">
                            {nombrePaciente(p)}
                          </span>
                          <span className="text-label-sm uppercase text-outline">
                            {c.inicio} · sin nota
                          </span>
                        </span>
                        <PenLine size={16} strokeWidth={1.6} className="text-secondary" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta className="bg-sage-bg">
            <Rotulo>Tu semana</Rotulo>
            <p className="font-serif text-display-lg leading-none text-secondary">
              {oxigeno.sesionesSemana}
            </p>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              sesiones agendadas de {oxigeno.techo} sostenibles
            </p>
            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-700"
                style={{ width: `${Math.min(100, oxigeno.carga)}%` }}
              />
            </div>
            <p className="mt-6 text-body-sm italic leading-relaxed text-on-surface-variant">
              {oxigeno.cargaTexto}
            </p>
          </Tarjeta>
        </aside>
      </div>
    </div>
  )
}

function BloqueSesion({ cita, paciente, onAtendida }) {
  const atendida = cita.status === 'Completed'
  const falta = cita.status === 'No Show'
  const Icono = cita.modalidad === 'Virtual' ? Video : DoorOpen

  return (
    <article
      className={`flex gap-6 rounded-xl border p-6 transition-all duration-500 md:gap-8 md:p-8 ${
        atendida
          ? 'border-transparent bg-surface-container-low/50 opacity-60'
          : 'border-border-mist bg-surface-card hover:border-border-sand'
      }`}
    >
      <div className="w-14 shrink-0 pt-1 text-right">
        <span className="text-label-md uppercase text-outline">{cita.inicio}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar paciente={paciente} size={40} />
            <div>
              <h3 className="font-serif text-headline-md leading-tight text-ink-deep">
                {nombrePaciente(paciente)}
              </h3>
              <p className="mt-0.5 flex items-center gap-2 text-body-sm text-on-surface-variant">
                <Icono size={14} strokeWidth={1.6} />
                <span className="italic">{cita.modalidad}</span>
                <span className="text-outline">·</span>
                <span>{paciente?.treatment_modality}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ChipRiesgo nivel={paciente?.inferred_risk_level} compacto />
            {cita.intensidad === 'Alta' && (
              <span className="rounded-full bg-tertiary-fixed-dim/25 px-3 py-1 text-label-sm uppercase text-tertiary">
                Alta demanda
              </span>
            )}
          </div>
        </div>

        {cita.foco && (
          <p className="mb-5 max-w-focus text-body-md leading-relaxed text-on-surface-variant">
            {cita.foco}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/pacientes/${cita.patient_id}`}
            className="rounded-full px-4 py-2 text-label-md uppercase text-primary transition-colors hover:bg-surface-variant/60"
          >
            Ver historia
          </Link>
          <Link
            href={`/notas/nueva?paciente=${cita.patient_id}`}
            className="rounded-full px-4 py-2 text-label-md uppercase text-primary transition-colors hover:bg-surface-variant/60"
          >
            Escribir nota
          </Link>
          {!atendida && !falta && (
            <button
              onClick={onAtendida}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-border-sand px-4 py-2 text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary"
            >
              <CheckCircle2 size={14} strokeWidth={1.6} />
              Marcar atendida
            </button>
          )}
          {atendida && (
            <span className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-label-md uppercase text-secondary">
              <CheckCircle2 size={14} strokeWidth={1.8} />
              Atendida
            </span>
          )}
          {falta && (
            <span className="ml-auto px-4 py-2 text-label-md uppercase text-outline">No asistió</span>
          )}
        </div>
      </div>
    </article>
  )
}

function EspacioDeCalma({ minutos }) {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  const texto = horas > 0 ? `${horas} h${resto ? ` ${resto} min` : ''}` : `${resto} min`
  return (
    <div className="flex items-center gap-6 py-10">
      <div className="w-14 shrink-0" />
      <div className="flex flex-1 items-center">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border-sand to-transparent" />
        <span className="flex items-center gap-3 px-6 text-label-sm uppercase italic text-outline">
          <Leaf size={16} strokeWidth={1.6} className="text-secondary" />
          Espacio de calma · {texto}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border-sand to-transparent" />
      </div>
    </div>
  )
}

function minutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
