'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { nombrePaciente, useMirai } from '@/lib/store'
import { fechaLarga } from '@/lib/fecha'

const PLANTILLAS = {
  TCC: [
    'Datos brutos: pensamientos, emociones, conductas',
    'Hipótesis y conceptualización',
    'Plan para la próxima sesión',
  ],
  EMDR: [
    'Diana de la sesión',
    'Cognición negativa / cognición positiva',
    'Procesamiento y cierre',
  ],
  Sistémica: [
    'Quiénes estuvieron y cómo llegaron',
    'Patrón relacional observado',
    'Hipótesis sistémica y tarea',
  ],
  Humanista: ['Lo que trajo hoy', 'Lo que apareció en la sesión', 'Lo que queda abierto'],
}

const PREGUNTAS = [
  '¿Esta nota le sirve a quien la lea en seis meses, incluida tú?',
  '¿Escribiste lo que observaste o lo que interpretaste? ¿Se distingue?',
  '¿Hay algo aquí que no querrías que el paciente leyera? ¿Por qué está escrito así?',
  '¿Queda registrado lo que decidiste hacer, y no solo lo que pasó?',
]

export default function PaginaNota() {
  return (
    <Suspense fallback={<div className="px-margin-desktop py-16 text-outline">Abriendo el lienzo…</div>}>
      <LienzoDeEnfoque />
    </Suspense>
  )
}

