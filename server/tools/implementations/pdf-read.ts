/**
 * PDF Read Tool Implementation
 * Extract text and data from PDF files
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

// Try to use pdf-parse library if available
async function getPDFParser() {
  try {
    return await import("pdf-parse").then(m => m.default).catch(() => null);
  } catch {
    return null;
  }
}

async function executePDFRead(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { file, content, pages } = input;
  const logs: string[] = [];

  const fileData = file || content;
  
  if (!fileData) {
    return {
      success: false,
      error: "PDF file content is required (as base64 string)",
      executionTime: 0,
      logs: ["Error: No file data provided"],
    };
  }

  try {
    const pdfParse = await getPDFParser();
    
    if (!pdfParse) {
      return {
        success: false,
        error: "PDF parsing requires pdf-parse library. Install with: npm install pdf-parse",
        executionTime: 0,
        logs: ["Error: pdf-parse library not installed"],
      };
    }

    logs.push("Parsing PDF file");
    
    // Convert base64 to buffer if needed
    let buffer: Buffer;
    if (typeof fileData === "string") {
      buffer = Buffer.from(fileData, "base64");
    } else {
      buffer = fileData;
    }

    // Parse options
    const options: any = {};
    if (pages) {
      // Parse page range like "1-5" or "1,3,5"
      if (pages.includes("-")) {
        const [start, end] = pages.split("-").map(Number);
        options.max = end;
        // Note: pdf-parse doesn't support start page, only max
      } else if (pages.includes(",")) {
        options.max = Math.max(...pages.split(",").map(Number));
      } else {
        options.max = parseInt(pages);
      }
    }

    const data = await pdfParse(buffer, options);

    logs.push(`Extracted text from ${data.numpages} pages`);
    logs.push(`Text length: ${data.text.length} characters`);

    return {
      success: true,
      output: {
        text: data.text,
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        textLength: data.text.length,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "PDF parsing failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Register executor
registerExecutor("pdf_read", executePDFRead);

export { executePDFRead };
