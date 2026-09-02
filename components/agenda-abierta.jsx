'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, Link2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useMirai } from '@/lib/store'
import {
  actualizarServicio,
  crearServicio,
  eliminarServicio,
  generarTokenAgenda,
  listarServicios,
} from '@/lib/agenda-abierta'
import { BotonPrimario, BotonSuave, claseInput, Rotulo, Tarjeta } from '@/components/ui'

const DIAS = [
  ['1', 'Lun'], ['2', 'Mar'], ['3', 'Mié'], ['4', 'Jue'],
  ['5', 'Vie'], ['6', 'Sáb'], ['7', 'Dom'],
]
const HORAS = Array.from({ length: 16 }, (_, i) => i + 6) // 06:00 … 21:00
const DURACIONES = [30, 45, 60, 90, 120]

/**
 * La sección Premium de Ajustes: el interruptor del enlace público, el
 * horario semanal que alimenta los cupos, y el catálogo de servicios.
 */
export default function AgendaAbierta() {
  const { terapeuta, guardarAjustes, plan } = useMirai()
  const [token, setToken] = useState(terapeuta?.token_agenda || null)
  const [abierta, setAbierta] = useState(Boolean(terapeuta?.agenda_abierta))
  const [horario, setHorario] = useState(terapeuta?.horario_semanal || {})
  const [horarioSucio, setHorarioSucio] = useState(false)
  const [servicios, setServicios] = useState(null)
  const [aviso, setAviso] = useState(null) // { tipo: 'bien'|'mal', texto }
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    listarServicios().then(setServicios).catch((e) => setAviso({ tipo: 'mal', texto: e.message }))
  }, [])

  const url = useMemo(
    () => (token ? `${window.location.origin}/agendar/${token}` : null),
    [token],
  )

  const decir = (tipo, texto) => setAviso({ tipo, texto })

  const alternarAbierta = async () => {
    try {
      await guardarAjustes({ agenda_abierta: !abierta })
      setAbierta(!abierta)
      decir('bien', !abierta ? 'Enlace activo: ya recibe reservas.' : 'Enlace pausado.')
    } catch (e) {
      decir('mal', e.message)
    }
  }

  const generar = async () => {
    try {
      const t = await generarTokenAgenda()
      setToken(t)
      setCopiado(false)
      decir('bien', token
        ? 'Enlace nuevo. El anterior dejó de funcionar donde lo hayas compartido.'
        : 'Tu enlace está listo. Actívalo y compártelo.')
    } catch (e) {
      decir('mal', e.message)
    }
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
    } catch {
      decir('mal', 'No se pudo copiar. Selecciónalo y cópialo a mano.')
    }
  }

  const alternarHora = (dia, hora) => {
    const horas = new Set(horario[dia] || [])
    horas.has(hora) ? horas.delete(hora) : horas.add(hora)
    setHorario({ ...horario, [dia]: [...horas].sort((a, b) => a - b) })
    setHorarioSucio(true)
  }

  const guardarHorario = async () => {
    try {
      await guardarAjustes({ horario_semanal: horario })
      setHorarioSucio(false)
      decir('bien', 'Horario guardado. Los cupos del enlace ya lo reflejan.')
    } catch (e) {
      decir('mal', e.message)
    }
  }

  if (plan === 'base') {
    return (
      <Tarjeta>
        <Rotulo>Agenda abierta</Rotulo>
        <p className="text-body-md leading-relaxed text-on-surface-variant">
          Con Premium, tus consultantes eligen su hora desde un enlace público —
          sin chats de ida y vuelta. Las reservas te esperan acá para confirmarlas.
        </p>
      </Tarjeta>
    )
  }

  return (
    <Tarjeta>
      <Rotulo>Agenda abierta</Rotulo>

      {/* ── El enlace ── */}
      <div className="mb-8 flex flex-col gap-3">
        {token ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-border-sand bg-surface-card px-3 py-2 text-body-sm text-on-surface">
                {url}
              </code>
              <BotonSuave onClick={copiar}>
                <Copy size={14} strokeWidth={1.6} /> {copiado ? 'Copiado' : 'Copiar'}
              </BotonSuave>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={abierta} onChange={alternarAbierta} className="h-4 w-4 accent-primary" />
                <span className="text-body-md text-on-surface">
                  {abierta ? 'Recibiendo reservas' : 'Pausado (el enlace no muestra nada)'}
                </span>
              </label>
              <button
                type="button"
                onClick={generar}
                className="inline-flex items-center gap-2 text-label-sm uppercase text-outline transition-colors hover:text-primary"
              >
                <RefreshCw size={13} strokeWidth={1.6} /> Regenerar enlace
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-body-md text-on-surface-variant">
              Genera tu enlace público y compártelo donde quieras: bio, estados, tarjetas.
            </p>
            <BotonPrimario type="button" onClick={generar}>
              <Link2 size={14} strokeWidth={1.6} /> Generar mi enlace
            </BotonPrimario>
          </div>
        )}
      </div>

      {/* ── El horario ── */}
      <div className="mb-8">
        <p className="mb-3 text-label-md uppercase text-on-surface-variant">Tu horario semanal</p>
        <p className="mb-4 text-body-sm text-outline">
          Toca las horas en las que atiendes. El enlace ofrece solo estos cupos,
          menos tus citas ya tomadas.
        </p>
        <div className="overflow-x-auto">
          <table className="border-separate" style={{ borderSpacing: '3px' }}>
            <thead>
              <tr>
                <th></th>
                {DIAS.map(([, n]) => (
                  <th key={n} className="px-1 pb-1 text-label-sm uppercase text-outline">{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORAS.map((h) => (
                <tr key={h}>
                  <td className="pr-2 text-right text-body-sm tabular-nums text-outline">{String(h).padStart(2, '0')}:00</td>
                  {DIAS.map(([d]) => {
                    const on = (horario[d] || []).includes(h)
                    return (
                      <td key={d}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => alternarHora(d, h)}
                          className={`h-7 w-11 rounded-md border transition-colors ${
                            on
                              ? 'border-secondary bg-secondary-fixed'
                              : 'border-border-mist bg-surface-card hover:border-border-sand'
                          }`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {horarioSucio && (
          <div className="mt-3">
            <BotonPrimario type="button" onClick={guardarHorario}>Guardar horario</BotonPrimario>
          </div>
        )}
      </div>

      {/* ── Los servicios ── */}
      <div>
        <p className="mb-3 text-label-md uppercase text-on-surface-variant">Servicios que se pueden reservar</p>
        {servicios === null ? (
          <p className="text-body-sm italic text-outline">Cargando…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {servicios.map((s) => (
              <FilaServicio
                key={s.id}
                servicio={s}
                onCambio={(nuevo) => setServicios(servicios.map((x) => (x.id === s.id ? nuevo : x)))}
                onBorrado={() => setServicios(servicios.filter((x) => x.id !== s.id))}
                onError={(m) => decir('mal', m)}
              />
            ))}
            <NuevoServicio
              onCreado={(s) => setServicios([...servicios, s])}
              onError={(m) => decir('mal', m)}
            />
          </div>
        )}
      </div>

      {aviso && (
        <p
          role={aviso.tipo === 'mal' ? 'alert' : 'status'}
          className={`mt-4 text-body-sm ${aviso.tipo === 'mal' ? 'text-alert-clinical' : 'italic text-secondary'}`}
        >
          {aviso.texto}
        </p>
      )}
    </Tarjeta>
  )
}

function FilaServicio({ servicio, onCambio, onBorrado, onError }) {
  const alternar = async (campo) => {
    try {
      onCambio(await actualizarServicio(servicio.id, { [campo]: !servicio[campo] }))
    } catch (e) {
      onError(e.message)
    }
  }
  const borrar = async () => {
    try {
      await eliminarServicio(servicio.id)
      onBorrado()
    } catch (e) {
      onError('No se pudo eliminar (¿tiene reservas?). Puedes desactivarlo.')
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-sand bg-surface-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <span className={`text-body-md ${servicio.activo ? 'text-on-surface' : 'text-outline line-through'}`}>
          {servicio.nombre}
        </span>
        <span className="ml-3 text-body-sm tabular-nums text-on-surface-variant">
          S/{Number(servicio.precio).toFixed(0)} · {servicio.duracion_min} min
        </span>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-body-sm text-on-surface-variant">
        <input
          type="checkbox"
          checked={servicio.reservable_web && servicio.activo}
          onChange={() => alternar(servicio.activo ? 'reservable_web' : 'activo')}
          className="h-3.5 w-3.5 accent-primary"
        />
        en el enlace
      </label>
      <button type="button" onClick={borrar} aria-label={`Eliminar ${servicio.nombre}`} className="text-outline transition-colors hover:text-alert-clinical">
        <Trash2 size={15} strokeWidth={1.6} />
      </button>
    </div>
  )
}

function NuevoServicio({ onCreado, onError }) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [duracion, setDuracion] = useState(60)
  const [guardando, setGuardando] = useState(false)

  const crear = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const s = await crearServicio({
        nombre: nombre.trim(),
        precio: Number(precio) || 0,
        duracion_min: duracion,
      })
      onCreado(s)
      setNombre(''); setPrecio(''); setDuracion(60); setAbierto(false)
    } catch (e2) {
      onError(e2.message)
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-2 self-start text-label-sm uppercase text-secondary transition-colors hover:text-primary"
      >
        <Plus size={14} strokeWidth={1.8} /> Agregar servicio
      </button>
    )
  }

  return (
    <form onSubmit={crear} className="flex flex-wrap items-end gap-3 rounded-lg border border-border-mist bg-surface-container-low p-4">
      <label className="block min-w-48 flex-1">
        <span className="mb-1 block text-label-sm uppercase text-on-surface-variant">Nombre</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Primera consulta" className={claseInput} />
      </label>
      <label className="block w-28">
        <span className="mb-1 block text-label-sm uppercase text-on-surface-variant">Precio S/</span>
        <input type="number" min="0" step="1" value={precio} onChange={(e) => setPrecio(e.target.value)} required className={claseInput} />
      </label>
      <label className="block w-32">
        <span className="mb-1 block text-label-sm uppercase text-on-surface-variant">Duración</span>
        <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} className={claseInput}>
          {DURACIONES.map((d) => <option key={d} value={d}>{d} min</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <BotonPrimario type="submit" disabled={guardando}>{guardando ? '…' : 'Crear'}</BotonPrimario>
        <BotonSuave type="button" onClick={() => setAbierto(false)}>Cancelar</BotonSuave>
      </div>
    </form>
  )
}
