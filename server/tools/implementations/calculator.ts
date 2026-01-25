/**
 * Calculator Tool Implementation
 * Performs mathematical calculations, statistics, and financial formulas
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";
import * as math from "mathjs";

// Financial formulas
const financialFormulas: Record<string, (vars: Record<string, number>) => number> = {
  // Compound Interest: A = P(1 + r/n)^(nt)
  compound_interest: (v) => v.principal * Math.pow(1 + v.rate / v.compounds, v.compounds * v.years),
  
  // Simple Interest: I = P * r * t
  simple_interest: (v) => v.principal * v.rate * v.years,
  
  // Present Value: PV = FV / (1 + r)^n
  present_value: (v) => v.futureValue / Math.pow(1 + v.rate, v.periods),
  
  // Future Value: FV = PV * (1 + r)^n
  future_value: (v) => v.presentValue * Math.pow(1 + v.rate, v.periods),
  
  // Monthly Payment (Loan): M = P * [r(1+r)^n] / [(1+r)^n - 1]
  loan_payment: (v) => {
    const r = v.rate / 12;
    const n = v.years * 12;
    return v.principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  },
  
  // ROI: (gain - cost) / cost * 100
  roi: (v) => ((v.gain - v.cost) / v.cost) * 100,
  
  // Break Even: Fixed Costs / (Price - Variable Cost)
  break_even: (v) => v.fixedCosts / (v.price - v.variableCost),
  
  // Gross Margin: (Revenue - COGS) / Revenue * 100
  gross_margin: (v) => ((v.revenue - v.cogs) / v.revenue) * 100,
  
  // Net Profit Margin: (Net Income / Revenue) * 100
  net_profit_margin: (v) => (v.netIncome / v.revenue) * 100,
};

// Statistical functions
const statisticalFunctions: Record<string, (data: number[]) => number> = {
  mean: (data) => data.reduce((a, b) => a + b, 0) / data.length,
  median: (data) => {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },
  mode: (data) => {
    const counts = new Map<number, number>();
    data.forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
    let maxCount = 0;
    let mode = data[0];
    counts.forEach((count, num) => {
      if (count > maxCount) {
        maxCount = count;
        mode = num;
      }
    });
    return mode;
  },
  std_dev: (data) => {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(n => Math.pow(n - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / data.length);
  },
  variance: (data) => {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
  },
  sum: (data) => data.reduce((a, b) => a + b, 0),
  min: (data) => Math.min(...data),
  max: (data) => Math.max(...data),
  range: (data) => Math.max(...data) - Math.min(...data),
};

// Unit conversion type
type ConversionValue = number | ((v: number) => number);

// Unit conversions
const unitConversions: Record<string, Record<string, ConversionValue>> = {
  length: {
    m_to_ft: 3.28084,
    ft_to_m: 0.3048,
    km_to_mi: 0.621371,
    mi_to_km: 1.60934,
    in_to_cm: 2.54,
    cm_to_in: 0.393701,
  },
  weight: {
    kg_to_lb: 2.20462,
    lb_to_kg: 0.453592,
    g_to_oz: 0.035274,
    oz_to_g: 28.3495,
  },
  temperature: {
    c_to_f: (c: number) => (c * 9/5) + 32,
    f_to_c: (f: number) => (f - 32) * 5/9,
    c_to_k: (c: number) => c + 273.15,
    k_to_c: (k: number) => k - 273.15,
  },
  volume: {
    l_to_gal: 0.264172,
    gal_to_l: 3.78541,
    ml_to_floz: 0.033814,
    floz_to_ml: 29.5735,
  },
};

export async function executeCalculator(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { expression, variables = {} } = input;
  const logs: string[] = [];

  try {
    // Check if it's a financial formula
    if (expression in financialFormulas) {
      logs.push(`Using financial formula: ${expression}`);
      const result = financialFormulas[expression](variables);
      return {
        success: true,
        output: {
          result: Math.round(result * 100) / 100,
          formula: expression,
          variables,
        },
        executionTime: 0,
        logs,
      };
    }

    // Check if it's a statistical function with data array
    if (expression in statisticalFunctions && variables.data) {
      logs.push(`Using statistical function: ${expression}`);
      const result = statisticalFunctions[expression](variables.data);
      return {
        success: true,
        output: {
          result: Math.round(result * 10000) / 10000,
          function: expression,
          dataPoints: variables.data.length,
        },
        executionTime: 0,
        logs,
      };
    }

    // Check if it's a unit conversion
    if (expression.includes("_to_")) {
      logs.push(`Attempting unit conversion: ${expression}`);
      for (const category of Object.values(unitConversions)) {
        if (expression in category) {
          const conversion = category[expression];
          const value = variables.value || 1;
          const result = typeof conversion === "function" 
            ? conversion(value) 
            : value * conversion;
          return {
            success: true,
            output: {
              result: Math.round(result * 10000) / 10000,
              conversion: expression,
              originalValue: value,
            },
            executionTime: 0,
            logs,
          };
        }
      }
    }

    // Use mathjs for general expressions
    logs.push(`Evaluating expression: ${expression}`);
    
    // Create a limited scope with variables
    const scope = { ...variables };
    
    // Evaluate the expression
    const result = math.evaluate(expression, scope);
    
    // Handle different result types
    let output: any;
    if (typeof result === "object" && result !== null) {
      if (Array.isArray(result)) {
        output = { result: result.map(r => typeof r === "number" ? Math.round(r * 10000) / 10000 : r) };
      } else if ("entries" in result) {
        // Matrix result
        output = { result: result.toArray() };
      } else {
        output = { result };
      }
    } else if (typeof result === "number") {
      output = { result: Math.round(result * 10000) / 10000 };
    } else {
      output = { result };
    }

    logs.push(`Result: ${JSON.stringify(output.result)}`);

    return {
      success: true,
      output,
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Calculation failed";
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
registerExecutor("calculator", executeCalculator);
