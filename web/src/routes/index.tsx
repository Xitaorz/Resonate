import { Search } from '@/components/Search'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="px-4 py-8 overscroll-none">
      <Search />
    </div>
  )
}
