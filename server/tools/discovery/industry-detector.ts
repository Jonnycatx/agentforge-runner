/**
 * Industry/Domain Detection System
 * Identifies the business domain from user context
 */

// Industry taxonomy
export const industries = [
  "technology",
  "healthcare",
  "finance",
  "retail",
  "manufacturing",
  "real_estate",
  "legal",
  "education",
  "marketing",
  "professional_services",
  "government",
  "nonprofit",
  "media_entertainment",
  "hospitality",
  "logistics",
] as const;

export type Industry = typeof industries[number];

// Industry definitions
export const industryDefinitions: Record<Industry, {
  name: string;
  description: string;
  keywords: string[];
  terminology: string[];
  toolPriorities: string[];
  complianceNotes: string[];
}> = {
  technology: {
    name: "Technology & Software",
    description: "Software development, IT services, SaaS",
    keywords: ["software", "app", "code", "developer", "startup", "saas", "api", "cloud", "tech"],
    terminology: ["sprint", "deployment", "repository", "CI/CD", "microservices", "agile"],
    toolPriorities: ["code_execute", "http_request", "web_search", "file_tools"],
    complianceNotes: ["SOC2", "GDPR for user data", "Open source licenses"],
  },
  healthcare: {
    name: "Healthcare & Medical",
    description: "Hospitals, clinics, pharma, medical devices",
    keywords: ["medical", "healthcare", "hospital", "patient", "doctor", "pharma", "clinic", "health"],
    terminology: ["HIPAA", "EMR", "diagnosis", "treatment", "clinical trial", "formulary"],
    toolPriorities: ["pdf_read", "email_tools", "calendar_events", "data_transform"],
    complianceNotes: ["HIPAA compliance required", "PHI handling restrictions", "FDA regulations"],
  },
  finance: {
    name: "Finance & Banking",
    description: "Banks, investment, insurance, fintech",
    keywords: ["bank", "finance", "investment", "trading", "insurance", "loan", "credit", "portfolio"],
    terminology: ["ROI", "P&L", "balance sheet", "derivative", "hedge", "compliance"],
    toolPriorities: ["market_data", "calculator", "excel_tools", "pdf_read"],
    complianceNotes: ["SEC regulations", "SOX compliance", "KYC/AML requirements", "PCI-DSS"],
  },
  retail: {
    name: "Retail & E-commerce",
    description: "Online stores, physical retail, consumer goods",
    keywords: ["store", "shop", "ecommerce", "product", "inventory", "customer", "order", "retail"],
    terminology: ["SKU", "conversion rate", "cart abandonment", "fulfillment", "POS"],
    toolPriorities: ["web_scrape", "csv_tools", "email_tools", "data_transform"],
    complianceNotes: ["PCI compliance for payments", "Consumer protection laws", "Return policies"],
  },
  manufacturing: {
    name: "Manufacturing & Industrial",
    description: "Factories, production, supply chain",
    keywords: ["manufacturing", "factory", "production", "supply chain", "inventory", "equipment", "industrial"],
    terminology: ["BOM", "MRP", "lean", "six sigma", "OEE", "quality control"],
    toolPriorities: ["excel_tools", "csv_tools", "calculator", "email_tools"],
    complianceNotes: ["OSHA safety", "ISO certifications", "Environmental regulations"],
  },
  real_estate: {
    name: "Real Estate",
    description: "Property sales, rentals, property management",
    keywords: ["property", "real estate", "rental", "lease", "mortgage", "listing", "home", "apartment"],
    terminology: ["MLS", "cap rate", "closing", "escrow", "appraisal", "HOA"],
    toolPriorities: ["web_search", "calculator", "pdf_generator", "email_tools"],
    complianceNotes: ["Fair housing laws", "Disclosure requirements", "Licensing regulations"],
  },
  legal: {
    name: "Legal Services",
    description: "Law firms, legal departments, compliance",
    keywords: ["legal", "law", "attorney", "contract", "compliance", "litigation", "court"],
    terminology: ["plaintiff", "defendant", "discovery", "deposition", "statute", "jurisdiction"],
    toolPriorities: ["pdf_read", "file_tools", "web_search", "email_tools"],
    complianceNotes: ["Attorney-client privilege", "Court filing deadlines", "Bar requirements"],
  },
  education: {
    name: "Education",
    description: "Schools, universities, e-learning, training",
    keywords: ["school", "university", "student", "teacher", "course", "learning", "education", "training"],
    terminology: ["curriculum", "syllabus", "enrollment", "GPA", "accreditation"],
    toolPriorities: ["pdf_read", "file_tools", "calendar_events", "email_tools"],
    complianceNotes: ["FERPA for student data", "ADA accessibility", "Accreditation standards"],
  },
  marketing: {
    name: "Marketing & Advertising",
    description: "Agencies, brand management, digital marketing",
    keywords: ["marketing", "advertising", "campaign", "brand", "social media", "content", "seo"],
    terminology: ["CTR", "impression", "engagement", "conversion", "funnel", "A/B test"],
    toolPriorities: ["web_search", "web_scrape", "email_tools", "news_search"],
    complianceNotes: ["CAN-SPAM for emails", "FTC disclosure rules", "GDPR for EU"],
  },
  professional_services: {
    name: "Professional Services",
    description: "Consulting, accounting, HR services",
    keywords: ["consulting", "advisor", "accountant", "hr", "recruitment", "staffing"],
    terminology: ["billable hours", "engagement", "scope", "deliverable", "retainer"],
    toolPriorities: ["excel_tools", "pdf_generator", "email_tools", "calendar_events"],
    complianceNotes: ["Professional licensing", "Confidentiality agreements", "Industry certifications"],
  },
  government: {
    name: "Government & Public Sector",
    description: "Federal, state, local government agencies",
    keywords: ["government", "federal", "state", "public", "agency", "policy", "regulation"],
    terminology: ["RFP", "grant", "procurement", "FOIA", "constituent"],
    toolPriorities: ["pdf_read", "file_tools", "data_transform", "email_tools"],
    complianceNotes: ["FISMA", "FedRAMP", "Section 508 accessibility", "Records retention"],
  },
  nonprofit: {
    name: "Non-profit & NGO",
    description: "Charities, foundations, social enterprises",
    keywords: ["nonprofit", "charity", "foundation", "donation", "volunteer", "grant", "mission"],
    terminology: ["501c3", "donor", "fundraising", "grant writing", "impact"],
    toolPriorities: ["email_tools", "excel_tools", "pdf_generator", "csv_tools"],
    complianceNotes: ["IRS reporting", "Donor privacy", "Grant compliance"],
  },
  media_entertainment: {
    name: "Media & Entertainment",
    description: "Publishing, broadcasting, gaming, streaming",
    keywords: ["media", "content", "video", "music", "game", "streaming", "publish", "broadcast"],
    terminology: ["syndication", "licensing", "royalty", "distribution", "audience"],
    toolPriorities: ["web_search", "file_tools", "web_scrape", "data_transform"],
    complianceNotes: ["Copyright laws", "Content licensing", "FCC regulations"],
  },
  hospitality: {
    name: "Hospitality & Travel",
    description: "Hotels, restaurants, tourism, events",
    keywords: ["hotel", "restaurant", "travel", "tourism", "booking", "reservation", "event"],
    terminology: ["occupancy", "RevPAR", "ADR", "booking window", "yield management"],
    toolPriorities: ["calendar_events", "email_tools", "web_search", "csv_tools"],
    complianceNotes: ["Health and safety", "Liquor licensing", "Travel regulations"],
  },
  logistics: {
    name: "Logistics & Transportation",
    description: "Shipping, warehousing, fleet management",
    keywords: ["shipping", "logistics", "warehouse", "fleet", "delivery", "freight", "transport"],
    terminology: ["LTL", "FTL", "last mile", "tracking", "customs", "freight forward"],
    toolPriorities: ["csv_tools", "data_transform", "http_request", "email_tools"],
    complianceNotes: ["DOT regulations", "Customs compliance", "Hazmat handling"],
  },
};

