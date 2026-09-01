'use client'

import { useEffect, useId, useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { simularSostenibilidad, soles, useMirai } from '@/lib/store'
import { claveDia } from '@/lib/fecha'
import { supabase } from '@/lib/supabase/navegador'
import {
  BotonPrimario,
  BotonSuave,
  Campo,
  claseInput,
  Encabezado,
  Rotulo,
  Tarjeta,
} from '@/components/ui'

const NOMBRE_PLAN = { base: 'Base', premium: 'Premium', consultorio: 'Consultorio' }

const CAMPOS_EDITABLES = [
  'full_name',
  'professional_license',
  'base_currency',
  'tarifa_sesion',
  'target_salary_monthly',
  'monthly_fixed_costs',
  'sesiones_semanales_sostenibles',
  'porcentaje_semilla',
  'friccion_reflexiva',
  'modo_calma',
]

export default function Ajustes() {
  const { terapeuta, guardarAjustes, reiniciarMuestra, esMuestra, exportarTodo, plan } = useMirai()
  const [datos, setDatos] = useState(terapeuta)
  const [guardado, setGuardado] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [falloDescarga, setFalloDescarga] = useState(null)
  const [falloGuardado, setFalloGuardado] = useState(null)

  // Un respaldo que ella puede pedir sin depender de nadie. Sale como JSON
  // porque es lo que se puede volver a leer dentro de diez años.
  const descargarTodo = async () => {
    setDescargando(true)
    setFalloDescarga(null)
    try {
      const datos = await exportarTodo()
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `mirai-${claveDia(new Date())}.json`
      enlace.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setFalloDescarga('No se pudo preparar la copia: ' + e.message)
    } finally {
      setDescargando(false)
    }
  }

  // Reiniciar la demo cambia el estado compartido; sin esto el formulario
  // seguiría mostrando en pantalla los valores anteriores.
  useEffect(() => {
    setDatos(terapeuta)
  }, [terapeuta])

  const proyeccion = simularSostenibilidad({
    terapeuta: datos,
    sesionesPorSemana: datos.sesiones_semanales_sostenibles,
    tarifa: datos.tarifa_sesion,
  })

  const cambiar = (campo, numerico = false) => (e) => {
    setDatos({ ...datos, [campo]: numerico ? Number(e.target.value) : e.target.value })
    setGuardado(false)
  }

  const enviar = async (e) => {
    e.preventDefault()
    setFalloGuardado(null)
    try {
      // Solo las columnas editables: la fila trae mas campos (id, plan,
      // created_at) y la base rechaza el update entero si viajan.
      const payload = {}
      for (const k of CAMPOS_EDITABLES) if (k in datos) payload[k] = datos[k]
      await guardarAjustes(payload)
      setGuardado(true)
    } catch (fallo) {
      setFalloGuardado(fallo.message || 'No se pudieron guardar los ajustes.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-content px-margin-mobile py-10 md:px-margin-desktop">
      <Encabezado
        titulo="Ajustes"
        bajada="Las reglas con las que Notaluma calcula tu carga y tu sostenibilidad."
      />

      <form onSubmit={enviar} className="max-w-2xl space-y-6">
        <Tarjeta>
          <Rotulo>Quién eres</Rotulo>
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo etiqueta="Nombre">
              <input value={datos.full_name} onChange={cambiar('full_name')} className={claseInput} />
            </Campo>
            <Campo etiqueta="Colegiatura">
              <input
                value={datos.professional_license || ''}
                onChange={cambiar('professional_license')}
                className={claseInput}
              />
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta>
          <Rotulo>Tu economía</Rotulo>
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo etiqueta="Tarifa por sesión (S/)">
              <input
                type="number"
                min="0"
                value={datos.tarifa_sesion}
                onChange={cambiar('tarifa_sesion', true)}
                className={claseInput}
              />
            </Campo>
            <Campo etiqueta="Lo que quieres retirar al mes (S/)">
              <input
                type="number"
                min="0"
                value={datos.target_salary_monthly}
                onChange={cambiar('target_salary_monthly', true)}
                className={claseInput}
              />
            </Campo>
            <Campo etiqueta="Costos fijos del mes (S/)" ayuda="Alquiler, software, supervisión.">
              <input
                type="number"
                min="0"
                value={datos.monthly_fixed_costs}
                onChange={cambiar('monthly_fixed_costs', true)}
                className={claseInput}
              />
            </Campo>
            <Campo etiqueta="Fondo semilla (%)" ayuda="Se aparta de lo que te queda cada mes.">
              <input
                type="number"
                min="0"
                max="50"
                value={datos.porcentaje_semilla}
                onChange={cambiar('porcentaje_semilla', true)}
                className={claseInput}
              />
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta>
          <Rotulo>Tu techo clínico</Rotulo>
          <Campo
            etiqueta="Sesiones por semana que puedes sostener"
            ayuda="Notaluma avisa cuando la agenda pasa de aquí. No lo bloquea: te lo dice."
          >
            <input
              type="number"
              min="1"
              max="60"
              value={datos.sesiones_semanales_sostenibles}
              onChange={cambiar('sesiones_semanales_sostenibles', true)}
              className={claseInput}
            />
          </Campo>
          <p className="mt-4 text-body-sm italic leading-relaxed text-on-surface-variant">
            Con {datos.sesiones_semanales_sostenibles} sesiones a {soles(datos.tarifa_sesion)}, un
            mes completo te deja alrededor de {soles(proyeccion.neto)} después de gastos fijos.
          </p>
        </Tarjeta>

        <Tarjeta>
          <Rotulo>Cómo se comporta Notaluma</Rotulo>
          <Interruptor
            activo={datos.friccion_reflexiva}
            onCambiar={(v) => {
              setDatos({ ...datos, friccion_reflexiva: v })
              setGuardado(false)
            }}
            titulo="Fricción reflexiva"
            texto="Dos segundos de pausa entre pulsar guardar y guardar de verdad, con una pregunta en pantalla. Sirve para releer antes de cerrar la nota."
          />
          <div className="mt-6 border-t border-border-mist pt-6">
            <Interruptor
              activo={datos.modo_calma}
              onCambiar={(v) => {
                setDatos({ ...datos, modo_calma: v })
                guardarAjustes({ modo_calma: v })
              }}
              titulo="Modo calma"
              texto="Quita el color de toda la interfaz. El indicador de riesgo alto lo conserva a propósito."
            />
          </div>
        </Tarjeta>

        <div className="flex items-center gap-4">
          <BotonPrimario type="submit">Guardar ajustes</BotonPrimario>
          {guardado && <span className="text-body-sm italic text-secondary">Guardado.</span>}
          {falloGuardado && (
            <span role="alert" className="text-body-sm text-alert-clinical">
              {falloGuardado}
            </span>
          )}
        </div>
      </form>

      <div className="mt-12 max-w-2xl rounded-lg border border-border-sand bg-surface-container-low p-6">
        <Rotulo>Tus datos</Rotulo>
        {!esMuestra && (
          <p className="mb-2 text-body-sm text-outline">
            Tu plan: <span className="font-medium text-on-surface">{NOMBRE_PLAN[plan] || 'Base'}</span>
          </p>
        )}
        <p className="text-body-md leading-relaxed text-on-surface-variant">
          {esMuestra
            ? 'Esta es la muestra: todo se guarda en este navegador, en esta computadora. No hay servidor ni cuenta, y se pierde si limpias los datos de navegación. Los pacientes que ves son inventados.'
            : 'Tus pacientes y tus notas viven en tu cuenta, aisladas de las de cualquier otro profesional. Las notas clínicas se guardan cifradas: quien tuviera acceso a la base de datos vería bytes, no lo que escribiste.'}
        </p>

        <div className="mt-6 border-t border-border-mist pt-6">
          <p className="mb-4 text-body-md leading-relaxed text-on-surface-variant">
            {esMuestra
              ? 'Puedes descargar lo que hayas escrito acá para no perderlo.'
              : 'Puedes llevarte todo cuando quieras. Es tu historia clínica, no la nuestra: si algún día dejas de usar Notaluma, te vas con tus datos.'}
          </p>
          <BotonSuave onClick={descargarTodo} disabled={descargando}>
            <Download size={14} strokeWidth={1.6} />
            {descargando ? 'Preparando…' : 'Descargar una copia de todo'}
          </BotonSuave>
          {falloDescarga && (
            <p role="alert" className="mt-3 text-body-sm text-alert-clinical">
              {falloDescarga}
            </p>
          )}
        </div>

        {!esMuestra && (
          <div className="mt-6 border-t border-border-mist pt-6">
            <CambioDeContrasena />
          </div>
        )}

        <div className={esMuestra ? 'mt-6 border-t border-border-mist pt-6' : 'hidden'}>
          {confirmar ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-body-sm text-alert-clinical">
                Vuelve a los datos de ejemplo y borra lo que hayas escrito aquí.
              </span>
              <button
                onClick={() => {
                  reiniciarMuestra()
                  setConfirmar(false)
                }}
                className="rounded-md bg-alert-clinical px-4 py-2 text-label-md uppercase text-on-error"
              >
                Sí, reiniciar
              </button>
              <BotonSuave onClick={() => setConfirmar(false)}>No</BotonSuave>
            </div>
          ) : (
            <button
              onClick={() => setConfirmar(true)}
              className="inline-flex items-center gap-2 text-label-md uppercase text-outline transition-colors hover:text-primary"
            >
              <RotateCcw size={14} strokeWidth={1.6} />
              Reiniciar con los datos de ejemplo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Interruptor({ activo, onCambiar, titulo, texto }) {
  const tituloId = useId()
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p id={tituloId} className="text-body-lg text-on-surface">
          {titulo}
        </p>
        <p className="mt-1 max-w-md text-body-sm leading-relaxed text-on-surface-variant">{texto}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        aria-labelledby={tituloId}
        onClick={() => onCambiar(!activo)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          activo ? 'bg-secondary' : 'bg-surface-variant'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-surface-card transition-transform ${
            activo ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

/**
 * Cambiar la contraseña con la sesión abierta. No pide la actual porque la
 * sesión ya la respalda; el riesgo de laptop abierta lo cubre el cierre por
 * inactividad de veinte minutos.
 */
function CambioDeContrasena() {
  const [abierto, setAbierto] = useState(false)
  const [clave, setClave] = useState('')
  const [repite, setRepite] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)   // { tipo: 'bien' | 'mal', texto }

  const guardar = async (e) => {
    e.preventDefault()
    setAviso(null)
    if (clave.length < 10) {
      setAviso({ tipo: 'mal', texto: 'La contraseña necesita al menos 10 caracteres.' })
      return
    }
    if (clave !== repite) {
      setAviso({ tipo: 'mal', texto: 'Las dos contraseñas no coinciden.' })
      return
    }
    setGuardando(true)
    try {
      const { error } = await supabase().auth.updateUser({ password: clave })
      if (error) throw error
      setClave('')
      setRepite('')
      setAbierto(false)
      setAviso({ tipo: 'bien', texto: 'Contraseña cambiada. Guárdala en tu gestor.' })
    } catch (error) {
      setAviso({ tipo: 'mal', texto: error.message || 'No se pudo cambiar. Inténtalo de nuevo.' })
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <div>
        <button
          onClick={() => { setAbierto(true); setAviso(null) }}
          className="text-label-md uppercase text-outline transition-colors hover:text-primary"
        >
          Cambiar mi contraseña
        </button>
        {aviso?.tipo === 'bien' && (
          <p role="status" className="mt-3 text-body-sm italic text-secondary">{aviso.texto}</p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={guardar} className="max-w-sm space-y-4">
      <label className="block">
        <span className="mb-2 block text-label-md uppercase text-on-surface-variant">Contraseña nueva</span>
        <input type="password" value={clave} onChange={(e) => setClave(e.target.value)}
          autoComplete="new-password" required minLength={10} className={claseInput} />
      </label>
      <label className="block">
        <span className="mb-2 block text-label-md uppercase text-on-surface-variant">Repítela</span>
        <input type="password" value={repite} onChange={(e) => setRepite(e.target.value)}
          autoComplete="new-password" required minLength={10} className={claseInput} />
      </label>
      {aviso?.tipo === 'mal' && (
        <p role="alert" className="text-body-sm text-alert-clinical">{aviso.texto}</p>
      )}
      <div className="flex items-center gap-3">
        <BotonPrimario type="submit" disabled={guardando}>
          {guardando ? 'Un momento…' : 'Guardar'}
        </BotonPrimario>
        <BotonSuave type="button" onClick={() => setAbierto(false)}>Cancelar</BotonSuave>
      </div>
    </form>
  )
}
