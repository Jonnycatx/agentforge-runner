/**
 * Browser Automation Tool Implementation
 * Automate browser actions - click, type, navigate
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

interface BrowserAction {
  type: "goto" | "click" | "type" | "select" | "wait" | "screenshot" | "scroll" | "press" | "hover" | "evaluate";
  selector?: string;
  value?: string;
  timeout?: number;
  options?: Record<string, any>;
}

interface AutomationResult {
  action: string;
  success: boolean;
  result?: any;
  screenshot?: string;
  error?: string;
}

async function runAutomation(
  url: string,
  actions: BrowserAction[]
): Promise<{ results: AutomationResult[]; finalScreenshot?: string }> {
  const puppeteer = await import("puppeteer").catch(() => null);
  if (!puppeteer) {
    throw new Error("Browser automation requires Puppeteer. Install with: npm install puppeteer");
  }

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results: AutomationResult[] = [];

  try {
    const page = await browser.newPage();
    
    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to starting URL
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    results.push({ action: `goto: ${url}`, success: true });

    // Execute each action
    for (const action of actions) {
      try {
        let actionResult: any;

        switch (action.type) {
          case "goto":
            await page.goto(action.value!, { waitUntil: "networkidle2", timeout: action.timeout || 30000 });
            actionResult = { url: action.value };
            break;

          case "click":
            await page.waitForSelector(action.selector!, { timeout: action.timeout || 5000 });
            await page.click(action.selector!);
            actionResult = { clicked: action.selector };
            break;

          case "type":
            await page.waitForSelector(action.selector!, { timeout: action.timeout || 5000 });
            if (action.options?.clear) {
              await page.click(action.selector!, { clickCount: 3 });
            }
            await page.type(action.selector!, action.value!, { delay: action.options?.delay || 50 });
            actionResult = { typed: action.value, into: action.selector };
            break;

          case "select":
            await page.waitForSelector(action.selector!, { timeout: action.timeout || 5000 });
            await page.select(action.selector!, action.value!);
            actionResult = { selected: action.value, in: action.selector };
            break;

          case "wait":
            if (action.selector) {
              await page.waitForSelector(action.selector, { timeout: action.timeout || 10000 });
              actionResult = { waitedFor: action.selector };
            } else if (action.value) {
              await new Promise(r => setTimeout(r, parseInt(action.value!) || 1000));
              actionResult = { waitedMs: action.value };
            }
            break;

          case "screenshot":
            const screenshot = await page.screenshot({
              fullPage: action.options?.fullPage || false,
              encoding: "base64",
            });
            actionResult = { screenshot: screenshot as string };
            break;

          case "scroll":
            if (action.selector) {
              await page.$eval(action.selector, (el: Element) => el.scrollIntoView());
            } else {
              await page.evaluate((y: number) => window.scrollBy(0, y), parseInt(action.value || "500"));
            }
            actionResult = { scrolled: action.selector || action.value };
            break;

          case "press":
            await page.keyboard.press(action.value as any);
            actionResult = { pressed: action.value };
            break;

          case "hover":
            await page.waitForSelector(action.selector!, { timeout: action.timeout || 5000 });
            await page.hover(action.selector!);
            actionResult = { hovered: action.selector };
            break;

          case "evaluate":
            // Evaluate JavaScript code in the page context
            const evalResult = await page.evaluate((code: string) => {
              return Function(`"use strict"; return (${code})`)();
            }, action.value!);
            actionResult = { evaluated: evalResult };
            break;

          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        results.push({
          action: `${action.type}: ${action.selector || action.value || ""}`,
          success: true,
          result: actionResult,
          screenshot: actionResult?.screenshot,
        });
      } catch (error) {
        results.push({
          action: `${action.type}: ${action.selector || action.value || ""}`,
          success: false,
          error: error instanceof Error ? error.message : "Action failed",
        });
        
        // Continue with other actions unless it's a critical failure
        if (action.options?.stopOnError) {
          break;
        }
      }
    }

    // Take final screenshot
    const finalScreenshot = await page.screenshot({ encoding: "base64" }) as string;

    return { results, finalScreenshot };
  } finally {
    await browser.close();
  }
}

async function executeBrowserAutomation(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { url, actions } = input;
  const logs: string[] = [];

  if (!url) {
    return {
      success: false,
      error: "Starting URL is required",
      executionTime: 0,
      logs: ["Error: No URL provided"],
    };
  }

  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return {
      success: false,
      error: "Actions array is required and must not be empty",
      executionTime: 0,
      logs: ["Error: No actions provided"],
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
    logs.push(`Starting browser automation at: ${url}`);
    logs.push(`Executing ${actions.length} actions`);

    const { results, finalScreenshot } = await runAutomation(url, actions);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logs.push(`Completed: ${successCount} succeeded, ${failCount} failed`);

    // Log each action result
    results.forEach((r, i) => {
      logs.push(`  ${i + 1}. ${r.action} - ${r.success ? "OK" : "FAILED"}`);
      if (r.error) {
        logs.push(`     Error: ${r.error}`);
      }
    });

    return {
      success: failCount === 0,
      output: {
        results,
        summary: {
          total: actions.length,
          succeeded: successCount,
          failed: failCount,
        },
        finalScreenshot,
        url,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Browser automation failed";
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
registerExecutor("browser_automation", executeBrowserAutomation);

export { executeBrowserAutomation };
