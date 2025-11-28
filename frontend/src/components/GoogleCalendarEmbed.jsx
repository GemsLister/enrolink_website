import { useState, useCallback, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addHours,
  isSameDay,
} from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useAuth } from "../hooks/useAuth";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../lib/googleCalendar";

// Set up the localizer
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { "en-US": enUS },
});

// Button style for toolbar
const buttonStyle = {
  padding: "0.5rem 1rem",
  borderRadius: "0.25rem",
  border: "1px solid #ccc",
  background: "white",
  cursor: "pointer",
  fontSize: "0.875rem",
};

const GoogleCalendarEmbed = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("week"); // 'month', 'week', 'day', 'agenda'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch events from backend
  const fetchEvents = useCallback(async (start, end) => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found in localStorage");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Fetching events from:", start, "to", end);

      // Get the calendar ID from environment or use 'primary'
      const calendarId = import.meta.env.VITE_GOOGLE_CALENDAR_ID || "primary";
      console.log("Using calendar ID:", calendarId);

      const response = await listEvents(
        {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          calendarId: calendarId,
        },
        token
      );

      console.log("Fetched events:", response);

      // Format events for the calendar
      // Format events for the calendar
      const formattedEvents = (response.items || []).map((event) => {
        // Handle all-day events correctly
        let startDate, endDate;

        if (event.start?.dateTime) {
          startDate = new Date(event.start.dateTime);
        } else if (event.start?.date) {
          // For all-day events, parse as UTC to avoid timezone shifts
          startDate = new Date(event.start.date + "T00:00:00Z");
        } else {
          startDate = new Date();
        }

        if (event.end?.dateTime) {
          endDate = new Date(event.end.dateTime);
        } else if (event.end?.date) {
          // For all-day events, end date in Google Calendar is exclusive
          // So we set it to the start of that day (not end of previous day)
          endDate = new Date(event.end.date + "T00:00:00Z");
        } else {
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59);
        }

        return {
          id: event.id,
          title: event.summary || "No title",
          start: startDate,
          end: endDate,
          allDay: !event.start?.dateTime,
          resource: event,
        };
      });

      console.log("Formatted events:", formattedEvents);
      setEvents(formattedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      setError(`Failed to load calendar events: ${error.message}`);
      if (error.status === 401) {
        console.log("Token might be expired or invalid");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle date selection
  const handleSelectSlot = useCallback((slotInfo) => {
    setSelectedEvent({
      id: null,
      summary: "",
      description: "",
      start: slotInfo.start,
      end: addHours(slotInfo.start, 1),
      allDay:
        slotInfo.slots.length > 1 &&
        isSameDay(slotInfo.start, slotInfo.slots[1]),
    });
    setShowEventModal(true);
  }, []);

  // Create or update event
  const handleSaveEvent = useCallback(
    async (eventData) => {
      if (!token) return;

      try {
        setIsSyncing(true);

        if (eventData.id) {
          // Update existing event
          // When updating an event
          await updateEvent(
            {
              id: eventData.id,
              summary: eventData.summary || "Updated Event",
              start: new Date(eventData.start),
              end: new Date(eventData.end),
              // ... other event properties
            },
            token
          );

          setEvents((prev) =>
            prev.map((evt) =>
              evt.id === eventData.id
                ? {
                    ...eventData,
                    start: new Date(eventData.start),
                    end: new Date(eventData.end),
                  }
                : evt
            )
          );
        } else {
          // Create new event
          const newEvent = await createEvent(
            {
              summary: eventData.summary || "New Event",
              description: eventData.description || "",
              start: { dateTime: eventData.start.toISOString() },
              end: { dateTime: eventData.end.toISOString() },
            },
            token
          );

          setEvents((prev) => [
            ...prev,
            {
              ...newEvent,
              start: new Date(newEvent.start.dateTime || newEvent.start.date),
              end: new Date(newEvent.end.dateTime || newEvent.end.date),
            },
          ]);
        }

        setShowEventModal(false);
        setSelectedEvent(null);
      } catch (err) {
        console.error("Error saving event:", err);
        setError("Failed to save event. Please try again.");
      } finally {
        setIsSyncing(false);
      }
    },
    [token]
  );

  // Handle event deletion
  const handleDeleteEvent = useCallback(async () => {
    if (!selectedEvent?.id) return;

    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        setIsSyncing(true);
        await deleteEvent(selectedEvent.id, token);
        setEvents((prev) => prev.filter((evt) => evt.id !== selectedEvent.id));
        setShowEventModal(false);
        setSelectedEvent(null);
      } catch (err) {
        console.error("Error deleting event:", err);
        setError("Failed to delete event. Please try again.");
      } finally {
        setIsSyncing(false);
      }
    }
  }, [selectedEvent, token]);

  // Handle event drop or resize
  const handleEventDropResize = useCallback(
    async ({ event, start, end, isAllDay: droppedOnAllDaySlot }) => {
      const allDay = event.allDay || droppedOnAllDaySlot;

      try {
        setIsSyncing(true);
        await updateEvent(
          {
            id: event.id,
            summary: event.summary || event.title,
            description: event.description || "",
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
            allDay,
          },
          token
        );

        setEvents((prev) =>
          prev.map((evt) =>
            evt.id === event.id ? { ...evt, start, end, allDay } : evt
          )
        );
      } catch (err) {
        console.error("Error updating event:", err);
        setError("Failed to update event. Please try again.");
      } finally {
        setIsSyncing(false);
      }
    },
    [token]
  );

  // Handle view change
  const onView = useCallback((newView) => {
    console.log("View changed to:", newView);
    setView(newView);
  }, []);

  // Handle navigation
  const onNavigate = useCallback((newDate) => {
    console.log("Navigated to:", newDate);
    setDate(newDate);
  }, []);

  // Handle range change (month/week/day view changes)
  const handleRangeChange = useCallback(
    (range) => {
      if (range.length > 0) {
        const start = new Date(range[0]);
        const end = new Date(range[range.length - 1]);
        end.setHours(23, 59, 59); // End of the last day

        console.log("Calendar range changed to:", start, "to", end);
        fetchEvents(start, end);
      }
    },
    [fetchEvents]
  );

  // Render the modal
  const renderEventModal = () => {
    if (!showEventModal || !selectedEvent) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">
            {selectedEvent.id ? "Edit Event" : "New Event"}
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleSaveEvent({
                ...selectedEvent,
                summary: formData.get("summary") || "No title",
                description: formData.get("description") || "",
                start: new Date(formData.get("start") || selectedEvent.start),
                end: new Date(formData.get("end") || selectedEvent.end),
              });
            }}
          >
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  name="summary"
                  placeholder="Event title"
                  required
                  className="w-full p-2 border rounded"
                  defaultValue={
                    selectedEvent.summary || selectedEvent.title || ""
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start
                </label>
                <input
                  type="datetime-local"
                  name="start"
                  required
                  className="w-full p-2 border rounded"
                  defaultValue={selectedEvent.start.toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End
                </label>
                <input
                  type="datetime-local"
                  name="end"
                  required
                  className="w-full p-2 border rounded"
                  defaultValue={selectedEvent.end.toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Add event description..."
                  className="w-full p-2 border rounded"
                  rows={3}
                  defaultValue={selectedEvent.description || ""}
                />
              </div>

              <div className="flex justify-between pt-2">
                <div>
                  {selectedEvent.id && (
                    <button
                      type="button"
                      onClick={handleDeleteEvent}
                      className="px-4 py-2 text-red-600 hover:text-red-800"
                      disabled={isSyncing}
                    >
                      Delete Event
                    </button>
                  )}
                </div>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventModal(false);
                      setSelectedEvent(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={isSyncing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={isSyncing}
                  >
                    {isSyncing ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Initialize calendar with current month's events
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Start from previous month
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Up to next month

    console.log("Initializing calendar with date range:", start, "to", end);
    fetchEvents(start, end);
  }, [fetchEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div style={{ height: "80vh", padding: "1rem" }}>
      {error && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            color: "#721c24",
            padding: "0.75rem",
            borderRadius: "0.25rem",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.25rem",
              cursor: "pointer",
              padding: "0 0.5rem",
            }}
          >
            &times;
          </button>
        </div>
      )}

      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={onView}
          date={date}
          onNavigate={onNavigate}
          selectable
          onSelectEvent={(event) => {
            setSelectedEvent({
              ...event,
              start:
                event.start instanceof Date
                  ? event.start
                  : new Date(event.start),
              end: event.end instanceof Date ? event.end : new Date(event.end),
            });
            setShowEventModal(true);
          }}
          views={["month", "week", "day", "agenda"]}
          components={{
            toolbar: (props) => (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => props.onNavigate("TODAY")}
                    style={buttonStyle}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => props.onNavigate("PREV")}
                    style={buttonStyle}
                  >
                    «
                  </button>
                  <button
                    onClick={() => props.onNavigate("NEXT")}
                    style={buttonStyle}
                  >
                    »
                  </button>
                </div>
                <div style={{ fontWeight: "bold" }}>{props.label}</div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {["month", "week", "day", "agenda"].map((viewType) => (
                    <button
                      key={viewType}
                      style={{
                        ...buttonStyle,
                        backgroundColor:
                          props.view === viewType ? "#1a73e8" : "",
                        color: props.view === viewType ? "white" : "",
                      }}
                      onClick={() => props.onView(viewType)}
                    >
                      {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ),
          }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.color || "#1a73e8",
              borderRadius: "4px",
              opacity: 0.9,
              color: "white",
              border: "none",
              padding: "2px 5px",
              fontSize: "0.8rem",
            },
          })}
        />
      </div>

      {/* Event Modal */}
      {showEventModal && selectedEvent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "0.5rem",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                fontSize: "1.5rem",
                marginBottom: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {selectedEvent.id ? "Edit Event" : "New Event"}
              <button
                onClick={() => setShowEventModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </h2>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Title
              </label>
              <input
                type="text"
                value={selectedEvent.title || ""}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, title: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.25rem",
                  border: "1px solid #ccc",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  Start
                </label>
                <input
                  type="datetime-local"
                  value={selectedEvent.start.toISOString().slice(0, 16)}
                  onChange={(e) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      start: new Date(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  End
                </label>
                <input
                  type="datetime-local"
                  value={selectedEvent.end.toISOString().slice(0, 16)}
                  onChange={(e) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      end: new Date(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                onClick={() => setShowEventModal(false)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.25rem",
                  border: "1px solid #ccc",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSaveEvent(selectedEvent);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.25rem",
                  border: "1px solid #1a73e8",
                  background: "#1a73e8",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarEmbed;
