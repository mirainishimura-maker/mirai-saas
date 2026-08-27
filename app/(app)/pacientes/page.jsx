'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CalendarClock, Search, UserPlus } from 'lucide-react'
import {
  FASES,
  nombrePaciente,
  proximaCita,
  resumenNota,
  sesionesDe,
  ultimaNota,
  useMirai,
} from '@/lib/store'
import { diaYHora, relativo } from '@/lib/fecha'
import Modal from '@/components/modal'
import {
  Avatar,
  BotonPrimario,
  BotonSuave,
  Campo,
  ChipFase,
  ChipRiesgo,
  claseInput,
  Encabezado,
} from '@/components/ui'

export default function Pacientes() {
  const { pacientes, sesiones, citas, crearPaciente } = useMirai()
  const [busqueda, setBusqueda] = useState('')
  const [fase, setFase] = useState('todas')
  const [nuevoAbierto, setNuevoAbierto] = useState(false)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return pacientes.filter((p) => {
      if (fase !== 'todas' && p.alliance_status !== fase) return false
      if (!q) return true
      const nota = ultimaNota(sesiones, p.id)
      return (
        nombrePaciente(p).toLowerCase().includes(q) ||
        (p.motivo || '').toLowerCase().includes(q) ||
        (nota?.raw_narrative || '').toLowerCase().includes(q)
      )
    })
  }, [pacientes, sesiones, busqueda, fase])

  return (
    <div className="mx-auto w-full max-w-content px-margin-mobile py-10 md:px-margin-desktop">
      <Encabezado
        titulo="Pacientes"
        bajada="Un espacio sereno para revisar las historias de quienes acompañas."
        acciones={
          <div className="relative w-full md:w-72">
            <Search
              size={18}
              strokeWidth={1.6}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar paciente por nombre o por lo escrito en sus notas"
              placeholder="Buscar nombre o nota…"
              className={claseInput + ' pl-10'}
            />
          </div>
        }
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <Filtro activo={fase === 'todas'} onClick={() => setFase('todas')}>
          Todas ({pacientes.length})
        </Filtro>
        {FASES.map((f) => {
          const n = pacientes.filter((p) => p.alliance_status === f.valor).length
          return (
            <Filtro key={f.valor} activo={fase === f.valor} onClick={() => setFase(f.valor)}>
              {f.etiqueta} ({n})
            </Filtro>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtrados.map((p) => (
          <TarjetaPaciente
            key={p.id}
            paciente={p}
            nota={ultimaNota(sesiones, p.id)}
            total={sesionesDe(sesiones, p.id).length}
            proxima={proximaCita(citas, p.id)}
          />
        ))}

        <button
          onClick={() => setNuevoAbierto(true)}
          className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-sand p-6 transition-colors hover:bg-surface-card"
        >
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
            <UserPlus size={28} strokeWidth={1.4} />
          </span>
          <span className="font-serif text-headline-md text-ink-deep">Nuevo paciente</span>
          <span className="mt-2 max-w-[220px] text-center text-body-sm text-on-surface-variant">
            Empezar una historia. Solo el nombre es obligatorio.
          </span>
        </button>
      </div>

      {filtrados.length === 0 && busqueda && (
        <p className="mt-10 text-center text-body-md italic text-outline">
          Nadie coincide con «{busqueda}».
        </p>
      )}

      <p className="mt-12 pb-6 text-center text-label-sm uppercase text-outline">
        {filtrados.length} de {pacientes.length} pacientes
      </p>

      <ModalNuevoPaciente
        abierto={nuevoAbierto}
        cerrar={() => setNuevoAbierto(false)}
        crear={crearPaciente}
      />
    </div>
  )
}

function Filtro({ activo, children, ...props }) {
  return (
    <button
      className={`rounded-full border px-4 py-2 text-label-md uppercase transition-colors ${
        activo
          ? 'border-secondary bg-secondary-fixed text-on-secondary-fixed'
          : 'border-border-sand bg-surface-card text-on-surface-variant hover:border-secondary'
      }`}
      {...props}
    >
      {children}
    </button>
  )
}

function TarjetaPaciente({ paciente, nota, total, proxima }) {
  return (
    <Link
      href={`/pacientes/${paciente.id}`}
      className="group flex h-full flex-col rounded-xl border border-border-mist bg-surface-card p-6 transition-all duration-300 hover:border-border-sand hover:shadow-sm"
    >
      <div className="mb-4 flex items-start gap-4">
        <Avatar paciente={paciente} size={52} />
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-headline-md leading-tight text-on-surface">
            {nombrePaciente(paciente)}
          </h3>
          <p className="mt-1 text-label-sm uppercase text-outline">
            {total > 0 ? `${total} ${total === 1 ? "nota" : "notas"}` : "Sin notas"} · {paciente.frecuencia}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <ChipFase valor={paciente.alliance_status} />
        <ChipRiesgo nivel={paciente.inferred_risk_level} compacto />
      </div>

      <div className="mb-6 flex-1">
        <p className="mb-2 text-label-sm uppercase text-on-surface-variant">
          {nota ? `Última nota · ${relativo(nota.session_date)}` : 'Motivo de consulta'}
        </p>
        <p className="border-l-2 border-border-mist pl-3 text-body-sm italic leading-relaxed text-ink-deep">
          {nota ? resumenNota(nota) : paciente.motivo || 'Sin registro todavía.'}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border-mist pt-4">
        <span className="flex items-center gap-1.5 text-label-sm uppercase text-outline">
          <CalendarClock size={14} strokeWidth={1.6} />
          {proxima ? diaYHora(proxima.cuando) : 'Sin próxima cita'}
        </span>
        <span className="text-label-md uppercase text-secondary transition-colors group-hover:text-primary">
          Ver historia →
        </span>
      </div>
    </Link>
  )
}

function ModalNuevoPaciente({ abierto, cerrar, crear }) {
  const router = useRouter()
  const [datos, setDatos] = useState(vacio())

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value })

  const guardar = (e) => {
    e.preventDefault()
    if (!datos.first_name.trim()) return
    const nuevo = crear(datos)
    setDatos(vacio())
    cerrar()
    router.push(`/pacientes/${nuevo.id}`)
  }

  return (
    <Modal
      abierto={abierto}
      cerrar={cerrar}
      titulo="Nuevo paciente"
      bajada="Lo demás se puede completar después, o nunca."
    >
      <form onSubmit={guardar} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo etiqueta="Nombre">
            <input
              autoFocus
              required
              value={datos.first_name}
              onChange={cambiar('first_name')}
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Apellido">
            <input value={datos.last_name} onChange={cambiar('last_name')} className={claseInput} />
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo etiqueta="WhatsApp">
            <input
              value={datos.phone_number}
              onChange={cambiar('phone_number')}
              placeholder="+51 9…"
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Correo">
            <input
              type="email"
              value={datos.email}
              onChange={cambiar('email')}
              className={claseInput}
            />
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
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

        <Campo etiqueta="Motivo de consulta" ayuda="Con tus palabras. No es un formulario clínico.">
          <textarea
            rows={3}
            value={datos.motivo}
            onChange={cambiar('motivo')}
            className={claseInput + ' resize-none'}
          />
        </Campo>

        <div className="flex justify-end gap-3 pt-2">
          <BotonSuave type="button" onClick={cerrar}>
            Cancelar
          </BotonSuave>
          <BotonPrimario type="submit" disabled={!datos.first_name.trim()}>
            Crear historia
          </BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}

function vacio() {
  return {
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    treatment_modality: 'TCC',
    frecuencia: 'Semanal',
    motivo: '',
  }
}
