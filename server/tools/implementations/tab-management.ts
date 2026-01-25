/**
 * Tab Management Tool - Multi-tab browser control
 * Enables opening, switching, and managing multiple browser tabs
 */

import type { ToolExecutionResult } from "@shared/schema";
import { registerExecutor } from "../executor";

// Simulated tab state (in real implementation, this would be managed by Playwright browser context)
let mockTabs: Array<{ url: string; title: string; index: number }> = [
  { url: "about:blank", title: "New Tab", index: 0 }
];
let activeTabIndex = 0;

/**
 * Tab Management
 * Open, switch, close, and list browser tabs
 */
export async function executeTabManagement(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const { action, url, tabIndex, titlePattern, urlPattern } = input;

  try {
    const logs: string[] = [];
    let result: any = {};

    switch (action) {
      case "open": {
        const newUrl = url || "about:blank";
        const newIndex = mockTabs.length;
        mockTabs.push({
          url: newUrl,
          title: `Tab ${newIndex + 1}`,
          index: newIndex,
        });
        activeTabIndex = newIndex;
        logs.push(`Opened new tab at index ${newIndex}: ${newUrl}`);
        result = {
          newTabIndex: newIndex,
          activeTab: mockTabs[newIndex],
        };
        break;
      }

      case "switch": {
        let targetIndex = tabIndex;

        // Find by title pattern
        if (titlePattern && targetIndex === undefined) {
          const found = mockTabs.find(t => 
            t.title.toLowerCase().includes(titlePattern.toLowerCase())
          );
          if (found) targetIndex = found.index;
        }

        // Find by URL pattern
        if (urlPattern && targetIndex === undefined) {
          const found = mockTabs.find(t => 
            t.url.toLowerCase().includes(urlPattern.toLowerCase())
          );
          if (found) targetIndex = found.index;
        }

        if (targetIndex === undefined || targetIndex >= mockTabs.length) {
          throw new Error(`Tab not found. Available tabs: ${mockTabs.length}`);
        }

        activeTabIndex = targetIndex;
        logs.push(`Switched to tab ${targetIndex}: ${mockTabs[targetIndex].url}`);
        result = {
          activeTab: mockTabs[targetIndex],
        };
        break;
      }

      case "close": {
        const closeIndex = tabIndex ?? activeTabIndex;
        if (mockTabs.length <= 1) {
          throw new Error("Cannot close the last tab");
        }
        const closedTab = mockTabs.splice(closeIndex, 1)[0];
        // Update indices
        mockTabs = mockTabs.map((t, i) => ({ ...t, index: i }));
        // Adjust active tab if needed
        if (activeTabIndex >= mockTabs.length) {
          activeTabIndex = mockTabs.length - 1;
        }
        logs.push(`Closed tab ${closeIndex}: ${closedTab.url}`);
        result = {
          closedTab,
          activeTab: mockTabs[activeTabIndex],
        };
        break;
      }

      case "list": {
        logs.push(`Listed ${mockTabs.length} open tabs`);
        result = {
          tabs: mockTabs,
          activeTab: mockTabs[activeTabIndex],
          count: mockTabs.length,
        };
        break;
      }

      case "focus": {
        logs.push(`Focused active tab ${activeTabIndex}`);
        result = {
          activeTab: mockTabs[activeTabIndex],
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}. Use: open, switch, close, list, focus`);
    }

    return {
      success: true,
      output: result,
      executionTime: Date.now() - startTime,
      logs,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      logs: [`Error in tab management: ${error.message}`],
    };
  }
}

// Register executor
registerExecutor("tab_management", executeTabManagement);
