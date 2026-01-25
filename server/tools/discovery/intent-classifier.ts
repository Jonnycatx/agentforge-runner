/**
 * Intent Classification System
 * Analyzes user input to determine what they want to accomplish
 */

// Intent categories
export const intentCategories = [
  "information_gathering",
  "communication",
  "data_processing",
  "content_creation",
  "automation",
  "analysis_reporting",
  "transaction",
  "research",
  "monitoring",
  "integration",
] as const;

export type IntentCategory = typeof intentCategories[number];

// Intent definitions with keywords and tool mappings
export const intentDefinitions: Record<IntentCategory, {
  name: string;
  description: string;
  keywords: string[];
  phrases: string[];
  toolCategories: string[];
}> = {
  information_gathering: {
    name: "Information Gathering",
    description: "Finding, collecting, or looking up information",
    keywords: ["find", "search", "lookup", "get", "fetch", "retrieve", "discover", "learn", "research"],
    phrases: ["i need to find", "help me search", "looking for", "where can i find", "what is"],
    toolCategories: ["web", "search", "research"],
  },
  communication: {
    name: "Communication",
    description: "Sending messages, emails, or notifications",
    keywords: ["email", "send", "message", "notify", "contact", "reach out", "reply", "respond"],
    phrases: ["send an email", "write a message", "reach out to", "contact", "follow up"],
    toolCategories: ["email", "communication"],
  },
  data_processing: {
    name: "Data Processing",
    description: "Cleaning, transforming, or organizing data",
    keywords: ["clean", "transform", "convert", "parse", "format", "organize", "merge", "split", "filter"],
    phrases: ["clean up data", "transform this", "convert to", "process the data", "organize"],
    toolCategories: ["data", "files"],
  },
  content_creation: {
    name: "Content Creation",
    description: "Creating documents, reports, or media",
    keywords: ["create", "write", "generate", "draft", "compose", "design", "build", "make"],
    phrases: ["create a report", "write content", "generate a", "draft a document", "make a"],
    toolCategories: ["files", "web"],
  },
  automation: {
    name: "Automation",
    description: "Automating repetitive tasks or workflows",
    keywords: ["automate", "schedule", "repeat", "workflow", "trigger", "batch", "recurring"],
    phrases: ["automate this", "set up a workflow", "run automatically", "schedule to"],
    toolCategories: ["automation", "web"],
  },
  analysis_reporting: {
    name: "Analysis & Reporting",
    description: "Analyzing data and generating reports",
    keywords: ["analyze", "report", "summarize", "insights", "trends", "metrics", "statistics", "dashboard"],
    phrases: ["analyze this", "generate a report", "show me trends", "calculate metrics"],
    toolCategories: ["data", "finance"],
  },
  transaction: {
    name: "Transaction",
    description: "Making purchases, payments, or bookings",
    keywords: ["buy", "purchase", "book", "order", "pay", "subscribe", "reserve"],
    phrases: ["make a purchase", "book a", "place an order", "subscribe to"],
    toolCategories: ["finance", "web"],
  },
  research: {
    name: "Research",
    description: "In-depth investigation and analysis",
    keywords: ["research", "investigate", "study", "compare", "evaluate", "assess", "review"],
    phrases: ["research this", "compare options", "evaluate", "do a deep dive"],
    toolCategories: ["search", "research", "web"],
  },
  monitoring: {
    name: "Monitoring",
    description: "Tracking changes, alerts, and updates",
    keywords: ["monitor", "track", "watch", "alert", "notify", "follow", "observe"],
    phrases: ["keep track of", "monitor for changes", "alert me when", "watch for"],
    toolCategories: ["web", "search", "automation"],
  },
  integration: {
    name: "Integration",
    description: "Connecting systems or syncing data",
    keywords: ["sync", "connect", "integrate", "link", "import", "export", "transfer"],
    phrases: ["sync with", "connect to", "integrate with", "import from", "export to"],
    toolCategories: ["data", "storage", "crm"],
  },
};

// Classification result
export interface IntentClassification {
  primary: IntentCategory;
  secondary: IntentCategory[];
  confidence: number;
  reasoning: string;
  suggestedToolCategories: string[];
  keywords_matched: string[];
}

// Multi-intent detection result
export interface MultiIntentResult {
  intents: IntentClassification[];
  combined_categories: string[];
  complexity: "simple" | "moderate" | "complex";
}

/**
 * Classify user input into intent categories
 */
