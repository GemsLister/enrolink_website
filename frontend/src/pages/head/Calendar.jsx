import { useState } from 'react'
import Sidebar from '../../components/Sidebar'
import CalendarGrid from '../../components/CalendarGrid'

export default function HeadCalendar() {
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-80 shrink-0">
        <Sidebar />
      </aside>
      <main className="flex-1 bg-[#f7f1f2] px-10 py-8">
        <h1 className="text-4xl font-extrabold tracking-[0.28em] text-[#7d102a]">CALENDAR</h1>
        <div className="mt-6">
          <CalendarGrid key={refreshKey} />
        </div>
      </main>
    </div>
  )
}
