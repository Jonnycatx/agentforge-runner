/**
 * Tool System Entry Point
 * Loads all tool implementations and exports the execution engine
 */

// Core executor
export { executeTool, registerExecutor, hasExecutor, getExecutableTools } from "./executor";

// Registry helpers
export { toolRegistry, getToolsByCategory, getToolById, searchTools, getCategories, getToolsRequiringAuth } from "./registry";

// Auth manager
export { ToolAuthManager } from "./auth-manager";

// Load all tool implementations (side effects register executors)
// Phase 1 Tools
import "./implementations/calculator";
import "./implementations/web-search";
import "./implementations/web-scrape";
import "./implementations/http-request";
import "./implementations/data-transform";
import "./implementations/code-execute";
import "./implementations/market-data";
import "./implementations/news-search";

// Phase 2 Tools
import "./implementations/web-screenshot";
import "./implementations/pdf-generator";
import "./implementations/browser-automation";
import "./implementations/csv-tools";
import "./implementations/excel-tools";
import "./implementations/file-tools";
import "./implementations/pdf-read";
import "./implementations/image-ocr";
import "./implementations/email-tools";
import "./implementations/company-search";
import "./implementations/calendar-events";

// Phase 3 Tools - Advanced Web Automation
import "./implementations/clipboard-tools";
import "./implementations/tab-management";
import "./implementations/element-tools";

// Phase 3 Tools - Advanced Email AI
import "./implementations/advanced-email-tools";

// Phase 3 Tools - Deep Research Intelligence
import "./implementations/research-tools";
import "./implementations/analysis-tools";

// Phase 3 Tools - AI Data Scientist
import "./implementations/data-scientist-tools";

// Phase 3 Tools - AI Financial Analyst
import "./implementations/finance-tools";

// Phase 3 Tools - Advanced Technical Analysis & Trading
import "./implementations/trading-tools";

// Phase 3 Tools - B2B Sales & SDR
import "./implementations/sales-tools";

// Phase 3 Tools - Social Media Management
import "./implementations/social-media-tools";

// Phase 3 Tools - HR & Recruiting
import "./implementations/hr-tools";

// Phase 4 Tools - Complete Ecosystem (8 New Agents)
// Personal Orchestrator, Content Creator, Marketing, Health, Travel, Creative, Learning, Security
import "./implementations/ecosystem-tools";

// Phase 5 Tools - Creative Production (3 New Agents)
// Book Writer, Screenplay Agent, Songwriter
import "./implementations/creative-writing-tools";

// Phase 6 Tools - Meta Builders (2 New Agents)
// Script Builder (Code Automation), Prompt Builder (Prompt Engineering)
import "./implementations/meta-builder-tools";

// Phase 7 Tools - Personal Memory & Life Assistant (The Ultimate Agent)
// Smart Life Companion - your digital second brain
import "./implementations/memory-tools";

// Log loaded tools
import { getExecutableTools } from "./executor";

console.log(`[Tools] Loaded ${getExecutableTools().length} tool executors:`, getExecutableTools().join(", "));
