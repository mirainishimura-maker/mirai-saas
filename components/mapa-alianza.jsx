'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, Plus, RotateCcw, Trash2 } from 'lucide-react'

const TIPOS = [
  'Esquema nuclear',
  'Creencia central',
  'Pensamiento automático',
  'Emoción',
  'Conducta',
  'Respuesta fisiológica',
  'Recurso',
]

const TONO = {
  'Esquema nuclear': 'border-primary/40 bg-primary-fixed/60',
  'Creencia central': 'border-secondary/40 bg-secondary-fixed/60',
  Emoción: 'border-tertiary/30 bg-tertiary-fixed/40',
  Conducta: 'border-border-sand bg-surface-card',
  'Pensamiento automático': 'border-border-sand bg-surface-card',
  'Respuesta fisiológica': 'border-border-sand bg-surface-container-low',
  Recurso: 'border-secondary/30 bg-secondary-container/40',
}

/**
 * Mapa de conceptualización. Los nodos se arrastran, se editan en el sitio y
 * se conectan entre sí. Las posiciones se guardan en porcentaje para que el
 * mapa aguante cualquier tamaño de pantalla.
 */
export default function MapaAlianza({ mapa, onCambio }) {
  const lienzoRef = useRef(null)
  const nodosRef = useRef({})
  const [centros, setCentros] = useState({})
  const [arrastrando, setArrastrando] = useState(null)
  const [editando, setEditando] = useState(null)
  const [conectando, setConectando] = useState(null)

  const nodes = mapa?.nodes || []
  const links = mapa?.links || []

  const medir = useCallback(() => {
    const lienzo = lienzoRef.current
    if (!lienzo) return
    const caja = lienzo.getBoundingClientRect()
    const siguiente = {}
    for (const n of nodes) {
      const el = nodosRef.current[n.id]
      if (!el) continue
      const c = el.getBoundingClientRect()
      siguiente[n.id] = {
        x: c.left - caja.left + c.width / 2,
        y: c.top - caja.top + c.height / 2,
      }
    }
    setCentros(siguiente)
  }, [nodes])

  useLayoutEffect(() => {
    medir()
  }, [medir])

  useEffect(() => {
    const obs = new ResizeObserver(medir)
    if (lienzoRef.current) obs.observe(lienzoRef.current)
    window.addEventListener('resize', medir)
    return () => {
      obs.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [medir])

  const alMover = (e) => {
    if (!arrastrando) return
    const caja = lienzoRef.current.getBoundingClientRect()
    const x = ((e.clientX - caja.left - arrastrando.dx) / caja.width) * 100
    const y = ((e.clientY - caja.top - arrastrando.dy) / caja.height) * 100
    onCambio({
      ...mapa,
      nodes: nodes.map((n) =>
        n.id === arrastrando.id
          ? { ...n, x: acotar(x, 0, 88), y: acotar(y, 0, 88) }
          : n,
      ),
    })
  }

  const iniciarArrastre = (e, nodo) => {
    if (editando) return
    const el = nodosRef.current[nodo.id]
    const caja = el.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    setArrastrando({ id: nodo.id, dx: e.clientX - caja.left, dy: e.clientY - caja.top })
  }

  const alHacerClic = (nodo) => {
    if (!conectando) return
    if (conectando === nodo.id) {
      setConectando(null)
      return
    }
    const yaExiste = links.some(
      ([a, b]) =>
        (a === conectando && b === nodo.id) || (a === nodo.id && b === conectando),
    )
    onCambio({
      ...mapa,
      links: yaExiste
        ? links.filter(
            ([a, b]) =>
              !((a === conectando && b === nodo.id) || (a === nodo.id && b === conectando)),
          )
        : [...links, [conectando, nodo.id]],
    })
    setConectando(null)
  }

  const agregarNodo = () => {
    const id = 'n' + Math.random().toString(36).slice(2, 7)
    onCambio({
      ...mapa,
      nodes: [...nodes, { id, tipo: 'Pensamiento automático', texto: '', x: 40, y: 48 }],
    })
    setEditando(id)
  }

  const borrarNodo = (id) => {
    onCambio({
      ...mapa,
      nodes: nodes.filter((n) => n.id !== id),
      links: links.filter(([a, b]) => a !== id && b !== id),
    })
    setEditando(null)
  }

  const editarNodo = (id, cambios) => {
    onCambio({ ...mapa, nodes: nodes.map((n) => (n.id === id ? { ...n, ...cambios } : n)) })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={agregarNodo}
          className="inline-flex items-center gap-2 rounded-md border border-border-sand bg-surface-card px-4 py-2 text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-primary"
        >
          <Plus size={14} strokeWidth={1.8} />
          Añadir nodo
        </button>
        {conectando && (
          <span className="rounded-full bg-secondary-fixed px-4 py-2 text-label-md uppercase text-on-secondary-fixed">
            Elige el nodo con el que se conecta
          </span>
        )}
        <span className="ml-auto text-body-sm italic text-outline">
          Arrastra para mover · clic en el texto para editar
        </span>
      </div>

      <div
        ref={lienzoRef}
        onPointerMove={alMover}
        onPointerUp={() => setArrastrando(null)}
        onPointerLeave={() => setArrastrando(null)}
        className="relative h-[560px] w-full overflow-hidden rounded-xl border border-border-sand"
        style={{
          background:
            'radial-gradient(circle at 20% 15%, #fffdf9 0%, #fbf3e5 55%, #f2ebdc 100%)',
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {links.map(([a, b], i) => {
            const ca = centros[a]
            const cb = centros[b]
            if (!ca || !cb) return null
            return (
              <line
                key={i}
                x1={ca.x}
                y1={ca.y}
                x2={cb.x}
                y2={cb.y}
                stroke="var(--color-outline-variant)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
              />
            )
          })}
        </svg>

        {nodes.map((nodo) => (
          <div
            key={nodo.id}
            ref={(el) => (nodosRef.current[nodo.id] = el)}
            onPointerDown={(e) => iniciarArrastre(e, nodo)}
            onClick={() => alHacerClic(nodo)}
            style={{
              // min() evita que un nodo arrastrado al borde se salga del lienzo
              // cuando la pantalla es angosta.
              left: `min(${nodo.x}%, calc(100% - 202px))`,
              top: `min(${nodo.y}%, calc(100% - 130px))`,
            }}
            className={`absolute w-[190px] select-none rounded-lg border p-4 shadow-sm transition-shadow ${
              TONO[nodo.tipo] || 'border-border-sand bg-surface-card'
            } ${arrastrando?.id === nodo.id ? 'cursor-grabbing shadow-md' : 'cursor-grab'} ${
              conectando === nodo.id ? 'ring-2 ring-secondary' : ''
            }`}
          >
            {editando === nodo.id ? (
              <div onPointerDown={(e) => e.stopPropagation()} className="space-y-2">
                <select
                  value={nodo.tipo}
                  onChange={(e) => editarNodo(nodo.id, { tipo: e.target.value })}
                  className="w-full rounded-sm border border-border-sand bg-surface-card px-2 py-1 text-label-sm uppercase text-on-surface-variant"
                >
                  {TIPOS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <textarea
                  autoFocus
                  rows={2}
                  value={nodo.texto}
                  onChange={(e) => editarNodo(nodo.id, { texto: e.target.value })}
                  placeholder="Escribe aquí…"
                  className="w-full resize-none rounded-sm border border-border-sand bg-surface-card px-2 py-1 font-serif text-body-sm text-on-surface focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => borrarNodo(nodo.id)}
                    className="text-outline hover:text-alert-clinical"
                    title="Eliminar nodo"
                  >
                    <Trash2 size={14} strokeWidth={1.6} />
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    className="inline-flex items-center gap-1 text-label-sm uppercase text-secondary"
                  >
                    <Check size={14} strokeWidth={1.8} />
                    Listo
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDoubleClick={() => setEditando(nodo.id)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  if (conectando) {
                    alHacerClic(nodo)
                    return
                  }
                  e.stopPropagation()
                  setEditando(nodo.id)
                }}
              >
                <p className="mb-1 text-label-sm uppercase text-on-surface-variant">{nodo.tipo}</p>
                <p className="font-serif text-body-md leading-snug text-on-surface">
                  {nodo.texto || <span className="text-outline-variant">Sin texto</span>}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConectando(nodo.id)
                  }}
                  className="mt-2 text-label-sm uppercase text-outline opacity-45 transition-all hover:text-secondary hover:opacity-100"
                >
                  conectar
                </button>
              </div>
            )}
          </div>
        ))}

        {nodes.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center px-8 text-center font-serif text-body-lg italic text-outline">
            El mapa está en blanco. Empieza por el esquema nuclear.
          </p>
        )}
      </div>
    </div>
  )
}

export function MapaVacio() {
  return { nodes: [], links: [] }
}

export function RestaurarMapa({ onRestaurar }) {
  return (
    <button
      onClick={onRestaurar}
      className="inline-flex items-center gap-2 text-label-md uppercase text-outline hover:text-primary"
    >
      <RotateCcw size={14} strokeWidth={1.6} />
      Vaciar mapa
    </button>
  )
}

function acotar(v, min, max) {
  return Math.min(max, Math.max(min, v))
}
