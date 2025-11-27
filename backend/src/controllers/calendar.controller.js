import { listEvents, createEvent, deleteEvent as gcalDelete, updateEvent, listCalendars, testCalendarAccess, getAutoCalendarId } from '../services/google/calendar.js';
import Schedule from '../models/Schedule.js';
import Event from '../models/Event.js';
import { google } from 'googleapis';

async function fetchDatabaseEvents(userId, { timeMin, timeMax }) {
  if (!userId) return [];

  const query = { user: userId };
  const startRange = {};
  const endRange = {};

  if (timeMin) {
    const startDate = new Date(timeMin);
    if (!isNaN(startDate)) {
      startRange.$gte = startDate;
    }
  }

  if (timeMax) {
    const endDate = new Date(timeMax);
    if (!isNaN(endDate)) {
      endRange.$lte = endDate;
    }
  }

  if (Object.keys(startRange).length) {
    query.start = { ...(query.start || {}), ...startRange };
  }
  if (Object.keys(endRange).length) {
    query.end = { ...(query.end || {}), ...endRange };
  }

  const rows = await Event.find(query).sort({ start: 1 }).lean();

  return rows.map((row) => {
    const allDay = !!row.allDay;
    return {
      id: row.googleEventId || String(row._id),
      summary: row.title,
      description: row.description,
      start: allDay
        ? { date: row.start.toISOString().split('T')[0] }
        : { dateTime: row.start.toISOString() },
      end: allDay
        ? { date: row.end.toISOString().split('T')[0] }
        : { dateTime: row.end.toISOString() },
      htmlLink: null,
      source: 'database',
    };
  });
}

