import React, { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { createEvent as gcalCreate } from '../lib/googleCalendar'

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

  if (!open) return null

  useEffect(() => {
    if (!open) return
    setSummary(initial?.summary || '')
    setDescription(initial?.description || '')
    setLocation(initial?.location || '')
    setAttendees(initial?.attendees || '')
    setAllDay(!!initial?.allDay)
    setStart(initial?.start || '')
    setEnd(initial?.end || '')
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
      const body = allDay
        ? { summary, description, start: { date: start }, end: { date: end } }
        : { summary, description, start: { dateTime: start }, end: { dateTime: end } }
      // Prepare the event data with all fields
      const eventData = {
        ...body,
        location: location || undefined,
        attendees: attendees 
          ? attendees.split(',').map(email => ({ email: email.trim() })) 
          : undefined
      }
      
      // backend decides calendarId when simple calendar is enabled; no need to send it
      await api.calendarCreate(eventData, token)
      
      // also create in Google Calendar so it appears in the embedded UI
      const gcid = calendarPick || import.meta.env.VITE_GOOGLE_CALENDAR_ID || undefined
      // Fire-and-forget: do not block the modal on Google consent or network
      ;(() => {
        const attendeeList = String(attendees || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(email => ({ email }))
        const googleEvent = {
          ...body,
          location: location || undefined,
          attendees: attendeeList.length ? attendeeList : undefined,
        }
        gcalCreate(googleEvent, { calendarId: gcid }).catch(err => {
          console.warn('Google Calendar create failed:', err)
        })
      })()
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

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_18px_36px_rgba(0,0,0,0.12)] border border-[#efccd2]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#7d102a]">Add Schedule</h3>
          <button onClick={onClose} className="text-[#7d102a] hover:opacity-70" aria-label="Close">✕</button>
        </div>
        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</div>}
          <input type="text" placeholder="Student name" value={summary} onChange={(e)=>setSummary(e.target.value)} className="w-full h-9 rounded-md bg-white px-3 text-[13px] text-[#2f2b33] placeholder:text-[#8c7f86] outline-none focus:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]" />
          
          <div className="grid grid-cols-1 gap-2">
            <label className="block text-[12px] text-[#7d102a] mb-1">Calendar</label>
            <select value={calendarPick} onChange={(e)=>setCalendarPick(e.target.value)} className="h-9 rounded-md bg-white px-3 text-[13px] text-[#2f2b33] outline-none focus:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]">
              <option value="primary">Primary</option>
              {import.meta.env.VITE_GOOGLE_CALENDAR_ID && <option value={import.meta.env.VITE_GOOGLE_CALENDAR_ID}>{import.meta.env.VITE_GOOGLE_CALENDAR_ID}</option>}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[#7d102a]">
            <input 
              type="checkbox" 
              checked={allDay} 
              onChange={(e) => {
                const newAllDayValue = e.target.checked;
                setAllDay(newAllDayValue);
                // When enabling all day, set end date same as start date
                if (newAllDayValue && start) {
                  // Use setTimeout to ensure state is updated
                  setTimeout(() => setEnd(start), 0);
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
                  const newStart = e.target.value;
                  setStart(newStart);
                  // If in allDay mode, update end to match start
                  if (allDay) {
                    setEnd(newStart);
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
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-9 rounded-md bg-white text-[#7d102a] text-[13px] font-semibold border border-[#efccd2] px-3">Cancel</button>
            <button type="submit" disabled={loading} className="h-9 rounded-md bg-[#8a1d35] text-white text-[13px] font-semibold disabled:opacity-50 px-3">{loading ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
