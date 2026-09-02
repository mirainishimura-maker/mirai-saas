'use client'

import { useEffect, useMemo, useState } from 'react'
import { hayNube, supabase } from '@/lib/supabase/navegador'

/**
 * La página pública del enlace: tres pasos — sesión, horario, tus datos.
 * Habla solo con las tres funciones públicas; el token es la única llave.
 * Es una PRE-reserva: nadie paga nada acá, y nada entra a la agenda
 * clínica hasta que el consultorio la confirma.
 */
export default function AgendarCliente({ token }) {
  const [agenda, setAgenda] = useState(undefined) // undefined=cargando · null=enlace no activo
  const [servicio, setServicio] = useState(null)
  const [slots, setSlots] = useState(null)
  const [slot, setSlot] = useState(null)
  const [datos, setDatos] = useState({ nombre: '', telefono: '', correo: '', motivo: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!hayNube) { setAgenda(null); return }
    supabase().rpc('agenda_publica', { p_token: token })
      .then(({ data, error: e }) => setAgenda(e ? null : data))
  }, [token])

  const elegirServicio = async (s) => {
    setServicio(s)
    setSlot(null)
    setSlots(null)
    setError(null)
    const { data, error: e } = await supabase().rpc('slots_publicos', {
      p_token: token,
      p_servicio: s.id,
    })
    if (e) { setError('No se pudieron cargar los horarios. Recarga la página.'); return }
    setSlots(data || [])
  }

  const enviar = async (e) => {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const { data, error: fallo } = await supabase().rpc('reservar_web', {
        p_token: token,
        p_servicio: servicio.id,
        p_inicio: slot,
        p_nombre: datos.nombre,
        p_telefono: datos.telefono,
        p_correo: datos.correo,
        p_motivo: datos.motivo,
      })
      if (fallo) throw fallo
      if (data?.ok) {
        setListo(true)
      } else if (data?.motivo === 'ocupado') {
        setError('Justo tomaron ese horario. Elige otro, por favor.')
        setSlot(null)
        elegirServicio(servicio) // recargar cupos
      } else if (data?.motivo === 'datos') {
        setError('Revisa tu nombre y tu número de WhatsApp.')
      } else {
        setError('El enlace ya no está activo. Escríbele directamente al consultorio.')
      }
    } catch {
      setError('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="px-margin-mobile py-7 md:px-margin-desktop">
        <span className="font-serif text-headline-md tracking-tight text-primary">Notaluma</span>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-margin-mobile pb-20 md:px-margin-desktop">
        {agenda === undefined && (
          <p className="font-serif text-body-lg italic text-outline">Abriendo la agenda…</p>
        )}

        {agenda === null && (
          <>
            <h1 className="mb-3 font-serif text-headline-lg text-ink-deep">Este enlace no está activo</h1>
            <p className="text-body-md leading-relaxed text-on-surface-variant">
              Puede que se haya renovado o esté en pausa. Pide el enlace vigente a tu
              consultorio, o escríbele directamente.
            </p>
          </>
        )}

        {listo && (
          <>
            <h1 className="mb-3 font-serif text-headline-lg text-ink-deep">Tu hora quedó apartada</h1>
            <p className="mb-6 text-body-md leading-relaxed text-on-surface-variant">
              <strong className="text-on-surface">{datos.nombre.trim()}</strong>, apartaste{' '}
              <strong className="text-on-surface">{servicio.nombre}</strong> para el{' '}
              <strong className="text-on-surface">{etiquetaSlot(slot)}</strong>.
            </p>
            <ol className="mb-8 flex flex-col gap-3 text-body-md text-on-surface-variant">
              <li className="flex gap-3"><Numero n={1} /> Te escriben por WhatsApp para confirmar.</li>
              <li className="flex gap-3"><Numero n={2} /> Recibes los medios de pago y las indicaciones.</li>
              <li className="flex gap-3"><Numero n={3} /> Con eso, tu hora queda confirmada.</li>
            </ol>
            <p className="text-body-sm italic text-outline">
              Es una pre-reserva: todavía no pagas nada.
            </p>
          </>
        )}

        {agenda && !listo && (
          <>
            <h1 className="mb-2 font-serif text-headline-lg text-ink-deep">Aparta tu hora</h1>
            <p className="mb-8 text-body-md text-on-surface-variant">
              con {agenda.nombre || 'tu consultorio'}
            </p>

            {/* Paso 1 · la sesión */}
            <Paso n={1} titulo="Qué tipo de sesión" activo>
              <div className="flex flex-col gap-2">
                {agenda.servicios.length === 0 && (
                  <p className="text-body-sm italic text-outline">
                    No hay sesiones disponibles por ahora.
                  </p>
                )}
                {agenda.servicios.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => elegirServicio(s)}
                    className={`flex items-baseline justify-between gap-4 rounded-xl border px-5 py-4 text-left transition-colors ${
                      servicio?.id === s.id
                        ? 'border-secondary bg-secondary-fixed/40'
                        : 'border-border-sand bg-surface-card hover:border-secondary/60'
                    }`}
                  >
                    <span>
                      <span className="block text-body-md font-medium text-on-surface">{s.nombre}</span>
                      {s.descripcion && (
                        <span className="block text-body-sm text-on-surface-variant">{s.descripcion}</span>
                      )}
                    </span>
                    <span className="whitespace-nowrap text-body-sm tabular-nums text-on-surface-variant">
                      S/{Number(s.precio).toFixed(0)} · {s.duracion_min} min
                    </span>
                  </button>
                ))}
              </div>
            </Paso>

            {/* Paso 2 · el horario */}
            {servicio && (
              <Paso n={2} titulo="Elige tu horario" activo>
                {slots === null && <p className="text-body-sm italic text-outline">Buscando cupos…</p>}
                {slots?.length === 0 && (
                  <p className="text-body-sm text-on-surface-variant">
                    No hay cupos en los próximos 14 días. Escríbele al consultorio para coordinar.
                  </p>
                )}
                {slots?.length > 0 && (
                  <div className="flex flex-col gap-4">
                    {agrupar(slots).map(([dia, lista]) => (
                      <div key={dia}>
                        <p className="mb-2 text-label-sm uppercase text-on-surface-variant">{dia}</p>
                        <div className="flex flex-wrap gap-2">
                          {lista.map((s) => (
                            <button
                              key={s.iso}
                              type="button"
                              onClick={() => setSlot(s.iso)}
                              className={`rounded-full border px-4 py-2 text-body-sm tabular-nums transition-colors ${
                                slot === s.iso
                                  ? 'border-secondary bg-secondary-fixed text-on-secondary-fixed'
                                  : 'border-border-sand bg-surface-card text-on-surface hover:border-secondary/60'
                              }`}
                            >
                              {s.hora}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Paso>
            )}

            {/* Paso 3 · tus datos */}
            {servicio && slot && (
              <Paso n={3} titulo="Tus datos" activo>
                <form onSubmit={enviar} className="flex flex-col gap-4">
                  <Campo etiqueta="Tu nombre" requerido>
                    <input value={datos.nombre} onChange={cambiar(setDatos, datos, 'nombre')} required minLength={2} autoComplete="name" className={entrada} />
                  </Campo>
                  <Campo etiqueta="Tu WhatsApp" requerido>
                    <input value={datos.telefono} onChange={cambiar(setDatos, datos, 'telefono')} required inputMode="tel" autoComplete="tel" placeholder="9__ ___ ___" className={entrada} />
                  </Campo>
                  <Campo etiqueta="Correo (opcional)">
                    <input type="email" value={datos.correo} onChange={cambiar(setDatos, datos, 'correo')} autoComplete="email" className={entrada} />
                  </Campo>
                  <Campo etiqueta="¿Qué te gustaría trabajar? (opcional)">
                    <textarea value={datos.motivo} onChange={cambiar(setDatos, datos, 'motivo')} rows={3} className={entrada} />
                  </Campo>

                  {error && (
                    <p role="alert" className="rounded-md bg-error-container/40 p-3 text-body-sm text-alert-clinical">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={enviando}
                    className="rounded-full bg-primary py-4 text-label-md uppercase text-on-primary transition-colors hover:bg-primary-container disabled:bg-surface-variant disabled:text-outline"
                  >
                    {enviando ? 'Un momento…' : 'Apartar mi hora'}
                  </button>
                  <p className="text-center text-body-sm italic text-outline">
                    Pre-reserva sin pago. Te confirman por WhatsApp.
                  </p>
                </form>
              </Paso>
            )}
          </>
        )}
      </main>
    </div>
  )
}

/* ── piecitas ── */

const entrada =
  'w-full rounded-md border border-border-sand bg-surface-card px-4 py-3 text-body-md text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary'

const cambiar = (set, datos, campo) => (e) => set({ ...datos, [campo]: e.target.value })

function Paso({ n, titulo, activo, children }) {
  return (
    <section className={`mb-8 ${activo ? '' : 'opacity-50'}`}>
      <h2 className="mb-3 flex items-center gap-3 font-serif text-headline-sm text-ink-deep">
        <Numero n={n} /> {titulo}
      </h2>
      {children}
    </section>
  )
}

function Numero({ n }) {
  return (
    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-secondary-fixed text-body-sm font-semibold text-on-secondary-fixed">
      {n}
    </span>
  )
}

function etiquetaSlot(iso) {
  const f = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  return f.format(new Date(iso))
}

function agrupar(slots) {
  const fDia = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long',
  })
  const fHora = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const mapa = new Map()
  for (const iso of slots) {
    const d = new Date(iso)
    const dia = fDia.format(d)
    if (!mapa.has(dia)) mapa.set(dia, [])
    mapa.get(dia).push({ iso, hora: fHora.format(d) })
  }
  return [...mapa.entries()]
}
