import { Hanken_Grotesk, Source_Serif_4 } from 'next/font/google'
import { MiraiProvider } from '@/lib/store'
import './globals.css'

const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-source-serif',
  display: 'swap',
})

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-hanken',
  display: 'swap',
})

export const metadata = {
  title: 'Mirai — práctica clínica en calma',
  description:
    'Historia clínica, agenda y sostenibilidad para psicólogos independientes. Sin urgencia, sin ruido.',
}

export const viewport = {
  themeColor: '#faf8f5',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-calma="off" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <MiraiProvider>{children}</MiraiProvider>
      </body>
    </html>
  )
}
