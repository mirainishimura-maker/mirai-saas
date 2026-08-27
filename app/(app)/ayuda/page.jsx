'use client'

import Link from 'next/link'
import { useMirai } from '@/lib/store'
import { Encabezado, Rotulo, Tarjeta } from '@/components/ui'

const RECORRIDO = [
  {
    titulo: 'El Refugio',
    texto:
      'Lo primero que ves en el día. No hay gráficos ni KPIs: están tus sesiones de hoy con nombre, el foco de cada una y qué notas te faltan escribir.',
    donde: '/refugio',
  },
  {
    titulo: 'Pacientes',
    texto:
      'El directorio muestra la última nota, no una ficha administrativa. El buscador entra dentro del texto de tus notas: busca por una palabra que recuerdes haber escrito.',
    donde: '/pacientes',
  },
  {
    titulo: 'Mapa de alianza',
    texto:
      'Dentro de cada paciente. Arrastra los nodos, edítalos con un clic y conéctalos entre sí. Es la conceptualización del caso, no un organigrama.',
    donde: '/pacientes',
  },
  {
    titulo: 'El lienzo',
    texto:
      'Texto libre en serif, sin barra de herramientas. El andamio de TCC, EMDR o Sistémica se inserta como texto que puedes borrar, nunca como campos obligatorios.',
    donde: '/notas/nueva',
  },
  {
    titulo: 'Calendario',
    texto:
      'Marca una sesión como atendida y su cobro se registra solo. Los huecos de más de hora y media se dibujan como espacio de calma, no como tiempo desperdiciado.',
    donde: '/calendario',
  },
  {
    titulo: 'Oxígeno clínico',
    texto:
      'La parte financiera. El árbol lee números reales: copa es tu retiro del mes, frutos son sesiones cobradas y raíces el fondo semilla.',
    donde: '/oxigeno',
  },
]

export default function Ayuda() {
  const { esMuestra } = useMirai()

  return (
    <div className="mx-auto w-full max-w-content px-margin-mobile py-10 md:px-margin-desktop">
      <Encabezado
        titulo="Cómo se usa Mirai"
        bajada="Seis pantallas, una sola idea: que la administración no te robe la cabeza antes de entrar a sesión."
      />

      <h2 className="sr-only">Recorrido por las pantallas</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {RECORRIDO.map((r) => (
          <Tarjeta key={r.titulo}>
            <h3 className="mb-3 font-serif text-headline-md text-primary">{r.titulo}</h3>
            <p className="mb-5 text-body-md leading-relaxed text-on-surface-variant">{r.texto}</p>
            <Link
              href={r.donde}
              aria-label={`Ir a ${r.titulo}`}
              className="text-label-md uppercase text-secondary hover:text-primary"
            >
              Ir →
            </Link>
          </Tarjeta>
        ))}
      </div>

      <div className="mt-12 max-w-3xl space-y-6">
        <Tarjeta className="bg-surface-container-low">
          <Rotulo>Dónde están tus datos</Rotulo>
          {esMuestra ? (
            <>
              <p className="mb-4 text-body-md leading-relaxed text-on-surface-variant">
                Estás en la muestra. Todas las pantallas funcionan de verdad, pero lo que escribas
                vive solo en este navegador: no hay cuenta ni servidor, y se pierde si limpias los
                datos de navegación. Los pacientes que ves son inventados.
              </p>
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                Para trabajar con pacientes reales hace falta una cuenta. Desde ahí, cada terapeuta
                ve solo lo suyo y las notas se guardan cifradas.
              </p>
            </>
          ) : (
            <>
              <p className="mb-4 text-body-md leading-relaxed text-on-surface-variant">
                Tus pacientes y tus notas viven en tu cuenta, aisladas de las de cualquier otra
                terapeuta. Las notas clínicas se guardan cifradas: quien tuviera acceso a la base
                de datos vería bytes, no lo que escribiste.
              </p>
              <p className="mb-4 text-body-md leading-relaxed text-on-surface-variant">
                Queda registrado quién abre cada historia y cuándo, y ese registro no se puede
                editar ni borrar. También el tuyo.
              </p>
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                En Ajustes puedes descargar una copia de todo cuando quieras. Es tu historia
                clínica, no la nuestra.
              </p>
            </>
          )}
        </Tarjeta>

        <Tarjeta>
          <Rotulo>Las tres decisiones raras, explicadas</Rotulo>
          <dl className="space-y-5">
            <div>
              <dt className="text-body-lg text-on-surface">La pausa de dos segundos</dt>
              <dd className="mt-1 text-body-md leading-relaxed text-on-surface-variant">
                Entre pulsar «finalizar nota» y guardar hay dos segundos con una pregunta en
                pantalla. No es lentitud: es el momento de releer. Se puede apagar en Ajustes.
              </dd>
            </div>
            <div>
              <dt className="text-body-lg text-on-surface">El ícono de campana tachada</dt>
              <dd className="mt-1 text-body-md leading-relaxed text-on-surface-variant">
                No hay número rojo encima a propósito. Los avisos se acumulan en el panel de
                pendientes y los lees cuando tú decides abrirlo.
              </dd>
            </div>
            <div>
              <dt className="text-body-lg text-on-surface">El modo calma</dt>
              <dd className="mt-1 text-body-md leading-relaxed text-on-surface-variant">
                Quita el color de toda la interfaz. El único elemento que lo conserva es el
                indicador de riesgo alto, porque ahí el color es información clínica.
              </dd>
            </div>
          </dl>
        </Tarjeta>
      </div>
    </div>
  )
}
