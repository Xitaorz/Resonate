import { Search } from '@/components/Search'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className='h-full flex justify-center items-center'>
      <Search />
    </div>
  )
}
