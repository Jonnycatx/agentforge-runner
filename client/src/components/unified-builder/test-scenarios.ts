/**
 * Test Scenarios - Auto-generated test prompts based on agent configuration
 */

export interface TestScenario {
  id: string;
  prompt: string;
  description: string;
  expectedBehavior: string;
  toolsUsed: string[];
}

// Tool-specific test scenarios
const toolScenarios: Record<string, TestScenario[]> = {
  web_search: [
    {
      id: "web-search-1",
      prompt: "Search for the latest news about artificial intelligence",
      description: "Basic web search",
      expectedBehavior: "Returns relevant AI news articles with sources",
      toolsUsed: ["web_search"],
    },
    {
      id: "web-search-2",
      prompt: "Find the top 5 competitors of OpenAI",
      description: "Competitive research",
      expectedBehavior: "Lists AI companies with brief descriptions",
      toolsUsed: ["web_search"],
    },
  ],
  web_scrape: [
    {
      id: "web-scrape-1",
      prompt: "Extract the main content from https://example.com",
      description: "Basic web scraping",
      expectedBehavior: "Returns structured content from the webpage",
      toolsUsed: ["web_scrape"],
    },
  ],
  email_read: [
    {
      id: "email-1",
      prompt: "Check my inbox for any urgent emails",
      description: "Email inbox check",
      expectedBehavior: "Lists recent emails, highlights urgent ones",
      toolsUsed: ["email_read"],
    },
    {
      id: "email-2",
      prompt: "Summarize my unread emails from today",
      description: "Email summary",
      expectedBehavior: "Provides brief summary of each unread email",
      toolsUsed: ["email_read"],
    },
  ],
  email_send: [
    {
      id: "email-send-1",
      prompt: "Draft a professional follow-up email for a job interview",
      description: "Email drafting",
      expectedBehavior: "Creates professional email with proper structure",
      toolsUsed: ["email_send"],
    },
  ],
  email_categorize: [
    {
      id: "email-cat-1",
      prompt: "Categorize my inbox emails into work, personal, and promotions",
      description: "Email categorization",
      expectedBehavior: "Organizes emails into categories",
      toolsUsed: ["email_read", "email_categorize"],
    },
  ],
  calculator: [
    {
      id: "calc-1",
      prompt: "Calculate the compound interest on $10,000 at 5% for 10 years",
      description: "Financial calculation",
      expectedBehavior: "Returns accurate compound interest result",
      toolsUsed: ["calculator"],
    },
    {
      id: "calc-2",
      prompt: "What's 15% of $2,500?",
      description: "Basic calculation",
      expectedBehavior: "Returns $375",
      toolsUsed: ["calculator"],
    },
  ],
  csv_read: [
    {
      id: "csv-1",
      prompt: "Analyze this sales data and find the top performing products",
      description: "CSV analysis",
      expectedBehavior: "Reads CSV and provides insights",
      toolsUsed: ["csv_read", "data_transform"],
    },
  ],
  data_transform: [
    {
      id: "data-1",
      prompt: "Clean this dataset by removing duplicates and null values",
      description: "Data cleaning",
      expectedBehavior: "Returns cleaned dataset",
      toolsUsed: ["data_transform"],
    },
  ],
  news_search: [
    {
      id: "news-1",
      prompt: "Get me the latest tech industry news from the past week",
      description: "News search",
      expectedBehavior: "Returns recent tech news articles",
      toolsUsed: ["news_search"],
    },
  ],
  company_search: [
    {
      id: "company-1",
      prompt: "Research information about Tesla Inc - company size, revenue, and key executives",
      description: "Company research",
      expectedBehavior: "Returns company profile with details",
      toolsUsed: ["company_search"],
    },
  ],
  market_data: [
    {
      id: "market-1",
      prompt: "Get the current stock price and daily change for Apple (AAPL)",
      description: "Stock price lookup",
      expectedBehavior: "Returns current price and % change",
      toolsUsed: ["market_data"],
    },
    {
      id: "market-2",
      prompt: "Compare the performance of TSLA, NVDA, and GOOGL this month",
      description: "Stock comparison",
      expectedBehavior: "Returns comparative analysis",
      toolsUsed: ["market_data", "calculator"],
    },
  ],
  pdf_read: [
    {
      id: "pdf-1",
      prompt: "Summarize the key points from this PDF document",
      description: "PDF analysis",
      expectedBehavior: "Extracts and summarizes PDF content",
      toolsUsed: ["pdf_read"],
    },
  ],
  file_read: [
    {
      id: "file-1",
      prompt: "Read and analyze the contents of config.json",
      description: "File reading",
      expectedBehavior: "Returns file contents with analysis",
      toolsUsed: ["file_read"],
    },
  ],
};

// Generic test scenarios for any agent
const genericScenarios: TestScenario[] = [
  {
    id: "generic-1",
    prompt: "Hello! What can you help me with?",
    description: "Introduction",
    expectedBehavior: "Explains capabilities and available tools",
    toolsUsed: [],
  },
  {
    id: "generic-2",
    prompt: "What tools do you have access to?",
    description: "Tool listing",
    expectedBehavior: "Lists available tools with descriptions",
    toolsUsed: [],
  },
  {
    id: "generic-3",
    prompt: "Walk me through your typical workflow",
    description: "Process explanation",
    expectedBehavior: "Explains step-by-step approach",
    toolsUsed: [],
  },
];

/**
 * Generate test scenarios based on agent's tools
 */
export function generateTestScenarios(tools: string[]): TestScenario[] {
  const scenarios: TestScenario[] = [];
  const addedIds = new Set<string>();

  // Add tool-specific scenarios
  for (const toolId of tools) {
    const toolTests = toolScenarios[toolId];
    if (toolTests) {
      for (const scenario of toolTests) {
        if (!addedIds.has(scenario.id)) {
          scenarios.push(scenario);
          addedIds.add(scenario.id);
        }
      }
    }
  }

  // Add generic scenarios
  for (const scenario of genericScenarios) {
    if (!addedIds.has(scenario.id)) {
      scenarios.push(scenario);
      addedIds.add(scenario.id);
    }
  }

  // Limit to top 5 most relevant
  return scenarios.slice(0, 5);
}

/**
 * Get quick test prompts for UI
 */
export function getQuickTestPrompts(tools: string[]): string[] {
  const scenarios = generateTestScenarios(tools);
  return scenarios.slice(0, 3).map(s => s.prompt);
}

/**
 * Validate test response
 */
export function validateTestResponse(
  response: string,
  scenario: TestScenario
): { passed: boolean; feedback: string } {
  // Basic validation
  if (!response || response.length < 10) {
    return {
      passed: false,
      feedback: "Response too short or empty",
    };
  }

  if (response.toLowerCase().includes("error") || response.toLowerCase().includes("failed")) {
    return {
      passed: false,
      feedback: "Response indicates an error occurred",
    };
  }

  // Check if response addresses the prompt
  const promptKeywords = scenario.prompt.toLowerCase().split(" ").filter(w => w.length > 3);
  const responseText = response.toLowerCase();
  const relevantKeywords = promptKeywords.filter(kw => responseText.includes(kw));
  
  if (relevantKeywords.length < promptKeywords.length * 0.3) {
    return {
      passed: true,
      feedback: "Response may not fully address the prompt",
    };
  }

  return {
    passed: true,
    feedback: "Response looks good!",
  };
}
