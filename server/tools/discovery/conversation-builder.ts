/**
 * Conversational Skill Builder
 * Guides users through agent creation via natural conversation
 */

import { classifyIntent, detectMultipleIntents, type IntentClassification } from "./intent-classifier";
import { detectIndustry, type IndustryDetection, type Industry, industries } from "./industry-detector";
import { decomposeTask, type TaskDecomposition } from "./task-decomposer";
import { recommendTools, toolBundles, type RecommendationResult } from "./tool-recommender";

// Agent employee definitions for server-side (subset of client-side data)
const agentEmployeesList = [
  { id: "web-agent", name: "Web Agent", category: "web", description: "Automate web research, scraping, and browser tasks", requiredTools: ["web_search", "web_scrape", "web_screenshot"], defaultConfig: { goal: "Automate web research and data extraction", personality: "Methodical and thorough" }, systemPrompt: "" },
  { id: "email-agent", name: "Email Agent", category: "email", description: "Manage inbox, draft responses, automate email tasks", requiredTools: ["email_read", "email_send", "email_categorize"], defaultConfig: { goal: "Efficiently manage inbox and communications", personality: "Professional yet personable" }, systemPrompt: "" },
  { id: "research-agent", name: "Research Agent", category: "research", description: "Deep research, source comparison, report generation", requiredTools: ["web_search", "news_search", "pdf_read"], defaultConfig: { goal: "Conduct thorough research on any topic", personality: "Curious and meticulous" }, systemPrompt: "" },
  { id: "data-agent", name: "Data Agent", category: "data", description: "Process, clean, analyze, and visualize data", requiredTools: ["csv_read", "csv_write", "data_transform"], defaultConfig: { goal: "Process and analyze data efficiently", personality: "Precise and analytical" }, systemPrompt: "" },
  { id: "financial-agent", name: "Financial Agent", category: "finance", description: "Bookkeeping, expense tracking, financial reporting", requiredTools: ["csv_read", "excel_write", "calculator", "pdf_read"], defaultConfig: { goal: "Maintain accurate financial records", personality: "Precise and detail-oriented" }, systemPrompt: "" },
  { id: "trading-agent", name: "Trading Agent", category: "trading", description: "Market analysis, alerts, portfolio tracking", requiredTools: ["market_data", "calculator", "csv_write"], defaultConfig: { goal: "Track markets and analyze investments", personality: "Analytical and objective" }, systemPrompt: "" },
  { id: "sales-agent", name: "Sales Agent", category: "sales", description: "Lead research, outreach, CRM management, proposals", requiredTools: ["web_search", "company_search", "email_send"], defaultConfig: { goal: "Find and qualify leads for sales", personality: "Confident and value-focused" }, systemPrompt: "" },
  { id: "social-media-agent", name: "Social Media Agent", category: "social", description: "Content creation, scheduling, analytics, engagement", requiredTools: ["web_search", "file_write"], defaultConfig: { goal: "Create engaging social content", personality: "Creative and trend-aware" }, systemPrompt: "" },
  { id: "hr-agent", name: "HR Agent", category: "hr", description: "Recruiting, onboarding, policy management", requiredTools: ["email_read", "email_send", "pdf_read", "file_write"], defaultConfig: { goal: "Streamline HR processes", personality: "Professional and empathetic" }, systemPrompt: "" },
  { id: "support-agent", name: "Customer Support Agent", category: "support", description: "Ticket handling, knowledge base, customer communication", requiredTools: ["email_read", "email_send", "web_search"], defaultConfig: { goal: "Provide excellent customer support", personality: "Patient and helpful" }, systemPrompt: "" },
  { id: "pm-agent", name: "Project Manager Agent", category: "pm", description: "Task tracking, status reports, team coordination", requiredTools: ["file_read", "file_write", "email_send", "calculator"], defaultConfig: { goal: "Keep projects on track", personality: "Organized and proactive" }, systemPrompt: "" },
  { id: "legal-agent", name: "Legal Agent", category: "legal", description: "Contract review, document analysis, compliance", requiredTools: ["pdf_read", "file_write", "web_search"], defaultConfig: { goal: "Analyze legal documents and contracts", personality: "Thorough and precise" }, systemPrompt: "" },
];

const agentEmployees = agentEmployeesList;

