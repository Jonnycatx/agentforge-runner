/**
 * Company Search Tool Implementation
 * Look up company information and data
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

interface CompanyInfo {
  name: string;
  domain?: string;
  description?: string;
  industry?: string;
  size?: string;
  founded?: string;
  location?: string;
  website?: string;
  socialProfiles?: Record<string, string | undefined>;
  financials?: {
    revenue?: string;
    employees?: number;
    stockPrice?: number;
    marketCap?: string;
  };
}

// Clearbit API (requires API key)
async function searchClearbit(company: string, apiKey: string): Promise<CompanyInfo | null> {
  try {
    // First try domain lookup if company looks like a domain
    let domain = company;
    if (!company.includes(".")) {
      // Try to find domain using name
      const searchResponse = await fetch(
        `https://company.clearbit.com/v1/domains/find?name=${encodeURIComponent(company)}`,
        {
          headers: { "Authorization": `Bearer ${apiKey}` },
        }
      );
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        domain = searchData.domain;
      } else {
        return null;
      }
    }

    // Get company info
    const response = await fetch(
      `https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`,
      {
        headers: { "Authorization": `Bearer ${apiKey}` },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      name: data.name,
      domain: data.domain,
      description: data.description,
      industry: data.category?.industry,
      size: data.metrics?.employeesRange,
      founded: data.foundedYear?.toString(),
      location: data.location ? `${data.geo?.city}, ${data.geo?.country}` : undefined,
      website: data.domain ? `https://${data.domain}` : undefined,
      socialProfiles: {
        linkedin: data.linkedin?.handle ? `https://linkedin.com/company/${data.linkedin.handle}` : undefined,
        twitter: data.twitter?.handle ? `https://twitter.com/${data.twitter.handle}` : undefined,
        facebook: data.facebook?.handle ? `https://facebook.com/${data.facebook.handle}` : undefined,
      },
      financials: {
        employees: data.metrics?.employees,
        revenue: data.metrics?.estimatedAnnualRevenue,
        marketCap: data.metrics?.marketCap?.toString(),
      },
    };
  } catch (error) {
    console.error("Clearbit error:", error);
    return null;
  }
}

// Fallback: Web scraping approach (basic info only)
async function searchWebFallback(company: string): Promise<CompanyInfo> {
  // Search for company info using web search
  // This is a simplified version - in production, use proper scraping
  
  return {
    name: company,
    description: `Company: ${company}. Use a company data API (like Clearbit) for detailed information.`,
  };
}

// Yahoo Finance for public companies
async function getFinancials(ticker: string): Promise<any> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    return {
      stockPrice: result.meta?.regularMarketPrice,
      marketCap: result.meta?.marketCap,
      currency: result.meta?.currency,
      exchange: result.meta?.exchangeName,
    };
  } catch {
    return null;
  }
}

async function executeCompanySearch(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { company, includeFinancials = false, ticker } = input;
  const logs: string[] = [];

  if (!company) {
    return {
      success: false,
      error: "Company name or domain is required",
      executionTime: 0,
      logs: ["Error: No company provided"],
    };
  }

  try {
    logs.push(`Looking up company: ${company}`);

    let companyInfo: CompanyInfo | null = null;
    const apiKey = credentials?.apiKey;

    // Try Clearbit if API key provided
    if (apiKey) {
      logs.push("Using Clearbit API");
      companyInfo = await searchClearbit(company, apiKey);
    }

    // Fallback to basic info
    if (!companyInfo) {
      logs.push("Using fallback search");
      companyInfo = await searchWebFallback(company);
    }

    // Get financial data if requested and ticker provided
    if (includeFinancials && ticker) {
      logs.push(`Fetching financials for ticker: ${ticker}`);
      const financials = await getFinancials(ticker);
      if (financials) {
        companyInfo.financials = {
          ...companyInfo.financials,
          ...financials,
        };
      }
    }

    logs.push(`Found info for: ${companyInfo.name}`);

    return {
      success: true,
      output: {
        company: companyInfo,
        searchTerm: company,
        hasDetailedInfo: !!apiKey,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Company search failed";
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
registerExecutor("company_search", executeCompanySearch);

export { executeCompanySearch };
