import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function loadCredentials() {
  // First, try to get credentials from environment variable as JSON
  if (process.env.GCP_CREDENTIALS) {
    try {
      const creds = JSON.parse(process.env.GCP_CREDENTIALS);
      if (!creds.client_email) throw new Error('Missing client_email in GCP credentials');
      if (!creds.private_key) throw new Error('Missing private_key in GCP credentials');
      
        // Normalize escaped newlines if present
        if (typeof creds.private_key === 'string') {
          // Handle multiple escape formats: \\n, \n, and actual newlines
          creds.private_key = creds.private_key
            .replace(/\\\\n/g, '\\n')      // Double escaped -> single escaped
            .replace(/\\n/g, '\n')         // Single escaped -> actual newline
            .replace(/\r\n/g, '\n')        // Windows line endings -> Unix
            .replace(/\\r\\n/g, '\n');     // Escaped Windows line endings
        }
        
        console.log('Using GCP credentials from GCP_CREDENTIALS environment variable');
        return creds;
    } catch (error) {
      console.error('Error parsing GCP_CREDENTIALS:', error);
    }
  }

  // Then try GOOGLE_APPLICATION_CREDENTIALS - could be JSON string or file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      // First, try to parse it as JSON (if it's a JSON string)
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS.trim().startsWith('{')) {
        const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        if (!creds.client_email) throw new Error('Missing client_email in GCP credentials');
        if (!creds.private_key) throw new Error('Missing private_key in GCP credentials');
        
        // Normalize escaped newlines if present
        if (typeof creds.private_key === 'string') {
          // Handle multiple escape formats: \\n, \n, and actual newlines
          creds.private_key = creds.private_key
            .replace(/\\\\n/g, '\\n')      // Double escaped -> single escaped
            .replace(/\\n/g, '\n')         // Single escaped -> actual newline
            .replace(/\r\n/g, '\n')        // Windows line endings -> Unix
            .replace(/\\r\\n/g, '\n');     // Escaped Windows line endings
        }
        
        console.log('Using GCP credentials from GOOGLE_APPLICATION_CREDENTIALS (JSON)');
        return creds;
      }
      
      // Otherwise, treat it as a file path
      const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const creds = JSON.parse(fileContent);
        
        if (!creds.client_email) throw new Error('Missing client_email in GCP credentials');
        if (!creds.private_key) throw new Error('Missing private_key in GCP credentials');
        
        // Normalize escaped newlines if present
        if (typeof creds.private_key === 'string') {
          creds.private_key = creds.private_key.replace(/\\\\n/g, '\\n');
        }
        
        console.log(`Using GCP credentials from file: ${filePath}`);
        return creds;
      }
    } catch (error) {
      console.error('Error loading credentials from GOOGLE_APPLICATION_CREDENTIALS:', error);
    }
  }

  // Fallback to file-based credentials in common locations
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const candidates = [
      path.resolve(__dirname, '../../..', 'svc.json'),
      path.resolve(__dirname, '../../', 'svc.json'),
      path.resolve(process.cwd(), 'src', '..', 'svc.json'),
      path.resolve(process.cwd(), 'svc.json'),
    ];
    
    for (const p of candidates) {
      try { 
        if (fs.existsSync(p)) { 
          console.log(`Loading GCP credentials from ${p}`);
          const fileRaw = fs.readFileSync(p, 'utf8');
          const creds = JSON.parse(fileRaw);
          
          if (!creds.client_email) throw new Error(`Missing client_email in ${p}`);
          if (!creds.private_key) throw new Error(`Missing private_key in ${p}`);
          
          // Normalize escaped newlines if present
          if (typeof creds.private_key === 'string') {
            // Handle multiple escape formats: \\n, \n, and actual newlines
            creds.private_key = creds.private_key
              .replace(/\\\\n/g, '\\n')      // Double escaped -> single escaped
              .replace(/\\n/g, '\n')         // Single escaped -> actual newline
              .replace(/\r\n/g, '\n')        // Windows line endings -> Unix
              .replace(/\\r\\n/g, '\n');     // Escaped Windows line endings
          }
          
          return creds;
        } 
      } catch (error) {
        console.error(`Error reading ${p}:`, error);
      }
    }
  } catch (error) {
    console.error('Error loading credentials:', error);
  }

  throw new Error('GCP credentials not found. Please set GCP_CREDENTIALS environment variable with JSON credentials, set GOOGLE_APPLICATION_CREDENTIALS to a credentials file path, or provide svc.json with service account credentials.');
}

function authClient() {
  const creds = loadCredentials();
  const scopes = ['https://www.googleapis.com/auth/calendar'];
  const jwt = new google.auth.JWT(creds.client_email, null, creds.private_key, scopes);
  return jwt;
}

export async function listEvents(calendarId, { timeMin, timeMax } = {}) {
  const auth = await authClient();
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });
  const params = { calendarId, singleEvents: true, orderBy: 'startTime' };
  if (timeMin) params.timeMin = timeMin;
  if (timeMax) params.timeMax = timeMax;
  const resp = await calendar.events.list(params);
  return resp.data.items || [];
}

