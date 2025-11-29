import { listEvents, createEvent, deleteEvent as gcalDelete, updateEvent, listCalendars, testCalendarAccess, getAutoCalendarId } from '../services/google/calendar.js';
import Schedule from '../models/Schedule.js';
import Event from '../models/Event.js';
import mongoose from 'mongoose';
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
      
      // Automatically sync ALL Google Calendar events to database first
      // This includes both existing events and new events created directly in Google Calendar
      let syncedEventIds = new Set();
      if (userId && events && events.length > 0) {
        try {
          // Sync each event to database
          for (const gEvent of events) {
            if (!gEvent.start || !gEvent.end) continue;
            
            const eventStart = new Date(gEvent.start.dateTime || gEvent.start.date);
            const eventEnd = new Date(gEvent.end.dateTime || gEvent.end.date);
            const eventTitle = gEvent.summary || 'No Title';
            const isAllDay = !!gEvent.start.date;
            
            // Sync event to database (create or update)
            // Use findOneAndUpdate with upsert to atomically check and create/update
            try {
              await Event.findOneAndUpdate(
                { googleEventId: gEvent.id, user: userId },
                {
                  title: eventTitle,
                  description: gEvent.description || '',
                  start: eventStart,
                  end: eventEnd,
                  allDay: isAllDay,
                  googleEventId: gEvent.id,
                  user: userId,
                },
                { 
                  upsert: true, 
                  new: true, 
                  setDefaultsOnInsert: true,
                  runValidators: true
                }
              );
              syncedEventIds.add(gEvent.id); // Track successfully synced events
            } catch (duplicateError) {
              // If duplicate key error (unique index violation), event was created by another request
              if (duplicateError.code === 11000) {
                const existingEvent = await Event.findOne({ googleEventId: gEvent.id, user: userId });
                if (existingEvent) {
                  await Event.findOneAndUpdate(
                    { _id: existingEvent._id },
                    {
                      title: eventTitle,
                      description: gEvent.description || '',
                      start: eventStart,
                      end: eventEnd,
                      allDay: isAllDay,
                    },
                    { new: true }
                  );
                }
                syncedEventIds.add(gEvent.id);
                console.log(`Event ${gEvent.id} already exists for user ${userId}, updated existing record`);
              } else {
                throw duplicateError;
              }
            }
          }
        } catch (syncError) {
          console.error('Error syncing events to database:', syncError);
        }
      }

      // If Google returned events successfully, remove any database events (for this user)
      // that were previously synced to Google but no longer exist there within the same range.
      // This ensures deletions done directly in Google Calendar propagate to the local database.
      if (userId) {
        try {
          const googleIds = new Set((events || []).map(ev => ev.id).filter(Boolean));
          const deletionQuery = {
            user: userId,
            googleEventId: { $exists: true, $ne: null }
          };
          // Apply time range filters if provided (same logic as fetchDatabaseEvents)
          const startRange = {};
          const endRange = {};
          if (timeMin) {
            const s = new Date(timeMin);
            if (!isNaN(s)) startRange.$gte = s;
          }
          if (timeMax) {
            const e = new Date(timeMax);
            if (!isNaN(e)) endRange.$lte = e;
          }
          if (Object.keys(startRange).length) deletionQuery.start = startRange;
          if (Object.keys(endRange).length) deletionQuery.end = endRange;

          const candidates = await Event.find(deletionQuery).select('_id googleEventId title').lean();
          const toDelete = candidates.filter(doc => !googleIds.has(doc.googleEventId));
          for (const doc of toDelete) {
            try {
              await Event.deleteOne({ _id: doc._id, user: userId });
              console.log(`Deleted local event ${doc._id} (${doc.title}) because Google event ${doc.googleEventId} is missing`);
            } catch (delErr) {
              console.error('Failed to delete local event during Google sync deletion:', { id: doc._id, err: delErr });
            }
          }
        } catch (pruneErr) {
          console.error('Error pruning deleted Google events from database:', pruneErr);
        }
      }
      
      // Get events from database that might not be in Google Calendar
      // This includes events that were created in the app or events that exist in DB but not in Google Calendar
      let dbEvents = [];
      if (userId) {
        try {
          dbEvents = await fetchDatabaseEvents(userId, { timeMin, timeMax });
        } catch (dbError) {
          console.error('Error fetching database events:', dbError);
        }
      }
      
      // Create a map of Google Calendar events by ID for quick lookup
      const googleEventMap = new Map();
      (events || []).forEach(event => {
        if (event.id) {
          googleEventMap.set(event.id, event);
        }
      });
      
      // Add database-only events that don't exist in Google Calendar
      // (Events without googleEventId remain visible even if not in Google, e.g., offline or failed sync)
      dbEvents.forEach(dbEvent => {
        if (dbEvent.id && !googleEventMap.has(dbEvent.id)) {
          // Event exists in database but not in Google Calendar - include it
          googleEventMap.set(dbEvent.id, dbEvent);
        }
      });
      
      // Convert map back to array
      const allEvents = Array.from(googleEventMap.values());
      
      return res.json({ events: allEvents });
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
    
    const isDbOnlyId = id.startsWith('db_');
    const possibleDbId = isDbOnlyId ? id.substring(3) : id;
    let deletedFromGoogle = false;
    let deletedFromDatabase = false;
    let googleEventIdToDelete = null;
    
    // First, try to find the event in database to get googleEventId if deleting by database ID
    const userId = req.user?.id;
    let dbEvent = null;
    
    if (isDbOnlyId || mongoose.Types.ObjectId.isValid(possibleDbId)) {
      // This is a database ID, find the event first to get googleEventId
      const findConditions = [];
      if (mongoose.Types.ObjectId.isValid(possibleDbId)) {
        findConditions.push({ _id: possibleDbId });
      }
      
      if (findConditions.length) {
        if (userId) {
          dbEvent = await Event.findOne({
            user: userId,
            $or: findConditions,
          });
        }
        
        if (!dbEvent) {
          dbEvent = await Event.findOne({
            $or: findConditions,
          });
        }
        
        if (dbEvent && dbEvent.googleEventId) {
          googleEventIdToDelete = dbEvent.googleEventId;
        }
      }
    } else {
      // This might be a Google Calendar ID, try to find in database
      if (userId) {
        dbEvent = await Event.findOne({ googleEventId: id, user: userId });
      }
      if (!dbEvent) {
        dbEvent = await Event.findOne({ googleEventId: id });
      }
      googleEventIdToDelete = id; // Assume the ID is the googleEventId
    }
    
    // Delete from Google Calendar if we have a googleEventId
    if (googleEventIdToDelete) {
      try {
        await gcalDelete(cid, googleEventIdToDelete);
        deletedFromGoogle = true;
      } catch (gcalError) {
        const statusCode = gcalError?.response?.status || gcalError?.code;
        if (statusCode === 404) {
          console.warn(`Google Calendar event ${googleEventIdToDelete} not found; continuing with database cleanup.`);
        } else {
          console.error('Error deleting from Google Calendar:', gcalError);
          // Continue with database deletion even if Google Calendar deletion fails
        }
      }
    }
    
    // Delete from database
    // If we found the event earlier, use its _id directly for most reliable deletion
    if (dbEvent && dbEvent._id) {
      try {
        console.log(`Deleting event from database using found _id: ${dbEvent._id}`);
        const deleteResult = await Event.deleteOne({ _id: dbEvent._id });
        console.log(`Delete result:`, deleteResult);
        deletedFromDatabase = deleteResult.deletedCount > 0;
        if (deletedFromDatabase) {
          console.log(`✅ Successfully deleted event ${dbEvent._id} from database`);
        } else {
          console.warn(`⚠️ Event ${dbEvent._id} not found for deletion (may have been already deleted)`);
        }
      } catch (dbError) {
        console.error('❌ Error deleting event from database by _id:', dbError);
        throw dbError;
      }
    } else {
      // Fallback: try to delete using googleEventId or possibleDbId
      const deleteConditions = [];
      if (googleEventIdToDelete) {
        deleteConditions.push({ googleEventId: googleEventIdToDelete });
      }
      if (mongoose.Types.ObjectId.isValid(possibleDbId)) {
        deleteConditions.push({ _id: possibleDbId });
      }
      
      if (deleteConditions.length) {
        try {
          console.log(`Attempting to delete event from database with conditions:`, deleteConditions);
          let deleteResult = null;

          // First try with user filter if userId is available
          if (userId) {
            deleteResult = await Event.deleteOne({
              user: userId,
              $or: deleteConditions,
            });
            console.log(`Delete with user filter result:`, deleteResult);
            if (deleteResult.deletedCount > 0) {
              deletedFromDatabase = true;
            }
          }

          // If no deletion happened with user filter, try without user filter
          // This handles cases where events might be shared or user doesn't match
          if (!deletedFromDatabase) {
            deleteResult = await Event.deleteOne({
              $or: deleteConditions,
            });
            console.log(`Delete without user filter result:`, deleteResult);
            deletedFromDatabase = deleteResult.deletedCount > 0;
          }

          if (!deletedFromDatabase) {
            console.warn(`⚠️ Event not found in database for deletion. Conditions:`, deleteConditions);
          } else {
            console.log(`✅ Successfully deleted event from database`);
          }
        } catch (dbError) {
          console.error('❌ Error deleting event from database:', dbError);
          throw dbError;
        }
      } else {
        console.warn(`⚠️ No delete conditions generated. ID: ${id}, googleEventIdToDelete: ${googleEventIdToDelete}, possibleDbId: ${possibleDbId}`);
      }
    }
    
    if (!deletedFromGoogle && !deletedFromDatabase && !isDbOnlyId && !googleEventIdToDelete) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    return res.json({ ok: true, deletedFrom: { google: deletedFromGoogle, database: deletedFromDatabase } });
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
