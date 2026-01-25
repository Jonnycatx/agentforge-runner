/**
 * News Search Tool Implementation
 * Search and retrieve news articles
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

interface NewsArticle {
  title: string;
  description?: string;
  url: string;
  source: string;
  publishedAt: string;
  image?: string;
  author?: string;
}

// NewsAPI.org
async function searchNewsAPI(
  query: string,
  options: { maxResults: number; dateRange?: string },
  apiKey: string
): Promise<NewsArticle[]> {
  const params = new URLSearchParams({
    q: query,
    apiKey,
    pageSize: String(options.maxResults),
    language: "en",
    sortBy: "publishedAt",
  });

  // Add date filter
  if (options.dateRange) {
    const now = new Date();
    let from: Date;
    
    switch (options.dateRange) {
      case "today":
        from = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        from = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        from = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        from = new Date(now.setDate(now.getDate() - 7));
    }
    
    params.append("from", from.toISOString().split("T")[0]);
  }

  const response = await fetch(`https://newsapi.org/v2/everything?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `NewsAPI error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "ok") {
    throw new Error(data.message || "NewsAPI request failed");
  }

  return (data.articles || []).map((article: any) => ({
    title: article.title,
    description: article.description,
    url: article.url,
    source: article.source?.name || "Unknown",
    publishedAt: article.publishedAt,
    image: article.urlToImage,
    author: article.author,
  }));
}

// GNews API (alternative)
async function searchGNews(
  query: string,
  options: { maxResults: number },
  apiKey: string
): Promise<NewsArticle[]> {
  const params = new URLSearchParams({
    q: query,
    token: apiKey,
    max: String(options.maxResults),
    lang: "en",
  });

  const response = await fetch(`https://gnews.io/api/v4/search?${params}`);

  if (!response.ok) {
    throw new Error(`GNews API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.articles || []).map((article: any) => ({
    title: article.title,
    description: article.description,
    url: article.url,
    source: article.source?.name || "Unknown",
    publishedAt: article.publishedAt,
    image: article.image,
  }));
}

// Free fallback using RSS feeds (no API key needed)
async function searchFreeNews(
  query: string,
  options: { maxResults: number }
): Promise<NewsArticle[]> {
  // Use Google News RSS
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  
  const response = await fetch(rssUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status}`);
  }

  const xml = await response.text();
  
  // Simple XML parsing for RSS
  const articles: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < options.maxResults) {
    const item = match[1];
    
    const getTag = (tag: string): string => {
      const tagMatch = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return tagMatch ? tagMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
    };

    const title = getTag("title");
    const link = getTag("link");
    const pubDate = getTag("pubDate");
    const source = getTag("source") || "Google News";

    if (title && link) {
      articles.push({
        title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
        url: link,
        source,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      });
    }
  }

  return articles;
}

async function executeNewsSearch(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { query, maxResults = 10, dateRange, sources } = input;
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

  try {
    logs.push(`Searching news for: "${query}"`);
    if (dateRange) {
      logs.push(`Date range: ${dateRange}`);
    }

    let articles: NewsArticle[];

    if (apiKey) {
      logs.push("Using NewsAPI");
      try {
        articles = await searchNewsAPI(query, { maxResults, dateRange }, apiKey);
      } catch (error) {
        logs.push(`NewsAPI failed, trying GNews: ${error}`);
        try {
          articles = await searchGNews(query, { maxResults }, apiKey);
        } catch {
          logs.push("GNews failed, falling back to free RSS");
          articles = await searchFreeNews(query, { maxResults });
        }
      }
    } else {
      logs.push("No API key, using free Google News RSS");
      articles = await searchFreeNews(query, { maxResults });
    }

    // Filter by sources if specified
    if (sources && Array.isArray(sources) && sources.length > 0) {
      const sourceLower = sources.map((s: string) => s.toLowerCase());
      articles = articles.filter(a => 
        sourceLower.some(s => a.source.toLowerCase().includes(s))
      );
      logs.push(`Filtered to ${articles.length} articles from specified sources`);
    }

    logs.push(`Found ${articles.length} articles`);

    return {
      success: true,
      output: {
        articles,
        query,
        totalResults: articles.length,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "News search failed";
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
registerExecutor("news_search", executeNewsSearch);

export { executeNewsSearch };