// Detection result
export interface IndustryDetection {
  primary: Industry;
  secondary: Industry[];
  confidence: number;
  reasoning: string;
  terminology_matched: string[];
  compliance_notes: string[];
  recommended_tools: string[];
}

/**
 * Detect industry from user input
 */
export function detectIndustry(userInput: string, context?: string): IndustryDetection {
  const input = `${userInput} ${context || ""}`.toLowerCase();
  const scores: Record<Industry, number> = {} as any;
  const matchedTerms: Record<Industry, string[]> = {} as any;
  
  // Initialize
  for (const industry of industries) {
    scores[industry] = 0;
    matchedTerms[industry] = [];
  }
  
  // Score each industry
  for (const [industry, definition] of Object.entries(industryDefinitions)) {
    // Keywords
    for (const keyword of definition.keywords) {
      if (input.includes(keyword)) {
        scores[industry as Industry] += 1;
        matchedTerms[industry as Industry].push(keyword);
      }
    }
    
    // Terminology (worth more - industry-specific)
    for (const term of definition.terminology) {
      if (input.includes(term.toLowerCase())) {
        scores[industry as Industry] += 2;
        matchedTerms[industry as Industry].push(term);
      }
    }
  }
  
  // Sort by score
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0);
  
  if (sorted.length === 0) {
    return {
      primary: "technology", // Default
      secondary: [],
      confidence: 0.2,
      reasoning: "No clear industry detected, defaulting to general technology",
      terminology_matched: [],
      compliance_notes: [],
      recommended_tools: industryDefinitions.technology.toolPriorities,
    };
  }
  
  const [primaryIndustry, primaryScore] = sorted[0];
  const def = industryDefinitions[primaryIndustry as Industry];
  const maxPossible = def.keywords.length + (def.terminology.length * 2);
  const confidence = Math.min(primaryScore / Math.max(maxPossible / 3, 1), 1);
  
  // Secondary industries
  const secondary = sorted
    .slice(1, 3)
    .filter(([_, score]) => score >= primaryScore / 2)
    .map(([ind]) => ind as Industry);
  
  // Collect all compliance notes
  const allCompliance = new Set<string>(def.complianceNotes);
  for (const sec of secondary) {
    industryDefinitions[sec].complianceNotes.forEach(n => allCompliance.add(n));
  }
  
  // Collect all recommended tools
  const allTools = new Set<string>(def.toolPriorities);
  for (const sec of secondary) {
    industryDefinitions[sec].toolPriorities.forEach(t => allTools.add(t));
  }
  
  return {
    primary: primaryIndustry as Industry,
    secondary,
    confidence,
    reasoning: `Detected ${def.name} based on: ${matchedTerms[primaryIndustry as Industry].join(", ")}`,
    terminology_matched: matchedTerms[primaryIndustry as Industry],
    compliance_notes: Array.from(allCompliance),
    recommended_tools: Array.from(allTools),
  };
}

