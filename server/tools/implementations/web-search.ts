/**
 * Web Search Tool Implementation
 * Searches the web using Tavily API or falls back to a simple scraper
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

async function searchWithTavily(
  query: string,
  maxResults: number,
  apiKey: string
): Promise<SearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavily API error: ${error}`);
  }

  const data = await response.json();
  
  return (data.results || []).map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
    score: r.score,
  }));
}

async function searchWithSerpAPI(
  query: string,
  maxResults: number,
  apiKey: string
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    api_key: apiKey,
    num: String(maxResults),
  });

  const response = await fetch(`https://serpapi.com/search?${params}`);

  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.status}`);
  }

  const data = await response.json();
  
  return (data.organic_results || []).slice(0, maxResults).map((r: any) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
  }));
}

async function searchWithBrave(
  query: string,
  maxResults: number,
  apiKey: string
): Promise<SearchResult[]> {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
    {
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Brave Search error: ${response.status}`);
  }

  const data = await response.json();
  
  return (data.web?.results || []).slice(0, maxResults).map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
  }));
}

async function executeWebSearch(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { query, maxResults = 10, provider = "tavily" } = input;
  const logs: string[] = [];

  if (!query) {
    return {
      success: false,
      error: "Search query is required",
      executionTime: 0,
      logs: ["Error: No query provided"],
    };
  }

  const apiKey = credentials?.apiKey;
  if (!apiKey) {
    return {
      success: false,
      error: "API key is required for web search. Please connect the tool first.",
      executionTime: 0,
      logs: ["Error: No API key configured"],
    };
  }

  try {
    logs.push(`Searching for: "${query}" (max ${maxResults} results)`);
    
    let results: SearchResult[] = [];

    // Try the specified provider
    switch (provider) {
      case "serpapi":
        logs.push("Using SerpAPI provider");
        results = await searchWithSerpAPI(query, maxResults, apiKey);
        break;
      case "brave":
        logs.push("Using Brave Search provider");
        results = await searchWithBrave(query, maxResults, apiKey);
        break;
      case "tavily":
      default:
        logs.push("Using Tavily provider");
        results = await searchWithTavily(query, maxResults, apiKey);
    }

    logs.push(`Found ${results.length} results`);

    return {
      success: true,
      output: {
        results,
        query,
        totalResults: results.length,
        provider,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Search failed";
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
registerExecutor("web_search", executeWebSearch);

export { executeWebSearch };
