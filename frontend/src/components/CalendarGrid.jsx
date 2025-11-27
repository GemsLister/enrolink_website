import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  listEvents,
  deleteEvent as gcDeleteEvent,
} from "../lib/googleCalendar";
import { useAuth } from "../hooks/useAuth";
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
        console.log('Received events data:', data);

        // Handle both formats: { items: [...] } and direct array
        const items = Array.isArray(data?.items)
          ? data.items
          : (Array.isArray(data) ? data : []);

        console.log(`Found ${items.length} events`);
        const mapped = items.map((ev) => {
          const eventData = {
            id: ev.id || `event-${Math.random().toString(36).substr(2, 9)}`,
            title: ev.summary || "Untitled Event",
            start: new Date(ev.start?.dateTime || ev.start?.date || new Date()),
            end: new Date(ev.end?.dateTime || ev.end?.date || new Date(Date.now() + 3600000)),
            allDay: !!ev.start?.date,
            resource: {
              htmlLink: ev.htmlLink || '#',
              raw: ev // Include raw event data for debugging
            },
          };

          console.log('Mapped event:', eventData);
          return eventData;
        });

        console.log('Setting events:', mapped);
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

  const handleSelectEvent = useCallback(async (event) => {
    if (!token) {
      setError("Authentication required");
      return;
    }

    if (!event?.id) {
      setError("Cannot delete event without an identifier");
      return;
    }

    const eventTitle = event.title || event.summary || "this event";
    const confirmed = window.confirm(`Delete "${eventTitle}"? This cannot be undone.`);
    if (!confirmed) return;

    setError("");

    try {
      await gcDeleteEvent(event.id, token, calendarId);
      setEvents((prev) => prev.filter((ev) => ev.id !== event.id));
      updateEventsForView(currentView, currentDate);
    } catch (err) {
      console.error("Error deleting event:", err);
      setError(err.message || "Failed to delete event");
    }
  }, [token, calendarId, currentView, currentDate]);

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

  const updateEventsForView = (view, date) => {
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
          start.setDate(1);
          end.setMonth(end.getMonth() + 1);
          end.setDate(0);
          break;
        case "week":
          start.setDate(start.getDate() - start.getDay());
          end = new Date(start);
          end.setDate(start.getDate() + 6);
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

      console.log(`Updating view: ${view}, from ${start} to ${end}`);
      fetchEvents(start, end);
    } catch (error) {
      console.error('Error in updateEventsForView:', error);
      setError(`Failed to update calendar view: ${error.message}`);
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
    console.log('Initializing calendar with ID:', calendarId);
    console.log('Using token:', token ? 'Token exists' : 'No token found');

    // Log environment variables for debugging
    console.log('Environment variables:', {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_GOOGLE_CALENDAR_ID: import.meta.env.VITE_GOOGLE_CALENDAR_ID
    });

    updateEventsForView(currentView, currentDate);

    // Log the current date range being requested
    const start = new Date(currentDate);
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);

    console.log('Fetching events for date range:', {
      start: start.toISOString(),
      end: end.toISOString(),
      view: currentView,
      calendarId
    });

    // Log the current events state
    console.log('Current events state:', events);
  }, [calendarId, token]); // Add token as a dependency

  const CustomToolbar = (toolbar) => {
    const { label, onNavigate, onView, view } = toolbar;

    const handleNavigate = (action) => {
      onNavigate(action);
    };
  
    return (
      <div className="rbc-toolbar" style={{ padding: '8px 0' }}>
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
          {['month', 'week', 'day', 'agenda'].map((v) => (
            <button
              key={v}
              type="button"
              className={`rbc-btn ${view === v ? 'rbc-active' : ''}`}
              onClick={() => onView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '800px', padding: '20px' }}>
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
          toolbar: CustomToolbar
        }}
        view={currentView}
        onView={handleView}
        date={currentDate}
        onNavigate={handleNavigate}
        eventPropGetter={eventStyleGetter}
      />
      {showCreate && (
        <ScheduleCreateModal
          show={showCreate}
          onHide={() => setShowCreate(false)}
          initialValues={initial}
          onSave={() => {
            setShowCreate(false);
            updateEventsForView(currentView, currentDate);
          }}
          calendarId={calendarId}
        />
      )}
    </div>
  );
}