function LienzoDeEnfoque() {
  const router = useRouter()
  const parametros = useSearchParams()
  const { pacientes, terapeuta, guardarNota } = useMirai()

  const [pacienteId, setPacienteId] = useState(parametros.get('paciente') || '')
  const [texto, setTexto] = useState('')
  const [etiquetas, setEtiquetas] = useState('')
  const [riesgo, setRiesgo] = useState('Low')
  const [fase, setFase] = useState('escribiendo') // escribiendo | pausa | guardada
  const [progreso, setProgreso] = useState(0)
  const areaRef = useRef(null)

  const paciente = pacientes.find((p) => p.id === pacienteId)
  const modalidad = paciente?.treatment_modality || 'TCC'
  const pregunta = useMemo(() => PREGUNTAS[texto.length % PREGUNTAS.length], [texto.length])
  const palabras = texto.trim() ? texto.trim().split(/\s+/).length : 0

  // Al cambiar de paciente el riesgo se recalcula en los dos sentidos: si solo
  // subiera, una nota de alguien sin indicadores heredaría el riesgo alto del
  // paciente anterior.
  useEffect(() => {
    const elegido = pacientes.find((p) => p.id === pacienteId)
    setRiesgo(elegido?.inferred_risk_level === 'High' ? 'High' : 'Low')
  }, [pacienteId, pacientes])

  // Lo que se guardará, congelado en el momento en que empieza la pausa. Se
  // escribe desde un manejador, nunca durante el render: React puede descartar
  // un render y dejar en la ref algo que nunca llegó a pantalla.
  const congelado = useRef(null)

  const confirmar = useCallback(
    (datos) => {
      const b = datos || congelado.current
      if (!b || !b.pacienteId || !b.texto.trim()) return
      const nota = guardarNota({
        patient_id: b.pacienteId,
        raw_narrative: b.texto.trim(),
        treatment_modality: b.modalidad,
        inferred_risk_level: b.riesgo,
        tags: b.etiquetas
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      })
      setFase('guardada')
      setTimeout(() => router.push(`/pacientes/${nota.patient_id}`), 900)
    },
    [guardarNota, router],
  )

  // La fricción reflexiva: dos segundos entre decidir guardar y guardar.
  // No es una animación de carga — es el tiempo de releer lo que escribiste.
  useEffect(() => {
    if (fase !== 'pausa') return
    const inicio = Date.now()
    const tic = setInterval(() => {
      const t = Math.min(1, (Date.now() - inicio) / 2000)
      setProgreso(t)
      if (t >= 1) {
        clearInterval(tic)
        confirmar()
      }
    }, 40)
    return () => clearInterval(tic)
  }, [fase, confirmar])

  const iniciarGuardado = () => {
    if (!pacienteId || !texto.trim()) return
    const datos = { pacienteId, texto, modalidad, riesgo, etiquetas }
    if (!terapeuta.friccion_reflexiva) {
      confirmar(datos)
      return
    }
    // Durante la pausa la nota queda tal como está y los campos se bloquean:
    // esos dos segundos son para releer, no para seguir editando. Así lo que se
    // guarda es exactamente lo que estás viendo en pantalla.
    congelado.current = datos
    setProgreso(0)
    setFase('pausa')
  }

  const cancelarPausa = () => {
    congelado.current = null
    setFase('escribiendo')
    setProgreso(0)
    areaRef.current?.focus()
  }

  const enPausa = fase === 'pausa'
  const bloqueado = enPausa || fase === 'guardada'

  const insertarPlantilla = () => {
    const secciones = PLANTILLAS[modalidad] || PLANTILLAS.TCC
    const andamio = secciones.map((s) => `${s}\n\n`).join('\n')
    setTexto((t) => (t.trim() ? t + '\n\n' + andamio : andamio))
    areaRef.current?.focus()
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-surface">
      <div className="mx-auto flex w-full max-w-content flex-col px-margin-mobile py-8 md:px-margin-desktop">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={pacienteId ? `/pacientes/${pacienteId}` : '/notas'}
            className="inline-flex items-center gap-2 text-label-md uppercase text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft size={14} strokeWidth={1.8} />
            Salir del lienzo
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
              disabled={bloqueado}
              aria-label="Paciente de esta sesión"
              className="rounded-md border border-border-sand bg-surface-card px-4 py-2 text-body-md text-on-surface focus:border-secondary focus:outline-none"
            >
              <option value="">¿De quién es esta sesión?</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {nombrePaciente(p)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={insertarPlantilla}
              disabled={bloqueado}
              className="inline-flex items-center gap-2 rounded-md border border-border-sand bg-surface-card px-4 py-2 text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-primary"
              title={`Inserta el andamiaje de ${modalidad} como texto, no como formulario`}
            >
              <Sparkles size={14} strokeWidth={1.6} />
              Andamio {modalidad}
            </button>
          </div>
        </div>

        <p className="mb-8 text-label-sm uppercase text-outline">
          {fechaLarga(new Date())}
          {paciente ? ` · ${nombrePaciente(paciente)}` : ''}
        </p>

        <div className="mx-auto w-full max-w-focus flex-1">
          <textarea
            ref={areaRef}
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={bloqueado}
            aria-label="Nota clínica de la sesión"
            placeholder="Escribe libremente aquí tu análisis clínico. La estructura se procesa después."
            className="min-h-[45vh] w-full resize-none border-none bg-transparent font-serif text-body-lg leading-relaxed text-on-surface placeholder:text-outline-variant/70 focus:outline-none disabled:opacity-100 md:text-[20px]"
          />

          <div className="mt-10 flex flex-wrap gap-4 border-t border-border-mist pt-6">
            <label className="flex-1">
              <span className="mb-2 block text-label-sm uppercase text-on-surface-variant">
                Etiquetas
              </span>
              <input
                value={etiquetas}
                onChange={(e) => setEtiquetas(e.target.value)}
                disabled={bloqueado}
                placeholder="separadas por coma"
                className="w-full border-b border-border-sand bg-transparent pb-2 text-body-md text-on-surface placeholder:text-outline-variant focus:border-secondary focus:outline-none"
              />
            </label>
            <label className="w-full sm:w-56">
              <span className="mb-2 block text-label-sm uppercase text-on-surface-variant">
                Riesgo en esta sesión
              </span>
              <select
                value={riesgo}
                onChange={(e) => setRiesgo(e.target.value)}
                disabled={bloqueado}
                className="w-full border-b border-border-sand bg-transparent pb-2 text-body-md text-on-surface focus:border-secondary focus:outline-none"
              >
                <option value="Low">Sin indicadores</option>
                <option value="Medium">Vigilancia</option>
                <option value="High">Riesgo alto</option>
              </select>
            </label>
          </div>
        </div>

        <div className="sticky bottom-6 mt-12 flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-5 rounded-xl border border-border-mist bg-surface-card/95 px-6 py-4 shadow-sm backdrop-blur-sm">
            {fase === 'pausa' ? (
              <>
                <Reloj progreso={progreso} />
                <p className="max-w-xs font-serif text-body-md italic leading-snug text-ink-deep">
                  {pregunta}
                </p>
                <button
                  onClick={cancelarPausa}
                  className="text-label-md uppercase text-outline transition-colors hover:text-primary"
                >
                  Seguir escribiendo
                </button>
              </>
            ) : fase === 'guardada' ? (
              <span className="flex items-center gap-3 px-4 text-label-md uppercase text-secondary">
                <Check size={18} strokeWidth={2} />
                Nota guardada
              </span>
            ) : (
              <>
                <span className="text-label-sm uppercase text-outline">
                  {palabras} {palabras === 1 ? 'palabra' : 'palabras'}
                  {terapeuta.friccion_reflexiva && ' · pausa de 2 s antes de guardar'}
                </span>
                <button
                  onClick={iniciarGuardado}
                  disabled={!pacienteId || !texto.trim()}
                  className="rounded-md bg-secondary px-8 py-3 text-label-md uppercase text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:bg-surface-variant disabled:text-outline"
                >
                  Finalizar nota clínica
                </button>
              </>
            )}
          </div>
        </div>

        {!pacienteId && (
          <p className="mt-6 text-center text-body-sm italic text-outline">
            Elige de quién es la sesión para poder guardar.
          </p>
        )}
      </div>
    </div>
  )
}

function Reloj({ progreso }) {
  const radio = 15.9155
  const circunferencia = 2 * Math.PI * radio
  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90" aria-hidden="true">
      <circle
        cx="18"
        cy="18"
        r={radio}
        fill="none"
        stroke="var(--color-secondary-fixed)"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r={radio}
        fill="none"
        stroke="var(--color-secondary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circunferencia}
        strokeDashoffset={circunferencia * (1 - progreso)}
      />
    </svg>
  )
}
