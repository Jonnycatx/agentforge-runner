/**
 * HTTP Request Tool Implementation
 * Makes HTTP requests to any API
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface HttpRequestOptions {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  auth?: {
    type: "basic" | "bearer" | "api_key";
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  timeout?: number;
}

async function makeHttpRequest(options: HttpRequestOptions): Promise<{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
}> {
  const {
    url,
    method = "GET",
    headers = {},
    body,
    auth,
    timeout = 30000,
  } = options;

  // Build headers
  const requestHeaders: Record<string, string> = {
    "User-Agent": "AgentForge/1.0",
    ...headers,
  };

  // Handle authentication
  if (auth) {
    switch (auth.type) {
      case "basic":
        if (auth.username && auth.password) {
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
          requestHeaders["Authorization"] = `Basic ${credentials}`;
        }
        break;
      case "bearer":
        if (auth.token) {
          requestHeaders["Authorization"] = `Bearer ${auth.token}`;
        }
        break;
      case "api_key":
        if (auth.apiKey) {
          const header = auth.apiKeyHeader || "X-API-Key";
          requestHeaders[header] = auth.apiKey;
        }
        break;
    }
  }

  // Set content type for body
  if (body && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Parse response body
    let data: any;
    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
    } else if (contentType.includes("text/")) {
      data = await response.text();
    } else {
      // For binary data, return as base64
      const buffer = await response.arrayBuffer();
      data = {
        type: "binary",
        contentType,
        size: buffer.byteLength,
        base64: Buffer.from(buffer).toString("base64").substring(0, 1000) + "...", // Truncate
      };
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function executeHttpRequest(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { url, method = "GET", headers, body, auth, timeout } = input;
  const logs: string[] = [];

  if (!url) {
    return {
      success: false,
      error: "URL is required",
      executionTime: 0,
      logs: ["Error: No URL provided"],
    };
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return {
      success: false,
      error: "Invalid URL provided",
      executionTime: 0,
      logs: ["Error: Invalid URL format"],
    };
  }

  // Validate method
  const validMethods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  if (!validMethods.includes(method.toUpperCase() as HttpMethod)) {
    return {
      success: false,
      error: `Invalid HTTP method: ${method}`,
      executionTime: 0,
      logs: ["Error: Invalid HTTP method"],
    };
  }

  try {
    logs.push(`Making ${method} request to: ${url}`);
    if (body) {
      logs.push(`Request body: ${JSON.stringify(body).substring(0, 200)}...`);
    }

    const result = await makeHttpRequest({
      url,
      method: method.toUpperCase() as HttpMethod,
      headers,
      body,
      auth,
      timeout,
    });

    logs.push(`Response status: ${result.status} ${result.statusText}`);

    // Check if request was successful (2xx status)
    const isSuccess = result.status >= 200 && result.status < 300;

    return {
      success: isSuccess,
      output: {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        data: result.data,
      },
      error: isSuccess ? undefined : `Request failed with status ${result.status}`,
      executionTime: 0,
      logs,
    };
  } catch (error) {
    let errorMessage: string;
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Request timed out";
      } else {
        errorMessage = error.message;
      }
    } else {
      errorMessage = "Request failed";
    }
    
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Register the executor
registerExecutor("http_request", executeHttpRequest);

export { executeHttpRequest };