// Conversation state machine states
export type ConversationState = 
  | "greeting"
  | "job_type"
  | "industry"
  | "tasks"
  | "tools"
  | "integrations"
  | "review"
  | "customize"
  | "confirm"
  | "complete";

// Conversation context - accumulated information
export interface ConversationContext {
  state: ConversationState;
  history: ConversationMessage[];
  
  // Gathered information
  jobType?: string;
  agentName?: string;
  intent?: IntentClassification;
  industry?: IndustryDetection;
  tasks?: TaskDecomposition;
  recommendations?: RecommendationResult;
  selectedTools: string[];
  selectedEmployee?: string;
  customizations: Record<string, any>;
  
  // Flags
  needsClarification: boolean;
  clarificationQuestion?: string;
  suggestedQuestions: string[];
  canProceed: boolean;
}

// Single message in conversation
export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  suggestions?: string[];
  metadata?: Record<string, any>;
}

// Response from the conversation builder
export interface ConversationResponse {
  message: string;
  suggestions: string[];
  showExamples?: boolean;
  examples?: string[];
  nextState: ConversationState;
  context: ConversationContext;
  actions?: ConversationAction[];
}

// Actions the UI should take
export interface ConversationAction {
  type: "select_tools" | "select_employee" | "show_preview" | "create_agent" | "go_back";
  data?: any;
}

// State machine transitions
const stateTransitions: Record<ConversationState, ConversationState[]> = {
  greeting: ["job_type"],
  job_type: ["industry", "tasks"],
  industry: ["tasks"],
  tasks: ["tools", "review"],
  tools: ["integrations", "review"],
  integrations: ["review"],
  review: ["customize", "confirm"],
  customize: ["review"],
  confirm: ["complete"],
  complete: ["greeting"], // Can start over
};

/**
 * Initialize a new conversation
 */
export function initializeConversation(): ConversationContext {
  return {
    state: "greeting",
    history: [],
    selectedTools: [],
    customizations: {},
    needsClarification: false,
    suggestedQuestions: [],
    canProceed: false,
  };
}

/**
 * Process user input and generate response
 */
export function processUserInput(
  userInput: string,
  context: ConversationContext
): ConversationResponse {
  // Add user message to history
  context.history.push({
    role: "user",
    content: userInput,
    timestamp: new Date(),
  });
  
  // Check for navigation commands
  const navCommand = checkNavigationCommands(userInput);
  if (navCommand) {
    return handleNavigationCommand(navCommand, context);
  }
  
  // Process based on current state
  switch (context.state) {
    case "greeting":
      return handleGreeting(userInput, context);
    case "job_type":
      return handleJobType(userInput, context);
    case "industry":
      return handleIndustry(userInput, context);
    case "tasks":
      return handleTasks(userInput, context);
    case "tools":
      return handleTools(userInput, context);
    case "integrations":
      return handleIntegrations(userInput, context);
    case "review":
      return handleReview(userInput, context);
    case "customize":
      return handleCustomize(userInput, context);
    case "confirm":
      return handleConfirm(userInput, context);
    default:
      return handleGreeting(userInput, context);
  }
}

/**
 * Check for navigation commands
 */
function checkNavigationCommands(input: string): string | null {
  const lower = input.toLowerCase().trim();
  
  if (lower === "back" || lower === "go back" || lower === "previous") {
    return "back";
  }
  if (lower === "start over" || lower === "restart" || lower === "reset") {
    return "restart";
  }
  if (lower === "skip" || lower === "next") {
    return "skip";
  }
  if (lower === "help" || lower === "?") {
    return "help";
  }
  
  return null;
}

/**
 * Handle navigation commands
 */
function handleNavigationCommand(
  command: string,
  context: ConversationContext
): ConversationResponse {
  if (command === "restart") {
    const newContext = initializeConversation();
    return {
      message: "No problem! Let's start fresh. What kind of AI assistant would you like to create?",
      suggestions: ["Email assistant", "Research agent", "Data analyst", "Sales helper"],
      nextState: "greeting",
      context: newContext,
    };
  }
  
  if (command === "back") {
    // Find previous state
    const stateOrder: ConversationState[] = [
      "greeting", "job_type", "industry", "tasks", "tools", "integrations", "review", "customize", "confirm"
    ];
    const currentIndex = stateOrder.indexOf(context.state);
    if (currentIndex > 0) {
      const previousState = stateOrder[currentIndex - 1];
      context.state = previousState;
      return generateStatePrompt(context);
    }
  }
  
  if (command === "skip") {
    const nextStates = stateTransitions[context.state];
    if (nextStates.length > 0) {
      context.state = nextStates[0];
      return generateStatePrompt(context);
    }
  }
  
  if (command === "help") {
    return {
      message: getHelpMessage(context.state),
      suggestions: ["Continue", "Go back", "Start over"],
      nextState: context.state,
      context,
    };
  }
  
  return generateStatePrompt(context);
}

