# Google Calendar Integration Troubleshooting Guide

## Why Events Don't Appear in Google Calendar

If events are saved to your database but don't appear in Google Calendar, here are the most common causes and solutions:

## 🔍 Step 1: Check Calendar Access

### Option A: Use the Diagnostic Endpoints

1. **List all available calendars:**
   ```bash
   GET /api/calendar/calendars
   ```
   This will show you all calendars your service account can access, including their IDs.

2. **Test calendar access:**
   ```bash
   GET /api/calendar/test?calendarId=primary
   ```
   Replace `primary` with your calendar ID to test access.

### Option B: Check Backend Logs

When creating an event, check your backend console for:
- ✅ `Event created in Google Calendar:` - Success!
- ❌ `Google Calendar create failed:` - Error details will be shown

## 🔧 Common Issues and Solutions

### Issue 1: Service Account Doesn't Have Access to Calendar

**Symptoms:**
- Error code: `401` or `403`
- Error message: "Insufficient Permission" or "Forbidden"

**Solution:**
1. Find your service account email:
   - Check your `GOOGLE_APPLICATION_CREDENTIALS` JSON
   - Look for `client_email` field (e.g., `googlecalendar@enrolink.iam.gserviceaccount.com`)

2. Share your Google Calendar with the service account:
   - Open Google Calendar
   - Find your calendar (e.g., "EnroLink Schedule")
   - Click the three dots (⋮) next to the calendar name
   - Select "Settings and sharing"
   - Under "Share with specific people", click "Add people"
   - Enter the service account email
   - Set permission to "Make changes to events" (or "Make changes and manage sharing")
   - Click "Send"

### Issue 2: Wrong Calendar ID

**Symptoms:**
- Error code: `404`
- Error message: "Not Found"

**Solution:**
1. Use the `/api/calendar/calendars` endpoint to find the correct calendar ID
2. Look for your calendar name (e.g., "EnroLink Schedule")
3. Copy the `id` field
4. Update your `.env` file:
   ```env
   GOOGLE_CALENDAR_ID=<the-correct-calendar-id>
   ```
   Or use the calendar ID when creating events via the API.

### Issue 3: Events Created But Not Visible

**Symptoms:**
- Events are created successfully (no errors)
- But they don't appear in Google Calendar

**Possible Causes:**
1. **Wrong calendar selected in Google Calendar UI:**
   - Make sure the correct calendar is checked/visible in Google Calendar
   - The calendar might be hidden or unchecked

2. **Events created in a different calendar:**
   - Check which calendar ID was used
   - Verify the calendar is visible in your Google Calendar view

3. **Time range:**
   - Make sure you're viewing the correct date range in Google Calendar
   - All-day events might appear differently

## 🔄 Sync Existing Events

If you have events in your database that weren't synced to Google Calendar:

1. **Push all unsynced events:**
   ```bash
   POST /api/calendar/push
   ```
   This will create Google Calendar events for all database events that don't have a `googleEventId`.

2. **Check the response:**
   - `synced`: Number of events successfully created
   - `failed`: Array of events that failed (with error details)

## 📋 Quick Diagnostic Checklist

- [ ] Service account email is correct
- [ ] Calendar is shared with service account
- [ ] Service account has "Make changes to events" permission
- [ ] Calendar ID is correct (use `/api/calendar/calendars` to verify)
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` is properly set in `.env`
- [ ] Backend server has been restarted after changing `.env`
- [ ] Check backend logs for specific error messages

## 🧪 Testing the Integration

1. **Test calendar listing:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/calendar/calendars
   ```

2. **Test calendar access:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" "http://localhost:8080/api/calendar/test?calendarId=primary"
   ```

3. **Create a test event:**
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "summary": "Test Event",
       "start": { "date": "2025-12-01" },
       "end": { "date": "2025-12-01" }
     }' \
     http://localhost:8080/api/calendar/events
   ```

4. **Check if event was created:**
   - Look in Google Calendar
   - Check backend logs for success/error messages
   - Verify `googleEventId` is saved in database

## 📝 Notes

- The service account creates events **on behalf of itself**, not on behalf of your personal Google account
- Events created by the service account will show the service account email as the creator
- You need to share the calendar with the service account for it to create events
- The calendar ID for "EnroLink Schedule" is likely different from "primary" - use the `/calendars` endpoint to find it



