'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, DoorOpen, Video } from 'lucide-react'
import { citasDelDia, nombrePaciente, useMirai, calcularOxigeno } from '@/lib/store'
import {
  DIAS_CORTOS,
  MESES,
  claveDia,
  desdeClave,
  fechaLarga,
  gridMes,
  hoy,
  inicioSemana,
  sumarDias,
} from '@/lib/fecha'
import Modal from '@/components/modal'
import {
  Avatar,
  BotonPrimario,
  BotonSuave,
  Campo,
  ChipRiesgo,
  claseInput,
  Encabezado,
  Rotulo,
  Tarjeta,
} from '@/components/ui'

export default function PaginaCalendario() {
  return (
    <Suspense fallback={<div className="px-margin-desktop py-16 text-outline">Cargando…</div>}>
      <Calendario />
    </Suspense>
  )
}

function Calendario() {
  const parametros = useSearchParams()
  const { citas, pacientes, terapeuta, cambiarEstadoCita, eliminarCita, crearCita } = useMirai()

  const [dia, setDia] = useState(() => hoy())
  const [mesVisible, setMesVisible] = useState(() => hoy())
  const [vista, setVista] = useState('dia')
  const [nuevaAbierta, setNuevaAbierta] = useState(false)
  const [pacientePrevio, setPacientePrevio] = useState('')

  useEffect(() => {
    const p = parametros.get('paciente')
    if (p) {
      setPacientePrevio(p)
      setNuevaAbierta(true)
    }
  }, [parametros])

  const oxigeno = calcularOxigeno({ transacciones: [], citas, terapeuta })
  const paciente = (pid) => pacientes.find((p) => p.id === pid)
  const delDia = citasDelDia(citas, dia)

  const semana = useMemo(() => {
    const lunes = inicioSemana(dia)
    return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
  }, [dia])

  const conteoPorDia = useMemo(() => {
    const mapa = {}
    for (const c of citas) {
      if (c.status === 'Cancelled') continue
      mapa[c.dia] = (mapa[c.dia] || 0) + 1
    }
    return mapa
  }, [citas])

  return (
    <div className="mx-auto w-full max-w-content px-margin-mobile py-10 md:px-margin-desktop">
      <Encabezado
        titulo="Calendario"
        bajada="Protegiendo tu energía clínica, no solo tus horas."
        acciones={
          <div className="flex rounded-md bg-surface-container-highest p-1">
            {[
              ['dia', 'Día'],
              ['semana', 'Semana'],
              ['mes', 'Mes'],
            ].map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() => setVista(valor)}
                className={`rounded-sm px-5 py-2 text-label-md uppercase transition-all ${
                  vista === valor
                    ? 'bg-surface-card text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-gutter lg:grid-cols-12">
        <div className="lg:col-span-8">
          {vista === 'dia' && (
            <VistaDia
              dia={dia}
              citas={delDia}
              paciente={paciente}
              onAtendida={(id) => cambiarEstadoCita(id, 'Completed')}
              onFalta={(id) => cambiarEstadoCita(id, 'No Show')}
              onEliminar={eliminarCita}
              onIrAyer={() => setDia(sumarDias(dia, -1))}
              onIrManana={() => setDia(sumarDias(dia, 1))}
              onHoy={() => setDia(hoy())}
            />
          )}

          {vista === 'semana' && (
            <VistaSemana semana={semana} citas={citas} paciente={paciente} onElegir={(d) => { setDia(d); setVista('dia') }} />
          )}

          {vista === 'mes' && (
            <VistaMes
              mes={mesVisible}
              conteo={conteoPorDia}
              seleccionado={dia}
              onElegir={(d) => {
                setDia(d)
                setVista('dia')
              }}
              onMover={(n) =>
                setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + n, 1))
              }
            />
          )}
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <Tarjeta>
            <MiniMes
              mes={mesVisible}
              conteo={conteoPorDia}
              seleccionado={dia}
              onElegir={setDia}
              onMover={(n) =>
                setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + n, 1))
              }
            />
          </Tarjeta>

          <Tarjeta className="bg-sage-bg">
            <Rotulo>Oxígeno clínico</Rotulo>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-display-lg leading-none text-secondary">
                {oxigeno.carga}%
              </span>
              <span className="text-body-sm italic text-on-surface-variant">de tu techo</span>
            </div>
            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-700"
                style={{ width: `${Math.min(100, oxigeno.carga)}%` }}
              />
            </div>
            <p className="mt-6 text-body-sm leading-relaxed italic text-on-surface-variant">
              {oxigeno.sesionesSemana} sesiones esta semana de{' '}
              {terapeuta.sesiones_semanales_sostenibles} que definiste como sostenibles.
            </p>
            <Link
              href="/oxigeno"
              className="mt-4 inline-block text-label-md uppercase text-secondary hover:text-primary"
            >
              Ver el panel completo →
            </Link>
          </Tarjeta>
        </aside>
      </div>

      <button
        onClick={() => setNuevaAbierta(true)}
        className="fixed bottom-8 right-8 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-transform hover:scale-105 md:bottom-12 md:right-12"
        aria-label="Agendar sesión"
      >
        <CalendarPlus size={22} strokeWidth={1.6} />
      </button>

      <ModalNuevaCita
        abierto={nuevaAbierta}
        cerrar={() => {
          setNuevaAbierta(false)
          setPacientePrevio('')
        }}
        pacientes={pacientes}
        pacientePrevio={pacientePrevio}
        diaPorDefecto={dia}
        crear={(datos) => {
          crearCita(datos)
          setDia(desdeClave(datos.dia))
          setVista('dia')
        }}
      />
    </div>
  )
}

function VistaDia({ dia, citas, paciente, onAtendida, onFalta, onEliminar, onIrAyer, onIrManana, onHoy }) {
  const esHoy = claveDia(dia) === claveDia(hoy())
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-headline-md text-ink-deep first-letter:uppercase">
          {esHoy ? 'Hoy · ' : ''}
          {fechaLarga(dia)}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={onIrAyer} className="p-2 text-on-surface-variant hover:text-primary" aria-label="Día anterior">
            <ChevronLeft size={18} strokeWidth={1.6} />
          </button>
          {!esHoy && (
            <button onClick={onHoy} className="px-3 text-label-md uppercase text-secondary">
              Hoy
            </button>
          )}
          <button onClick={onIrManana} className="p-2 text-on-surface-variant hover:text-primary" aria-label="Día siguiente">
            <ChevronRight size={18} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {citas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-sand px-8 py-16 text-center">
          <p className="font-serif text-headline-md text-ink-deep">Día libre.</p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            No hay nada agendado. Eso también cuenta como agenda.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {citas.map((cita) => {
            const p = paciente(cita.patient_id)
            const atendida = cita.status === 'Completed'
            const falta = cita.status === 'No Show'
            const Icono = cita.modalidad === 'Virtual' ? Video : DoorOpen
            return (
              <li
                key={cita.id}
                className={`rounded-xl border p-6 transition-all ${
                  atendida || falta
                    ? 'border-transparent bg-surface-container-low/60 opacity-70'
                    : 'border-border-mist bg-surface-card'
                }`}
              >
                <div className="flex gap-5">
                  <div className="w-14 shrink-0 text-right">
                    <p className="text-label-md uppercase text-outline">{cita.inicio}</p>
                    <p className="mt-1 text-label-sm uppercase text-outline-variant">{cita.fin}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <Avatar paciente={p} size={36} />
                      <Link
                        href={`/pacientes/${cita.patient_id}`}
                        className="font-serif text-headline-md leading-tight text-ink-deep hover:text-primary"
                      >
                        {nombrePaciente(p)}
                      </Link>
                      <ChipRiesgo nivel={p?.inferred_risk_level} compacto />
                      {cita.intensidad === 'Alta' && (
                        <span className="rounded-full bg-tertiary-fixed-dim/25 px-3 py-1 text-label-sm uppercase text-tertiary">
                          Alta demanda
                        </span>
                      )}
                    </div>
                    <p className="mb-3 flex items-center gap-2 text-body-sm text-on-surface-variant">
                      <Icono size={14} strokeWidth={1.6} />
                      <span className="italic">{cita.modalidad}</span>
                    </p>
                    {cita.foco && (
                      <p className="mb-4 max-w-focus text-body-md leading-relaxed text-on-surface-variant">
                        {cita.foco}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {!atendida && !falta && (
                        <>
                          <button
                            onClick={() => onAtendida(cita.id)}
                            className="rounded-full border border-border-sand px-4 py-2 text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary"
                          >
                            Atendida
                          </button>
                          <button
                            onClick={() => onFalta(cita.id)}
                            className="rounded-full px-4 py-2 text-label-md uppercase text-outline transition-colors hover:text-primary"
                          >
                            No asistió
                          </button>
                        </>
                      )}
                      {atendida && (
                        <span className="text-label-md uppercase text-secondary">Atendida · cobrada</span>
                      )}
                      {falta && <span className="text-label-md uppercase text-outline">No asistió</span>}
                      <button
                        onClick={() => onEliminar(cita.id)}
                        className="ml-auto text-label-sm uppercase text-outline transition-colors hover:text-alert-clinical"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function VistaSemana({ semana, citas, paciente, onElegir }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {semana.map((d) => {
        const delDia = citasDelDia(citas, d)
        const esHoy = claveDia(d) === claveDia(hoy())
        return (
          <button
            key={claveDia(d)}
            onClick={() => onElegir(d)}
            className={`flex min-h-[160px] flex-col rounded-lg border p-3 text-left transition-colors ${
              esHoy ? 'border-secondary bg-surface-card' : 'border-border-mist bg-surface-card hover:border-border-sand'
            }`}
          >
            <span className="mb-3 text-label-sm uppercase text-outline">
              {DIAS_CORTOS[d.getDay()]} {d.getDate()}
            </span>
            <span className="space-y-2">
              {delDia.map((c) => {
                const p = paciente(c.patient_id)
                return (
                  <span
                    key={c.id}
                    className={`block rounded-sm px-2 py-1.5 text-label-sm ${
                      p?.inferred_risk_level === 'High'
                        ? 'bg-error-container/40 text-alert-clinical'
                        : 'bg-secondary-fixed/40 text-on-secondary-fixed'
                    }`}
                    data-preserva-color={p?.inferred_risk_level === 'High' ? '' : undefined}
                  >
                    {c.inicio} {p?.first_name}
                  </span>
                )
              })}
              {delDia.length === 0 && (
                <span className="block text-body-sm italic text-outline-variant">libre</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function VistaMes({ mes, conteo, seleccionado, onElegir, onMover }) {
  const dias = gridMes(mes)
  return (
    <div className="rounded-lg border border-border-mist bg-surface-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-headline-md text-ink-deep first-letter:uppercase">
          {MESES[mes.getMonth()]} {mes.getFullYear()}
        </h2>
        <div className="flex gap-1">
          <button onClick={() => onMover(-1)} className="p-2 text-on-surface-variant hover:text-primary" aria-label="Mes anterior">
            <ChevronLeft size={18} strokeWidth={1.6} />
          </button>
          <button onClick={() => onMover(1)} className="p-2 text-on-surface-variant hover:text-primary" aria-label="Mes siguiente">
            <ChevronRight size={18} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2 text-center">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="text-label-sm uppercase text-outline/60">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dias.map(({ fecha, delMes }) => {
          const clave = claveDia(fecha)
          const n = conteo[clave] || 0
          const esHoy = clave === claveDia(hoy())
          const activo = clave === claveDia(seleccionado)
          return (
            <button
              key={clave}
              onClick={() => onElegir(fecha)}
              className={`flex aspect-square flex-col items-center justify-center rounded-md text-body-sm transition-colors ${
                !delMes ? 'text-outline-variant/40' : 'text-on-surface-variant'
              } ${activo ? 'bg-secondary text-on-primary' : esHoy ? 'border border-secondary' : 'hover:bg-surface-container-low'}`}
            >
              <span>{fecha.getDate()}</span>
              {n > 0 && (
                <span className="mt-1 flex gap-0.5">
                  {Array.from({ length: Math.min(n, 4) }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 w-1 rounded-full ${activo ? 'bg-on-primary' : 'bg-secondary'}`}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MiniMes({ mes, conteo, seleccionado, onElegir, onMover }) {
  const dias = gridMes(mes)
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h4 className="font-serif text-headline-md italic text-ink-deep first-letter:uppercase">
          {MESES[mes.getMonth()]}
        </h4>
        <div className="flex gap-2">
          <button onClick={() => onMover(-1)} className="text-on-surface-variant hover:text-primary" aria-label="Mes anterior">
            <ChevronLeft size={18} strokeWidth={1.6} />
          </button>
          <button onClick={() => onMover(1)} className="text-on-surface-variant hover:text-primary" aria-label="Mes siguiente">
            <ChevronRight size={18} strokeWidth={1.6} />
          </button>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-7 gap-1 text-center">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="text-label-sm uppercase text-outline/50">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {dias.map(({ fecha, delMes }) => {
          const clave = claveDia(fecha)
          const activo = clave === claveDia(seleccionado)
          const n = conteo[clave] || 0
          return (
            <button
              key={clave}
              onClick={() => onElegir(fecha)}
              className={`relative rounded-full p-2 text-body-sm transition-colors ${
                !delMes ? 'text-outline-variant/40' : 'text-on-surface-variant'
              } ${activo ? 'bg-secondary text-on-primary' : 'hover:bg-surface-container-low'}`}
            >
              {fecha.getDate()}
              {n > 0 && !activo && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-secondary" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ModalNuevaCita({ abierto, cerrar, pacientes, pacientePrevio, diaPorDefecto, crear }) {
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    if (!abierto) return
    setDatos({
      patient_id: pacientePrevio || pacientes[0]?.id || '',
      dia: claveDia(diaPorDefecto),
      inicio: '09:00',
      fin: '10:00',
      modalidad: 'Presencial',
      intensidad: 'Normal',
      foco: '',
    })
  }, [abierto, pacientePrevio, diaPorDefecto, pacientes])

  if (!datos) return null

  const cambiar = (campo) => (e) => {
    const valor = e.target.value
    setDatos((d) => {
      // Al mover la hora de inicio, la de fin la sigue manteniendo la duración.
      if (campo === 'inicio') {
        const dur = aMinutos(d.fin) - aMinutos(d.inicio)
        return { ...d, inicio: valor, fin: aHora(aMinutos(valor) + (dur > 0 ? dur : 60)) }
      }
      return { ...d, [campo]: valor }
    })
  }

  const enviar = (e) => {
    e.preventDefault()
    if (!datos.patient_id) return
    crear(datos)
    cerrar()
  }

  return (
    <Modal abierto={abierto} cerrar={cerrar} titulo="Agendar sesión">
      <form onSubmit={enviar} className="space-y-5">
        <Campo etiqueta="Paciente">
          <select value={datos.patient_id} onChange={cambiar('patient_id')} className={claseInput}>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {nombrePaciente(p)}
              </option>
            ))}
          </select>
        </Campo>

        <div className="grid gap-5 sm:grid-cols-3">
          <Campo etiqueta="Día">
            <input type="date" value={datos.dia} onChange={cambiar('dia')} className={claseInput} />
          </Campo>
          <Campo etiqueta="Inicio">
            <input type="time" value={datos.inicio} onChange={cambiar('inicio')} className={claseInput} />
          </Campo>
          <Campo etiqueta="Fin">
            <input type="time" value={datos.fin} onChange={cambiar('fin')} className={claseInput} />
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo etiqueta="Modalidad">
            <select value={datos.modalidad} onChange={cambiar('modalidad')} className={claseInput}>
              <option>Presencial</option>
              <option>Virtual</option>
            </select>
          </Campo>
          <Campo
            etiqueta="Carga de la sesión"
            ayuda="Marcar «alta» ayuda a que no se acumulen dos seguidas."
          >
            <select value={datos.intensidad} onChange={cambiar('intensidad')} className={claseInput}>
              <option>Baja</option>
              <option>Normal</option>
              <option>Alta</option>
            </select>
          </Campo>
        </div>

        <Campo etiqueta="Foco de la sesión" ayuda="Lo que quieres recordar antes de entrar.">
          <textarea
            rows={2}
            value={datos.foco}
            onChange={cambiar('foco')}
            className={claseInput + ' resize-none'}
          />
        </Campo>

        <div className="flex justify-end gap-3 pt-2">
          <BotonSuave type="button" onClick={cerrar}>
            Cancelar
          </BotonSuave>
          <BotonPrimario type="submit">Agendar</BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

function aMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function aHora(min) {
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
