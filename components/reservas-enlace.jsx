'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useMirai } from '@/lib/store'
import {
  confirmarReserva,
  horarioLima,
  listarReservasPendientes,
  pacienteQueCoincide,
  rechazarReserva,
} from '@/lib/agenda-abierta'
import { BotonSuave, Rotulo, Tarjeta } from '@/components/ui'

/**
 * Las pre-reservas del enlace público, esperando en el calendario.
 * Confirmar crea (o encuentra, por los últimos 9 dígitos del teléfono)
 * al paciente y pone la cita en la agenda ahí mismo. Nada entra solo.
 */
export default function ReservasEnlace() {
  const { modo, esPremium, pacientes, crearPaciente, crearCita } = useMirai()
  const [reservas, setReservas] = useState(null)
  const [ocupado, setOcupado] = useState(null) // id en proceso
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    if (modo !== 'nube' || !esPremium) return
    listarReservasPendientes().then(setReservas).catch(() => setReservas([]))
  }, [modo, esPremium])

  if (modo !== 'nube' || !esPremium || !reservas || reservas.length === 0) return null

  const resolver = async (reserva, accion) => {
    setOcupado(reserva.id)
    setAviso(null)
    try {
      if (accion === 'confirmar') {
        const conocido = pacienteQueCoincide(reserva, pacientes)
        const { pacienteNuevo } = await confirmarReserva(reserva, conocido, {
          crearPaciente,
          crearCita,
        })
        setAviso({
          tipo: 'bien',
          texto: pacienteNuevo
            ? `${reserva.nombre} entró como paciente y su cita ya está en la agenda.`
            : `Cita agendada para ${conocido.first_name} (ya era paciente).`,
        })
      } else {
        await rechazarReserva(reserva.id)
        setAviso({ tipo: 'bien', texto: 'Reserva rechazada. El cupo vuelve a ofrecerse.' })
      }
      setReservas(reservas.filter((r) => r.id !== reserva.id))
    } catch (e) {
      setAviso({ tipo: 'mal', texto: e.message })
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Tarjeta>
      <Rotulo>Reservas del enlace</Rotulo>
      <div className="flex flex-col gap-3">
        {reservas.map((r) => {
          const { dia, inicio } = horarioLima(r)
          const conocido = pacienteQueCoincide(r, pacientes)
          return (
            <div key={r.id} className="rounded-lg border border-border-sand bg-surface-card p-4">
              <p className="text-body-md font-medium text-on-surface">{r.nombre}</p>
              <p className="text-body-sm text-on-surface-variant">
                {r.servicio_nombre} · {etiqueta(dia)} {inicio} · {r.telefono}
              </p>
              {r.motivo && (
                <p className="mt-1 text-body-sm italic text-on-surface-variant">“{r.motivo}”</p>
              )}
              <p className="mt-1 text-body-sm text-outline">
                {conocido
                  ? `Coincide con tu paciente ${conocido.first_name} ${conocido.last_name || ''}`.trim()
                  : 'Persona nueva: al confirmar se crea su ficha'}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={ocupado === r.id}
                  onClick={() => resolver(r, 'confirmar')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-label-sm uppercase text-on-primary transition-colors hover:bg-primary-container disabled:bg-surface-variant disabled:text-outline"
                >
                  <Check size={13} strokeWidth={2} /> Confirmar
                </button>
                <BotonSuave disabled={ocupado === r.id} onClick={() => resolver(r, 'rechazar')}>
                  <X size={13} strokeWidth={2} /> Rechazar
                </BotonSuave>
              </div>
            </div>
          )
        })}
      </div>
      {aviso && (
        <p
          role={aviso.tipo === 'mal' ? 'alert' : 'status'}
          className={`mt-3 text-body-sm ${aviso.tipo === 'mal' ? 'text-alert-clinical' : 'italic text-secondary'}`}
        >
          {aviso.texto}
        </p>
      )}
    </Tarjeta>
  )
}

function etiqueta(diaISO) {
  const [y, m, d] = diaISO.split('-').map(Number)
  return new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(y, m - 1, d))
}
