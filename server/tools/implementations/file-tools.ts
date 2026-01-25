/**
 * File Tools Implementation
 * Read, write, and search files
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";
import * as fs from "fs/promises";
import * as path from "path";
import { createReadStream, existsSync, statSync } from "fs";
import { createHash } from "crypto";

// MIME type detection
const mimeTypes: Record<string, string> = {
  ".txt": "text/plain",
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".md": "text/markdown",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || "application/octet-stream";
}

// File Read executor
async function executeFileRead(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { path: filePath, encoding = "utf-8" } = input;
  const logs: string[] = [];

  if (!filePath) {
    return {
      success: false,
      error: "File path is required",
      executionTime: 0,
      logs: ["Error: No path provided"],
    };
  }

  try {
    logs.push(`Reading file: ${filePath}`);

    // Check if file exists
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `File not found: ${filePath}`,
        executionTime: 0,
        logs: [...logs, "Error: File does not exist"],
      };
    }

    const stats = statSync(filePath);
    logs.push(`File size: ${stats.size} bytes`);

    // Check file size (limit to 10MB for text, 50MB for binary)
    const maxSize = encoding === "base64" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (stats.size > maxSize) {
      return {
        success: false,
        error: `File too large: ${stats.size} bytes (max: ${maxSize})`,
        executionTime: 0,
        logs,
      };
    }

    const mimeType = getMimeType(filePath);
    const isTextFile = mimeType.startsWith("text/") || 
                       mimeType === "application/json" || 
                       mimeType === "application/xml" ||
                       mimeType === "application/javascript";

    let content: string;
    
    if (encoding === "base64" || !isTextFile) {
      // Read as binary/base64
      const buffer = await fs.readFile(filePath);
      content = buffer.toString("base64");
      logs.push("Read as base64");
    } else {
      // Read as text
      content = await fs.readFile(filePath, encoding as BufferEncoding);
      logs.push(`Read as text (${encoding})`);
    }

    return {
      success: true,
      output: {
        content,
        path: filePath,
        filename: path.basename(filePath),
        size: stats.size,
        mimeType,
        encoding: encoding === "base64" || !isTextFile ? "base64" : encoding,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "File read failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// File Write executor
async function executeFileWrite(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { 
    path: filePath, 
    content, 
    append = false, 
    createDirs = true,
    encoding = "utf-8",
  } = input;
  const logs: string[] = [];

  if (!filePath) {
    return {
      success: false,
      error: "File path is required",
      executionTime: 0,
      logs: ["Error: No path provided"],
    };
  }

  if (content === undefined || content === null) {
    return {
      success: false,
      error: "Content is required",
      executionTime: 0,
      logs: ["Error: No content provided"],
    };
  }

  try {
    logs.push(`Writing to: ${filePath}`);
    logs.push(`Mode: ${append ? "append" : "overwrite"}`);

    // Create parent directories if needed
    if (createDirs) {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      logs.push(`Ensured directory exists: ${dir}`);
    }

    // Determine if content is base64
    let dataToWrite: string | Buffer;
    if (encoding === "base64") {
      dataToWrite = Buffer.from(content, "base64");
      logs.push("Decoded base64 content");
    } else {
      dataToWrite = content;
    }

    // Write or append
    if (append) {
      await fs.appendFile(filePath, dataToWrite);
    } else {
      await fs.writeFile(filePath, dataToWrite);
    }

    const stats = statSync(filePath);
    logs.push(`Written ${stats.size} bytes`);

    return {
      success: true,
      output: {
        path: filePath,
        filename: path.basename(filePath),
        size: stats.size,
        mode: append ? "appended" : "written",
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "File write failed";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// File Search executor
async function executeFileSearch(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { 
    directory, 
    pattern, 
    contentSearch, 
    recursive = true,
    maxResults = 100,
  } = input;
  const logs: string[] = [];

  if (!directory) {
    return {
      success: false,
      error: "Directory path is required",
      executionTime: 0,
      logs: ["Error: No directory provided"],
    };
  }

  try {
    logs.push(`Searching in: ${directory}`);
    if (pattern) logs.push(`Pattern: ${pattern}`);
    if (contentSearch) logs.push(`Content search: ${contentSearch}`);

    // Check if directory exists
    if (!existsSync(directory)) {
      return {
        success: false,
        error: `Directory not found: ${directory}`,
        executionTime: 0,
        logs: [...logs, "Error: Directory does not exist"],
      };
    }

    const results: Array<{
      path: string;
      name: string;
      size: number;
      modified: string;
      matches?: string[];
    }> = [];

    // Convert glob pattern to regex
    const patternRegex = pattern 
      ? new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i")
      : null;

    const contentRegex = contentSearch ? new RegExp(contentSearch, "gi") : null;

    async function searchDir(dir: string) {
      if (results.length >= maxResults) return;

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (recursive) {
            await searchDir(fullPath);
          }
        } else if (entry.isFile()) {
          // Check filename pattern
          if (patternRegex && !patternRegex.test(entry.name)) {
            continue;
          }

          const stats = statSync(fullPath);
          
          // Content search
          let matches: string[] | undefined;
          if (contentRegex) {
            try {
              // Only search text files under 1MB
              if (stats.size < 1024 * 1024) {
                const mimeType = getMimeType(fullPath);
                if (mimeType.startsWith("text/") || mimeType === "application/json") {
                  const content = await fs.readFile(fullPath, "utf-8");
                  const found = content.match(contentRegex);
                  if (found) {
                    matches = found.slice(0, 5); // Limit matches shown
                  } else {
                    continue; // Skip files without content match
                  }
                }
              }
            } catch {
              // Skip files we can't read
              continue;
            }
          }

          results.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            matches,
          });
        }
      }
    }

    await searchDir(directory);

    logs.push(`Found ${results.length} files`);

    return {
      success: true,
      output: {
        files: results,
        totalFound: results.length,
        searchDirectory: directory,
        pattern,
        contentSearch,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "File search failed";
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
registerExecutor("file_read", executeFileRead);
registerExecutor("file_write", executeFileWrite);
registerExecutor("file_search", executeFileSearch);

export { executeFileRead, executeFileWrite, executeFileSearch };
