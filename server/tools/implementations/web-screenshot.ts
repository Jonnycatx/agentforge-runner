/**
 * Web Screenshot Tool Implementation
 * Captures screenshots of webpages using Puppeteer
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

// Note: For full functionality, install puppeteer: npm install puppeteer
// This implementation provides a fallback using a screenshot API service

interface ScreenshotOptions {
  url: string;
  fullPage?: boolean;
  width?: number;
  height?: number;
  format?: "png" | "jpeg" | "pdf";
  quality?: number;
  delay?: number;
}

// Use a free screenshot API as fallback
async function captureWithAPI(options: ScreenshotOptions): Promise<string> {
  const { url, width = 1280, height = 720, fullPage = false } = options;
  
  // Using screenshotapi.net (free tier available)
  // Alternative: use urlbox.io, screenshotlayer.com, etc.
  const apiUrl = `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(url)}&width=${width}&height=${height}&full_page=${fullPage}&output=image&file_type=png&wait_for_event=load`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`Screenshot API error: ${response.status}`);
  }
  
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

// Try to use Puppeteer if available
async function captureWithPuppeteer(options: ScreenshotOptions): Promise<string | null> {
  try {
    // Dynamic import to avoid errors if puppeteer isn't installed
    const puppeteer = await import("puppeteer").catch(() => null);
    if (!puppeteer) return null;
    
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    try {
      const page = await browser.newPage();
      
      await page.setViewport({
        width: options.width || 1280,
        height: options.height || 720,
      });
      
      await page.goto(options.url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      
      if (options.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
      
      const screenshot = await page.screenshot({
        fullPage: options.fullPage,
        type: options.format === "jpeg" ? "jpeg" : "png",
        quality: options.format === "jpeg" ? options.quality || 80 : undefined,
        encoding: "base64",
      });
      
      return screenshot as string;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Puppeteer not available:", error);
    return null;
  }
}

async function executeWebScreenshot(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const {
    url,
    fullPage = false,
    width = 1280,
    height = 720,
    format = "png",
    quality,
    delay,
  } = input;
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

  try {
    logs.push(`Capturing screenshot of: ${url}`);
    logs.push(`Options: ${width}x${height}, fullPage: ${fullPage}, format: ${format}`);

    const options: ScreenshotOptions = {
      url,
      fullPage,
      width,
      height,
      format: format as "png" | "jpeg" | "pdf",
      quality,
      delay,
    };

    // Try Puppeteer first (better quality, more options)
    let base64Image = await captureWithPuppeteer(options);
    
    if (base64Image) {
      logs.push("Screenshot captured using Puppeteer");
    } else {
      // Fallback to API
      logs.push("Puppeteer not available, using screenshot API");
      base64Image = await captureWithAPI(options);
      logs.push("Screenshot captured using API");
    }

    return {
      success: true,
      output: {
        image: base64Image,
        format,
        width,
        height,
        fullPage,
        url,
        mimeType: format === "jpeg" ? "image/jpeg" : "image/png",
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Screenshot capture failed";
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
registerExecutor("web_screenshot", executeWebScreenshot);

export { executeWebScreenshot };
