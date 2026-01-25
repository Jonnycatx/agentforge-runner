/**
 * Code Executor Tool Implementation
 * Executes JavaScript code in a sandboxed environment
 * Note: Python execution would require a separate runtime/container
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";
import * as vm from "vm";

// Safe built-in functions available in sandbox
const safeGlobals = {
  // Math functions
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  JSON,
  Date,
  RegExp,
  Map,
  Set,
  
  // Utility functions
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  
  // Console (captured)
  console: {
    log: (...args: any[]) => args,
    error: (...args: any[]) => args,
    warn: (...args: any[]) => args,
    info: (...args: any[]) => args,
  },
};

async function executeCode(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const { code, timeout = 5000, language = "javascript" } = input;
  const logs: string[] = [];
  const stdout: string[] = [];
  const stderr: string[] = [];

  if (!code) {
    return {
      success: false,
      error: "Code is required",
      executionTime: 0,
      logs: ["Error: No code provided"],
    };
  }

  // Only JavaScript is supported for now
  if (language !== "javascript" && language !== "js") {
    return {
      success: false,
      error: `Language "${language}" is not supported. Only JavaScript is available.`,
      executionTime: 0,
      logs: ["Error: Unsupported language"],
    };
  }

  try {
    logs.push(`Executing JavaScript code (timeout: ${timeout}ms)`);

    // Create sandbox with captured console
    const sandbox: Record<string, any> = {
      ...safeGlobals,
      console: {
        log: (...args: any[]) => {
          stdout.push(args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
        },
        error: (...args: any[]) => {
          stderr.push(args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
        },
        warn: (...args: any[]) => {
          stdout.push(`[WARN] ${args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")}`);
        },
        info: (...args: any[]) => {
          stdout.push(`[INFO] ${args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")}`);
        },
      },
      // Result container
      __result__: undefined as any,
    };

    // Wrap code to capture the last expression's value
    const wrappedCode = `
      try {
        __result__ = (function() {
          ${code}
        })();
      } catch (e) {
        __result__ = { __error__: e.message };
      }
    `;

    // Create context and run
    const context = vm.createContext(sandbox);
    
    vm.runInContext(wrappedCode, context, {
      timeout,
      displayErrors: true,
    });

    // Check for error
    if (sandbox.__result__ && typeof sandbox.__result__ === "object" && "__error__" in sandbox.__result__) {
      throw new Error(sandbox.__result__.__error__ as string);
    }

    logs.push("Execution completed successfully");
    
    // Format result
    let result = sandbox.__result__;
    if (result === undefined && stdout.length > 0) {
      result = stdout[stdout.length - 1];
    }

    return {
      success: true,
      output: {
        result,
        stdout: stdout.join("\n"),
        stderr: stderr.join("\n"),
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    let errorMessage: string;
    
    if (error instanceof Error) {
      if (error.message.includes("Script execution timed out")) {
        errorMessage = `Code execution timed out after ${timeout}ms`;
      } else {
        errorMessage = error.message;
      }
    } else {
      errorMessage = "Code execution failed";
    }
    
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      output: {
        stdout: stdout.join("\n"),
        stderr: stderr.join("\n"),
      },
      executionTime: 0,
      logs,
    };
  }
}

// Register the executor
registerExecutor("code_execute", executeCode);

export { executeCode };