/**
 * Generate prompt for current state
 */
function generateStatePrompt(context: ConversationContext): ConversationResponse {
  switch (context.state) {
    case "greeting":
      return {
        message: "What kind of AI assistant would you like to create? You can describe what you want it to do, or choose from our pre-built employee types.",
        suggestions: ["Email assistant", "Research agent", "Data analyst", "Sales helper", "Show me all options"],
        nextState: "greeting",
        context,
      };
      
    case "job_type":
      return {
        message: "What will this assistant primarily do? Describe the main tasks or choose a category.",
        suggestions: ["Research and information gathering", "Email and communication", "Data processing", "Sales and outreach"],
        nextState: "job_type",
        context,
      };
      
    case "industry":
      return {
        message: "What industry or field will this assistant work in? This helps me recommend the right tools and terminology.",
        suggestions: ["Technology", "Healthcare", "Finance", "Retail", "Other"],
        nextState: "industry",
        context,
      };
      
    case "tasks":
      return {
        message: "What specific tasks do you want the assistant to handle? Be as specific as you can.",
        suggestions: ["Search the web for information", "Send and manage emails", "Process spreadsheets", "Generate reports"],
        nextState: "tasks",
        context,
      };
      
    case "tools":
      return {
        message: `Based on your needs, I recommend these tools: ${context.recommendations?.essential.slice(0, 3).map(t => t.name).join(", ")}. Would you like to add or remove any?`,
        suggestions: ["Looks good", "Add more tools", "Remove some tools", "Show all available tools"],
        nextState: "tools",
        context,
      };
      
    case "review":
      return generateReviewResponse(context);
      
    default:
      return {
        message: "Let's continue setting up your assistant.",
        suggestions: ["Continue", "Go back"],
        nextState: context.state,
        context,
      };
  }
}

/**
 * Handle greeting state
 */
function handleGreeting(input: string, context: ConversationContext): ConversationResponse {
  // Check if they want to see options
  if (input.toLowerCase().includes("show") || input.toLowerCase().includes("options") || input.toLowerCase().includes("all")) {
    return {
      message: "Here are our pre-built AI employees. Each comes with specialized tools and knowledge for their role. Which interests you?",
      suggestions: agentEmployees.slice(0, 6).map(e => e.name),
      showExamples: true,
      examples: agentEmployees.map(e => `${e.name}: ${e.description}`),
      nextState: "job_type",
      context: { ...context, state: "job_type" },
      actions: [{ type: "select_employee" }],
    };
  }
  
  // Try to match to an employee type
  const matchedEmployee = agentEmployees.find(e => 
    input.toLowerCase().includes(e.name.toLowerCase()) ||
    input.toLowerCase().includes(e.category)
  );
  
  if (matchedEmployee) {
    context.selectedEmployee = matchedEmployee.id;
    context.jobType = matchedEmployee.name;
    context.selectedTools = [...matchedEmployee.requiredTools];
    context.state = "industry";
    
    return {
      message: `Great choice! The ${matchedEmployee.name} is perfect for ${matchedEmployee.description.toLowerCase()}. What industry will you be using this in?`,
      suggestions: ["Technology", "Healthcare", "Finance", "Retail", "Marketing", "Other"],
      nextState: "industry",
      context,
    };
  }
  
  // Classify intent from freeform input
  const intent = classifyIntent(input);
  context.intent = intent;
  context.state = "job_type";
  
  return {
    message: `I understand you want to ${intent.primary.replace(/_/g, " ")}. Let me help you build the perfect assistant for that. What industry or field will this be for?`,
    suggestions: ["Technology", "Healthcare", "Finance", "Retail", "Marketing", "Tell me more about what I need"],
    nextState: "industry",
    context: { ...context, state: "industry" },
  };
}

