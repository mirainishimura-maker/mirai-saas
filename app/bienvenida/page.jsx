import Link from 'next/link'
import ArbolDeRiqueza from '@/components/arbol'

export const metadata = {
  title: 'Mirai — tener tiempo para pensar en ellos',
}

export default function Bienvenida() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="w-full px-margin-mobile py-8 md:px-margin-desktop">
        <div className="flex items-center justify-between">
          <span className="font-serif text-headline-lg tracking-tight text-primary">Mirai</span>
          <Link
            href="/refugio"
            className="border-b border-primary/30 pb-1 text-label-md uppercase text-primary transition-colors hover:border-primary"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-content flex-1 space-y-32 px-margin-mobile pb-24 md:space-y-48 md:px-margin-desktop md:pb-32">
        <section className="flex flex-col items-center gap-16 pt-8 lg:flex-row lg:gap-24 lg:pt-16">
          <div className="z-10 w-full lg:w-6/12">
            <h1 className="mb-8 text-balance font-serif text-headline-lg leading-tight text-primary md:text-display-lg">
              Tener tiempo para pensar en ellos.
            </h1>
            <p className="mb-12 max-w-md text-body-lg leading-relaxed text-on-surface-variant">
              Más allá de la gestión. Un espacio clínico diseñado para proteger tu capacidad de
              reflexión, cuidar tu alianza terapéutica y devolverte el oxígeno al final del día.
            </p>
            <Link
              href="/refugio"
              className="group inline-flex items-center gap-4 text-primary transition-all"
            >
              <span className="border-b border-primary/20 pb-1 text-label-md uppercase transition-colors group-hover:border-primary">
                Comenzar en calma
              </span>
              <span className="transition-transform group-hover:translate-x-2">→</span>
            </Link>
          </div>

          <div className="relative w-full lg:w-6/12">
            <div className="absolute -inset-6 -z-10 rotate-3 rounded-xl bg-surface-container-low opacity-70 md:-inset-12" />
            <LienzoIlustrado />
          </div>
        </section>

        <section className="flex flex-col gap-32">
          <Vineta
            titulo="Narrativa viva"
            texto="Tus notas clínicas no son campos a rellenar, son el testimonio de un encuentro. Mirai ofrece un lienzo limpio donde la escritura vuelve a ser un proceso reflexivo."
            invertida
          >
            <MapaIlustrado />
          </Vineta>

          <Vineta
            titulo="Cero urgencia"
            texto="Diseñado contra la corriente del software moderno. Sin alertas rojas, sin contadores, sin colores estridentes. Lo administrativo se acumula en un panel y te espera; no te interrumpe."
          >
            <DiaIlustrado />
          </Vineta>

          <Vineta
            titulo="Oxígeno clínico"
            texto="La parte financiera no se llama facturación, se llama cuánto aire te queda. Un árbol con copa, frutos y raíces: lo que retiras, lo que cobras y lo que guardas para los meses flojos."
            invertida
          >
            <div className="flex justify-center rounded-xl border border-border-mist bg-surface-container-low p-8">
              <ArbolDeRiqueza avance={72} sesionesCobradas={30} raices={60} />
            </div>
          </Vineta>
        </section>

        <section className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
          <h2 className="mb-8 font-serif text-headline-lg leading-tight text-primary">
            Recupera el espacio mental
            <br />
            para ejercer tu vocación.
          </h2>
          <p className="mb-12 text-balance text-body-md italic text-on-surface-variant">
            Entra y recorre el consultorio de ejemplo. Todo lo que escribas se queda en tu
            navegador.
          </p>
          <Link
            href="/refugio"
            className="inline-flex items-center justify-center rounded-full bg-primary px-10 py-4 text-label-md uppercase text-on-primary transition-all duration-500 hover:-translate-y-1 hover:bg-primary-container"
          >
            Entrar al refugio
          </Link>
        </section>
      </main>

      <footer className="w-full pb-12 pt-8">
        <div className="mx-auto flex max-w-content flex-col items-center gap-4 px-margin-mobile text-body-sm text-outline md:px-margin-desktop">
          <span className="mb-2 h-px w-12 bg-outline/20" />
          <span className="font-serif text-xl italic text-primary/60">Mirai</span>
        </div>
      </footer>
    </div>
  )
}

