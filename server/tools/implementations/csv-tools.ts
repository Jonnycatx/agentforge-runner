/**
 * CSV Tools Implementation
 * Read and write CSV files
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

// Simple CSV parser (no external dependencies)
function parseCSV(content: string, options: { hasHeader?: boolean; delimiter?: string } = {}): {
  data: Record<string, any>[];
  columns: string[];
  rowCount: number;
} {
  const { hasHeader = true, delimiter: userDelimiter } = options;
  
  // Auto-detect delimiter
  const firstLine = content.split("\n")[0];
  let delimiter = userDelimiter || ",";
  if (!userDelimiter) {
    const counts = {
      ",": (firstLine.match(/,/g) || []).length,
      "\t": (firstLine.match(/\t/g) || []).length,
      ";": (firstLine.match(/;/g) || []).length,
      "|": (firstLine.match(/\|/g) || []).length,
    };
    delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  // Parse CSV handling quoted fields
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        if (char === "\r") i++; // Skip \n in \r\n
      } else if (char !== "\r") {
        currentField += char;
      }
    }
  }

  // Don't forget the last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f !== "")) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { data: [], columns: [], rowCount: 0 };
  }

  // Determine columns
  const columns = hasHeader
    ? rows[0].map((col, i) => col || `column_${i + 1}`)
    : rows[0].map((_, i) => `column_${i + 1}`);

  // Convert to objects
  const startRow = hasHeader ? 1 : 0;
  const data = rows.slice(startRow).map(row => {
    const obj: Record<string, any> = {};
    columns.forEach((col, i) => {
      let value: any = row[i] || "";
      // Type inference
      if (value === "") {
        obj[col] = null;
      } else if (!isNaN(Number(value)) && value.trim() !== "") {
        obj[col] = Number(value);
      } else if (value.toLowerCase() === "true") {
        obj[col] = true;
      } else if (value.toLowerCase() === "false") {
        obj[col] = false;
      } else {
        obj[col] = value;
      }
    });
    return obj;
  });

  return { data, columns, rowCount: data.length };
}

// Convert data to CSV string
function toCSV(data: Record<string, any>[], options: { includeHeader?: boolean; delimiter?: string } = {}): string {
  const { includeHeader = true, delimiter = "," } = options;
  
  if (data.length === 0) return "";

  const columns = Object.keys(data[0]);
  const rows: string[] = [];

  if (includeHeader) {
    rows.push(columns.map(col => escapeCSVField(col, delimiter)).join(delimiter));
  }

  for (const row of data) {
    const values = columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return "";
      return escapeCSVField(String(val), delimiter);
    });
    rows.push(values.join(delimiter));
  }

  return rows.join("\n");
}

function escapeCSVField(field: string, delimiter: string): string {
  if (field.includes(delimiter) || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// CSV Read executor
async function executeCSVRead(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { content, file, hasHeader = true, delimiter } = input;
  const logs: string[] = [];

  // Accept either content string or file content
  const csvContent = content || file;
  
  if (!csvContent) {
    return {
      success: false,
      error: "CSV content or file is required",
      executionTime: 0,
      logs: ["Error: No CSV data provided"],
    };
  }

  try {
    logs.push("Parsing CSV data");
    
    const result = parseCSV(csvContent, { hasHeader, delimiter });
    
    logs.push(`Detected ${result.columns.length} columns`);
    logs.push(`Parsed ${result.rowCount} rows`);
    logs.push(`Columns: ${result.columns.join(", ")}`);

    return {
      success: true,
      output: {
        data: result.data,
        columns: result.columns,
        rowCount: result.rowCount,
        preview: result.data.slice(0, 5),
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "CSV parsing failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// CSV Write executor
async function executeCSVWrite(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { data, filename = "output.csv", includeHeader = true, delimiter = "," } = input;
  const logs: string[] = [];

  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      success: false,
      error: "Data array is required and must not be empty",
      executionTime: 0,
      logs: ["Error: No data provided"],
    };
  }

  try {
    logs.push(`Converting ${data.length} rows to CSV`);
    
    const csvContent = toCSV(data, { includeHeader, delimiter });
    const columns = Object.keys(data[0]);
    
    logs.push(`Generated CSV with ${columns.length} columns`);
    logs.push(`Output size: ${csvContent.length} characters`);

    return {
      success: true,
      output: {
        content: csvContent,
        filename,
        rowCount: data.length,
        columns,
        size: csvContent.length,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "CSV generation failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Register executors
registerExecutor("csv_read", executeCSVRead);
registerExecutor("csv_write", executeCSVWrite);

export { executeCSVRead, executeCSVWrite };
