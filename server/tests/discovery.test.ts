/**
 * Smart Tool Discovery Tests
 */
import { describe, it, expect } from 'vitest';
import { classifyIntent, detectMultipleIntents } from '../tools/discovery/intent-classifier';
import { detectIndustry, getIndustryToolPack } from '../tools/discovery/industry-detector';
import { decomposeTask } from '../tools/discovery/task-decomposer';
import { recommendTools, toolBundles } from '../tools/discovery/tool-recommender';

describe('Intent Classifier', () => {
  it('should classify research intent', () => {
    const result = classifyIntent('I need to research competitors and find market trends');
    expect(result.primary).toBe('information_gathering');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should classify communication intent', () => {
    const result = classifyIntent('Send an email to my team about the new project');
    expect(result.primary).toBe('communication');
  });

  it('should classify data processing intent', () => {
    const result = classifyIntent('Clean and transform this CSV data');
    expect(result.primary).toBe('data_processing');
  });

  it('should classify automation intent', () => {
    const result = classifyIntent('Automate my daily report generation every morning');
    expect(result.primary).toBe('automation');
  });

  it('should detect multiple intents', () => {
    const results = detectMultipleIntents('Research competitors, send report via email, and schedule follow-up');
    expect(results.length).toBeGreaterThan(1);
  });

  it('should have confidence between 0 and 1', () => {
    const result = classifyIntent('any query here');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

describe('Industry Detector', () => {
  it('should detect healthcare industry', () => {
    const result = detectIndustry('We need to manage patient records and HIPAA compliance');
    expect(result.primary).toBe('healthcare');
  });

  it('should detect finance industry', () => {
    const result = detectIndustry('Track stock portfolio and trading positions');
    expect(result.primary).toBe('finance');
  });

  it('should detect technology industry', () => {
    const result = detectIndustry('Deploy API endpoints and manage CI/CD pipeline');
    expect(result.primary).toBe('technology');
  });

  it('should detect real estate industry', () => {
    const result = detectIndustry('List properties on MLS and schedule open houses');
    expect(result.primary).toBe('real_estate');
  });

  it('should return tool pack for industry', () => {
    const pack = getIndustryToolPack('healthcare');
    expect(pack.tools.length).toBeGreaterThan(0);
    expect(pack.complianceNotes).toBeDefined();
  });

  it('should return general pack for unknown industry', () => {
    const result = detectIndustry('some generic task');
    expect(result.primary).toBe('general');
  });
});

describe('Task Decomposer', () => {
  it('should decompose simple task', () => {
    const result = decomposeTask('Search for information about AI');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('should decompose multi-step task', () => {
    const result = decomposeTask('Research competitors, analyze data, and create a report');
    expect(result.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('should identify tool requirements', () => {
    const result = decomposeTask('Download a PDF and extract text from it');
    const tools = result.steps.flatMap(s => s.suggestedTools);
    expect(tools.some(t => t.includes('pdf') || t.includes('read'))).toBe(true);
  });

  it('should calculate complexity score', () => {
    const simple = decomposeTask('Calculate 2+2');
    const complex = decomposeTask('Research market, analyze competitors, create report, send to team, schedule follow-up');
    expect(complex.totalComplexity).toBeGreaterThan(simple.totalComplexity);
  });

  it('should build dependency graph', () => {
    const result = decomposeTask('First search, then analyze, finally report');
    expect(result.dependencyGraph).toBeDefined();
  });
});

describe('Tool Recommender', () => {
  it('should recommend tools based on intent', () => {
    const result = recommendTools(
      { primary: 'information_gathering', secondary: [], confidence: 0.9, reasoning: '', suggestedToolCategories: [], keywords_matched: [] },
      { primary: 'general', secondary: [], confidence: 0.5, reasoning: '', terminology_matched: [], compliance_notes: [], recommended_tools: [] },
      { steps: [], totalComplexity: 1, dependencyGraph: {} }
    );
    expect(result.essential.length).toBeGreaterThan(0);
  });

  it('should include industry-specific tools', () => {
    const result = recommendTools(
      { primary: 'data_processing', secondary: [], confidence: 0.9, reasoning: '', suggestedToolCategories: [], keywords_matched: [] },
      { primary: 'finance', secondary: [], confidence: 0.9, reasoning: '', terminology_matched: [], compliance_notes: [], recommended_tools: [] },
      { steps: [], totalComplexity: 1, dependencyGraph: {} }
    );
    expect(result.essential.some(t => t.includes('market') || t.includes('calculator'))).toBe(true);
  });

  it('should calculate minimum viable toolkit', () => {
    const result = recommendTools(
      { primary: 'communication', secondary: [], confidence: 0.9, reasoning: '', suggestedToolCategories: [], keywords_matched: [] },
      { primary: 'general', secondary: [], confidence: 0.5, reasoning: '', terminology_matched: [], compliance_notes: [], recommended_tools: [] },
      { steps: [], totalComplexity: 1, dependencyGraph: {} }
    );
    expect(result.minimumViable.length).toBeGreaterThan(0);
    expect(result.minimumViable.length).toBeLessThanOrEqual(result.essential.length);
  });

  it('should have predefined tool bundles', () => {
    expect(toolBundles.length).toBeGreaterThan(0);
    expect(toolBundles.every(b => b.tools.length > 0)).toBe(true);
  });

  it('should generate explanation', () => {
    const result = recommendTools(
      { primary: 'content_creation', secondary: [], confidence: 0.8, reasoning: '', suggestedToolCategories: [], keywords_matched: [] },
      { primary: 'marketing', secondary: [], confidence: 0.7, reasoning: '', terminology_matched: [], compliance_notes: [], recommended_tools: [] },
      { steps: [{ action: 'write', complexity: 1, suggestedTools: [] }], totalComplexity: 1, dependencyGraph: {} }
    );
    expect(result.explanation).toBeDefined();
    expect(result.explanation.length).toBeGreaterThan(0);
  });
});
