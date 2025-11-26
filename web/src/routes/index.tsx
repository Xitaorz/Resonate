import { Search } from '@/components/Search'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/use-auth'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const auth = useAuth()
  const isVip = auth?.user?.isvip === 1

  return (
    <div className={`px-4 py-8 overscroll-none min-h-screen ${
      isVip ? "bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-amber-50/50 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-amber-950/20" : ""
    }`}>
      {isVip && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none -z-10" />
      )}
      <div className="relative">
        <Search />
      </div>
    </div>
  )
}
