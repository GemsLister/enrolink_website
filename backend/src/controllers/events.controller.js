import Event from '../models/Event.js';
import { deleteEvent as gcalDelete, getAutoCalendarId } from '../services/google/calendar.js';

// Helper function to get calendar ID (same logic as calendar controller)
async function getCalendarId(req) {
  // Priority: query param > env var > auto-detect
  if (req.query?.calendarId) {
    return req.query.calendarId;
  }
  if (process.env.GOOGLE_CALENDAR_ID && process.env.GOOGLE_CALENDAR_ID !== 'primary') {
    return process.env.GOOGLE_CALENDAR_ID;
  }
  if (process.env.CALENDAR_ID && process.env.CALENDAR_ID !== 'primary') {
    return process.env.CALENDAR_ID;
  }
  // Auto-detect calendar ID
  return await getAutoCalendarId();
}

// Get events within date range
export const getEvents = async (req, res) => {
  try {
    const { start, end } = req.query;
    const events = await Event.find({
      user: req.user.id,
      start: { $gte: new Date(start) },
      end: { $lte: new Date(end) }
    }).sort({ start: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create new event
export const createEvent = async (req, res) => {
  try {
    const event = new Event({
      ...req.body,
      user: req.user.id
    });
    const newEvent = await event.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true }
    );
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Delete from Google Calendar FIRST (before deleting from database)
    // This ensures we can still retry if Google Calendar deletion fails
    let deletedFromGoogle = false;
    if (event.googleEventId) {
      try {
        const calendarId = await getCalendarId(req);
        console.log(`Attempting to delete event ${event.googleEventId} from Google Calendar ${calendarId}`);
        await gcalDelete(calendarId, event.googleEventId);
        deletedFromGoogle = true;
        console.log(`✅ Successfully deleted event ${event.googleEventId} from Google Calendar`);
      } catch (gcalError) {
        const statusCode = gcalError?.response?.status || gcalError?.code;
        if (statusCode === 404) {
          console.warn(`⚠️ Google Calendar event ${event.googleEventId} not found (404); continuing with database deletion.`);
          deletedFromGoogle = true; // Consider it deleted if it doesn't exist
        } else {
          console.error('❌ Failed to delete Google Calendar event:', {
            message: gcalError.message,
            code: gcalError.code,
            status: statusCode,
            response: gcalError.response?.data,
            googleEventId: event.googleEventId,
            calendarId: await getCalendarId(req).catch(() => 'unknown')
          });
          // Don't continue - throw error so user knows deletion failed
          // This ensures the event stays in database if Google Calendar deletion fails
          return res.status(500).json({ 
            message: 'Failed to delete event from Google Calendar',
            error: gcalError.message,
            details: {
              googleEventId: event.googleEventId,
              code: gcalError.code
            }
          });
        }
      }
    } else {
      console.log(`Event ${event._id} has no googleEventId, skipping Google Calendar deletion`);
    }

    // Delete from database
    await Event.deleteOne({ _id: event._id });
    console.log(`Successfully deleted event ${event._id} from database`);

    res.json({ 
      message: 'Event deleted',
      deletedFrom: {
        google: deletedFromGoogle,
        database: true
      }
    });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ message: err.message });
  }
};