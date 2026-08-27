'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { ArrowLeft, CalendarPlus, Check, Circle, PenLine, Trash2 } from 'lucide-react'
import {
  FASES,
  faseDe,
  nombrePaciente,
  proximaCita,
  sesionesDe,
  useMirai,
} from '@/lib/store'
import { desdeClave, diaYHora, fechaLarga, relativo } from '@/lib/fecha'
import MapaAlianza from '@/components/mapa-alianza'
import {
  Avatar,
  BotonPrimario,
  BotonSuave,
  Campo,
  ChipRiesgo,
  claseInput,
  Rotulo,
  Tarjeta,
  Vacio,
} from '@/components/ui'

export default function PaginaPaciente() {
  return (
    <Suspense fallback={<div className="px-margin-desktop py-16 text-outline">Cargando…</div>}>
      <PerfilPaciente />
    </Suspense>
  )
}

function PerfilPaciente() {
  const { id } = useParams()
  const router = useRouter()
  const {
    pacientes,
    sesiones,
    citas,
    mapas,
    actualizarPaciente,
    archivarPaciente,
    eliminarNota,
    guardarMapa,
  } = useMirai()
  const parametros = useSearchParams()
  const [pestana, setPestana] = useState(parametros.get('vista') || 'historia')

  const paciente = pacientes.find((p) => p.id === id)

  if (!paciente) {
    return (
      <div className="mx-auto w-full max-w-content px-margin-mobile py-16 md:px-margin-desktop">
        <Vacio
          titulo="Esta historia ya no existe."
          texto="Es posible que la hayas eliminado desde otro momento."
        >
          <Link
            href="/pacientes"
            className="rounded-md bg-primary px-6 py-3 text-label-md uppercase text-on-primary"
          >
            Volver al directorio
          </Link>
        </Vacio>
      </div>
    )
  }

  const historia = sesionesDe(sesiones, paciente.id)
  const proxima = proximaCita(citas, paciente.id)
  const mapa = mapas[paciente.id] || { nodes: [], links: [] }

  return (
    <div className="mx-auto w-full max-w-content px-margin-mobile py-10 md:px-margin-desktop">
      <Link
        href="/pacientes"
        className="mb-8 inline-flex items-center gap-2 text-label-md uppercase text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft size={14} strokeWidth={1.8} />
        Pacientes
      </Link>

      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-5">
          <Avatar paciente={paciente} size={64} />
          <div>
            <h1 className="font-serif text-headline-lg text-ink-deep md:text-display-lg">
              {nombrePaciente(paciente)}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-md text-on-surface-variant">
              <span>{paciente.treatment_modality}</span>
              <span className="text-outline">·</span>
              <span>{paciente.frecuencia}</span>
              <span className="text-outline">·</span>
              <span>
                {historia.length} {historia.length === 1 ? 'sesión escrita' : 'sesiones escritas'}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ChipRiesgo nivel={paciente.inferred_risk_level} />
              {proxima && (
                <span className="text-label-md uppercase text-outline">
                  Próxima: {diaYHora(proxima.cuando)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/notas/nueva?paciente=${paciente.id}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-label-md uppercase text-on-primary transition-colors hover:bg-primary-container"
          >
            <PenLine size={16} strokeWidth={1.6} />
            Escribir nota
          </Link>
          <Link
            href={`/calendario?paciente=${paciente.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-border-sand bg-surface-card px-5 py-3 text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-primary"
          >
            <CalendarPlus size={16} strokeWidth={1.6} />
            Agendar
          </Link>
        </div>
      </header>

      <nav className="mb-8 flex gap-1 border-b border-border-mist" role="tablist">
        {[
          ['historia', 'Historia'],
          ['mapa', 'Mapa de alianza'],
          ['ficha', 'Ficha'],
        ].map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={pestana === valor}
            onClick={() => setPestana(valor)}
            className={`-mb-px border-b-2 px-5 py-3 text-label-md uppercase transition-colors ${
              pestana === valor
                ? 'border-secondary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-primary'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </nav>

      {pestana === 'historia' && (
        <div className="grid gap-gutter lg:grid-cols-12">
          <div className="lg:col-span-8">
            {historia.length === 0 ? (
              <Vacio
                titulo="Todavía no hay notas."
                texto="La primera nota suele escribirse después de la sesión, no durante."
              >
                <Link
                  href={`/notas/nueva?paciente=${paciente.id}`}
                  className="rounded-md bg-primary px-6 py-3 text-label-md uppercase text-on-primary"
                >
                  Escribir la primera
                </Link>
              </Vacio>
            ) : (
              <ol className="space-y-6">
                {historia.map((nota, i) => (
                  <NotaHistoria
                    key={nota.id}
                    nota={nota}
                    numero={historia.length - i}
                    onEliminar={() => eliminarNota(nota.id)}
                  />
                ))}
              </ol>
            )}
          </div>
          <aside className="lg:col-span-4">
            <LineaDeFases
              actual={paciente.alliance_status}
              onCambiar={(valor) => actualizarPaciente(paciente.id, { alliance_status: valor })}
            />
          </aside>
        </div>
      )}

      {pestana === 'mapa' && (
        <div className="grid gap-gutter lg:grid-cols-12">
          <div className="lg:col-span-8">
            <MapaAlianza mapa={mapa} onCambio={(m) => guardarMapa(paciente.id, m)} />
          </div>
          <aside className="lg:col-span-4">
            <LineaDeFases
              actual={paciente.alliance_status}
              onCambiar={(valor) => actualizarPaciente(paciente.id, { alliance_status: valor })}
            />
          </aside>
        </div>
      )}

      {pestana === 'ficha' && (
        <Ficha
          paciente={paciente}
          onGuardar={(cambios) => actualizarPaciente(paciente.id, cambios)}
          onEliminar={() => {
            archivarPaciente(paciente.id)
            router.push('/pacientes')
          }}
        />
      )}
    </div>
  )
}

function NotaHistoria({ nota, numero, onEliminar }) {
  const [abierta, setAbierta] = useState(numero === 1)
  const parrafos = nota.raw_narrative.split('\n').filter(Boolean)

  return (
    <li className="rounded-lg border border-border-mist bg-surface-card p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border-mist pb-4">
        <div>
          <p className="text-label-sm uppercase text-outline">
            Sesión {numero} · {fechaLarga(desdeClave(nota.session_date))} · {relativo(nota.session_date)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-label-md uppercase text-on-surface-variant">
              {nota.treatment_modality}
            </span>
            <ChipRiesgo nivel={nota.inferred_risk_level} compacto />
          </p>
        </div>
        <button
          onClick={onEliminar}
          className="text-outline transition-colors hover:text-alert-clinical"
          title="Eliminar nota"
        >
          <Trash2 size={16} strokeWidth={1.6} />
        </button>
      </div>

      <div
        className={`space-y-4 font-serif text-body-lg leading-relaxed text-ink-deep ${
          abierta ? '' : 'line-clamp-3'
        }`}
      >
        {parrafos.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {parrafos.length > 1 && (
        <button
          onClick={() => setAbierta((v) => !v)}
          className="mt-4 text-label-md uppercase text-secondary hover:text-primary"
        >
          {abierta ? 'Plegar' : 'Leer completa'}
        </button>
      )}

      {nota.tags?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border-mist pt-4">
          {nota.tags.map((t) => (
            <span
              key={t}
              className="rounded-sm bg-surface-variant px-2 py-1 text-label-sm uppercase text-on-surface-variant"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </li>
  )
}

function LineaDeFases({ actual, onCambiar }) {
  const indiceActual = FASES.findIndex((f) => f.valor === actual)

  return (
    <Tarjeta className="bg-surface-container-low">
      <Rotulo>Fases de la alianza</Rotulo>
      <ol className="relative space-y-8 pt-2">
        <span className="absolute left-[22px] top-4 bottom-4 w-px bg-border-sand" aria-hidden="true" />
        {FASES.map((fase, i) => {
          const cumplida = i < indiceActual
          const esActual = i === indiceActual
          return (
            <li key={fase.valor} className="relative flex items-start gap-4">
              <button
                onClick={() => onCambiar(fase.valor)}
                title={`Marcar como ${fase.etiqueta.toLowerCase()}`}
                className={`z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-surface-container-low transition-colors ${
                  cumplida
                    ? 'bg-secondary-fixed text-secondary'
                    : esActual
                      ? 'bg-primary-fixed-dim text-primary'
                      : 'bg-surface-variant text-outline hover:bg-secondary-fixed/50'
                }`}
              >
                {cumplida ? (
                  <Check size={16} strokeWidth={2} />
                ) : esActual ? (
                  <span className="h-3.5 w-3.5 rounded-full bg-primary" />
                ) : (
                  <Circle size={14} strokeWidth={1.6} />
                )}
              </button>
              <div className={`pt-1 ${cumplida ? 'opacity-60' : esActual ? '' : 'opacity-45'}`}>
                <p
                  className={`text-label-sm uppercase ${esActual ? 'text-primary' : 'text-outline'}`}
                >
                  Fase {i + 1}
                  {esActual ? ' · actual' : ''}
                </p>
                <p className="mt-1 font-serif text-body-lg leading-tight text-on-surface">
                  {fase.etiqueta}
                </p>
                <p className="mt-1 text-body-sm text-on-surface-variant">{fase.descripcion}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </Tarjeta>
  )
}

function Ficha({ paciente, onGuardar, onEliminar }) {
  const [datos, setDatos] = useState(paciente)
  const [guardado, setGuardado] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  const cambiar = (campo) => (e) => {
    setDatos({ ...datos, [campo]: e.target.value })
    setGuardado(false)
  }

  const enviar = (e) => {
    e.preventDefault()
    onGuardar(datos)
    setGuardado(true)
  }

  return (
    <form onSubmit={enviar} className="max-w-2xl space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Nombre">
          <input value={datos.first_name} onChange={cambiar('first_name')} className={claseInput} />
        </Campo>
        <Campo etiqueta="Apellido">
          <input value={datos.last_name} onChange={cambiar('last_name')} className={claseInput} />
        </Campo>
        <Campo etiqueta="WhatsApp">
          <input
            value={datos.phone_number || ''}
            onChange={cambiar('phone_number')}
            className={claseInput}
          />
        </Campo>
        <Campo etiqueta="Correo">
          <input value={datos.email || ''} onChange={cambiar('email')} className={claseInput} />
        </Campo>
        <Campo etiqueta="Enfoque">
          <select
            value={datos.treatment_modality}
            onChange={cambiar('treatment_modality')}
            className={claseInput}
          >
            <option>TCC</option>
            <option>EMDR</option>
            <option>Sistémica</option>
            <option>Humanista</option>
            <option>Otro</option>
          </select>
        </Campo>
        <Campo etiqueta="Frecuencia">
          <select value={datos.frecuencia} onChange={cambiar('frecuencia')} className={claseInput}>
            <option>Semanal</option>
            <option>Quincenal</option>
            <option>Mensual</option>
            <option>A demanda</option>
          </select>
        </Campo>
      </div>

      <Campo etiqueta="Motivo de consulta">
        <textarea
          rows={3}
          value={datos.motivo || ''}
          onChange={cambiar('motivo')}
          className={claseInput + ' resize-none'}
        />
      </Campo>

      <Campo
        etiqueta="Notas de contacto"
        ayuda="Horarios, preferencias, acuerdos. Nada clínico: eso va en las notas de sesión."
      >
        <textarea
          rows={3}
          value={datos.notes || ''}
          onChange={cambiar('notes')}
          className={claseInput + ' resize-none'}
        />
      </Campo>

      <Campo
        etiqueta="Nivel de riesgo"
        ayuda="Marcar riesgo alto hace que este paciente destaque en toda la interfaz, incluso en modo calma."
      >
        <select
          value={datos.inferred_risk_level}
          onChange={cambiar('inferred_risk_level')}
          className={claseInput}
        >
          <option value="Low">Sin indicadores de riesgo</option>
          <option value="Medium">Vigilancia</option>
          <option value="High">Riesgo alto</option>
        </select>
      </Campo>

      <div className="flex flex-wrap items-center gap-3 border-t border-border-mist pt-6">
        <BotonPrimario type="submit">Guardar ficha</BotonPrimario>
        {guardado && <span className="text-body-sm italic text-secondary">Guardado.</span>}

        <span className="ml-auto">
          {confirmar ? (
            <span className="flex items-center gap-3">
              <span className="text-body-sm text-alert-clinical">
                Se borra la historia completa.
              </span>
              <button
                type="button"
                onClick={onEliminar}
                className="rounded-md bg-alert-clinical px-4 py-2 text-label-md uppercase text-on-error"
              >
                Sí, eliminar
              </button>
              <BotonSuave type="button" onClick={() => setConfirmar(false)}>
                No
              </BotonSuave>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmar(true)}
              className="inline-flex items-center gap-2 text-label-md uppercase text-outline transition-colors hover:text-alert-clinical"
            >
              <Trash2 size={14} strokeWidth={1.6} />
              Eliminar paciente
            </button>
          )}
        </span>
      </div>
    </form>
  )
}
