/**
 * Email Tools Implementation
 * Read, send, categorize emails via Gmail/Outlook APIs
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

type OAuthProvider = "google" | "microsoft";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

async function refreshGoogleToken(refreshToken: string): Promise<any> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to refresh Google token.");
  }

  return response.json();
}

async function refreshMicrosoftToken(refreshToken: string): Promise<any> {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth client not configured.");
  }

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "offline_access Mail.Read Mail.ReadWrite Mail.Send",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to refresh Microsoft token.");
  }

  return response.json();
}

async function getAccessToken(credentials?: Record<string, any>): Promise<{ provider: OAuthProvider; accessToken: string }> {
  if (!credentials) {
    throw new Error("Email credentials not found. Please connect your email account.");
  }

  const provider = (credentials.provider || "google") as OAuthProvider;
  const accessToken = credentials.accessToken as string | undefined;
  const refreshToken = credentials.refreshToken as string | undefined;
  const expiresAt = typeof credentials.expiresAt === "number" ? credentials.expiresAt : undefined;

  if (!accessToken && !refreshToken) {
    throw new Error("Missing access token. Please reconnect your email account.");
  }

  if (expiresAt && Date.now() > expiresAt - 60000 && refreshToken) {
    if (provider === "google") {
      const refreshed = await refreshGoogleToken(refreshToken);
      return {
        provider,
        accessToken: refreshed.access_token,
      };
    }
    if (provider === "microsoft") {
      const refreshed = await refreshMicrosoftToken(refreshToken);
      return {
        provider,
        accessToken: refreshed.access_token,
      };
    }
  }

  if (!accessToken) {
    throw new Error("Access token missing. Please reconnect your email account.");
  }

  return { provider, accessToken };
}

async function graphRequest(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Outlook API error: ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

// Gmail API helpers
async function gmailRequest(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Gmail API error: ${response.status}`);
  }

  return response.json();
}

// Parse email headers
function parseEmailHeaders(headers: Array<{ name: string; value: string }>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of headers) {
    result[header.name.toLowerCase()] = header.value;
  }
  return result;
}

// Decode base64 email content
function decodeEmailBody(body: { data?: string; size: number }): string {
  if (!body.data) return "";
  return Buffer.from(body.data, "base64url").toString("utf-8");
}

// Email Read executor
async function executeEmailRead(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { query, maxResults = 20, includeAttachments = false } = input;
  const logs: string[] = [];

  let provider: OAuthProvider = "google";
  let accessToken = "";
  try {
    const token = await getAccessToken(credentials);
    provider = token.provider;
    accessToken = token.accessToken;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email access token required.",
      executionTime: 0,
      logs: ["Error: Missing access token"],
    };
  }

  try {
    logs.push(`Fetching emails${query ? ` matching: ${query}` : ""}`);

    if (provider === "microsoft") {
      const params = new URLSearchParams({
        $top: String(maxResults),
        $select: "id,subject,bodyPreview,from,toRecipients,receivedDateTime,conversationId",
      });
      if (query) {
        params.set("$search", `"${query}"`);
      }
      const response = await graphRequest(`/me/messages?${params.toString()}`, accessToken, {
        headers: query ? { ConsistencyLevel: "eventual" } : {},
      });
      const messages = response.value || [];
      logs.push(`Found ${messages.length} messages`);

      const emails = messages.map((message: any) => ({
        id: message.id,
        threadId: message.conversationId,
        from: message.from?.emailAddress?.address,
        to: message.toRecipients?.map((r: any) => r.emailAddress?.address).join(", "),
        subject: message.subject,
        date: message.receivedDateTime,
        snippet: message.bodyPreview,
        body: message.bodyPreview?.substring(0, 5000) || "",
        labels: [],
        attachments: [],
      }));

      return {
        success: true,
        output: {
          emails,
          totalResults: messages.length,
          query,
        },
        executionTime: 0,
        logs,
      };
    }

    // Gmail
    const listParams = new URLSearchParams({
      maxResults: String(maxResults),
    });
    if (query) {
      listParams.append("q", query);
    }

    const listResponse = await gmailRequest(
      `/users/me/messages?${listParams}`,
      accessToken
    );

    const messageIds = listResponse.messages || [];
    logs.push(`Found ${messageIds.length} messages`);

    const emails = await Promise.all(
      messageIds.slice(0, maxResults).map(async (msg: { id: string }) => {
        const message = await gmailRequest(
          `/users/me/messages/${msg.id}?format=full`,
          accessToken
        );

        const headers = parseEmailHeaders(message.payload.headers || []);
        
        let body = "";
        if (message.payload.body?.data) {
          body = decodeEmailBody(message.payload.body);
        } else if (message.payload.parts) {
          for (const part of message.payload.parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
              body = decodeEmailBody(part.body);
              break;
            }
          }
        }

        let attachments: Array<{ name: string; mimeType: string; size: number }> = [];
        if (includeAttachments && message.payload.parts) {
          attachments = message.payload.parts
            .filter((p: any) => p.filename && p.body?.attachmentId)
            .map((p: any) => ({
              name: p.filename,
              mimeType: p.mimeType,
              size: p.body.size,
            }));
        }

        return {
          id: message.id,
          threadId: message.threadId,
          from: headers.from,
          to: headers.to,
          subject: headers.subject,
          date: headers.date,
          snippet: message.snippet,
          body: body.substring(0, 5000),
          labels: message.labelIds,
          attachments,
        };
      })
    );

    logs.push(`Retrieved ${emails.length} email details`);

    return {
      success: true,
      output: {
        emails,
        totalResults: messageIds.length,
        query,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Email read failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Email Send executor
async function executeEmailSend(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { to, subject, body, cc, bcc, isHtml = false } = input;
  const logs: string[] = [];

  let provider: OAuthProvider = "google";
  let accessToken = "";
  try {
    const token = await getAccessToken(credentials);
    provider = token.provider;
    accessToken = token.accessToken;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email access token required.",
      executionTime: 0,
      logs: ["Error: No access token"],
    };
  }

  if (!to || !subject || !body) {
    return {
      success: false,
      error: "To, subject, and body are required",
      executionTime: 0,
      logs: ["Error: Missing required fields"],
    };
  }

  try {
    logs.push(`Sending email to: ${to}`);
    logs.push(`Subject: ${subject}`);

    if (provider === "microsoft") {
      await graphRequest("/me/sendMail", accessToken, {
        method: "POST",
        body: JSON.stringify({
          message: {
            subject,
            body: {
              contentType: isHtml ? "HTML" : "Text",
              content: body,
            },
            toRecipients: to.split(",").map((email) => ({
              emailAddress: { address: email.trim() },
            })),
            ccRecipients: cc ? cc.split(",").map((email) => ({
              emailAddress: { address: email.trim() },
            })) : undefined,
            bccRecipients: bcc ? bcc.split(",").map((email) => ({
              emailAddress: { address: email.trim() },
            })) : undefined,
          },
          saveToSentItems: true,
        }),
      });

      logs.push("Email sent successfully via Outlook");
      return {
        success: true,
        output: {
          messageId: "sent",
          to,
          subject,
        },
        executionTime: 0,
        logs,
      };
    }

    const headers = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`,
    ];

    if (cc) headers.push(`Cc: ${cc}`);
    if (bcc) headers.push(`Bcc: ${bcc}`);

    const email = headers.join("\r\n") + "\r\n\r\n" + body;
    const encodedEmail = Buffer.from(email).toString("base64url");

    const response = await gmailRequest(
      "/users/me/messages/send",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ raw: encodedEmail }),
      }
    );

    logs.push(`Email sent successfully, ID: ${response.id}`);

    return {
      success: true,
      output: {
        messageId: response.id,
        threadId: response.threadId,
        to,
        subject,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Email send failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Email Categorize executor (uses LLM for classification)
async function executeEmailCategorize(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { emailIds, categories = ["important", "promotional", "social", "updates", "spam"] } = input;
  const logs: string[] = [];

  let accessToken = "";
  let provider: OAuthProvider = "google";
  try {
    const token = await getAccessToken(credentials);
    provider = token.provider;
    accessToken = token.accessToken;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email access token required.",
      executionTime: 0,
      logs: ["Error: No access token"],
    };
  }

  if (provider !== "google") {
    return {
      success: false,
      error: "This tool currently supports Gmail only. Please connect Gmail.",
      executionTime: 0,
      logs: ["Error: Outlook not supported for this tool"],
    };
  }

  if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
    return {
      success: false,
      error: "Email IDs array is required",
      executionTime: 0,
      logs: ["Error: No email IDs provided"],
    };
  }

  try {
    logs.push(`Categorizing ${emailIds.length} emails`);
    logs.push(`Categories: ${categories.join(", ")}`);

    // Fetch emails
    const emails = await Promise.all(
      emailIds.map(async (id: string) => {
        const message = await gmailRequest(
          `/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          accessToken
        );
        const headers = parseEmailHeaders(message.payload.headers || []);
        return {
          id,
          from: headers.from,
          subject: headers.subject,
          snippet: message.snippet,
        };
      })
    );

    // Simple rule-based categorization (in production, use LLM)
    const categorized = emails.map(email => {
      const text = `${email.from} ${email.subject} ${email.snippet}`.toLowerCase();
      
      let category = "updates";
      
      if (text.includes("unsubscribe") || text.includes("newsletter") || text.includes("sale") || text.includes("offer")) {
        category = "promotional";
      } else if (text.includes("facebook") || text.includes("twitter") || text.includes("linkedin") || text.includes("instagram")) {
        category = "social";
      } else if (text.includes("urgent") || text.includes("important") || text.includes("action required") || text.includes("deadline")) {
        category = "important";
      } else if (text.includes("verify") || text.includes("click here") || text.includes("winner") || text.includes("free money")) {
        category = "spam";
      }

      return {
        ...email,
        category,
        confidence: 0.7, // Placeholder confidence
      };
    });

    logs.push(`Categorized ${categorized.length} emails`);

    // Group by category
    const summary = categories.reduce((acc: Record<string, number>, cat: string) => {
      acc[cat] = categorized.filter(e => e.category === cat).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      output: {
        categorized,
        summary,
        totalProcessed: emails.length,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Email categorization failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Email Draft executor
async function executeEmailDraft(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { emailId, tone = "professional", instructions } = input;
  const logs: string[] = [];

  let accessToken = "";
  let provider: OAuthProvider = "google";
  try {
    const token = await getAccessToken(credentials);
    provider = token.provider;
    accessToken = token.accessToken;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email access token required.",
      executionTime: 0,
      logs: ["Error: No access token"],
    };
  }

  if (provider !== "google") {
    return {
      success: false,
      error: "This tool currently supports Gmail only. Please connect Gmail.",
      executionTime: 0,
      logs: ["Error: Outlook not supported for this tool"],
    };
  }

  if (!emailId) {
    return {
      success: false,
      error: "Email ID is required to draft a response",
      executionTime: 0,
      logs: ["Error: No email ID provided"],
    };
  }

  try {
    logs.push(`Drafting response to email: ${emailId}`);
    logs.push(`Tone: ${tone}`);

    // Fetch original email
    const message = await gmailRequest(
      `/users/me/messages/${emailId}?format=full`,
      accessToken
    );

    const headers = parseEmailHeaders(message.payload.headers || []);
    
    // Get body
    let originalBody = "";
    if (message.payload.body?.data) {
      originalBody = decodeEmailBody(message.payload.body);
    } else if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          originalBody = decodeEmailBody(part.body);
          break;
        }
      }
    }

    logs.push(`Original email from: ${headers.from}`);
    logs.push(`Subject: ${headers.subject}`);

    // Generate draft (simple template - in production, use LLM)
    const greetings: Record<string, string> = {
      professional: "Dear",
      friendly: "Hi",
      formal: "Dear Sir/Madam",
      casual: "Hey",
    };

    const closings: Record<string, string> = {
      professional: "Best regards",
      friendly: "Best",
      formal: "Yours faithfully",
      casual: "Cheers",
    };

    const senderName = headers.from?.match(/^([^<]+)/)?.[1]?.trim() || "there";
    
    let draft = `${greetings[tone] || "Hi"} ${senderName},

Thank you for your email regarding "${headers.subject}".

${instructions ? `[${instructions}]` : "[Your response here]"}

${closings[tone] || "Best regards"},
[Your name]`;

    // Create draft in Gmail
    const draftEmail = [
      `To: ${headers.from}`,
      `Subject: Re: ${headers.subject}`,
      `In-Reply-To: ${headers["message-id"]}`,
      `References: ${headers["message-id"]}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      draft,
    ].join("\r\n");

    const encodedDraft = Buffer.from(draftEmail).toString("base64url");

    const draftResponse = await gmailRequest(
      "/users/me/drafts",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          message: {
            raw: encodedDraft,
            threadId: message.threadId,
          },
        }),
      }
    );

    logs.push(`Draft created with ID: ${draftResponse.id}`);

    return {
      success: true,
      output: {
        draft,
        draftId: draftResponse.id,
        replyTo: headers.from,
        subject: `Re: ${headers.subject}`,
        threadId: message.threadId,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Email draft failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Email Unsubscribe executor
async function executeEmailUnsubscribe(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { action = "scan", emailIds } = input;
  const logs: string[] = [];

  let accessToken = "";
  let provider: OAuthProvider = "google";
  try {
    const token = await getAccessToken(credentials);
    provider = token.provider;
    accessToken = token.accessToken;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email access token required.",
      executionTime: 0,
      logs: ["Error: No access token"],
    };
  }

  if (provider !== "google") {
    return {
      success: false,
      error: "This tool currently supports Gmail only. Please connect Gmail.",
      executionTime: 0,
      logs: ["Error: Outlook not supported for this tool"],
    };
  }

  try {
    if (action === "scan") {
      logs.push("Scanning for subscription emails");

      // Search for emails with unsubscribe links
      const listResponse = await gmailRequest(
        `/users/me/messages?maxResults=50&q=unsubscribe`,
        accessToken
      );

      const messageIds = listResponse.messages || [];
      logs.push(`Found ${messageIds.length} potential subscription emails`);

      // Extract unsubscribe info from each
      const subscriptions = await Promise.all(
        messageIds.slice(0, 30).map(async (msg: { id: string }) => {
          try {
            const message = await gmailRequest(
              `/users/me/messages/${msg.id}?format=full`,
              accessToken
            );

            const headers = parseEmailHeaders(message.payload.headers || []);
            
            // Check for List-Unsubscribe header
            const unsubscribeHeader = headers["list-unsubscribe"];
            let unsubscribeLink: string | null = null;
            
            if (unsubscribeHeader) {
              const linkMatch = unsubscribeHeader.match(/<(https?:[^>]+)>/);
              if (linkMatch) {
                unsubscribeLink = linkMatch[1];
              }
            }

            // Try to find unsubscribe link in body
            if (!unsubscribeLink) {
              let body = "";
              if (message.payload.body?.data) {
                body = decodeEmailBody(message.payload.body);
              } else if (message.payload.parts) {
                for (const part of message.payload.parts) {
                  if (part.mimeType === "text/html" && part.body?.data) {
                    body = decodeEmailBody(part.body);
                    break;
                  }
                }
              }
              
              const linkMatch = body.match(/href=["']([^"']*unsubscribe[^"']*)["']/i);
              if (linkMatch) {
                unsubscribeLink = linkMatch[1];
              }
            }

            if (unsubscribeLink) {
              return {
                id: msg.id,
                from: headers.from,
                subject: headers.subject,
                unsubscribeLink,
                date: headers.date,
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      const validSubscriptions = subscriptions.filter(s => s !== null);
      logs.push(`Found ${validSubscriptions.length} subscriptions with unsubscribe links`);

      // Group by sender
      const bySender = validSubscriptions.reduce((acc, sub) => {
        if (!sub) return acc;
        const sender = sub.from?.match(/@([^>]+)/)?.[1] || sub.from || "unknown";
        if (!acc[sender]) acc[sender] = [];
        acc[sender].push(sub);
        return acc;
      }, {} as Record<string, any[]>);

      return {
        success: true,
        output: {
          subscriptions: validSubscriptions,
          bySender,
          totalFound: validSubscriptions.length,
        },
        executionTime: 0,
        logs,
      };
    }

    // Action: unsubscribe (would need to follow links - security sensitive)
    return {
      success: false,
      error: "Automatic unsubscribe not implemented for security reasons. Use the scan action to find unsubscribe links.",
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Email unsubscribe scan failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Register executors
registerExecutor("email_read", executeEmailRead);
registerExecutor("email_send", executeEmailSend);
registerExecutor("email_categorize", executeEmailCategorize);
registerExecutor("email_draft", executeEmailDraft);
registerExecutor("email_unsubscribe", executeEmailUnsubscribe);

export { 
  executeEmailRead, 
  executeEmailSend, 
  executeEmailCategorize, 
  executeEmailDraft, 
  executeEmailUnsubscribe 
};
