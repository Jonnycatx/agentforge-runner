/**
 * Excel Tools Implementation
 * Read and write Excel files (.xlsx)
 * Uses xlsx library if available, otherwise provides limited CSV fallback
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

// Try to use xlsx library if available
async function getXLSX() {
  try {
    return await import("xlsx").catch(() => null);
  } catch {
    return null;
  }
}

// Excel Read executor
async function executeExcelRead(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { file, content, sheet, range } = input;
  const logs: string[] = [];

  const fileData = file || content;
  
  if (!fileData) {
    return {
      success: false,
      error: "Excel file content is required (as base64 string)",
      executionTime: 0,
      logs: ["Error: No file data provided"],
    };
  }

  try {
    const xlsx = await getXLSX();
    
    if (!xlsx) {
      return {
        success: false,
        error: "Excel support requires xlsx library. Install with: npm install xlsx",
        executionTime: 0,
        logs: ["Error: xlsx library not installed"],
      };
    }

    logs.push("Parsing Excel file");
    
    // Parse the workbook from base64 or buffer
    let workbook;
    if (typeof fileData === "string") {
      // Assume base64
      const buffer = Buffer.from(fileData, "base64");
      workbook = xlsx.read(buffer, { type: "buffer" });
    } else {
      workbook = xlsx.read(fileData, { type: "buffer" });
    }

    const sheetNames = workbook.SheetNames;
    logs.push(`Found ${sheetNames.length} sheets: ${sheetNames.join(", ")}`);

    // Get the requested sheet or first sheet
    const targetSheet = sheet || sheetNames[0];
    if (!sheetNames.includes(targetSheet)) {
      return {
        success: false,
        error: `Sheet "${targetSheet}" not found. Available: ${sheetNames.join(", ")}`,
        executionTime: 0,
        logs,
      };
    }

    const worksheet = workbook.Sheets[targetSheet];
    
    // Convert to JSON
    const jsonOptions: any = { header: 1, defval: null };
    if (range) {
      jsonOptions.range = range;
    }
    
    const rawData = xlsx.utils.sheet_to_json(worksheet, jsonOptions) as any[][];
    
    if (rawData.length === 0) {
      return {
        success: true,
        output: {
          data: [],
          columns: [],
          rowCount: 0,
          sheets: sheetNames,
          activeSheet: targetSheet,
        },
        executionTime: 0,
        logs: [...logs, "Sheet is empty"],
      };
    }

    // First row as headers
    const columns = rawData[0].map((col: any, i: number) => 
      col !== null && col !== undefined ? String(col) : `column_${i + 1}`
    );
    
    // Convert remaining rows to objects
    const data = rawData.slice(1).map(row => {
      const obj: Record<string, any> = {};
      columns.forEach((col, i) => {
        obj[col] = row[i] !== undefined ? row[i] : null;
      });
      return obj;
    });

    logs.push(`Parsed ${data.length} rows with ${columns.length} columns`);

    return {
      success: true,
      output: {
        data,
        columns,
        rowCount: data.length,
        sheets: sheetNames,
        activeSheet: targetSheet,
        preview: data.slice(0, 5),
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Excel parsing failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Excel Write executor
async function executeExcelWrite(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { data, filename = "output.xlsx", sheetName = "Sheet1" } = input;
  const logs: string[] = [];

  if (!data) {
    return {
      success: false,
      error: "Data is required",
      executionTime: 0,
      logs: ["Error: No data provided"],
    };
  }

  try {
    const xlsx = await getXLSX();
    
    if (!xlsx) {
      return {
        success: false,
        error: "Excel support requires xlsx library. Install with: npm install xlsx",
        executionTime: 0,
        logs: ["Error: xlsx library not installed"],
      };
    }

    logs.push("Creating Excel workbook");

    // Create workbook
    const workbook = xlsx.utils.book_new();
    
    // Handle multiple sheets if data is an object with sheet names as keys
    if (!Array.isArray(data) && typeof data === "object") {
      // Multiple sheets
      for (const [name, sheetData] of Object.entries(data)) {
        if (Array.isArray(sheetData)) {
          const worksheet = xlsx.utils.json_to_sheet(sheetData);
          xlsx.utils.book_append_sheet(workbook, worksheet, name);
          logs.push(`Added sheet "${name}" with ${sheetData.length} rows`);
        }
      }
    } else if (Array.isArray(data)) {
      // Single sheet
      const worksheet = xlsx.utils.json_to_sheet(data);
      xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
      logs.push(`Added sheet "${sheetName}" with ${data.length} rows`);
    } else {
      return {
        success: false,
        error: "Data must be an array or object with sheet names as keys",
        executionTime: 0,
        logs,
      };
    }

    // Write to buffer
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    const base64 = Buffer.from(buffer).toString("base64");
    
    logs.push(`Generated Excel file: ${buffer.length} bytes`);

    return {
      success: true,
      output: {
        content: base64,
        filename,
        size: buffer.length,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sheets: workbook.SheetNames,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Excel generation failed";
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
registerExecutor("excel_read", executeExcelRead);
registerExecutor("excel_write", executeExcelWrite);

export { executeExcelRead, executeExcelWrite };
