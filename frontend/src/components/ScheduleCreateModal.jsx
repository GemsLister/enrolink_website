import React, { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

const pad = (value) => String(value).padStart(2, '0')

const toDateInput = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date?.getTime?.())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const toDateTimeInput = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date?.getTime?.())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const addOneDayStr = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d?.getTime?.())) return ''
  d.setDate(d.getDate() + 1)
  return toDateInput(d)
}

export default function ScheduleCreateModal({ open, onClose, onCreated, calendarId, initial }) {
  const { token } = useAuth()
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [attendees, setAttendees] = useState('') // comma-separated emails
  const [allDay, setAllDay] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [calendarPick, setCalendarPick] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!open) return null

  useEffect(() => {
    if (!open) return
    const initialAllDay = !!initial?.allDay
    setSummary(initial?.summary || '')
    setDescription(initial?.description || '')
    setLocation(initial?.location || '')
    setAttendees(initial?.attendees || '')
    setAllDay(initialAllDay)
    setStart(initialAllDay ? toDateInput(initial?.start) : toDateTimeInput(initial?.start))
    setEnd(initialAllDay ? toDateInput(initial?.end) : toDateTimeInput(initial?.end))
    const envCal = import.meta.env.VITE_GOOGLE_CALENDAR_ID || 'primary'
    setCalendarPick(calendarId || envCal)
  }, [open, initial, calendarId])

  async function onSubmit(e) {
    e.preventDefault()
    if (!token) return
    setLoading(true)
    setError('')
    try {
      if (!summary) throw new Error('Title is required')
      if (!start || !end) throw new Error('Start and end are required')
      const nameKey = String(summary || '').trim().toLowerCase()
      if (nameKey) {
        const farPast = '1970-01-01T00:00:00.000Z'
        const farFuture = '2100-01-01T00:00:00.000Z'
        const dupData = await api.calendarEvents(token, { timeMin: farPast, timeMax: farFuture, calendarId: calendarPick || 'primary' })
        const dupItems = Array.isArray(dupData?.events) ? dupData.events : (Array.isArray(dupData?.items) ? dupData.items : (Array.isArray(dupData) ? dupData : []))
        const hasDup = dupItems.some((ev) => {
          const nm = String(ev.summary || ev.title || '').trim().toLowerCase()
          const id = ev.id || ev._id || ''
          return nm === nameKey && (!initial?.id || id !== initial.id)
        })
        if (hasDup) throw new Error('A schedule with this name already exists')
      }
      const parseDate = (value) => {
        if (!value) return null
        const parsed = new Date(value)
        return isNaN(parsed) ? null : parsed.toISOString()
      }

      const allDayStart = allDay ? start : null
      const allDayEnd = allDay ? end : null

      const startIso = allDay ? null : parseDate(start)
      const endIso = allDay ? null : parseDate(end)

  if (!allDay && (!startIso || !endIso)) {
    throw new Error('Invalid start or end date/time')
  }

  const body = allDay
    ? { summary, description, start: { date: allDayStart }, end: { date: addOneDayStr(allDayEnd || allDayStart) } }
    : { summary, description, start: { dateTime: startIso }, end: { dateTime: endIso } }
  // Prepare the event data with all fields
  const eventData = {
        ...body,
        location: location || undefined,
        attendees: attendees 
          ? attendees.split(',').map(email => ({ email: email.trim() })) 
          : undefined
      }
      
      const isEditing = Boolean(initial?.id)
      if (isEditing) {
        await api.calendarUpdate(initial.id, eventData, token, calendarPick || 'primary')
      } else {
        await api.calendarCreate(eventData, token, calendarPick || 'primary')
      }
      try { if (window.gtag) window.gtag('event', isEditing ? 'schedule_update' : 'schedule_create', { all_day: !!allDay }) } catch (_) {}
      setSummary('')
      setDescription('')
      setLocation('')
      setAttendees('')
      setStart('')
      setEnd('')
      setAllDay(false)
      onCreated?.()
      onClose?.()
    } catch (err) {
      setError(err.message || 'Failed to create schedule')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!token || !initial?.id) return
    try {
      setDeleteLoading(true)
      setError('')
      await api.calendarDelete(token, initial.id, calendarPick || 'primary')
      onCreated?.() // Refresh the calendar
      onClose?.()
    } catch (err) {
      setError(err.message || 'Failed to archive schedule')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_18px_36px_rgba(0,0,0,0.12)] border border-[#efccd2]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#7d102a]">{initial?.id ? 'Edit Schedule' : 'Add Schedule'}</h3>
          <button onClick={onClose} className="text-[#7d102a] hover:opacity-70" aria-label="Close">✕</button>
        </div>
        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</div>}
          <input type="text" placeholder="Student name" value={summary} onChange={(e)=>setSummary(e.target.value)} className="w-full h-9 rounded-md bg-white px-3 text-[13px] text-[#2f2b33] placeholder:text-[#8c7f86] outline-none focus:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]" />
          
          <input type="hidden" value={calendarPick} readOnly />
          <label className="flex items-center gap-2 text-[13px] text-[#7d102a]">
            <input 
              type="checkbox" 
              checked={allDay} 
              onChange={(e) => {
                const newAllDayValue = e.target.checked
                setAllDay(newAllDayValue)
                if (newAllDayValue && start) {
                  setTimeout(() => setEnd(addOneDayStr(start)), 0)
                }
              }} 
            />
            All-day
          </label>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="block text-[12px] text-[#7d102a] mb-1">Start</label>
              <input 
                type={allDay ? 'date' : 'datetime-local'} 
                value={start} 
                onChange={(e) => {
                  const newStart = e.target.value
                  setStart(newStart)
                  if (allDay) {
                    setEnd(addOneDayStr(newStart))
                  }
                }} 
                className="w-full h-9 rounded-md bg-white px-3 text-[13px] text-[#2f2b33] outline-none focus:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]" 
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#7d102a] mb-1">End</label>
              <input 
                type={allDay ? 'date' : 'datetime-local'} 
                value={end} 
                onChange={(e) => setEnd(e.target.value)} 
                disabled={allDay}
                className={`w-full h-9 rounded-md px-3 text-[13px] outline-none focus:outline-none ${
                  allDay 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'bg-white text-[#2f2b33] shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]'
                }`} 
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            {initial?.id ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={deleteLoading}
                className="h-9 rounded-md bg-white text-red-600 text-[13px] font-semibold border border-red-200 px-3 disabled:opacity-50"
              >
                {deleteLoading ? 'Archiving…' : 'Archive'}
              </button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="h-9 rounded-md bg-white text-[#7d102a] text-[13px] font-semibold border border-[#efccd2] px-3">Cancel</button>
              <button type="submit" disabled={loading} className="h-9 rounded-md bg-[#8a1d35] text-white text-[13px] font-semibold disabled:opacity-50 px-3">
                {loading ? 'Saving…' : (initial?.id ? 'Update' : 'Save')}
              </button>
            </div>
          </div>
        </form>
    </div>
  </div>
  {confirmOpen && (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={() => setConfirmOpen(false)} />
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#f4c3c6] to-[#f3b1b7] p-6 border-2 border-[#6b2b2b] shadow-[0_35px_90px_rgba(239,150,150,0.35)]">
        <div className="text-center text-[#6b2b2b] font-bold text-lg mb-2">Archive this schedule?</div>
        <p className="text-center text-[#6b2b2b] text-sm">This action will remove it from active lists.</p>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={handleDelete} disabled={deleteLoading} className="rounded-full bg-[#6b0000] text-white px-6 py-2 disabled:opacity-50">{deleteLoading ? 'Archiving…' : 'Continue'}</button>
          <button onClick={() => setConfirmOpen(false)} className="rounded-full bg-white text-[#6b2b2b] border border-[#6b2b2b] px-6 py-2">Cancel</button>
        </div>
      </div>
    </div>
  )}
  </>
  )
}
