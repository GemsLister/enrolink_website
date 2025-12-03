import { api } from '../api/client';

// In frontend/src/lib/googleCalendar.js
// In frontend/src/lib/googleCalendar.js
// In frontend/src/lib/googleCalendar.js
export async function listEvents(params = {}, token) {
  try {
    const { timeMin, timeMax, calendarId = 'primary' } = params;
    // Use the existing calendarEvents method which handles the URL correctly
    const data = await api.calendarEvents(token, { timeMin, timeMax, calendarId });
    // Backend returns { events: [...] }, so return it in a format that matches expected structure
    return { items: data.events || [] };
  } catch (error) {
    console.error('Error listing events:', error);
    throw error;
  }
}

// Create a new event
// In frontend/src/lib/googleCalendar.js
export async function createEvent(event, token) {
  try {
    return await api.calendarCreate({
      summary: event.summary || 'New Event',
      description: event.description || '',
      start: {
        dateTime: event.start?.dateTime || new Date().toISOString(),
        timeZone: 'Asia/Manila'
      },
      end: {
        dateTime: event.end?.dateTime || new Date(Date.now() + 3600000).toISOString(),
        timeZone: 'Asia/Manila'
      },
      ...(event.attendees && { attendees: event.attendees }),
      ...(event.location && { location: event.location })
    }, token);
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

export async function updateEvent(event, token, calendarId = 'primary') {
  if (typeof event === 'string') {
    console.warn('Deprecated: Please pass an event object instead of just the eventId');
    return updateEvent({ id: event }, token, calendarId);
  }

  if (!event.id) {
    throw new Error('Event ID is required for updating');
  }

  try {
    return await api.calendarUpdate(event.id, {
      summary: event.summary,
      description: event.description || '',
      start: {
        dateTime: event.start?.dateTime || event.start,
        timeZone: 'Asia/Manila'
      },
      end: {
        dateTime: event.end?.dateTime || event.end,
        timeZone: 'Asia/Manila'
      },
      ...(event.attendees && { attendees: event.attendees }),
      ...(event.location && { location: event.location })
    }, token);
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

// Update an existing event
// export async function updateEvent(event, token, calendarId = 'primary') {
//   if (typeof event === 'string') {
//     console.warn('Deprecated: Please pass an event object instead of just the eventId');
//     return updateEvent({ id: event }, token, calendarId);
//   }

//   if (!event.id) {
//     throw new Error('Event ID is required for updating');
//   }

//   try {
//     return await api.calendarUpdate(event.id, {
//       summary: event.summary,
//       description: event.description || '',
//       start: {
//         dateTime: event.start?.dateTime || event.start,
//         timeZone: 'Asia/Manila'
//       },
//       end: {
//         dateTime: event.end?.dateTime || event.end,
//         timeZone: 'Asia/Manila'
//       },
//       ...(event.attendees && { attendees: event.attendees }),
//       ...(event.location && { location: event.location })
//     }, token);
//   } catch (error) {
//     console.error('Error updating event:', error);
//     throw error;
//   }
// }

// Delete an event
export async function deleteEvent(eventId, token, calendarId = 'primary') {
  try {
    return await api.calendarDelete(token, eventId);
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

// These functions are kept for compatibility
export function initGoogleCalendar() {
  console.warn('initGoogleCalendar is deprecated and no longer needed');
}

export async function ensureAuth() {
  console.warn('ensureAuth is deprecated, use your auth context instead');
  return true;
}

export function clearAuth() {
  console.warn('clearAuth is deprecated, use your auth context instead');
}

// Default export with all functions
export default {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  initGoogleCalendar,
  ensureAuth,
  clearAuth
};