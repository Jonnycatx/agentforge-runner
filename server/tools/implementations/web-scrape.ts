/**
 * Web Scraper Tool Implementation
 * Extracts content and data from webpages
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";
import * as cheerio from "cheerio";

interface ScrapeResult {
  content: string;
  title?: string;
  description?: string;
  images?: string[];
  links?: { text: string; href: string }[];
  metadata?: Record<string, string>;
}

async function scrapeUrl(
  url: string,
  options: {
    selector?: string;
    extractImages?: boolean;
    extractLinks?: boolean;
  } = {}
): Promise<ScrapeResult> {
  // Fetch the page
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AgentForge/1.0; +https://agentforge.dev)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove script and style elements
  $("script, style, noscript, iframe").remove();

  // Extract metadata
  const metadata: Record<string, string> = {};
  $("meta").each((_, el) => {
    const name = $(el).attr("name") || $(el).attr("property");
    const content = $(el).attr("content");
    if (name && content) {
      metadata[name] = content;
    }
  });

  // Get title
  const title = $("title").text().trim() || metadata["og:title"] || undefined;
  
  // Get description
  const description = metadata["description"] || metadata["og:description"] || undefined;

  // Extract content
  let content: string;
  if (options.selector) {
    content = $(options.selector).text().trim();
  } else {
    // Get main content area
    const mainSelectors = ["main", "article", '[role="main"]', ".content", "#content", ".post", ".article"];
    let mainContent = "";
    
    for (const sel of mainSelectors) {
      const element = $(sel);
      if (element.length > 0) {
        mainContent = element.text();
        break;
      }
    }
    
    // Fallback to body
    if (!mainContent) {
      mainContent = $("body").text();
    }
    
    // Clean up whitespace
    content = mainContent
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();
  }

  // Extract images if requested
  let images: string[] | undefined;
  if (options.extractImages) {
    images = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        // Convert relative URLs to absolute
        try {
          const absoluteUrl = new URL(src, url).href;
          if (!images!.includes(absoluteUrl)) {
            images!.push(absoluteUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });
  }

  // Extract links if requested
  let links: { text: string; href: string }[] | undefined;
  if (options.extractLinks !== false) {
    links = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (href && text && !href.startsWith("#") && !href.startsWith("javascript:")) {
        try {
          const absoluteUrl = new URL(href, url).href;
          if (!links!.some(l => l.href === absoluteUrl)) {
            links!.push({ text: text.substring(0, 100), href: absoluteUrl });
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });
    // Limit to first 50 links
    links = links.slice(0, 50);
  }

  return {
    content: content.substring(0, 50000), // Limit content length
    title,
    description,
    images: images?.slice(0, 20), // Limit images
    links,
    metadata,
  };
}

async function executeWebScrape(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { url, selector, extractImages = false, extractLinks = true } = input;
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
    logs.push(`Scraping URL: ${url}`);
    if (selector) {
      logs.push(`Using CSS selector: ${selector}`);
    }

    const result = await scrapeUrl(url, {
      selector,
      extractImages,
      extractLinks,
    });

    logs.push(`Extracted ${result.content.length} characters of content`);
    if (result.images) {
      logs.push(`Found ${result.images.length} images`);
    }
    if (result.links) {
      logs.push(`Found ${result.links.length} links`);
    }

    return {
      success: true,
      output: {
        ...result,
        url,
        contentLength: result.content.length,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Scraping failed";
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
registerExecutor("web_scrape", executeWebScrape);

export { executeWebScrape };
