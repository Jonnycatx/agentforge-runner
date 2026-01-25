/**
 * Data Transform Tool Implementation
 * Clean, filter, and transform datasets
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

type TransformOperation = {
  type: string;
  [key: string]: any;
};

// Transform operations
const transformers: Record<string, (data: any[], params: any) => any[]> = {
  // Filter rows by condition
  filter: (data, { field, operator, value }) => {
    return data.filter(row => {
      const fieldValue = row[field];
      switch (operator) {
        case "eq": return fieldValue === value;
        case "neq": return fieldValue !== value;
        case "gt": return fieldValue > value;
        case "gte": return fieldValue >= value;
        case "lt": return fieldValue < value;
        case "lte": return fieldValue <= value;
        case "contains": return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
        case "startsWith": return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());
        case "endsWith": return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());
        case "isNull": return fieldValue === null || fieldValue === undefined;
        case "isNotNull": return fieldValue !== null && fieldValue !== undefined;
        case "in": return Array.isArray(value) && value.includes(fieldValue);
        default: return true;
      }
    });
  },

  // Select specific fields
  select: (data, { fields }) => {
    return data.map(row => {
      const newRow: Record<string, any> = {};
      for (const field of fields) {
        if (field in row) {
          newRow[field] = row[field];
        }
      }
      return newRow;
    });
  },

  // Rename fields
  rename: (data, { mappings }) => {
    return data.map(row => {
      const newRow: Record<string, any> = { ...row };
      for (const [oldName, newName] of Object.entries(mappings)) {
        if (oldName in newRow) {
          newRow[newName as string] = newRow[oldName];
          delete newRow[oldName];
        }
      }
      return newRow;
    });
  },

  // Add computed field
  compute: (data, { field, expression, type = "string" }) => {
    return data.map(row => {
      let value: any;
      try {
        // Simple expression evaluation with row context
        // Supports: row.field, basic math, string concat
        const evalExpression = expression.replace(/row\.(\w+)/g, (_: string, f: string) => {
          const v = row[f];
          return typeof v === "string" ? `"${v}"` : v;
        });
        value = eval(evalExpression);
        
        // Type casting
        if (type === "number") value = Number(value);
        if (type === "boolean") value = Boolean(value);
        if (type === "string") value = String(value);
      } catch {
        value = null;
      }
      return { ...row, [field]: value };
    });
  },

  // Sort by field(s)
  sort: (data, { fields, orders = [] }) => {
    return [...data].sort((a, b) => {
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const order = orders[i] || "asc";
        const aVal = a[field];
        const bVal = b[field];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        if (comparison !== 0) {
          return order === "desc" ? -comparison : comparison;
        }
      }
      return 0;
    });
  },

  // Limit rows
  limit: (data, { count, offset = 0 }) => {
    return data.slice(offset, offset + count);
  },

  // Group by and aggregate
  groupBy: (data, { field, aggregations }) => {
    const groups = new Map<any, any[]>();
    
    for (const row of data) {
      const key = row[field];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    }

    return Array.from(groups.entries()).map(([key, rows]) => {
      const result: Record<string, any> = { [field]: key };
      
      for (const agg of aggregations) {
        const { field: aggField, operation, as } = agg;
        const values = rows.map(r => r[aggField]).filter(v => v !== null && v !== undefined);
        const numValues = values.map(Number).filter(n => !isNaN(n));
        
        let aggValue: any;
        switch (operation) {
          case "count": aggValue = rows.length; break;
          case "sum": aggValue = numValues.reduce((a, b) => a + b, 0); break;
          case "avg": aggValue = numValues.length > 0 ? numValues.reduce((a, b) => a + b, 0) / numValues.length : null; break;
          case "min": aggValue = numValues.length > 0 ? Math.min(...numValues) : null; break;
          case "max": aggValue = numValues.length > 0 ? Math.max(...numValues) : null; break;
          case "first": aggValue = values[0]; break;
          case "last": aggValue = values[values.length - 1]; break;
          case "concat": aggValue = values.join(", "); break;
          default: aggValue = null;
        }
        
        result[as || `${operation}_${aggField}`] = aggValue;
      }
      
      return result;
    });
  },

  // Remove duplicates
  dedupe: (data, { fields }) => {
    const seen = new Set<string>();
    return data.filter(row => {
      const key = fields ? fields.map((f: string) => row[f]).join("|") : JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  // Fill null values
  fillNull: (data, { field, value, method = "value" }) => {
    if (method === "value") {
      return data.map(row => ({
        ...row,
        [field]: row[field] ?? value,
      }));
    }
    
    if (method === "forward") {
      let lastValue = value;
      return data.map(row => {
        if (row[field] !== null && row[field] !== undefined) {
          lastValue = row[field];
        }
        return { ...row, [field]: row[field] ?? lastValue };
      });
    }
    
    return data;
  },

  // Map values
  map: (data, { field, mappings, default: defaultValue }) => {
    return data.map(row => ({
      ...row,
      [field]: mappings[row[field]] ?? defaultValue ?? row[field],
    }));
  },

  // Split field into multiple
  split: (data, { field, delimiter, into }) => {
    return data.map(row => {
      const parts = String(row[field] || "").split(delimiter);
      const newFields: Record<string, any> = {};
      for (let i = 0; i < into.length; i++) {
        newFields[into[i]] = parts[i] || null;
      }
      return { ...row, ...newFields };
    });
  },

  // Merge/join with another dataset
  join: (data, { rightData, on, type = "inner" }) => {
    const rightMap = new Map<any, any>();
    for (const row of rightData) {
      rightMap.set(row[on], row);
    }

    if (type === "inner") {
      return data
        .filter(row => rightMap.has(row[on]))
        .map(row => ({ ...row, ...rightMap.get(row[on]) }));
    }
    
    if (type === "left") {
      return data.map(row => {
        const rightRow = rightMap.get(row[on]) || {};
        return { ...row, ...rightRow };
      });
    }

    return data;
  },
};

export async function executeDataTransform(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { data, operations } = input;
  const logs: string[] = [];

  if (!data || !Array.isArray(data)) {
    return {
      success: false,
      error: "Data must be an array",
      executionTime: 0,
      logs: ["Error: Invalid data format"],
    };
  }

  if (!operations || !Array.isArray(operations)) {
    return {
      success: false,
      error: "Operations must be an array",
      executionTime: 0,
      logs: ["Error: Invalid operations format"],
    };
  }

  try {
    logs.push(`Starting transformation with ${data.length} rows`);
    logs.push(`Applying ${operations.length} operations`);

    let result = [...data];

    for (const op of operations) {
      const { type, ...params } = op as TransformOperation;
      
      if (!transformers[type]) {
        logs.push(`Warning: Unknown operation "${type}", skipping`);
        continue;
      }

      const beforeCount = result.length;
      result = transformers[type](result, params);
      logs.push(`${type}: ${beforeCount} → ${result.length} rows`);
    }

    logs.push(`Transformation complete: ${result.length} rows`);

    return {
      success: true,
      output: {
        result,
        summary: {
          inputRows: data.length,
          outputRows: result.length,
          operationsApplied: operations.length,
          columns: result.length > 0 ? Object.keys(result[0]) : [],
        },
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Transform failed";
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
registerExecutor("data_transform", executeDataTransform);
