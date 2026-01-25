/**
 * Tool Bundles - Pre-configured tool combinations for common use cases
 */

export interface ToolBundle {
  id: string;
  name: string;
  description: string;
  icon: string;
  tools: string[];
  color: string;
}

export const toolBundles: ToolBundle[] = [
  {
    id: "researcher",
    name: "Research Pack",
    description: "Complete toolkit for web research and analysis",
    icon: "Search",
    tools: ["web_search", "web_scrape", "news_search", "company_search", "research_planner"],
    color: "bg-blue-500",
  },
  {
    id: "deep-research",
    name: "Deep Research Intelligence",
    description: "Full research planning, verification, and synthesis",
    icon: "Brain",
    tools: ["research_planner", "iterative_browse", "source_credibility", "cross_source_synthesis", "citation_manager"],
    color: "bg-emerald-600",
  },
  {
    id: "academic-research",
    name: "Academic Research",
    description: "Academic papers, citations, and scholarly analysis",
    icon: "GraduationCap",
    tools: ["academic_search", "pdf_read", "citation_manager", "table_extractor", "report_generator"],
    color: "bg-indigo-600",
  },
  {
    id: "fact-checker",
    name: "Fact Checker",
    description: "Verify claims with multi-source analysis",
    icon: "ShieldCheck",
    tools: ["source_credibility", "cross_source_synthesis", "web_search", "news_search"],
    color: "bg-green-600",
  },
  {
    id: "research-memory",
    name: "Research Memory Kit",
    description: "Long-term research with memory and analysis",
    icon: "Database",
    tools: ["research_memory", "data_analysis", "timeline_builder", "report_generator"],
    color: "bg-purple-600",
  },
  {
    id: "email-pro",
    name: "Email Pro",
    description: "Full email management and automation",
    icon: "Mail",
    tools: ["email_read", "email_send", "email_categorize", "email_draft", "email_summarize", "email_extract_actions"],
    color: "bg-purple-500",
  },
  {
    id: "email-ai-assistant",
    name: "AI Email Assistant",
    description: "Complete AI-powered email management suite",
    icon: "Sparkles",
    tools: ["email_summarize", "email_extract_actions", "email_prioritize", "email_search_semantic", "email_style_match", "email_sentiment"],
    color: "bg-violet-500",
  },
  {
    id: "email-automation",
    name: "Email Automation",
    description: "Rules, auto-reply, and batch processing",
    icon: "Workflow",
    tools: ["email_auto_reply", "email_rules", "email_batch", "email_digest"],
    color: "bg-fuchsia-500",
  },
  {
    id: "email-productivity",
    name: "Inbox Zero Kit",
    description: "Get to inbox zero with smart tools",
    icon: "Inbox",
    tools: ["email_prioritize", "email_batch", "email_unsubscribe", "email_thread_manage", "email_digest"],
    color: "bg-purple-600",
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Data processing and analysis tools",
    icon: "BarChart3",
    tools: ["csv_read", "csv_write", "excel_read", "data_transform", "calculator"],
    color: "bg-green-500",
  },
  {
    id: "ai-data-scientist",
    name: "AI Data Scientist",
    description: "Natural language queries, auto-insights, and visualization",
    icon: "Sparkles",
    tools: ["ask_data", "auto_analyze", "visualize_data", "stats_analysis", "data_clean"],
    color: "bg-cyan-600",
  },
  {
    id: "ml-toolkit",
    name: "ML & Prediction Kit",
    description: "Machine learning, forecasting, and anomaly detection",
    icon: "TrendingUp",
    tools: ["ml_predict", "anomaly_detect", "stats_analysis", "auto_analyze"],
    color: "bg-blue-600",
  },
  {
    id: "data-engineering",
    name: "Data Engineering",
    description: "ETL, data formats, SQL, and database connections",
    icon: "Database",
    tools: ["data_parquet", "data_json", "sql_query", "data_merge", "data_clean", "db_connect"],
    color: "bg-slate-600",
  },
  {
    id: "data-reporting",
    name: "Data Reporting Suite",
    description: "Visualization, analysis, and report generation",
    icon: "FileText",
    tools: ["visualize_data", "stats_analysis", "data_report", "auto_analyze"],
    color: "bg-teal-600",
  },
  {
    id: "finance",
    name: "Finance Suite",
    description: "Financial analysis and market data",
    icon: "DollarSign",
    tools: ["calculator", "market_data", "csv_read", "pdf_read"],
    color: "bg-emerald-500",
  },
  {
    id: "investment-analyzer",
    name: "Investment Analyzer",
    description: "Stock data, portfolio analysis, and market intelligence",
    icon: "TrendingUp",
    tools: ["stock_data", "portfolio_analyzer", "investment_screener", "market_data"],
    color: "bg-green-600",
  },
  {
    id: "personal-finance",
    name: "Personal Finance Kit",
    description: "Budgeting, expense tracking, and goal planning",
    icon: "Wallet",
    tools: ["transaction_categorizer", "budget_tracker", "goal_tracker", "expense_forecast", "statement_parser"],
    color: "bg-emerald-600",
  },
  {
    id: "financial-math",
    name: "Financial Calculator Pro",
    description: "Loans, investments, NPV/IRR, Monte Carlo simulations",
    icon: "Calculator",
    tools: ["financial_math", "calculator", "debt_analyzer", "expense_forecast"],
    color: "bg-teal-600",
  },
  {
    id: "tax-planning",
    name: "Tax Planning Kit",
    description: "Tax estimation and deduction scanning",
    icon: "Receipt",
    tools: ["tax_estimator", "transaction_categorizer", "financial_report"],
    color: "bg-lime-600",
  },
  {
    id: "fraud-security",
    name: "Financial Security",
    description: "Transaction monitoring and fraud detection",
    icon: "ShieldAlert",
    tools: ["fraud_detector", "statement_parser", "transaction_categorizer"],
    color: "bg-red-600",
  },
  // Trading & Technical Analysis Bundles
  {
    id: "technical-analysis",
    name: "Technical Analysis Pro",
    description: "Indicators, patterns, Fibonacci, and multi-timeframe analysis",
    icon: "TrendingUp",
    tools: ["ohlcv_data", "technical_indicators", "chart_pattern_detector", "fibonacci_tools", "multi_timeframe_analysis"],
    color: "bg-amber-600",
  },
  {
    id: "chart-patterns",
    name: "Chart Pattern Scanner",
    description: "Classical patterns, candlesticks, and support/resistance",
    icon: "Triangle",
    tools: ["chart_pattern_detector", "candlestick_patterns", "support_resistance", "ohlcv_data"],
    color: "bg-orange-600",
  },
  {
    id: "advanced-charting",
    name: "Advanced Charting Kit",
    description: "Elliott Wave, Gann, Fibonacci, and volume analysis",
    icon: "Waves",
    tools: ["elliott_wave", "gann_tools", "fibonacci_tools", "volume_analysis", "ohlcv_data"],
    color: "bg-yellow-600",
  },
  {
    id: "trade-ideas",
    name: "Trade Idea Generator",
    description: "Confluence analysis, backtesting, and trade setup generation",
    icon: "Lightbulb",
    tools: ["trade_idea_generator", "multi_timeframe_analysis", "backtest_scenario", "market_sentiment"],
    color: "bg-amber-500",
  },
  // B2B Sales & SDR Bundles
  {
    id: "lead-generation",
    name: "Lead Generation Suite",
    description: "Build targeted lists with company and contact enrichment",
    icon: "ListFilter",
    tools: ["lead_list_generator", "contact_finder", "company_enrichment", "buyer_persona_matcher"],
    color: "bg-indigo-600",
  },
  {
    id: "sales-enrichment",
    name: "Sales Intelligence & Enrichment",
    description: "Enrich contacts with emails, phones, LinkedIn, and signals",
    icon: "UserSearch",
    tools: ["contact_finder", "company_enrichment", "linkedin_enricher", "intent_signal_scanner"],
    color: "bg-violet-600",
  },
  {
    id: "outreach-automation",
    name: "Multi-Channel Outreach",
    description: "Email sequences, personalization, and call scripts",
    icon: "Workflow",
    tools: ["outreach_sequence", "email_personalization", "call_script_generator", "meeting_scheduler"],
    color: "bg-blue-600",
  },
  {
    id: "sales-qualification",
    name: "Lead Scoring & Qualification",
    description: "Score leads, handle objections, and manage pipeline",
    icon: "Star",
    tools: ["lead_scoring", "objection_handler", "pipeline_report", "compliance_checker"],
    color: "bg-purple-600",
  },
  {
    id: "sdr-full-stack",
    name: "Full-Stack SDR Kit",
    description: "Complete B2B prospecting: list build → enrich → outreach → qualify",
    icon: "Briefcase",
    tools: ["lead_list_generator", "contact_finder", "company_enrichment", "intent_signal_scanner", "email_personalization", "outreach_sequence", "lead_scoring", "crm_sync"],
    color: "bg-indigo-500",
  },
  // Social Media Management Bundles
  {
    id: "content-creator",
    name: "Content Creation Suite",
    description: "Ideas, captions, repurposing, and brand voice",
    icon: "Lightbulb",
    tools: ["content_idea_generator", "caption_generator", "content_repurposer", "brand_voice_analyzer"],
    color: "bg-pink-600",
  },
  {
    id: "social-scheduler",
    name: "Smart Scheduling & Posting",
    description: "Optimal times, cross-platform posting, and A/B testing",
    icon: "Clock",
    tools: ["smart_scheduler", "cross_platform_poster", "ab_test_runner"],
    color: "bg-rose-600",
  },
  {
    id: "social-engagement",
    name: "Engagement & Community",
    description: "Auto-replies, mention monitoring, and community building",
    icon: "MessageCircle",
    tools: ["smart_reply_bot", "mention_monitor", "audience_analyzer"],
    color: "bg-fuchsia-600",
  },
  {
    id: "social-analytics",
    name: "Social Analytics & Insights",
    description: "Performance reports, competitor analysis, and growth scanning",
    icon: "BarChart3",
    tools: ["performance_analyzer", "competitor_analyzer", "growth_scanner", "audience_analyzer"],
    color: "bg-purple-600",
  },
  {
    id: "social-growth-engine",
    name: "Autonomous Growth Engine",
    description: "Full social management: strategy, campaigns, monitoring",
    icon: "TrendingUp",
    tools: ["strategy_planner", "campaign_orchestrator", "crisis_monitor", "growth_scanner", "social_export_hub"],
    color: "bg-pink-500",
  },
  // HR & Recruiting Bundles
  {
    id: "recruiting-essentials",
    name: "Recruiting Essentials",
    description: "Job descriptions, resume screening, candidate ranking",
    icon: "FileSearch",
    tools: ["job_description_generator", "resume_parser", "candidate_ranker", "interview_question_generator"],
    color: "bg-teal-600",
  },
  {
    id: "hiring-automation",
    name: "Full Hiring Automation",
    description: "End-to-end recruiting: source → screen → interview → offer",
    icon: "Users",
    tools: ["candidate_sourcer", "resume_parser", "candidate_ranker", "interview_question_generator", "offer_letter_generator", "bias_auditor"],
    color: "bg-teal-500",
  },
  {
    id: "onboarding-suite",
    name: "Employee Onboarding Suite",
    description: "Onboarding plans, policies, training recommendations",
    icon: "ClipboardList",
    tools: ["onboarding_automator", "policy_assistant", "training_recommender", "timeoff_manager"],
    color: "bg-cyan-600",
  },
  {
    id: "hr-analytics",
    name: "HR Analytics & Compliance",
    description: "Metrics, engagement, compliance, and bias auditing",
    icon: "BarChart3",
    tools: ["hr_metrics_dashboard", "engagement_analyzer", "hr_compliance_checker", "bias_auditor", "employee_data_manager"],
    color: "bg-emerald-600",
  },
  {
    id: "performance-engagement",
    name: "Performance & Engagement",
    description: "Reviews, development, engagement monitoring",
    icon: "Heart",
    tools: ["performance_review_analyzer", "engagement_analyzer", "training_recommender"],
    color: "bg-green-600",
  },
  // Personal Orchestrator Bundles
  {
    id: "executive-assistant",
    name: "Executive Assistant Suite",
    description: "Daily planning, cross-agent summaries, reminders",
    icon: "Brain",
    tools: ["daily_planner", "task_router", "cross_agent_summary", "reminder_system", "daily_briefing"],
    color: "bg-purple-600",
  },
  {
    id: "productivity-tracker",
    name: "Productivity & Goals",
    description: "Habits, goals, burnout prevention",
    icon: "Target",
    tools: ["habit_tracker", "goal_tracker", "burnout_checker", "personal_knowledge_base"],
    color: "bg-indigo-600",
  },
  // Content Creation Bundles
  {
    id: "content-writer",
    name: "Content Writing Suite",
    description: "Articles, newsletters, video scripts, SEO",
    icon: "PenTool",
    tools: ["article_writer", "newsletter_writer", "video_script_writer", "seo_optimizer"],
    color: "bg-rose-600",
  },
  {
    id: "ad-copywriter",
    name: "Ad Copy & Conversion",
    description: "Ad copy, landing pages, A/B variants",
    icon: "Megaphone",
    tools: ["ad_copy_generator", "landing_page_creator", "lead_magnet_creator", "content_tone_matcher"],
    color: "bg-orange-600",
  },
  // Marketing Bundles
  {
    id: "marketing-strategy",
    name: "Marketing Strategy Kit",
    description: "Campaigns, SEO, funnels, ROI tracking",
    icon: "Target",
    tools: ["campaign_planner", "seo_keyword_research", "funnel_optimizer", "roi_attribution"],
    color: "bg-orange-500",
  },
  {
    id: "growth-experimentation",
    name: "Growth Experimentation",
    description: "Experiments, landing pages, lead magnets",
    icon: "FlaskConical",
    tools: ["growth_experiment_runner", "landing_page_creator", "lead_magnet_creator", "ad_creative_generator"],
    color: "bg-amber-600",
  },
  // Health & Wellness Bundles
  {
    id: "fitness-nutrition",
    name: "Fitness & Nutrition",
    description: "Meal plans, workouts, habit tracking",
    icon: "Dumbbell",
    tools: ["meal_planner", "workout_generator", "health_habit_builder"],
    color: "bg-red-600",
  },
  {
    id: "mental-wellness",
    name: "Mental Wellness",
    description: "Stress, sleep, meditation, mood tracking",
    icon: "Heart",
    tools: ["stress_tracker", "sleep_analyzer", "meditation_generator", "burnout_checker"],
    color: "bg-pink-600",
  },
  // Travel Bundles
  {
    id: "trip-planner",
    name: "Trip Planning Suite",
    description: "Flights, hotels, itineraries, packing",
    icon: "Plane",
    tools: ["flight_search", "hotel_search", "itinerary_optimizer", "packing_list_generator"],
    color: "bg-sky-600",
  },
  {
    id: "travel-logistics",
    name: "Travel Logistics",
    description: "Visas, expenses, local recommendations",
    icon: "Map",
    tools: ["visa_requirements", "travel_expense_tracker", "local_recommendations"],
    color: "bg-cyan-600",
  },
  // Creative Bundles
  {
    id: "ai-art-creator",
    name: "AI Art & Prompts",
    description: "Image prompts, thumbnails, memes",
    icon: "Wand2",
    tools: ["image_prompt_engineer", "thumbnail_creator", "meme_generator"],
    color: "bg-fuchsia-600",
  },
  {
    id: "brand-design",
    name: "Brand & Design",
    description: "Color palettes, branding, layouts",
    icon: "Palette",
    tools: ["branding_kit_creator", "layout_generator", "wireframe_describer"],
    color: "bg-violet-600",
  },
  // Learning Bundles
  {
    id: "study-tools",
    name: "Study Tools Suite",
    description: "Explanations, quizzes, flashcards",
    icon: "BookOpen",
    tools: ["concept_explainer", "quiz_flashcard_generator", "note_organizer", "content_summarizer"],
    color: "bg-blue-600",
  },
  {
    id: "skill-development",
    name: "Skill Development",
    description: "Courses, learning paths, skill gaps",
    icon: "GraduationCap",
    tools: ["course_recommender", "skill_gap_analyzer", "learning_path_planner"],
    color: "bg-indigo-500",
  },
  // Security Bundles
  {
    id: "digital-security",
    name: "Digital Security Suite",
    description: "Phishing, passwords, breaches, 2FA",
    icon: "Shield",
    tools: ["phishing_detector", "password_analyzer", "breach_monitor", "security_setup_assistant"],
    color: "bg-slate-600",
  },
  {
    id: "privacy-protection",
    name: "Privacy Protection",
    description: "Privacy policies, anomaly detection",
    icon: "Lock",
    tools: ["privacy_policy_reviewer", "anomaly_detector", "breach_monitor"],
    color: "bg-gray-600",
  },
  // Book Writing Bundles
  {
    id: "novel-planning",
    name: "Novel Planning Suite",
    description: "Brainstorming, outlining, world-building, characters",
    icon: "BookOpen",
    tools: ["genre_brainstormer", "outline_builder", "world_builder", "character_creator"],
    color: "bg-amber-600",
  },
  {
    id: "novel-drafting",
    name: "Novel Drafting & Writing",
    description: "Chapter drafting, dialogue, plot tracking",
    icon: "PenTool",
    tools: ["chapter_drafter", "dialogue_generator", "plot_thread_tracker", "manuscript_stats"],
    color: "bg-orange-600",
  },
  {
    id: "novel-revision",
    name: "Novel Revision & Publishing",
    description: "Feedback, formatting, query letters",
    icon: "Edit",
    tools: ["revision_feedback", "ending_suggester", "manuscript_formatter", "plagiarism_checker"],
    color: "bg-yellow-600",
  },
  // Screenplay Bundles
  {
    id: "screenplay-development",
    name: "Screenplay Development",
    description: "Loglines, beat sheets, structure, characters",
    icon: "Film",
    tools: ["logline_refiner", "beat_sheet_generator", "script_character_engine", "screenplay_formatter"],
    color: "bg-red-600",
  },
  {
    id: "screenplay-writing",
    name: "Screenplay Writing & Polish",
    description: "Action lines, dialogue, pacing optimization",
    icon: "Camera",
    tools: ["action_line_writer", "script_character_engine", "pacing_optimizer", "screenplay_formatter"],
    color: "bg-rose-600",
  },
  {
    id: "screenplay-industry",
    name: "Industry & Pitch Ready",
    description: "Coverage, storyboards, pitch decks",
    icon: "Presentation",
    tools: ["script_coverage", "storyboard_describer", "pitch_deck_drafter"],
    color: "bg-red-700",
  },
  // Songwriting Bundles
  {
    id: "songwriting-lyrics",
    name: "Lyric Writing Suite",
    description: "Lyrics, rhymes, flow, metaphors",
    icon: "Mic",
    tools: ["lyric_generator", "rhyme_flow_checker", "lyric_metaphor_enhancer", "song_title_brainstormer"],
    color: "bg-purple-600",
  },
  {
    id: "songwriting-music",
    name: "Music & Composition",
    description: "Chords, melodies, structure, arrangement",
    icon: "Music",
    tools: ["chord_suggester", "melody_creator", "song_structure_planner", "arrangement_suggester"],
    color: "bg-violet-600",
  },
  {
    id: "songwriting-hooks",
    name: "Hooks & Hit-Making",
    description: "Hook optimization, genre styles, export",
    icon: "Sparkles",
    tools: ["hook_optimizer", "genre_style_emulator", "song_export_prep"],
    color: "bg-fuchsia-600",
  },
  // Script Builder Bundles
  {
    id: "code-generation",
    name: "Code Generation Suite",
    description: "Natural language to code, structure, debugging",
    icon: "Code",
    tools: ["natural_language_to_code", "code_structure_builder", "debug_error_fixer", "code_refactor_optimizer"],
    color: "bg-green-600",
  },
  {
    id: "api-integration",
    name: "API & Integration Tools",
    description: "API connectors, workflow automation",
    icon: "Plug",
    tools: ["api_connector_builder", "workflow_orchestrator", "test_generator"],
    color: "bg-emerald-600",
  },
  {
    id: "devops-deployment",
    name: "DevOps & Deployment",
    description: "Security, documentation, deployment configs",
    icon: "Rocket",
    tools: ["security_checker", "doc_generator", "deployment_builder", "code_execution_preview"],
    color: "bg-teal-600",
  },
  // Prompt Builder Bundles
  {
    id: "prompt-engineering",
    name: "Prompt Engineering Suite",
    description: "Structure, few-shot, chains, analysis",
    icon: "Wand2",
    tools: ["prompt_structure_generator", "few_shot_curator", "prompt_chain_orchestrator", "prompt_analyzer"],
    color: "bg-violet-600",
  },
  {
    id: "agentic-prompts",
    name: "Agentic Prompt Tools",
    description: "Tool schemas, output formats, self-critique",
    icon: "GitBranch",
    tools: ["tool_schema_formatter", "output_format_enforcer", "self_critique_builder"],
    color: "bg-purple-600",
  },
  {
    id: "prompt-optimization",
    name: "Prompt Optimization",
    description: "A/B testing, token compression, model adaptation",
    icon: "Zap",
    tools: ["prompt_ab_tester", "token_optimizer", "model_adapter", "bias_safety_injector"],
    color: "bg-indigo-600",
  },
  {
    id: "prompt-mastery",
    name: "Prompt Mastery Suite",
    description: "Library, meta-prompts, full optimization",
    icon: "Infinity",
    tools: ["prompt_library_manager", "meta_prompt_generator", "prompt_analyzer"],
    color: "bg-pink-600",
  },
  {
    id: "content-creator",
    name: "Content Creator",
    description: "Content creation and web tools",
    icon: "PenTool",
    tools: ["web_search", "web_screenshot", "pdf_generator", "file_write"],
    color: "bg-pink-500",
  },
  {
    id: "automation",
    name: "Automation Kit",
    description: "Browser automation and scripting",
    icon: "Zap",
    tools: ["browser_automation", "web_scrape", "http_request", "code_execute"],
    color: "bg-amber-500",
  },
  // New Enhanced Bundles
  {
    id: "clipboard-workflow",
    name: "Copy-Paste Pro",
    description: "Clipboard operations for data transfer between sites",
    icon: "ClipboardCopy",
    tools: ["clipboard_copy", "clipboard_paste", "tab_management", "element_value"],
    color: "bg-cyan-500",
  },
  {
    id: "ecommerce-migration",
    name: "E-Commerce Migration",
    description: "Complete toolkit for Shopify/WooCommerce data migration",
    icon: "ShoppingCart",
    tools: ["extract_structured_data", "clipboard_copy", "clipboard_paste", "tab_management", "form_fill", "file_upload", "wait_for_element"],
    color: "bg-orange-500",
  },
  {
    id: "web-automation-pro",
    name: "Web Automation Pro",
    description: "Advanced browser automation with multi-tab and clipboard",
    icon: "Bot",
    tools: ["browser_automation", "tab_management", "clipboard_copy", "clipboard_paste", "element_value", "wait_for_element", "page_interaction"],
    color: "bg-indigo-500",
  },
  {
    id: "data-extraction",
    name: "Data Extraction",
    description: "Extract structured data from any website",
    icon: "FileJson",
    tools: ["web_scrape", "extract_structured_data", "element_value", "text_selection"],
    color: "bg-teal-500",
  },
  {
    id: "form-master",
    name: "Form Master",
    description: "Fill and automate web forms efficiently",
    icon: "FormInput",
    tools: ["form_fill", "element_value", "file_upload", "wait_for_element", "browser_automation"],
    color: "bg-rose-500",
  },
  
  // -------------------------------------------------------------------------
  // PERSONAL MEMORY & LIFE ASSISTANT BUNDLES
  // -------------------------------------------------------------------------
  {
    id: "life-os-starter",
    name: "Personal Life OS Starter",
    description: "Essential tools to build your digital second brain",
    icon: "Brain",
    tools: ["daily_log_creator", "habit_pattern_learner", "proactive_reminder_engine", "memory_query_search", "privacy_control_center"],
    color: "bg-violet-500",
  },
  {
    id: "full-life-companion",
    name: "Full Life Companion",
    description: "Complete monitoring, learning, and proactive assistance",
    icon: "Sparkles",
    tools: ["daily_log_creator", "habit_pattern_learner", "proactive_reminder_engine", "memory_query_search", "contextual_suggestion_engine", "desktop_activity_watcher", "personal_knowledge_base", "smart_notification_hub"],
    color: "bg-purple-600",
  },
  {
    id: "memory-power-user",
    name: "Memory Power User",
    description: "Advanced memory, timeline, and relationship tracking",
    icon: "Database",
    tools: ["memory_query_search", "personal_knowledge_base", "ai_conversation_logger", "life_timeline_viewer", "relationship_tracker", "weekly_monthly_review"],
    color: "bg-indigo-600",
  },
  {
    id: "productivity-guardian",
    name: "Productivity Guardian",
    description: "Focus protection and meeting preparation",
    icon: "Target",
    tools: ["focus_time_optimizer", "meeting_context_preparer", "smart_notification_hub", "proactive_reminder_engine", "habit_pattern_learner"],
    color: "bg-emerald-600",
  },
  {
    id: "desktop-watcher",
    name: "Desktop Monitoring Suite",
    description: "Full desktop activity tracking and OCR capture",
    icon: "Monitor",
    tools: ["desktop_activity_watcher", "screen_ocr_capture", "file_system_monitor", "daily_log_creator"],
    color: "bg-cyan-600",
  },
  {
    id: "relationship-intelligence",
    name: "Relationship Intelligence",
    description: "Track and nurture personal and professional relationships",
    icon: "Heart",
    tools: ["relationship_tracker", "meeting_context_preparer", "email_read", "memory_query_search", "proactive_reminder_engine"],
    color: "bg-pink-500",
  },
];

/**
 * Get bundle by ID
 */
export function getBundleById(id: string): ToolBundle | undefined {
  return toolBundles.find(b => b.id === id);
}

/**
 * Get recommended bundles based on current tools
 */
export function getRecommendedBundles(currentTools: string[]): ToolBundle[] {
  return toolBundles
    .map(bundle => {
      // Calculate overlap score
      const overlap = bundle.tools.filter(t => currentTools.includes(t)).length;
      const newTools = bundle.tools.filter(t => !currentTools.includes(t)).length;
      // Prefer bundles with some overlap but still add new tools
      const score = overlap * 0.5 + newTools * 1;
      return { bundle, score };
    })
    .filter(({ bundle }) => {
      // Filter out bundles where all tools are already selected
      return bundle.tools.some(t => !currentTools.includes(t));
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ bundle }) => bundle);
}