function Vineta({ titulo, texto, invertida, children }) {
  return (
    <div
      className={`flex flex-col items-center gap-16 md:gap-24 ${
        invertida ? 'md:flex-row-reverse' : 'md:flex-row'
      }`}
    >
      <div className="w-full md:w-1/2">
        <h3 className="mb-6 font-serif text-headline-md italic text-primary">{titulo}</h3>
        <p className="max-w-md text-body-lg leading-relaxed text-on-surface-variant">{texto}</p>
      </div>
      <div className="w-full md:w-1/2">{children}</div>
    </div>
  )
}

function LienzoIlustrado() {
  return (
    <div className="rounded-xl border border-border-mist bg-surface-card p-8 shadow-sm md:p-12">
      <p className="mb-6 text-label-sm uppercase text-outline">miércoles · Elena M.</p>
      <div className="space-y-4 font-serif text-body-lg leading-relaxed text-ink-deep">
        <p>
          Elena llega diez minutos antes, algo que no había pasado antes. Cuenta la cena del
          domingo…
        </p>
        <p className="text-on-surface-variant">
          Aparece por primera vez la conexión entre la ansiedad de esta semana y la expectativa
          familiar no dicha.
        </p>
        <p aria-hidden="true" className="text-outline-variant">|</p>
      </div>
      <div className="mt-8 flex items-center gap-3 border-t border-border-mist pt-6">
        <span className="h-8 w-8 rounded-full border-2 border-secondary-fixed" />
        <span className="text-label-sm uppercase text-outline">
          pausa de 2 s antes de guardar
        </span>
      </div>
    </div>
  )
}

function MapaIlustrado() {
  return (
    <div className="relative h-[320px] overflow-hidden rounded-xl border border-border-mist bg-surface-container-low">
      <svg className="absolute inset-0 h-full w-full">
        <line x1="28%" y1="26%" x2="62%" y2="24%" stroke="var(--color-outline-variant)" strokeDasharray="4 6" />
        <line x1="28%" y1="26%" x2="48%" y2="60%" stroke="var(--color-outline-variant)" strokeDasharray="4 6" />
        <line x1="48%" y1="60%" x2="20%" y2="78%" stroke="var(--color-outline-variant)" strokeDasharray="4 6" />
      </svg>
      {[
        ['Esquema nuclear', 'No soy suficiente', '10%', '14%', 'bg-primary-fixed/60 border-primary/40'],
        ['Emoción', 'Ansiedad (8/10)', '52%', '12%', 'bg-tertiary-fixed/40 border-tertiary/30'],
        ['Creencia central', 'Debo complacer', '32%', '48%', 'bg-secondary-fixed/60 border-secondary/40'],
        ['Conducta', 'Evitación', '6%', '68%', 'bg-surface-card border-border-sand'],
      ].map(([tipo, texto, left, top, clase]) => (
        <div
          key={tipo + texto}
          style={{ left, top }}
          className={`absolute w-[160px] rounded-lg border p-3 shadow-sm ${clase}`}
        >
          <p className="text-label-sm uppercase text-on-surface-variant">{tipo}</p>
          <p className="font-serif text-body-md leading-snug text-on-surface">{texto}</p>
        </div>
      ))}
    </div>
  )
}

function DiaIlustrado() {
  return (
    <div className="space-y-3 rounded-xl border border-border-mist bg-surface-card p-8">
      {[
        ['09:00', 'Ana G.', 'Virtual'],
        ['11:30', 'Carlos R.', 'Presencial'],
      ].map(([hora, nombre, modo]) => (
        <div key={hora} className="flex items-center gap-5 rounded-lg bg-surface-container-low p-4">
          <span className="w-12 text-label-md uppercase text-outline">{hora}</span>
          <span className="flex-1">
            <span className="block font-serif text-body-lg text-ink-deep">{nombre}</span>
            <span className="text-body-sm italic text-on-surface-variant">{modo}</span>
          </span>
        </div>
      ))}
      <div className="flex items-center py-6">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border-sand to-transparent" />
        <span className="px-5 text-label-sm uppercase italic text-outline">Espacio de calma</span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border-sand to-transparent" />
      </div>
      <div className="flex items-center gap-5 rounded-lg bg-surface-container-low p-4">
        <span className="w-12 text-label-md uppercase text-outline">15:00</span>
        <span className="flex-1">
          <span className="block font-serif text-body-lg text-ink-deep">Marina V.</span>
          <span className="text-body-sm italic text-on-surface-variant">Presencial</span>
        </span>
      </div>
    </div>
  )
}