// Helper function to get calendar ID with auto-detection
async function getCalendarId(req) {
  // Priority: query param > env var > auto-detect
  if (req.query.calendarId) {
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

export async function list(req, res, next) {
  try {
    const { timeMin, timeMax } = req.query;
    const cid = await getCalendarId(req);
    const userId = req.user?.id || null;
    
    // Check if using simple calendar (database-only mode)
    if (String(process.env.USE_SIMPLE_CALENDAR || '').toLowerCase() === 'true') {
      const q = { calendarId: cid };
      const rows = await Schedule.find(q).sort({ 'start.dateTime': 1, 'start.date': 1 }).lean();
      const mapped = rows.map(r => ({
        id: String(r._id),
        summary: r.summary,
        description: r.description,
        start: r.start,
        end: r.end,
        htmlLink: r.htmlLink || null,
      }));
      return res.json({ events: mapped });
    }
    
    // Try to get events from Google Calendar
    try {
      const events = await listEvents(cid, { timeMin, timeMax });
      return res.json({ events: events || [] });
    } catch (gcalError) {
      console.error('Google Calendar API error:', {
        message: gcalError.message,
        code: gcalError.code,
        response: gcalError.response?.data
      });
      
      // Fall back to database events if Google Calendar fails
      try {
        const dbEvents = await fetchDatabaseEvents(userId, { timeMin, timeMax });
        if (dbEvents.length) {
          console.warn('Google Calendar error, returning database events instead.');
          return res.json({ events: dbEvents });
        }
      } catch (dbError) {
        console.error('Failed to read events from database fallback:', dbError);
      }

      console.warn('Google Calendar error, returning empty events. Error:', gcalError.message);
      return res.json({ events: [] });
    }
  } catch (e) {
    console.error('Error in list function:', {
      message: e.message,
      stack: e.stack,
      response: e.response?.data,
      status: e.response?.status,
      code: e.code
    });
    
    // Try database fallback before giving up
    try {
      const userId = req.user?.id;
      const { timeMin, timeMax } = req.query;
      const dbEvents = await fetchDatabaseEvents(userId, { timeMin, timeMax });
      if (dbEvents.length) {
        console.warn('Calendar error, returning database events instead. Error:', e.message);
        return res.json({ events: dbEvents });
      }
    } catch (dbError) {
      console.error('Fallback database read failed:', dbError);
    }

    console.warn('Calendar error, returning empty events. Error:', e.message);
    return res.json({ events: [] });
  }
}

export async function remove(req, res, next) {
  try {
    const cid = await getCalendarId(req);
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (String(process.env.USE_SIMPLE_CALENDAR || '').toLowerCase() === 'true') {
      const r = await Schedule.findOneAndDelete({ _id: id, calendarId: cid });
      if (!r) return res.status(404).json({ error: 'not found' });
      return res.json({ ok: true });
    }
    
    // Delete from Google Calendar
    await gcalDelete(cid, id);
    
    // Also delete from database if the event exists
    const userId = req.user?.id;
    if (userId) {
      try {
        await Event.findOneAndDelete({ googleEventId: id, user: userId });
      } catch (dbError) {
        console.error('Error deleting event from database:', dbError);
        // Continue even if database delete fails - event is already deleted from Google Calendar
      }
    }
    
    return res.json({ ok: true });
  } catch (e) {
    const status = e?.response?.status || e?.code === 401 ? 401 : (e?.code === 403 ? 403 : 500);
    const message = e?.response?.data?.error?.message || e?.message || 'Calendar error';
    return res.status(status).json({ error: message });
  }
}

// Sync events from Google Calendar to local database
export async function syncCalendar(req, res, next) {
  try {
    const { timeMin, timeMax } = req.body;
    const cid = await getCalendarId(req);
    
    // Get the authenticated user's ID
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get events from Google Calendar
    const googleEvents = await listEvents(cid, { timeMin, timeMax });
    
    // Sync each event to our database
    const syncedEvents = [];
    
    for (const gEvent of googleEvents) {
      // Skip events that don't have a valid start/end time
      if (!gEvent.start || !gEvent.end) continue;
      
      // Check if event already exists in our database
      let event = await Event.findOne({ googleEventId: gEvent.id, user: userId });
      
      if (event) {
        // Update existing event
        event = await Event.findOneAndUpdate(
          { _id: event._id, user: userId },
          {
            title: gEvent.summary || 'No Title',
            description: gEvent.description || '',
            start: new Date(gEvent.start.dateTime || gEvent.start.date),
            end: new Date(gEvent.end.dateTime || gEvent.end.date),
            allDay: !!gEvent.start.date, // If it has a date but no dateTime, it's an all-day event
          },
          { new: true }
        );
      } else {
        // Create new event
        event = new Event({
          title: gEvent.summary || 'No Title',
          description: gEvent.description || '',
          start: new Date(gEvent.start.dateTime || gEvent.start.date),
          end: new Date(gEvent.end.dateTime || gEvent.end.date),
          allDay: !!gEvent.start.date,
          googleEventId: gEvent.id,
          user: userId,
        });
        await event.save();
      }
      
      syncedEvents.push(event);
    }
    
    res.json({ success: true, synced: syncedEvents.length });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync with Google Calendar' });
  }
}

// Sync database events TO Google Calendar (push local events to Google)
export async function pushToGoogleCalendar(req, res, next) {
  try {
    const cid = await getCalendarId(req);
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find all events in database that don't have a googleEventId (not synced yet)
    const unsyncedEvents = await Event.find({
      user: userId,
      $or: [
        { googleEventId: { $exists: false } },
        { googleEventId: null },
        { googleEventId: '' }
      ]
    });

    const synced = [];
    const failed = [];

    for (const dbEvent of unsyncedEvents) {
      try {
        // Convert database event to Google Calendar format
        const googleEventData = {
          summary: dbEvent.title,
          description: dbEvent.description || '',
          start: dbEvent.allDay
            ? { date: dbEvent.start.toISOString().split('T')[0] }
            : {
                dateTime: dbEvent.start.toISOString(),
                timeZone: process.env.CALENDAR_TIMEZONE || 'Asia/Manila'
              },
          end: dbEvent.allDay
            ? { date: dbEvent.end.toISOString().split('T')[0] }
            : {
                dateTime: dbEvent.end.toISOString(),
                timeZone: process.env.CALENDAR_TIMEZONE || 'Asia/Manila'
              }
        };

        // Create event in Google Calendar
        const googleEvent = await createEvent(cid, googleEventData);
        
        // Update database event with Google Calendar ID
        await Event.findByIdAndUpdate(dbEvent._id, {
          googleEventId: googleEvent.id
        });

        synced.push({
          dbId: dbEvent._id,
          googleId: googleEvent.id,
          title: dbEvent.title
        });
      } catch (error) {
        const errorDetails = {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          response: error.response?.data
        };
        console.error(`❌ Failed to sync event ${dbEvent._id} (${dbEvent.title}):`, errorDetails);
        failed.push({
          dbId: dbEvent._id,
          title: dbEvent.title,
          error: error.message,
          details: errorDetails
        });
      }
    }

    res.json({
      success: true,
      synced: synced.length,
      failed: failed.length,
      syncedEvents: synced,
      failedEvents: failed
    });
  } catch (err) {
    console.error('Push to Google Calendar error:', err);
    res.status(500).json({ error: 'Failed to push events to Google Calendar: ' + err.message });
  }
}

export async function create(req, res, next) {
  try {
    const cid = await getCalendarId(req);
    const body = req.body || {};
    if (!body.summary) return res.status(400).json({ error: 'summary is required' });
    if (!body.start || !body.end) return res.status(400).json({ error: 'start and end are required' });

    // Normalize event times for Google Calendar: ensure RFC3339 or provide a timeZone
    const tz = process.env.CALENDAR_TIMEZONE || 'Asia/Manila';
    const norm = (part) => {
      if (!part) return part;
      const out = { ...part };
      if (out.dateTime) {
        const s = String(out.dateTime);
        const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s);
        // If no timezone info provided, keep the local wall time and attach explicit timeZone
        if (!hasTz) {
          out.timeZone = out.timeZone || tz;
        }
      }
      return out;
    };
    body.start = norm(body.start);
    body.end = norm(body.end);

    if (String(process.env.USE_SIMPLE_CALENDAR || '').toLowerCase() === 'true') {
      const allDay = !!body.start?.date && !!body.end?.date;
      const doc = await Schedule.create({
        calendarId: cid,
        summary: body.summary,
        description: body.description || '',
        start: body.start,
        end: body.end,
        allDay,
        createdBy: req.user?.id || null,
      });
      const event = {
        id: String(doc._id),
        summary: doc.summary,
        description: doc.description,
        start: doc.start,
        end: doc.end,
        htmlLink: null,
      };
      return res.status(201).json({ event });
    }
    
    // Get user ID first
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Parse dates for database
    const allDay = !!body.start?.date && !!body.end?.date;
    let startDate = body.start?.dateTime ? new Date(body.start.dateTime) : 
                  (body.start?.date ? new Date(body.start.date) : new Date());
    let endDate = body.end?.dateTime ? new Date(body.end.dateTime) : 
                 (body.end?.date ? new Date(body.end.date) : new Date(startDate.getTime() + 3600000));
    
    // Try to create event in Google Calendar first
    let googleEvent = null;
    let googleEventId = null;
    try {
      console.log('🔄 Attempting to create event in Google Calendar:', {
        calendarId: cid,
        summary: body.summary,
        start: body.start,
        end: body.end
      });
      
      googleEvent = await createEvent(cid, body);
      googleEventId = googleEvent?.id;
      console.log('✅ Event created in Google Calendar:', {
        googleEventId,
        htmlLink: googleEvent?.htmlLink,
        calendarId: cid
      });
    } catch (gcalError) {
      const errorDetails = {
        message: gcalError.message,
        code: gcalError.code,
        status: gcalError.response?.status,
        response: gcalError.response?.data,
        calendarId: cid
      };
      
      console.error('❌ Google Calendar create failed:', errorDetails);
      
      // Provide specific error messages
      if (gcalError.code === 401 || gcalError.code === 403) {
        console.error('⚠️  Authentication/Authorization Error:');
        console.error('   - Service account may not have access to this calendar');
        console.error('   - Calendar ID:', cid);
        console.error('   - Service account email:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 
          (JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)?.client_email || 'unknown') : 'unknown');
        console.error('   - Solution: Share the calendar with the service account email');
      } else if (gcalError.code === 404) {
        console.error('⚠️  Calendar Not Found:');
        console.error('   - Calendar ID:', cid);
        console.error('   - Solution: Check if the calendar ID is correct. Use /api/calendar/calendars to list available calendars');
      } else if (gcalError.message?.includes('credentials') || 
                  gcalError.message?.includes('GCP credentials')) {
        console.error('⚠️  Credentials Error:');
        console.error('   - Check your GOOGLE_APPLICATION_CREDENTIALS or GCP_CREDENTIALS environment variable');
      }
      
      // Continue - we'll save to database anyway and can sync later
    }
    
    // ALWAYS save to database (whether Google Calendar worked or not)
    let dbEvent;
    try {
      dbEvent = await Event.create({
        title: body.summary,
        description: body.description || '',
        start: startDate,
        end: endDate,
        allDay: allDay,
        googleEventId: googleEventId, // Will be null if Google Calendar failed
        user: userId,
      });
      console.log('Event saved to database:', dbEvent._id);
    } catch (dbError) {
      console.error('Database save error:', dbError);
      return res.status(500).json({ error: 'Failed to save event to database: ' + dbError.message });
    }
    
    // Return response in Google Calendar format (use Google event if available, otherwise use DB event)
    const responseEvent = googleEvent || {
      id: `db_${dbEvent._id}`,
      summary: body.summary,
      description: body.description || '',
      start: body.start,
      end: body.end,
    };
    
    res.status(201).json({ event: responseEvent });
  } catch (e) {
    console.error('Unexpected error in create function:', {
      message: e.message,
      stack: e.stack,
      name: e.name,
      code: e.code,
      response: e.response?.data
    });
    
    // Always try to save to database even on unexpected errors
    try {
      const userId = req.user?.id;
      if (userId && req.body) {
        const body = req.body;
        const allDay = !!body.start?.date && !!body.end?.date;
        let startDate = body.start?.dateTime ? new Date(body.start.dateTime) : 
                      (body.start?.date ? new Date(body.start.date) : new Date());
        let endDate = body.end?.dateTime ? new Date(body.end.dateTime) : 
                     (body.end?.date ? new Date(body.end.date) : new Date(startDate.getTime() + 3600000));
        
        const dbEvent = await Event.create({
          title: body.summary || 'Untitled Event',
          description: body.description || '',
          start: startDate,
          end: endDate,
          allDay: allDay,
          user: userId,
        });
        
        // Return success with database event
        return res.status(201).json({ 
          event: {
            id: `db_${dbEvent._id}`,
            summary: body.summary,
            description: body.description || '',
            start: body.start,
            end: body.end,
          }
        });
      }
    } catch (dbError) {
      console.error('Failed to save to database as fallback:', dbError);
    }
    
    const status = e?.response?.status || (e?.code === 401 ? 401 : (e?.code === 403 ? 403 : 500));
    const message = e?.response?.data?.error?.message || e?.message || 'Calendar error';
    return res.status(status).json({ error: message });
  }
}

