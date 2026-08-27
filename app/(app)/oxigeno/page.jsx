'use client'

import { useMemo, useState } from 'react'
import { Sprout, TriangleAlert } from 'lucide-react'
import { calcularOxigeno, simularSostenibilidad, soles, useMirai } from '@/lib/store'
import { MESES, desdeClave, fechaMedia } from '@/lib/fecha'
import ArbolDeRiqueza from '@/components/arbol'
import Modal from '@/components/modal'
import {
  BotonPrimario,
  BotonSuave,
  Campo,
  claseInput,
  Encabezado,
  Rotulo,
  Tarjeta,
} from '@/components/ui'

export default function Oxigeno() {
  const { transacciones, citas, terapeuta, registrarMovimiento, eliminarMovimiento } = useMirai()
  const [modalAbierto, setModalAbierto] = useState(false)

  const o = useMemo(
    () => calcularOxigeno({ transacciones, citas, terapeuta }),
    [transacciones, citas, terapeuta],
  )

  const mesActual = MESES[new Date().getMonth()]

  return (
    <div className="mx-auto w-full max-w-content px-margin-mobile py-10 md:px-margin-desktop">
      <Encabezado
        sobretitulo={`${mesActual} · lo que va del mes`}
        titulo="Oxígeno clínico"
        bajada="Cuánto aire te queda para seguir atendiendo bien. No es un tablero de ventas."
        acciones={<BotonPrimario onClick={() => setModalAbierto(true)}>Registrar movimiento</BotonPrimario>}
      />

      <div className="grid gap-gutter lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <Tarjeta className="bg-sage-bg">
            <Rotulo>Lo que queda después de los gastos</Rotulo>
            <div className="flex items-center gap-6">
              <Anillo porcentaje={o.margen} />
              <div className="min-w-0 flex-1 space-y-3 text-body-md">
                <Linea etiqueta="Entró" valor={soles(o.ingresos)} />
                <Linea etiqueta="Salió" valor={'– ' + soles(o.egresos)} tenue />
                <div className="border-t border-border-sand pt-3">
                  <p className="text-label-md uppercase text-on-surface-variant">Te queda</p>
                  <p className="mt-1 font-serif text-headline-lg text-primary">{soles(o.neto)}</p>
                </div>
              </div>
            </div>
          </Tarjeta>

          <Tarjeta>
            <Rotulo>Tu retiro del mes</Rotulo>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-serif text-headline-lg text-primary">{soles(o.neto)}</span>
              <span className="text-body-sm text-on-surface-variant">
                meta {soles(terapeuta.target_salary_monthly)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-700"
                style={{ width: `${o.avanceMeta}%` }}
              />
            </div>
            <p className="mt-4 text-body-sm italic leading-relaxed text-on-surface-variant">
              {o.avanceMeta >= 100
                ? 'Mes cubierto. Lo que entre de aquí en adelante puede ir al fondo semilla.'
                : `Vas en ${o.avanceMeta}%. Faltan unas ${o.sesionesParaLaMeta} sesiones para cubrir el mes.`}
            </p>
          </Tarjeta>

          <Tarjeta>
            <Rotulo>Ingresos por semana</Rotulo>
            <Curva serie={o.serie} />
          </Tarjeta>

          <Simulador terapeuta={terapeuta} />
        </div>

        <div className="lg:col-span-7">
          <Tarjeta className="flex h-full flex-col items-center justify-center gap-8 bg-surface-container-low py-12">
            <h2 className="font-serif text-headline-lg text-ink-deep">Árbol de la riqueza</h2>
            <ArbolDeRiqueza
              avance={o.avanceMeta}
              sesionesCobradas={o.sesionesCobradas}
              raices={o.raices}
            />
            <div className="grid w-full max-w-md grid-cols-3 gap-4 text-center">
              <Dato etiqueta="Copa" valor={`${o.avanceMeta}%`} pie="de tu meta" />
              <Dato etiqueta="Frutos" valor={o.sesionesCobradas} pie="sesiones cobradas" />
              <Dato etiqueta="Raíz" valor={soles(o.semilla)} pie={`fondo semilla ${terapeuta.porcentaje_semilla}%`} />
            </div>
            <p className="max-w-sm text-center text-body-sm italic leading-relaxed text-on-surface-variant">
              Las hojas crecen con lo que retiras, los frutos con lo que cobras y las raíces con lo
              que guardas. Un árbol sin raíces se cae en el primer mes flojo.
            </p>
          </Tarjeta>
        </div>
      </div>

      <div className="mt-10">
        <Rotulo>Movimientos de {mesActual}</Rotulo>
        {o.movimientos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-sand px-8 py-12 text-center text-body-md italic text-outline">
            Todavía no hay movimientos este mes.
          </p>
        ) : (
          <ul className="divide-y divide-border-mist overflow-hidden rounded-lg border border-border-mist bg-surface-card">
            {o.movimientos.slice(0, 40).map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-6 py-4">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    t.transaction_type === 'Income' ? 'bg-secondary' : 'bg-tertiary-fixed-dim'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-md text-on-surface">{t.category}</span>
                  <span className="text-label-sm uppercase text-outline">
                    {fechaMedia(desdeClave(t.transaction_date))}
                  </span>
                </span>
                <span
                  className={`text-body-md ${
                    t.transaction_type === 'Income' ? 'text-secondary' : 'text-tertiary'
                  }`}
                >
                  {t.transaction_type === 'Income' ? '+' : '–'} {soles(t.amount)}
                </span>
                <button
                  onClick={() => eliminarMovimiento(t.id)}
                  className="text-label-sm uppercase text-outline transition-colors hover:text-alert-clinical"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        {o.movimientos.length > 40 && (
          <p className="mt-4 text-center text-label-sm uppercase text-outline">
            Mostrando 40 de {o.movimientos.length} movimientos
          </p>
        )}
      </div>

      <ModalMovimiento
        abierto={modalAbierto}
        cerrar={() => setModalAbierto(false)}
        registrar={registrarMovimiento}
      />
    </div>
  )
}

function Linea({ etiqueta, valor, tenue, fuerte }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <span className={`text-label-md uppercase ${tenue ? 'text-outline' : 'text-on-surface-variant'}`}>
        {etiqueta}
      </span>
      <span className={fuerte ? 'font-serif text-headline-md text-primary' : 'text-body-md text-on-surface'}>
        {valor}
      </span>
    </div>
  )
}

function Dato({ etiqueta, valor, pie }) {
  return (
    <div>
      <p className="text-label-sm uppercase text-outline">{etiqueta}</p>
      <p className="mt-1 font-serif text-headline-md text-primary">{valor}</p>
      <p className="mt-0.5 text-body-sm text-on-surface-variant">{pie}</p>
    </div>
  )
}

function Anillo({ porcentaje }) {
  const r = 40
  const c = 2 * Math.PI * r
  const seguro = Math.min(100, Math.max(0, porcentaje))
  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-secondary-fixed)" strokeWidth="11" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--color-primary-container)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - seguro / 100)}
          style={{ transition: 'stroke-dashoffset 800ms ease' }}
        />
      </svg>
      <span className="absolute font-serif text-headline-md text-primary">{seguro}%</span>
    </div>
  )
}