/**
 * Handle job type state
 */
function handleJobType(input: string, context: ConversationContext): ConversationResponse {
  // Detect multiple intents
  const multiIntent = detectMultipleIntents(input);
  context.intent = multiIntent.intents[0];
  
  if (multiIntent.complexity !== "simple") {
    return {
      message: `That sounds like a multi-purpose assistant! I detected you want to: ${multiIntent.intents.map(i => i.primary.replace(/_/g, " ")).join(", ")}. Is that right?`,
      suggestions: ["Yes, that's right", "Let me clarify", "I just want one thing"],
      nextState: "industry",
      context: { ...context, state: "industry" },
    };
  }
  
  context.state = "industry";
  return {
    message: "Got it! What industry or field will this assistant work in? This helps me recommend specialized tools.",
    suggestions: industries.slice(0, 6).map(i => i.charAt(0).toUpperCase() + i.slice(1).replace(/_/g, " ")),
    nextState: "industry",
    context,
  };
}

/**
 * Handle industry state
 */
function handleIndustry(input: string, context: ConversationContext): ConversationResponse {
  const industryDetection = detectIndustry(input);
  context.industry = industryDetection;
  context.state = "tasks";
  
  return {
    message: `Perfect, I'll tailor recommendations for ${industryDetection.primary.replace(/_/g, " ")}. Now, describe the specific tasks you want this assistant to handle. Be as detailed as you'd like!`,
    suggestions: [
      "Search for information and compile reports",
      "Manage my email inbox",
      "Process data and create spreadsheets",
      "Help me with sales outreach",
    ],
    nextState: "tasks",
    context,
  };
}

/**
 * Handle tasks state
 */
function handleTasks(input: string, context: ConversationContext): ConversationResponse {
  // Decompose tasks
  const taskDecomp = decomposeTask(input, context.intent?.primary);
  context.tasks = taskDecomp;
  
  // Get tool recommendations
  const recommendations = recommendTools(context.intent, context.industry, taskDecomp);
  context.recommendations = recommendations;
  context.selectedTools = recommendations.minimumViableToolkit;
  context.state = "tools";
  
  // Build response
  const essentialToolNames = recommendations.essential.slice(0, 4).map(t => t.name);
  
  return {
    message: `I've analyzed your needs. This will be a ${taskDecomp.totalComplexity} task involving ${taskDecomp.steps.length} step(s). I recommend these essential tools: **${essentialToolNames.join(", ")}**. ${recommendations.recommended.length > 0 ? `You might also benefit from ${recommendations.recommended.slice(0, 2).map(t => t.name).join(" and ")}.` : ""} Does this look right?`,
    suggestions: ["Looks good, continue", "Add more tools", "Remove some tools", "Explain these tools"],
    nextState: "tools",
    context,
  };
}

/**
 * Handle tools state
 */
function handleTools(input: string, context: ConversationContext): ConversationResponse {
  const lower = input.toLowerCase();
  
  if (lower.includes("add") || lower.includes("more")) {
    const availableTools = context.recommendations?.recommended.filter(
      t => !context.selectedTools.includes(t.toolId)
    ) || [];
    
    return {
      message: "Here are additional tools you could add:",
      suggestions: availableTools.slice(0, 5).map(t => `Add ${t.name}`),
      nextState: "tools",
      context,
      actions: [{ type: "select_tools", data: availableTools }],
    };
  }
  
  if (lower.includes("remove")) {
    return {
      message: "Which tools would you like to remove?",
      suggestions: context.selectedTools.map(t => `Remove ${t.replace(/_/g, " ")}`),
      nextState: "tools",
      context,
    };
  }
  
  if (lower.includes("explain")) {
    const explanations = context.recommendations?.essential.slice(0, 4).map(t => 
      `**${t.name}**: ${t.reasons.join(", ")}`
    ).join("\n\n");
    
    return {
      message: `Here's why I recommended each tool:\n\n${explanations}`,
      suggestions: ["Got it, continue", "Add more tools", "Remove some tools"],
      nextState: "tools",
      context,
    };
  }
  
  // Process any tool additions/removals in the input
  if (lower.startsWith("add ")) {
    const toolName = input.substring(4).trim();
    const tool = context.recommendations?.recommended.find(t => 
      t.name.toLowerCase().includes(toolName.toLowerCase())
    );
    if (tool && !context.selectedTools.includes(tool.toolId)) {
      context.selectedTools.push(tool.toolId);
    }
  }
  
  if (lower.startsWith("remove ")) {
    const toolName = input.substring(7).trim();
    context.selectedTools = context.selectedTools.filter(t => 
      !t.toLowerCase().includes(toolName.toLowerCase().replace(/ /g, "_"))
    );
  }
  
  // Move to review
  context.state = "review";
  return generateReviewResponse(context);
}

