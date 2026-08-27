import Guardia from '@/components/guardia'
import Shell from '@/components/shell'

export default function AppLayout({ children }) {
  return (
    <Guardia>
      <Shell>{children}</Shell>
    </Guardia>
  )
}
