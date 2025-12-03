import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { listEvents } from "../lib/googleCalendar";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import ScheduleCreateModal from "./ScheduleCreateModal";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { "en-US": enUS },
  defaultLocale: "en-US",
});

export default function CalendarGrid({ calendarId: propCalendarId }) {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [initial, setInitial] = useState(null);
  const [currentView, setCurrentView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const rangeRef = useRef({ start: null, end: null });
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveConfirmIds, setArchiveConfirmIds] = useState([]);
  const [archiveConfirmLoading, setArchiveConfirmLoading] = useState(false);

  // Use the provided calendar ID or fall back to environment variable or 'primary'
  const calendarId = propCalendarId || import.meta.env.VITE_GOOGLE_CALENDAR_ID || 'primary';

  const fetchEvents = useCallback(
    async (start, end) => {
      if (!token) {
        setError("Authentication required");
        return;
      }
      setLoading(true);
      setError("");
      try {
        // Validate dates
        if (!(start instanceof Date && !isNaN(start)) || !(end instanceof Date && !isNaN(end))) {
          throw new Error(`Invalid date range: start=${start}, end=${end}`);
        }

        const timeMin = start.toISOString();
        const timeMax = end.toISOString();
        console.log('Fetching events from', timeMin, 'to', timeMax);

        console.log('Requesting events with params:', { timeMin, timeMax, calendarId });
        const data = await listEvents({ timeMin, timeMax, calendarId }, token);

        // Handle both formats: { items: [...] } and direct array
        const items = Array.isArray(data?.items)
          ? data.items
          : (Array.isArray(data) ? data : []);

        const parseAllDayDate = (dateStr) => {
          if (!dateStr) return null;
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        };

        const mapped = items.map((ev) => {
          const isAllDay = !!ev.start?.date && !!ev.end?.date && !ev.start?.dateTime && !ev.end?.dateTime;
          const startDate = isAllDay
            ? parseAllDayDate(ev.start?.date)
            : new Date(ev.start?.dateTime || ev.start?.date || new Date());
          let endDate = isAllDay
            ? parseAllDayDate(ev.end?.date)
            : new Date(ev.end?.dateTime || ev.end?.date || new Date(Date.now() + 3600000));

          // Google returns all-day end dates as exclusive (next day). Adjust so RBC
          // only shows the intended day(s) without spilling into the following day.
          if (isAllDay && endDate) {
            const inclusiveEnd = new Date(endDate.getTime() - 1);
            if (!isNaN(inclusiveEnd)) {
              endDate = inclusiveEnd;
            }
          }

          const eventData = {
            id: ev.id || `event-${Math.random().toString(36).substr(2, 9)}`,
            title: ev.summary || "Untitled Event",
            start: startDate,
            end: endDate,
            allDay: isAllDay,
            resource: {
              htmlLink: ev.htmlLink || '#',
              raw: ev // Include raw event data for debugging
            },
          };

          return eventData;
        });
        setEvents(mapped);
      } catch (e) {
        console.error("Error fetching events:", e);
        setError(e.message || "Failed to load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    [calendarId, token]
  );

  // Clear events when account token changes to avoid cross-account duplication
  useEffect(() => {
    setEvents([]);
    setError("");
  }, [token]);

  const handleSelectSlot = useCallback((slotInfo) => {
    const { start, end, allDay } = slotInfo;
    setInitial({
      summary: "",
      description: "",
      allDay,
      start,
      end: allDay ? end : new Date(start.getTime() + 60 * 60 * 1000),
    });
    setShowCreate(true);
  }, []);

  const updateEventsForView = useCallback((view, date, options = {}) => {
    // Ensure we have a valid date
    const currentDate = new Date(date);
    if (isNaN(currentDate.getTime())) {
      console.error('Invalid date provided to updateEventsForView:', date);
      return;
    }

    let start = new Date(currentDate);
    let end = new Date(currentDate);

    try {
      switch (view) {
        case "month":
          // Include entire month: timeMin at start of first day, timeMax exclusive at first day of next month
          start.setDate(1);
          start.setHours(0,0,0,0);
          end = new Date(start);
          end.setMonth(end.getMonth() + 1);
          // timeMax is exclusive, so use first day of next month at 00:00
          break;
        case "week":
          // Include 7-day window; timeMax exclusive at start + 7 days
          start.setDate(start.getDate() - start.getDay());
          start.setHours(0,0,0,0);
          end = new Date(start);
          end.setDate(start.getDate() + 7);
          break;
        case "day":
          end = new Date(start);
          end.setDate(start.getDate() + 1);
          break;
        case "agenda":
          start = new Date();
          end = new Date();
          end.setMonth(end.getMonth() + 1);
          break;
        default:
          console.warn('Unknown view type:', view);
          return;
      }

      // Final validation before fetching
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error(`Invalid date range calculated: start=${start}, end=${end}, view=${view}`);
      }

      if (!options.silent) {
        console.log(`Updating view: ${view}, from ${start} to ${end}`);
      }
      fetchEvents(start, end);
    } catch (error) {
      console.error('Error in updateEventsForView:', error);
      setError(`Failed to update calendar view: ${error.message}`);
    }
  }, [fetchEvents]);

  const handleSelectEvent = useCallback((event) => {
    const raw = event?.resource?.raw || {};
    const attendees =
      raw.attendees?.map((att) => att.email).filter(Boolean).join(", ") || "";

    setInitial({
      id: event.id,
      summary: event.title || raw.summary || "",
      description: raw.description || "",
      location: raw.location || "",
      attendees,
      allDay: !!event.allDay,
      start: event.start,
      end: event.end,
    });
    setShowCreate(true);
  }, []);

  const handleDeleteEvent = useCallback(async (eventId) => {
    if (!token || !eventId) return;
    
    try {
      setLoading(true);
      setError("");
      
      // Delete from backend (which will delete from both database and Google Calendar)
      await api.calendarDelete(token, eventId, calendarId);
      
      // Remove from local state immediately
      setEvents((prev) => prev.filter((evt) => evt.id !== eventId));
      
      // Refresh events to ensure sync
      updateEventsForView(currentView, currentDate);
      
      console.log(`Event ${eventId} deleted successfully`);
    } catch (err) {
      console.error("Error deleting event:", err);
      setError(err.message || "Failed to archive event. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, currentView, currentDate, updateEventsForView, calendarId]);

  const openArchiveConfirm = (ids) => {
    const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!list.length) return;
    setArchiveConfirmIds(list);
    setArchiveConfirmOpen(true);
  };

  const closeArchiveConfirm = () => {
    setArchiveConfirmOpen(false);
    setArchiveConfirmIds([]);
    setArchiveConfirmLoading(false);
  };

  const confirmArchive = async () => {
    if (!token || !archiveConfirmIds.length) { closeArchiveConfirm(); return; }
    try {
      setArchiveConfirmLoading(true);
      for (const id of archiveConfirmIds) {
        try { await api.calendarDelete(token, id, calendarId); } catch (_) {}
      }
      updateEventsForView(currentView, currentDate);
      setEvents((prev) => prev.filter(evt => !archiveConfirmIds.includes(evt.id)));
    } finally {
      closeArchiveConfirm();
    }
  };

  // Handle keyboard delete (Delete or Backspace key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle delete if an event is selected (modal is open)
      if (showCreate && initial?.id && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        openArchiveConfirm([initial.id]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCreate, initial, handleDeleteEvent]);

  const handleNavigate = (date, view, action) => {
    try {
      const nextDate = new Date(date);
      if (isNaN(nextDate)) {
        console.error('Invalid date after navigation:', { action, view, date });
        return;
      }

      const targetView = view || currentView;
      console.log('Navigation:', { action, targetView, nextDate });
      setCurrentDate(nextDate);
      updateEventsForView(targetView, nextDate);
    } catch (error) {
      console.error('Error in handleNavigate:', error);
      const fallbackDate = new Date();
      setCurrentDate(fallbackDate);
      updateEventsForView(view || currentView, fallbackDate);
    }
  };

  const handleView = (view) => {
    setCurrentView(view);
    updateEventsForView(view, currentDate);
  };

  const eventStyleGetter = (event) => {
    const backgroundColor = "#1a73e8"; // Google Calendar blue
    const style = {
      backgroundColor,
      borderRadius: "4px",
      opacity: 0.9,
      color: "white",
      border: "none",
      display: "block",
      padding: "2px 5px",
      fontSize: "0.85rem",
    };
    return { style };
  };

  // Initial load
  useEffect(() => {
    updateEventsForView(currentView, currentDate);
  }, [calendarId, token, updateEventsForView]); // Add token as a dependency

  // Auto-refresh when window gains focus or at intervals
  useEffect(() => {
    if (!token) return;
    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        updateEventsForView(currentView, currentDate, { silent: true });
      }
    };
    const handleFocus = () => updateEventsForView(currentView, currentDate, { silent: true });
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    const refreshMs = Number(import.meta.env.VITE_CALENDAR_REFRESH_MS || 60000);
    const intervalId = setInterval(() => {
      updateEventsForView(currentView, currentDate, { silent: true });
    }, refreshMs);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      clearInterval(intervalId);
    };
  }, [token, currentDate, currentView, updateEventsForView]);

  const CustomToolbar = (toolbar) => {
    const { label, onNavigate, onView, view } = toolbar;

    const handleNavigate = (action) => {
      onNavigate(action);
    };
    const handleSync = async () => {
      try {
        if (!token) {
          setError('Authentication required');
          return;
        }
        setError('');
        setLoading(true);
        const result = await api.calendarPushToGoogle(token);
        console.log('Push to Google result:', result);
        updateEventsForView(currentView, currentDate, { silent: true });
        sendGaEvent('calendar_push_to_google')
      } catch (e) {
        console.error('Failed to push events to Google:', e);
        setError(e.message || 'Failed to push events to Google Calendar');
      } finally {
        setLoading(false);
      }
    };
  
    const showSyncBtn = String(import.meta.env.VITE_ENABLE_CALENDAR_SYNC_BUTTON || '').toLowerCase() === 'true'
    return (
      <div className="rbc-toolbar p-5">
        <div className="rbc-btn-group" style={{ marginRight: 'auto' }}>
          <button
            type="button"
            onClick={() => handleNavigate('TODAY')}
            className="rbc-btn rbc-btn-today"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('PREV')}
            className="rbc-btn rbc-btn-nav"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('NEXT')}
            className="rbc-btn rbc-btn-nav"
          >
            ›
          </button>
          <span className="rbc-toolbar-label" style={{ marginLeft: '10px' }}>
            {label}
          </span>
        </div>
        <div className="rbc-btn-group">
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              type="button"
              className={`rbc-btn ${view === v ? 'rbc-active' : ''}`}
              onClick={() => onView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          {showSyncBtn && (
            <button
              type="button"
              className="rbc-btn"
              onClick={handleSync}
              style={{ marginLeft: '8px' }}
            >
              Sync to Google
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '500px', padding: '20px' }}>
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        selectable
        components={{
          toolbar: CustomToolbar,
          event: (props) => {
            return (
              <div
                style={props.style}
                title={props.event.title}
                onClick={() => handleSelectEvent(props.event)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openArchiveConfirm([props.event.id]);
                }}
              >
                {props.event.title}
              </div>
            );
          }
        }}
        view={currentView}
        onView={handleView}
        date={currentDate}
        onNavigate={handleNavigate}
        eventPropGetter={eventStyleGetter}
      />
      {showCreate && (
        <ScheduleCreateModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          initial={initial}
          onCreated={() => {
            setShowCreate(false);
            updateEventsForView(currentView, currentDate);
          }}
          calendarId={calendarId}
        />
      )}
      {archiveConfirmOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={closeArchiveConfirm} />
          <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#f4c3c6] to-[#f3b1b7] p-6 border-2 border-[#6b2b2b] shadow-[0_35px_90px_rgba(239,150,150,0.35)]">
            <div className="text-center text-[#6b2b2b] font-bold text-lg mb-2">
              {archiveConfirmIds.length > 1 ? 'Archive these schedules?' : 'Archive this schedule?'}
            </div>
            <p className="text-center text-[#6b2b2b] text-sm">This action will remove it from active lists.</p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={confirmArchive} disabled={archiveConfirmLoading} className="rounded-full bg-[#6b0000] text-white px-6 py-2 disabled:opacity-50">{archiveConfirmLoading ? 'Archiving…' : 'Continue'}</button>
              <button onClick={closeArchiveConfirm} className="rounded-full bg-white text-[#6b2b2b] border border-[#6b2b2b] px-6 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  const sendGaEvent = (name, params = {}) => {
    try { if (window.gtag) window.gtag('event', name, params) } catch (_) {}
  }
