'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { hayNube, supabase } from '@/lib/supabase/navegador'

/**
 * Aterrizaje del enlace de "olvidé mi contraseña".
 *
 * El enlace del correo trae un código que el cliente de Supabase canjea solo
 * al cargar la página; si el canje funcionó hay sesión y se puede escribir la
 * contraseña nueva. Si no hay sesión tras un momento, el enlace venció o ya
 * se usó: se dice tal cual, sin dar vueltas.
 */
export default function Restablecer() {
  const router = useRouter()
  const [fase, setFase] = useState('verificando') // verificando | lista | vencido
  const [clave, setClave] = useState('')
  const [repite, setRepite] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!hayNube) {
      setFase('vencido')
      return
    }
    const sb = supabase()
    let vivo = true

    // El canje del código tarda un instante; se pregunta por la sesión unas
    // cuantas veces antes de rendirse.
    let intentos = 0
    const timer = setInterval(async () => {
      intentos += 1
      const { data } = await sb.auth.getSession()
      if (!vivo) return
      if (data?.session) {
        clearInterval(timer)
        setFase('lista')
      } else if (intentos >= 6) {
        clearInterval(timer)
        setFase('vencido')
      }
    }, 500)

    return () => {
      vivo = false
      clearInterval(timer)
    }
  }, [])

  const guardar = async (e) => {
    e.preventDefault()
    setError(null)
    if (clave.length < 10) {
      setError('La contraseña necesita al menos 10 caracteres. Esto guarda historias clínicas.')
      return
    }
    if (clave !== repite) {
      setError('Las dos contraseñas no coinciden.')
      return
    }
    setGuardando(true)
    try {
      const { error: fallo } = await supabase().auth.updateUser({ password: clave })
      if (fallo) throw fallo
      router.push('/refugio')
      router.refresh()
    } catch (fallo) {
      setError(fallo.message || 'No se pudo guardar. Pide un enlace nuevo e inténtalo otra vez.')
      setGuardando(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="px-margin-mobile py-8 md:px-margin-desktop">
        <Link href="/bienvenida" className="font-serif text-headline-lg tracking-tight text-primary">
          Notaluma
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-margin-mobile pb-20 md:px-margin-desktop">
        <div className="w-full max-w-md">
          {fase === 'verificando' && (
            <p className="font-serif text-body-lg italic text-outline">Comprobando tu enlace…</p>
          )}

          {fase === 'vencido' && (
            <>
              <h1 className="mb-2 font-serif text-headline-lg text-ink-deep">Este enlace ya no sirve</h1>
              <p className="mb-8 text-body-md leading-relaxed text-on-surface-variant">
                Los enlaces para restablecer la contraseña caducan y solo se usan una vez.
                Pide uno nuevo desde la pantalla de entrada.
              </p>
              <Link
                href="/entrar"
                className="inline-block rounded-md bg-primary px-6 py-3.5 text-label-md uppercase text-on-primary transition-colors hover:bg-primary-container"
              >
                Volver a entrar
              </Link>
            </>
          )}

          {fase === 'lista' && (
            <>
              <h1 className="mb-2 font-serif text-headline-lg text-ink-deep">Tu contraseña nueva</h1>
              <p className="mb-10 text-body-md leading-relaxed text-on-surface-variant">
                Elige una frase larga que recuerdes, y guárdala en tu gestor de contraseñas.
              </p>
              <form onSubmit={guardar} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-label-md uppercase text-on-surface-variant">
                    Contraseña nueva
                  </span>
                  <input
                    type="password"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={10}
                    className={entrada}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-label-md uppercase text-on-surface-variant">
                    Repítela
                  </span>
                  <input
                    type="password"
                    value={repite}
                    onChange={(e) => setRepite(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={10}
                    className={entrada}
                  />
                </label>

                {error && (
                  <p role="alert" className="rounded-md bg-error-container/40 p-3 text-body-sm text-alert-clinical">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full rounded-md bg-primary py-3.5 text-label-md uppercase text-on-primary transition-colors hover:bg-primary-container disabled:bg-surface-variant disabled:text-outline"
                >
                  {guardando ? 'Un momento…' : 'Guardar y entrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

const entrada =
  'w-full rounded-md border border-border-sand bg-surface-card px-4 py-3 text-body-md text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary'
