import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accessToken, startDate, endDate } = body;

    if (!accessToken || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Create OAuth2 client with the access token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const timeMin = new Date(startDate).toISOString();
    const timeMax = new Date(endDate + 'T23:59:59').toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    // Filter and format events
    const relevantEvents = events
      .filter(event => {
        // Only include events with start/end times
        return event.start?.dateTime && event.end?.dateTime;
      })
      .map(event => ({
        id: event.id,
        summary: event.summary || 'Untitled Event',
        start: event.start?.dateTime,
        end: event.end?.dateTime,
        description: event.description,
      }));

    return NextResponse.json({ events: relevantEvents });
  } catch (error) {
    console.error('Google Calendar API error:', error);
    return NextResponse.json({ 
      error: "Failed to fetch calendar events",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
