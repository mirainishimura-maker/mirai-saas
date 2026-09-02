import AgendarCliente from './cliente'

export const metadata = {
  title: 'Aparta tu hora',
  robots: { index: false },
}

export default async function Agendar({ params }) {
  const { token } = await params
  return <AgendarCliente token={token} />
}