/**
 * Handle integrations state
 */
function handleIntegrations(input: string, context: ConversationContext): ConversationResponse {
  // For now, move to review
  context.state = "review";
  return generateReviewResponse(context);
}

/**
 * Generate review response
 */
function generateReviewResponse(context: ConversationContext): ConversationResponse {
  const employeeName = context.selectedEmployee 
    ? agentEmployees.find(e => e.id === context.selectedEmployee)?.name 
    : "Custom Agent";
  
  const summary = `
**Agent Summary:**
- **Type:** ${employeeName}
- **Industry:** ${context.industry?.primary.replace(/_/g, " ") || "General"}
- **Tools:** ${context.selectedTools.slice(0, 5).map(t => t.replace(/_/g, " ")).join(", ")}${context.selectedTools.length > 5 ? ` +${context.selectedTools.length - 5} more` : ""}
- **Complexity:** ${context.tasks?.totalComplexity || "Moderate"}
`;

  return {
    message: `Here's what I've configured for you:\n${summary}\n\nWould you like to create this agent or make any changes?`,
    suggestions: ["Create this agent", "Customize settings", "Change tools", "Start over"],
    nextState: "review",
    context: { ...context, state: "review", canProceed: true },
    actions: [{ type: "show_preview" }],
  };
}

/**
 * Handle review state
 */
function handleReview(input: string, context: ConversationContext): ConversationResponse {
  const lower = input.toLowerCase();
  
  if (lower.includes("create") || lower.includes("yes") || lower.includes("looks good")) {
    context.state = "confirm";
    return {
      message: "Great! I'll create your agent now. Give it a name, or I can suggest one.",
      suggestions: [
        context.selectedEmployee ? `${agentEmployees.find(e => e.id === context.selectedEmployee)?.name} Pro` : "Research Assistant",
        "My AI Helper",
        "Let me type a name",
      ],
      nextState: "confirm",
      context,
    };
  }
  
  if (lower.includes("customize") || lower.includes("settings")) {
    context.state = "customize";
    return {
      message: "What would you like to customize?",
      suggestions: ["Change personality", "Adjust creativity level", "Set response length", "Go back to review"],
      nextState: "customize",
      context,
    };
  }
  
  if (lower.includes("change tools") || lower.includes("tools")) {
    context.state = "tools";
    return generateStatePrompt(context);
  }
  
  return generateReviewResponse(context);
}

/**
 * Handle customize state
 */
function handleCustomize(input: string, context: ConversationContext): ConversationResponse {
  const lower = input.toLowerCase();
  
  if (lower.includes("personality")) {
    return {
      message: "How should your agent communicate?",
      suggestions: ["Professional and formal", "Friendly and casual", "Concise and efficient", "Detailed and thorough"],
      nextState: "customize",
      context,
    };
  }
  
  if (lower.includes("creativity") || lower.includes("temperature")) {
    return {
      message: "How creative should responses be?",
      suggestions: ["Very precise (low creativity)", "Balanced", "Creative (high variety)", "Back to customization"],
      nextState: "customize",
      context,
    };
  }
  
  // Store customization
  if (lower.includes("professional")) {
    context.customizations.personality = "professional";
  } else if (lower.includes("friendly") || lower.includes("casual")) {
    context.customizations.personality = "friendly";
  } else if (lower.includes("concise")) {
    context.customizations.personality = "concise";
  }
  
  if (lower.includes("precise") || lower.includes("low")) {
    context.customizations.temperature = 0.2;
  } else if (lower.includes("balanced")) {
    context.customizations.temperature = 0.5;
  } else if (lower.includes("creative") || lower.includes("high")) {
    context.customizations.temperature = 0.8;
  }
  
  if (lower.includes("back") || lower.includes("review") || lower.includes("done")) {
    context.state = "review";
    return generateReviewResponse(context);
  }
  
  return {
    message: "Setting saved! What else would you like to customize?",
    suggestions: ["Change personality", "Adjust creativity", "Done customizing"],
    nextState: "customize",
    context,
  };
}