// List all available calendars
export async function listAvailableCalendars(req, res, next) {
  try {
    const calendars = await listCalendars();
    const formatted = calendars.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      accessRole: cal.accessRole,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor,
      primary: cal.primary || false,
    }));
    res.json({ calendars: formatted });
  } catch (error) {
    console.error('Error listing calendars:', error);
    res.status(500).json({ 
      error: 'Failed to list calendars',
      message: error.message,
      details: error.response?.data
    });
  }
}

// Test calendar access and permissions
export async function testAccess(req, res, next) {
  try {
    const cid = await getCalendarId(req);
    const result = await testCalendarAccess(cid);
    res.json(result);
  } catch (error) {
    console.error('Error testing calendar access:', error);
    res.status(500).json({ 
      error: 'Failed to test calendar access',
      message: error.message,
      details: error.response?.data
    });
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { summary, description, start, end, location, attendees } = req.body;
    const calendarId = await getCalendarId(req);

    // For local database (when USE_SIMPLE_CALENDAR is true)
    if (String(process.env.USE_SIMPLE_CALENDAR || '').toLowerCase() === 'true') {
      const updateData = {};
      if (summary) updateData.summary = summary;
      if (description) updateData.description = description;
      if (start) updateData.start = start;
      if (end) updateData.end = end;
      if (location) updateData.location = location;

      const updatedEvent = await Schedule.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      return res.json({
        id: String(updatedEvent._id),
        summary: updatedEvent.summary,
        description: updatedEvent.description,
        start: updatedEvent.start,
        end: updatedEvent.end,
        location: updatedEvent.location,
        htmlLink: updatedEvent.htmlLink || null
      });
    }

    // For Google Calendar
    const eventData = {
      summary,
      description,
      start,
      end,
      ...(location && { location }),
      ...(attendees && { attendees })
    };

    const updatedEvent = await updateEvent(calendarId, id, eventData);
    
    // Also update in database if the event exists
    const userId = req.user?.id;
    if (userId && updatedEvent.id) {
      try {
        const dbEvent = await Event.findOne({ googleEventId: id, user: userId });
        if (dbEvent) {
          const updateData = {};
          if (summary !== undefined) updateData.title = summary;
          if (description !== undefined) updateData.description = description;
          
          // Use dates from Google Calendar response if available, otherwise use request body
          if (updatedEvent.start) {
            updateData.start = new Date(updatedEvent.start.dateTime || updatedEvent.start.date);
            updateData.allDay = !!updatedEvent.start.date;
          } else if (start) {
            updateData.start = new Date(start.dateTime || start.date);
            updateData.allDay = !!start.date;
          }
          
          if (updatedEvent.end) {
            updateData.end = new Date(updatedEvent.end.dateTime || updatedEvent.end.date);
          } else if (end) {
            updateData.end = new Date(end.dateTime || end.date);
          }
          
          await Event.findByIdAndUpdate(dbEvent._id, { $set: updateData });
        }
      } catch (dbError) {
        console.error('Error updating event in database:', dbError);
        // Continue even if database update fails
      }
    }
    
    res.json(updatedEvent);

  } catch (error) {
    console.error('Update error:', error);
    const status = error.response?.status || 
                 (error.code === 404 ? 404 : 
                 (error.code === 401 ? 401 : 
                 (error.code === 403 ? 403 : 500)));
    const message = error.response?.data?.error?.message || error.message || 'Failed to update event';
    res.status(status).json({ error: message });
  }
}