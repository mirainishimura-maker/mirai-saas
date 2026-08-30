'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { activarMuestra } from '@/lib/store'
import { hayNube, supabase } from '@/lib/supabase/navegador'

export default function Entrar() {
  const router = useRouter()
  const [pestana, setPestana] = useState('entrar') // entrar | crear
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [nombre, setNombre] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)

  const crearCuenta = pestana === 'crear'

  const enviar = async (e) => {
    e.preventDefault()
    setError(null)
    setMensaje(null)

    if (!hayNube) {
      setError('Todavía no hay servidor configurado. Por ahora solo está disponible la muestra.')
      return
    }
    if (crearCuenta && clave.length < 10) {
      setError('La contraseña necesita al menos 10 caracteres. Esto guarda historias clínicas.')
      return
    }

    setCargando(true)
    try {
      const sb = supabase()
      if (crearCuenta) {
        const { error: fallo } = await sb.auth.signUp({
          email: correo.trim(),
          password: clave,
          options: { data: { full_name: nombre.trim() } },
        })
        if (fallo) throw fallo
        setMensaje(
          'Cuenta creada. Revisa tu correo y confirma la dirección para poder entrar.',
        )
      } else {
        const { error: fallo } = await sb.auth.signInWithPassword({
          email: correo.trim(),
          password: clave,
        })
        if (fallo) throw fallo
        router.push('/refugio')
        router.refresh()
      }
    } catch (fallo) {
      setError(traducir(fallo.message))
    } finally {
      setCargando(false)
    }
  }

  const verMuestra = () => {
    activarMuestra()
    // Recarga completa a propósito: el modo se decide una sola vez, al
    // arrancar el proveedor. Con la navegación de cliente el proveedor no se
    // vuelve a montar, la marca de muestra no se lee, y el guardia rebota a
    // /entrar. Con la recarga, el arranque encuentra la marca y abre la muestra.
    window.location.assign('/refugio')
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="px-margin-mobile py-8 md:px-margin-desktop">
        <Link href="/bienvenida" className="font-serif text-headline-lg tracking-tight text-primary">
          Mirai
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-margin-mobile pb-20 md:px-margin-desktop">
        <div className="w-full max-w-md">
          <h1 className="mb-2 font-serif text-headline-lg text-ink-deep">
            {crearCuenta ? 'Crear tu consultorio' : 'Entrar'}
          </h1>
          <p className="mb-10 text-body-md leading-relaxed text-on-surface-variant">
            {crearCuenta
              ? 'Tus pacientes y tus notas serán solo tuyos: nadie más, ni siquiera otra terapeuta con cuenta en Mirai, puede verlos.'
              : 'Bienvenida de vuelta.'}
          </p>

          <form onSubmit={enviar} className="space-y-5">
            {crearCuenta && (
              <label className="block">
                <span className="mb-2 block text-label-md uppercase text-on-surface-variant">
                  Cómo te llamas
                </span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="name"
                  required
                  className={entrada}
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-label-md uppercase text-on-surface-variant">
                Correo
              </span>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="email"
                required
                className={entrada}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-label-md uppercase text-on-surface-variant">
                Contraseña
              </span>
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete={crearCuenta ? 'new-password' : 'current-password'}
                required
                minLength={crearCuenta ? 10 : undefined}
                className={entrada}
              />
              {crearCuenta && (
                <span className="mt-2 block text-body-sm text-outline">
                  Mínimo 10 caracteres. Una frase que recuerdes funciona mejor que una palabra
                  con símbolos.
                </span>
              )}
            </label>

            {error && (
              <p role="alert" className="rounded-md bg-error-container/40 p-3 text-body-sm text-alert-clinical">
                {error}
              </p>
            )}
            {mensaje && (
              <p role="status" className="rounded-md bg-secondary-fixed/40 p-3 text-body-sm text-on-secondary-fixed">
                {mensaje}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-md bg-primary py-3.5 text-label-md uppercase text-on-primary transition-colors hover:bg-primary-container disabled:bg-surface-variant disabled:text-outline"
            >
              {cargando ? 'Un momento…' : crearCuenta ? 'Crear cuenta' : 'Entrar'}
            </button>
          </form>

          <div className="mt-8 border-t border-border-mist pt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setPestana(crearCuenta ? 'entrar' : 'crear')
                setError(null)
                setMensaje(null)
              }}
              className="text-body-md text-secondary underline-offset-4 hover:underline"
            >
              {crearCuenta ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}
            </button>
          </div>

          <div className="mt-10 rounded-lg border border-border-sand bg-surface-card p-6 text-center">
            <p className="mb-4 text-body-sm leading-relaxed text-on-surface-variant">
              ¿Solo quieres ver cómo es? Hay un consultorio de ejemplo, con pacientes inventados,
              que no necesita cuenta.
            </p>
            <button
              type="button"
              onClick={verMuestra}
              className="text-label-md uppercase text-primary underline-offset-4 hover:underline"
            >
              Ver la muestra →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

const entrada =
  'w-full rounded-md border border-border-sand bg-surface-card px-4 py-3 text-body-md text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary'

/** Los mensajes de Supabase vienen en inglés y de sistema. */
function traducir(mensaje = '') {
  const m = mensaje.toLowerCase()
  if (m.includes('invalid login credentials')) return 'El correo o la contraseña no coinciden.'
  if (m.includes('email not confirmed'))
    return 'Falta confirmar tu correo. Revisa la bandeja de entrada.'
  if (m.includes('user already registered')) return 'Ya existe una cuenta con ese correo.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.'
  if (m.includes('password')) return 'Esa contraseña es demasiado corta o demasiado común.'
  return mensaje || 'No se pudo completar. Inténtalo de nuevo.'
}