export function classifyIntent(userInput: string): IntentClassification {
  const input = userInput.toLowerCase();
  const scores: Record<IntentCategory, number> = {} as any;
  const matchedKeywords: Record<IntentCategory, string[]> = {} as any;
  
  // Initialize scores
  for (const category of intentCategories) {
    scores[category] = 0;
    matchedKeywords[category] = [];
  }
  
  // Score each category
  for (const [category, definition] of Object.entries(intentDefinitions)) {
    // Check keywords
    for (const keyword of definition.keywords) {
      if (input.includes(keyword)) {
        scores[category as IntentCategory] += 1;
        matchedKeywords[category as IntentCategory].push(keyword);
      }
    }
    
    // Check phrases (worth more)
    for (const phrase of definition.phrases) {
      if (input.includes(phrase)) {
        scores[category as IntentCategory] += 2;
        matchedKeywords[category as IntentCategory].push(phrase);
      }
    }
  }
  
  // Sort by score
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0);
  
  if (sorted.length === 0) {
    // Default to information gathering if no match
    return {
      primary: "information_gathering",
      secondary: [],
      confidence: 0.3,
      reasoning: "No clear intent detected, defaulting to information gathering",
      suggestedToolCategories: ["web", "search"],
      keywords_matched: [],
    };
  }
  
  const [primaryCategory, primaryScore] = sorted[0];
  const maxPossibleScore = intentDefinitions[primaryCategory as IntentCategory].keywords.length +
    (intentDefinitions[primaryCategory as IntentCategory].phrases.length * 2);
  
  const confidence = Math.min(primaryScore / Math.max(maxPossibleScore / 2, 1), 1);
  
  // Get secondary intents (those with at least half the primary score)
  const secondary = sorted
    .slice(1)
    .filter(([_, score]) => score >= primaryScore / 2)
    .map(([cat]) => cat as IntentCategory);
  
  // Collect all suggested tool categories
  const suggestedCategories = new Set<string>();
  intentDefinitions[primaryCategory as IntentCategory].toolCategories.forEach(c => suggestedCategories.add(c));
  for (const sec of secondary) {
    intentDefinitions[sec].toolCategories.forEach(c => suggestedCategories.add(c));
  }
  
  return {
    primary: primaryCategory as IntentCategory,
    secondary,
    confidence,
    reasoning: `Detected ${intentDefinitions[primaryCategory as IntentCategory].name} intent based on keywords: ${matchedKeywords[primaryCategory as IntentCategory].join(", ")}`,
    suggestedToolCategories: Array.from(suggestedCategories),
    keywords_matched: matchedKeywords[primaryCategory as IntentCategory],
  };
}

/**
 * Detect multiple intents in a complex request
 */
export function detectMultipleIntents(userInput: string): MultiIntentResult {
  const input = userInput.toLowerCase();
  
  // Split by common conjunctions and punctuation
  const segments = input
    .split(/(?:,|;|\.|\band\b|\bthen\b|\balso\b|\bplus\b)/g)
    .map(s => s.trim())
    .filter(s => s.length > 3);
  
  const intents: IntentClassification[] = [];
  const seenPrimaries = new Set<IntentCategory>();
  
  for (const segment of segments) {
    const classification = classifyIntent(segment);
    if (!seenPrimaries.has(classification.primary) && classification.confidence > 0.3) {
      intents.push(classification);
      seenPrimaries.add(classification.primary);
    }
  }
  
  // If no segments, classify the whole input
  if (intents.length === 0) {
    intents.push(classifyIntent(userInput));
  }
  
  // Combine all categories
  const allCategories = new Set<string>();
  for (const intent of intents) {
    intent.suggestedToolCategories.forEach(c => allCategories.add(c));
  }
  
  // Determine complexity
  let complexity: "simple" | "moderate" | "complex" = "simple";
  if (intents.length >= 3) {
    complexity = "complex";
  } else if (intents.length === 2) {
    complexity = "moderate";
  }
  
  return {
    intents,
    combined_categories: Array.from(allCategories),
    complexity,
  };
}

/**
 * Generate LLM prompt for more accurate intent classification
 */
export function generateClassificationPrompt(userInput: string): string {
  return `Analyze the following user request and classify their intent(s).

User Request: "${userInput}"

Classify into one or more of these categories:
${intentCategories.map(c => `- ${c}: ${intentDefinitions[c].description}`).join("\n")}

Respond in JSON format:
{
  "primary_intent": "category_name",
  "secondary_intents": ["category1", "category2"],
  "confidence": 0.0-1.0,
  "reasoning": "explanation",
  "key_actions": ["action1", "action2"],
  "required_data": ["data1", "data2"],
  "expected_output": "description of what user expects"
}`;
}
