/**
 * Calendar Events Tool Implementation
 * Manage Google Calendar events
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

// Google Calendar API helpers
async function calendarRequest(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Calendar API error: ${response.status}`);
  }

  return response.json();
}

async function executeCalendarEvents(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { action, event, dateRange, eventId, calendarId = "primary" } = input;
  const logs: string[] = [];

  const accessToken = credentials?.accessToken;
  if (!accessToken) {
    return {
      success: false,
      error: "Google Calendar access token required. Please connect your Google account.",
      executionTime: 0,
      logs: ["Error: No access token"],
    };
  }

  try {
    switch (action) {
      case "list": {
        logs.push("Listing calendar events");
        
        const params = new URLSearchParams({
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "50",
        });

        if (dateRange?.start) {
          params.append("timeMin", new Date(dateRange.start).toISOString());
        } else {
          params.append("timeMin", new Date().toISOString());
        }

        if (dateRange?.end) {
          params.append("timeMax", new Date(dateRange.end).toISOString());
        }

        const response = await calendarRequest(
          `/calendars/${calendarId}/events?${params}`,
          accessToken
        );

        const events = (response.items || []).map((e: any) => ({
          id: e.id,
          summary: e.summary,
          description: e.description,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          location: e.location,
          attendees: e.attendees?.map((a: any) => ({
            email: a.email,
            responseStatus: a.responseStatus,
          })),
          link: e.htmlLink,
        }));

        logs.push(`Found ${events.length} events`);

        return {
          success: true,
          output: { events, totalCount: events.length },
          executionTime: 0,
          logs,
        };
      }

      case "create": {
        if (!event || !event.summary || !event.start || !event.end) {
          return {
            success: false,
            error: "Event must have summary, start, and end times",
            executionTime: 0,
            logs: ["Error: Missing event details"],
          };
        }

        logs.push(`Creating event: ${event.summary}`);

        const eventBody: any = {
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: {
            dateTime: new Date(event.start).toISOString(),
            timeZone: event.timeZone || "UTC",
          },
          end: {
            dateTime: new Date(event.end).toISOString(),
            timeZone: event.timeZone || "UTC",
          },
        };

        if (event.attendees) {
          eventBody.attendees = event.attendees.map((email: string) => ({ email }));
        }

        if (event.reminders) {
          eventBody.reminders = {
            useDefault: false,
            overrides: event.reminders.map((minutes: number) => ({
              method: "popup",
              minutes,
            })),
          };
        }

        const response = await calendarRequest(
          `/calendars/${calendarId}/events`,
          accessToken,
          {
            method: "POST",
            body: JSON.stringify(eventBody),
          }
        );

        logs.push(`Event created: ${response.id}`);

        return {
          success: true,
          output: {
            event: {
              id: response.id,
              summary: response.summary,
              start: response.start?.dateTime,
              end: response.end?.dateTime,
              link: response.htmlLink,
            },
          },
          executionTime: 0,
          logs,
        };
      }

      case "update": {
        if (!eventId || !event) {
          return {
            success: false,
            error: "Event ID and update data required",
            executionTime: 0,
            logs: ["Error: Missing event ID or update data"],
          };
        }

        logs.push(`Updating event: ${eventId}`);

        const updateBody: any = {};
        if (event.summary) updateBody.summary = event.summary;
        if (event.description) updateBody.description = event.description;
        if (event.location) updateBody.location = event.location;
        if (event.start) {
          updateBody.start = {
            dateTime: new Date(event.start).toISOString(),
            timeZone: event.timeZone || "UTC",
          };
        }
        if (event.end) {
          updateBody.end = {
            dateTime: new Date(event.end).toISOString(),
            timeZone: event.timeZone || "UTC",
          };
        }

        const response = await calendarRequest(
          `/calendars/${calendarId}/events/${eventId}`,
          accessToken,
          {
            method: "PATCH",
            body: JSON.stringify(updateBody),
          }
        );

        logs.push("Event updated");

        return {
          success: true,
          output: {
            event: {
              id: response.id,
              summary: response.summary,
              link: response.htmlLink,
            },
          },
          executionTime: 0,
          logs,
        };
      }

      case "delete": {
        if (!eventId) {
          return {
            success: false,
            error: "Event ID required",
            executionTime: 0,
            logs: ["Error: Missing event ID"],
          };
        }

        logs.push(`Deleting event: ${eventId}`);

        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          }
        );

        logs.push("Event deleted");

        return {
          success: true,
          output: { deleted: eventId },
          executionTime: 0,
          logs,
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${action}. Use: list, create, update, or delete`,
          executionTime: 0,
          logs,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Calendar operation failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Register executor
registerExecutor("calendar_events", executeCalendarEvents);

export { executeCalendarEvents };