function Curva({ serie }) {
  const max = Math.max(1, ...serie.map((s) => s.monto))
  const puntos = serie.map((s, i) => {
    const x = (i / Math.max(1, serie.length - 1)) * 200
    const y = 90 - (s.monto / max) * 78
    return [x, y]
  })
  const d = puntos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${d} L200,100 L0,100 Z`

  return (
    <div>
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="h-32 w-full">
        <defs>
          <linearGradient id="verde" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#verde)" />
        <path d={d} fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between text-label-sm uppercase text-outline">
        <span>hace 8 semanas</span>
        <span>esta semana</span>
      </div>
    </div>
  )
}

function Simulador({ terapeuta }) {
  const [sesiones, setSesiones] = useState(terapeuta.sesiones_semanales_sostenibles)
  const [tarifa, setTarifa] = useState(terapeuta.tarifa_sesion)

  const { neto, semilla, techo, excede } = simularSostenibilidad({
    terapeuta,
    sesionesPorSemana: sesiones,
    tarifa,
  })

  return (
    <Tarjeta>
      <Rotulo>Simulador de sostenibilidad</Rotulo>

      <div className="space-y-8">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="sesiones" className="text-body-sm text-on-surface-variant">
              Sesiones por semana
            </label>
            <span className="font-serif text-headline-md text-primary">{sesiones}</span>
          </div>
          <input
            id="sesiones"
            type="range"
            min="4"
            max="40"
            value={sesiones}
            onChange={(e) => setSesiones(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-variant accent-primary"
          />
          {excede && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-md border border-error/10 bg-error-container/20 p-3 text-body-sm text-alert-clinical"
            >
              <TriangleAlert size={16} strokeWidth={1.8} className="mt-0.5 shrink-0" />
              Pasar de {techo} sesiones fue lo que tú misma
              definiste como tu techo. Más allá de ahí, lo que se paga no es dinero.
            </p>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="tarifa" className="text-body-sm text-on-surface-variant">
              Valor por sesión
            </label>
            <span className="font-serif text-headline-md text-primary">{soles(tarifa)}</span>
          </div>
          <input
            id="tarifa"
            type="range"
            min="30"
            max="300"
            step="5"
            value={tarifa}
            onChange={(e) => setTarifa(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-variant accent-primary"
          />
        </div>

        <div className="space-y-4 border-t border-border-mist pt-6">
          <div className="flex items-baseline justify-between">
            <span className="text-label-sm uppercase text-on-surface-variant">
              Te quedaría al mes
            </span>
            <span className="font-serif text-headline-lg text-primary">{soles(neto)}</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-secondary-fixed/30 p-4">
            <span className="flex items-center gap-3">
              <Sprout size={18} strokeWidth={1.6} className="text-primary" />
              <span>
                <span className="block text-label-sm uppercase text-on-surface-variant">
                  Fondo semilla ({terapeuta.porcentaje_semilla}%)
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  Los meses flojos salen de aquí
                </span>
              </span>
            </span>
            <span className="font-serif text-headline-md text-primary">{soles(semilla)}</span>
          </div>
        </div>
      </div>
    </Tarjeta>
  )
}

function ModalMovimiento({ abierto, cerrar, registrar }) {
  const [datos, setDatos] = useState({
    transaction_type: 'Expense',
    amount: '',
    category: 'Alquiler de consultorio',
  })
  const [fallo, setFallo] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    const monto = Number(datos.amount)
    if (!Number.isFinite(monto) || monto <= 0) {
      setFallo('Escribe un monto mayor que cero.')
      return
    }
    setFallo(null)
    setGuardando(true)
    try {
      await registrar({ ...datos, amount: monto })
      setDatos({ transaction_type: 'Expense', amount: '', category: 'Alquiler de consultorio' })
      cerrar()
    } catch (e2) {
      setFallo(e2.message || 'No se pudo registrar el movimiento.')
    } finally {
      setGuardando(false)
    }
  }

  const categorias =
    datos.transaction_type === 'Income'
      ? ['Sesión', 'Paquete de sesiones', 'Taller', 'Evaluación', 'Otro ingreso']
      : [
          'Alquiler de consultorio',
          'Software',
          'Supervisión clínica',
          'Formación',
          'Materiales',
          'Impuestos',
          'Otro gasto',
        ]

  return (
    <Modal abierto={abierto} cerrar={cerrar} titulo="Registrar movimiento">
      <form onSubmit={enviar} className="space-y-5">
        <div className="flex gap-2">
          {[
            ['Expense', 'Salió'],
            ['Income', 'Entró'],
          ].map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() =>
                setDatos({
                  ...datos,
                  transaction_type: valor,
                  category: valor === 'Income' ? 'Sesión' : 'Alquiler de consultorio',
                })
              }
              className={`flex-1 rounded-md border py-3 text-label-md uppercase transition-colors ${
                datos.transaction_type === valor
                  ? 'border-secondary bg-secondary-fixed text-on-secondary-fixed'
                  : 'border-border-sand bg-surface-card text-on-surface-variant'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <Campo etiqueta="Monto (S/)">
          <input
            autoFocus
            type="number"
            min="1"
            step="1"
            value={datos.amount}
            onChange={cambiar('amount')}
            className={claseInput}
          />
        </Campo>

        <Campo etiqueta="Categoría">
          <select value={datos.category} onChange={cambiar('category')} className={claseInput}>
            {categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>

        {fallo && (
          <p role="alert" className="text-body-sm text-alert-clinical">
            {fallo}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <BotonSuave type="button" onClick={cerrar} disabled={guardando}>
            Cancelar
          </BotonSuave>
          <BotonPrimario type="submit" disabled={guardando}>
            {guardando ? 'Registrando…' : 'Registrar'}
          </BotonPrimario>
        </div>
      </form>
    </Modal>
  )
}
