'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { activarMuestra } from '@/lib/store'

// El número del negocio (Atendia). El mensaje llega prellenado.
const WHATSAPP = 'PONER_NUMERO'
const MENSAJE = 'Hola, vi Notaluma y quiero abrir mi consultorio digital. ¿Me cuentas cómo empezar?'
const WA_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAJE)}`

/**
 * /bienvenida — variante «pantalla-completa» de la dirección «consultorio-abierto».
 *
 * El video manda: arranca solo, en silencio (los navegadores no permiten
 * autoplay con audio), con el sonido a un toque. Debajo, solo lo esencial:
 * las tres puertas, los precios y el WhatsApp siempre visible.
 */
export default function BienvenidaCliente() {
  const videoRef = useRef(null)
  const [conSonido, setConSonido] = useState(false)
  const [pestana, setPestana] = useState('video') // video | leer

  const alternarSonido = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = conSonido
    if (!conSonido) v.play().catch(() => {})
    setConSonido(!conSonido)
  }

  const recorrer = () => {
    activarMuestra()
    // Recarga completa a propósito: el modo se decide al arrancar el
    // proveedor, y así la muestra abre sin pasar por el login.
    window.location.assign('/refugio')
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface pb-32">
      <header className="flex items-center justify-between px-margin-mobile py-6 md:px-margin-desktop">
        <span className="font-serif text-headline-md tracking-tight text-primary md:text-headline-lg">
          Notaluma
        </span>
        <Link
          href="/entrar"
          className="border-b border-primary/30 pb-1 text-label-md uppercase text-primary transition-colors hover:border-primary"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1">
        {/* ── El video, a sangre en móvil ── */}
        <div className="relative bg-primary md:mx-margin-desktop md:overflow-hidden md:rounded-xl">
          <video
            ref={videoRef}
            src="/notaluma.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="block w-full"
          />
          <button
            type="button"
            onClick={alternarSonido}
            aria-label={conSonido ? 'Silenciar el video' : 'Activar el sonido del video'}
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-surface/90 px-4 py-2 text-label-sm uppercase text-primary shadow-md transition-transform hover:scale-105"
          >
            {conSonido ? <Volume2 size={15} strokeWidth={1.8} /> : <VolumeX size={15} strokeWidth={1.8} />}
            {conSonido ? 'sonido' : 'con sonido'}
          </button>
        </div>

        <div className="flex flex-col gap-8 px-margin-mobile pt-6 md:px-margin-desktop">
          {/* ── Las tres puertas ── */}
          <div>
            <div className="flex gap-1.5 rounded-full bg-surface-container p-1.5">
              <BotonPestana activa={pestana === 'video'} onClick={() => setPestana('video')}>
                ▶ Video
              </BotonPestana>
              <BotonPestana onClick={recorrer}>✎ Recorrer</BotonPestana>
              <BotonPestana activa={pestana === 'leer'} onClick={() => setPestana('leer')}>
                ¶ Leer
              </BotonPestana>
            </div>
            <p className="mt-3 px-2 text-body-sm text-outline">
              Cada cabeza entiende distinto: míralo en un minuto, recórrelo con pacientes de
              ejemplo, o léelo con calma.
            </p>
          </div>

          {/* ── La puerta de lectura ── */}
          {pestana === 'leer' && (
            <div className="flex flex-col gap-4">
              <Bloque titulo="Narrativa viva">
                Tus notas clínicas no son campos a rellenar: son el testimonio de un encuentro.
                Un lienzo limpio, una pausa de dos segundos antes de guardar, y la escritura
                vuelve a ser un proceso reflexivo.
              </Bloque>
              <Bloque titulo="Cero urgencia">
                Sin alertas rojas, sin contadores, sin campanas. Lo administrativo se acumula en
                un panel y te espera; no te interrumpe en mitad de una sesión.
              </Bloque>
              <Bloque titulo="Oxígeno">
                La parte financiera no se llama facturación: se llama cuánto aire te queda. Un
                árbol con copa, frutos y raíces — lo que retiras, lo que cobras y lo que guardas
                para los meses flojos.
              </Bloque>
              <Bloque titulo="Cerrado con llave">
                Las notas se guardan cifradas: quien mire la base de datos ve bytes, no lo que
                escribiste. El aislamiento entre cuentas pasó 12 comprobaciones de ataque antes
                de abrir. Y exportas todo, siempre: es tu historia clínica, no la nuestra.
              </Bloque>
            </div>
          )}

          {/* ── Los niveles ── */}
          <div className="flex flex-col gap-3">
            <Plan nombre="Base" detalle="Tu consultorio: notas cifradas, agenda, oxígeno" />
            <Plan
              nombre="Premium"
              detalle="+ enlace público de agendamiento, embudo de interesados, recordatorios"
              destacado
            />
            <Plan nombre="Consultorio" detalle="+ equipo, sedes y liquidación" />
            <p className="px-2 text-body-sm italic text-outline">
              Precios de lanzamiento por definir — las cuentas se abren por invitación.
            </p>
          </div>
        </div>
      </main>

      {/* ── El WhatsApp, siempre visible ── */}
      <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md">
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-full bg-primary px-6 py-4 text-center shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <span className="block text-label-md uppercase text-on-primary">
            Quiero mi consultorio
          </span>
          <span className="mt-0.5 block text-body-sm text-on-primary/80">
            Abre tu WhatsApp con el mensaje listo
          </span>
        </a>
      </div>

      <footer className="flex justify-center pb-28 pt-16">
        <span className="font-serif text-xl italic text-primary/60">Notaluma</span>
      </footer>
    </div>
  )
}

function BotonPestana({ activa, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full py-2.5 text-label-sm uppercase transition-colors ${
        activa
          ? 'bg-surface-card text-on-surface shadow-sm'
          : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      {children}
    </button>
  )
}

function Bloque({ titulo, children }) {
  return (
    <div className="rounded-xl border border-border-sand bg-surface-card p-5">
      <h3 className="mb-1.5 font-serif text-headline-sm text-ink-deep">{titulo}</h3>
      <p className="text-body-md leading-relaxed text-on-surface-variant">{children}</p>
    </div>
  )
}

function Plan({ nombre, detalle, destacado }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 rounded-xl border bg-surface-card px-5 py-4 ${
        destacado ? 'border-secondary' : 'border-border-sand'
      }`}
    >
      <div>
        <span className="font-serif text-headline-sm text-ink-deep">{nombre}</span>
        <p className="text-body-sm text-on-surface-variant">{detalle}</p>
      </div>
      <span className="whitespace-nowrap text-body-sm text-outline">por definir</span>
    </div>
  )
}