/**
 * Get industry-specific tool pack
 */
export function getIndustryToolPack(industry: Industry): {
  essential: string[];
  recommended: string[];
  compliance_tools: string[];
} {
  const def = industryDefinitions[industry];
  
  // Common essential tools
  const essential = def.toolPriorities.slice(0, 3);
  
  // Recommended additions
  const recommended = def.toolPriorities.slice(3);
  
  // Compliance-related tools vary by industry
  const complianceTools: string[] = [];
  if (def.complianceNotes.some(n => n.toLowerCase().includes("data") || n.toLowerCase().includes("privacy"))) {
    complianceTools.push("data_transform"); // For anonymization
  }
  if (def.complianceNotes.some(n => n.toLowerCase().includes("audit") || n.toLowerCase().includes("record"))) {
    complianceTools.push("file_tools", "pdf_read");
  }
  
  return {
    essential,
    recommended,
    compliance_tools: complianceTools,
  };
}

/**
 * Generate LLM prompt for industry detection
 */
export function generateIndustryPrompt(userInput: string): string {
  return `Analyze the following request and determine the industry/domain context.

User Request: "${userInput}"

Industries to consider:
${industries.map(i => `- ${i}: ${industryDefinitions[i].description}`).join("\n")}

Respond in JSON format:
{
  "primary_industry": "industry_name",
  "secondary_industries": ["industry1", "industry2"],
  "confidence": 0.0-1.0,
  "reasoning": "explanation",
  "industry_terminology_used": ["term1", "term2"],
  "compliance_considerations": ["consideration1", "consideration2"]
}`;
}