export async function createEvent(calendarId, event) {
  const auth = await authClient();
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });
  const resp = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });
  return resp.data;
}

export async function deleteEvent(calendarId, eventId) {
  const auth = await authClient();
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });
  await calendar.events.delete({ calendarId, eventId });
  return { ok: true };
}

// Add this function to your calendar.js file
export async function updateEvent(calendarId, eventId, eventData) {
  try {
    const auth = await authClient();
    const calendar = google.calendar({ version: 'v3', auth });
    
    const updatedEvent = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: eventData.summary || 'Updated Event',
        description: eventData.description || '',
        start: eventData.start || { 
          dateTime: new Date().toISOString(),
          timeZone: 'UTC'
        },
        end: eventData.end || {
          dateTime: new Date(Date.now() + 3600000).toISOString(),
          timeZone: 'UTC'
        },
        ...(eventData.location && { location: eventData.location }),
        ...(eventData.attendees && { attendees: eventData.attendees })
      }
    });
    
    return updatedEvent.data;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

// List all available calendars
export async function listCalendars() {
  try {
    const auth = await authClient();
    await auth.authorize();
    const calendar = google.calendar({ version: 'v3', auth });
    const resp = await calendar.calendarList.list();
    return resp.data.items || [];
  } catch (error) {
    console.error('Error listing calendars:', error);
    throw error;
  }
}

// Test calendar access
export async function testCalendarAccess(calendarId) {
  try {
    const auth = await authClient();
    await auth.authorize();
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Try to get calendar metadata
    const calendarInfo = await calendar.calendars.get({ calendarId });
    
    // Try to list events (just to test read access)
    await calendar.events.list({ calendarId, maxResults: 1 });
    
    return {
      success: true,
      calendar: {
        id: calendarInfo.data.id,
        summary: calendarInfo.data.summary,
        description: calendarInfo.data.description,
        timeZone: calendarInfo.data.timeZone,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.response?.data
      }
    };
  }
}

// Cache for calendar ID to avoid repeated API calls
let cachedCalendarId = null;
let calendarIdCacheTime = 0;
const CALENDAR_ID_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Find calendar by name (case-insensitive partial match)
export async function findCalendarByName(calendarName) {
  try {
    const calendars = await listCalendars();
    
    // Try exact match first (case-insensitive)
    let found = calendars.find(cal => 
      cal.summary && cal.summary.toLowerCase() === calendarName.toLowerCase()
    );
    
    // If not found, try partial match
    if (!found) {
      found = calendars.find(cal => 
        cal.summary && cal.summary.toLowerCase().includes(calendarName.toLowerCase())
      );
    }
    
    // If still not found, try common variations
    if (!found && calendarName.toLowerCase().includes('enrolink')) {
      found = calendars.find(cal => 
        cal.summary && (
          cal.summary.toLowerCase().includes('enrolink') ||
          cal.summary.toLowerCase().includes('schedule')
        )
      );
    }
    
    return found ? found.id : null;
  } catch (error) {
    console.error('Error finding calendar by name:', error);
    return null;
  }
}

// Get the calendar ID automatically
export async function getAutoCalendarId() {
  // Check cache first
  const now = Date.now();
  if (cachedCalendarId && (now - calendarIdCacheTime) < CALENDAR_ID_CACHE_TTL) {
    return cachedCalendarId;
  }
  
  try {
    // Priority order:
    // 1. Explicitly set in environment variable
    const envCalendarId = process.env.GOOGLE_CALENDAR_ID || process.env.CALENDAR_ID;
    if (envCalendarId && envCalendarId !== 'primary') {
      cachedCalendarId = envCalendarId;
      calendarIdCacheTime = now;
      console.log('📅 Using calendar ID from environment:', envCalendarId);
      return envCalendarId;
    }
    
    // 2. Try to find by name from environment variable
    const calendarName = process.env.GCAL_CALENDAR_NAME || process.env.CALENDAR_NAME;
    if (calendarName) {
      const foundId = await findCalendarByName(calendarName);
      if (foundId) {
        cachedCalendarId = foundId;
        calendarIdCacheTime = now;
        console.log(`📅 Auto-detected calendar ID for "${calendarName}":`, foundId);
        return foundId;
      }
    }
    
    // 3. Try to find "EnroLink Schedule" or similar
    const commonNames = ['EnroLink Schedule', 'EnroLink', 'Schedule'];
    for (const name of commonNames) {
      const foundId = await findCalendarByName(name);
      if (foundId) {
        cachedCalendarId = foundId;
        calendarIdCacheTime = now;
        console.log(`📅 Auto-detected calendar ID for "${name}":`, foundId);
        return foundId;
      }
    }
    
    // 4. Fallback to primary
    console.log('📅 No specific calendar found, using "primary"');
    cachedCalendarId = 'primary';
    calendarIdCacheTime = now;
    return 'primary';
  } catch (error) {
    console.error('Error getting auto calendar ID:', error);
    // Fallback to primary on error
    return 'primary';
  }
}