/**
 * Handle confirm state
 */
function handleConfirm(input: string, context: ConversationContext): ConversationResponse {
  // Set agent name
  if (input.toLowerCase() !== "let me type a name" && input.length > 2) {
    context.agentName = input;
  } else {
    context.agentName = context.selectedEmployee 
      ? agentEmployees.find(e => e.id === context.selectedEmployee)?.name || "My Agent"
      : "My Agent";
  }
  
  context.state = "complete";
  
  return {
    message: `Your "${context.agentName}" is ready! Click below to finalize and start using your new AI assistant.`,
    suggestions: ["Create Agent", "Make changes first"],
    nextState: "complete",
    context,
    actions: [{ type: "create_agent", data: buildAgentConfig(context) }],
  };
}

/**
 * Build final agent configuration
 */
function buildAgentConfig(context: ConversationContext) {
  const employee = context.selectedEmployee 
    ? agentEmployees.find(e => e.id === context.selectedEmployee)
    : null;
  
  return {
    name: context.agentName || "My Agent",
    goal: employee?.defaultConfig.goal || `Help with ${context.intent?.primary.replace(/_/g, " ") || "various tasks"}`,
    personality: context.customizations.personality || employee?.defaultConfig.personality || "Helpful and professional",
    tools: context.selectedTools,
    temperature: context.customizations.temperature || 0.5,
    maxTokens: 4096,
    systemPrompt: employee?.systemPrompt,
  };
}

/**
 * Get help message for current state
 */
function getHelpMessage(state: ConversationState): string {
  const helpMessages: Record<ConversationState, string> = {
    greeting: "Tell me what kind of AI assistant you want to create. You can describe tasks in natural language or choose from pre-built employee types.",
    job_type: "Describe the main purpose of your assistant. What should it primarily help you with?",
    industry: "Tell me your industry or field. This helps me recommend specialized tools and use appropriate terminology.",
    tasks: "List the specific tasks you want the assistant to handle. Be as detailed as possible.",
    tools: "Review the recommended tools. You can add, remove, or ask me to explain any of them.",
    integrations: "Connect any external services your assistant should work with.",
    review: "Review your agent configuration. You can customize settings or proceed to create it.",
    customize: "Adjust personality, creativity level, response length, and other settings.",
    confirm: "Give your agent a name and create it!",
    complete: "Your agent is ready! You can now use it or make changes.",
  };
  
  return helpMessages[state] || "I'm here to help you create an AI assistant. Just tell me what you need!";
}

/**
 * Quick suggestions based on context
 */
export function getQuickSuggestions(context: ConversationContext): string[] {
  // Dynamic suggestions based on state and gathered info
  if (context.state === "tasks" && context.industry) {
    const industryTasks: Record<Industry, string[]> = {
      technology: ["Code review", "Documentation", "Bug tracking"],
      healthcare: ["Patient scheduling", "Records processing", "Compliance checks"],
      finance: ["Financial reporting", "Invoice processing", "Market analysis"],
      retail: ["Inventory tracking", "Customer inquiries", "Order processing"],
      manufacturing: ["Quality control", "Supply chain", "Equipment maintenance"],
      real_estate: ["Listing management", "Market analysis", "Client follow-up"],
      legal: ["Contract review", "Document analysis", "Case research"],
      education: ["Student records", "Course scheduling", "Assignment tracking"],
      marketing: ["Campaign tracking", "Content creation", "Analytics"],
      professional_services: ["Client management", "Billing", "Project tracking"],
      government: ["Document processing", "Compliance", "Public records"],
      nonprofit: ["Donor management", "Grant tracking", "Volunteer coordination"],
      media_entertainment: ["Content scheduling", "Rights management", "Analytics"],
      hospitality: ["Booking management", "Guest services", "Inventory"],
      logistics: ["Shipment tracking", "Route optimization", "Inventory management"],
    };
    
    return industryTasks[context.industry.primary] || [];
  }
  
  return [];
}
