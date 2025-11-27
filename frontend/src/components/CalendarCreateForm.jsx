import { useState, useEffect } from 'react';
import { createEvent } from '../lib/googleCalendar';

export default function CalendarCreateForm({ onCreated, token, calendarId = 'primary' }) {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');

  // Set initial date/time values
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hours}:${minutes}`;
    const dateTimeStr = `${dateStr}T${timeStr}`;
    
    setCurrentDateTime(dateTimeStr);
    setStart(dateTimeStr);
    
    // Set end time to 1 hour later by default
    const endTime = new Date(now);
    endTime.setHours(endTime.getHours() + 1);
    const endHours = String(endTime.getHours()).padStart(2, '0');
    const endMinutes = String(endTime.getMinutes()).padStart(2, '0');
    setEnd(`${dateStr}T${endHours}:${endMinutes}`);
  }, []);

  const handleDateChange = (e, type) => {
    const value = e.target.value;
    if (type === 'start') {
      setStart(value);
      
      // If end time is before new start time, adjust it
      if (value > end) {
        const startDate = new Date(value);
        startDate.setHours(startDate.getHours() + 1);
        const endStr = startDate.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:mm
        setEnd(endStr);
      }
    } else {
      setEnd(value);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!summary.trim()) {
      setError('Please enter a student name');
      return;
    }
    
    if (!start || !end) {
      setError('Please select both start and end times');
      return;
    }
    
    if (new Date(end) <= new Date(start)) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const event = {
        summary: summary.trim(),
        description: description.trim(),
        start: allDay 
          ? { date: start.split('T')[0] } 
          : { 
              dateTime: new Date(start).toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
        end: allDay 
          ? { date: end.split('T')[0] }
          : { 
              dateTime: new Date(end).toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
      };

      await createEvent(event, token, calendarId);
      setSuccess('Schedule created successfully!');
      
      // Reset form but keep the times for convenience
      setSummary('');
      setDescription('');
      
      // Call the onCreated callback if provided
      if (typeof onCreated === 'function') {
        onCreated();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-3xl bg-gradient-to-b from-[#efc4cd] to-[#f5d8de] p-5 shadow-[0_14px_28px_rgba(139,23,47,0.08)] border border-[#efccd2] max-w-md mx-auto">
      <h3 className="text-sm font-bold text-[#7d102a] mb-3">Add Schedule</h3>
      
      {/* Success/Error Messages */}
      {error && (
        <div className="mb-3 p-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-3 p-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded">
          {success}
        </div>
      )}

      <div className="space-y-3">
        {/* Student Name */}
        <div>
          <label className="block text-xs font-medium text-[#7d102a] mb-1">
            Student Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter student name"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full h-9 rounded-md bg-white px-3 text-sm text-[#2f2b33] placeholder:text-[#8c7f86] outline-none focus:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]"
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-[#7d102a] mb-1">
            Notes (Optional)
          </label>
          <textarea
            placeholder="Additional notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#2f2b33] placeholder:text-[#8c7f86] outline-none focus:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]"
            disabled={loading}
          />
        </div>

        {/* All-day Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allDay"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 text-[#8d1c37] focus:ring-[#8d1c37] border-[#d1a4ae] rounded"
            disabled={loading}
          />
          <label htmlFor="allDay" className="ml-2 block text-sm text-[#7d102a]">
            All-day event
          </label>
        </div>

        {/* Date/Time Picker */}
        <div className="grid grid-cols-1 gap-3">
          {/* Start Date/Time */}
          <div>
            <label className="block text-xs font-medium text-[#7d102a] mb-1">
              Start {allDay ? 'Date' : 'Date & Time'} <span className="text-red-500">*</span>
            </label>
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={allDay ? start.split('T')[0] : start}
              onChange={(e) => handleDateChange(e, 'start')}
              className="w-full h-9 rounded-md bg-white px-3 text-sm text-[#2f2b33] outline-none focus:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]"
              min={currentDateTime.split('T')[0]}
              disabled={loading}
            />
          </div>

          {/* End Date/Time */}
          <div>
            <label className="block text-xs font-medium text-[#7d102a] mb-1">
              End {allDay ? 'Date' : 'Date & Time'} <span className="text-red-500">*</span>
            </label>
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={allDay ? end.split('T')[0] : end}
              onChange={(e) => handleDateChange(e, 'end')}
              className="w-full h-9 rounded-md bg-white px-3 text-sm text-[#2f2b33] outline-none focus:outline-none shadow-[inset_0_0_0_1px_#efccd2] focus:shadow-[inset_0_0_0_2px_#cfa3ad]"
              min={allDay ? start.split('T')[0] : start}
              disabled={loading}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center h-10 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8d1c37] hover:bg-[#7a162f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8d1c37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Add Schedule'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
