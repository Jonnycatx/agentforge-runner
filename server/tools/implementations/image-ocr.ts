/**
 * Image OCR Tool Implementation
 * Extract text from images using Tesseract.js or API
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

// Try to use tesseract.js if available
async function getTesseract() {
  try {
    return await import("tesseract.js").catch(() => null);
  } catch {
    return null;
  }
}

// Fallback: Use OCR.space API (free tier available)
async function ocrWithAPI(imageBase64: string, language: string, apiKey?: string): Promise<{
  text: string;
  confidence: number;
}> {
  const formData = new FormData();
  formData.append("base64Image", `data:image/png;base64,${imageBase64}`);
  formData.append("language", language);
  formData.append("isOverlayRequired", "false");
  
  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: apiKey ? { "apikey": apiKey } : {},
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage || "OCR processing failed");
  }

  const results = data.ParsedResults?.[0];
  if (!results) {
    throw new Error("No OCR results returned");
  }

  return {
    text: results.ParsedText || "",
    confidence: results.TextOverlay?.Lines?.reduce(
      (acc: number, line: any) => acc + (line.Words?.reduce(
        (wacc: number, word: any) => wacc + (word.Confidence || 0), 0
      ) / (line.Words?.length || 1)), 0
    ) / (results.TextOverlay?.Lines?.length || 1) || 0,
  };
}

async function executeImageOCR(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { image, file, content, language = "eng" } = input;
  const logs: string[] = [];

  const imageData = image || file || content;
  
  if (!imageData) {
    return {
      success: false,
      error: "Image content is required (as base64 string)",
      executionTime: 0,
      logs: ["Error: No image data provided"],
    };
  }

  try {
    logs.push(`Running OCR with language: ${language}`);

    // Ensure we have base64 data
    let base64Image = imageData;
    if (typeof imageData === "string" && imageData.includes("base64,")) {
      base64Image = imageData.split("base64,")[1];
    }

    // Try Tesseract.js first
    const TesseractModule = await getTesseract();
    
    if (TesseractModule) {
      logs.push("Using Tesseract.js for OCR");
      
      // Create a worker for OCR
      const worker = await TesseractModule.createWorker();
      await worker.loadLanguage(language);
      await worker.initialize(language);
      
      const { data } = await worker.recognize(Buffer.from(base64Image, "base64"));
      await worker.terminate();

      logs.push(`OCR completed with ${Math.round(data.confidence)}% confidence`);

      // Cast data to any to access optional properties
      const ocrData = data as any;
      
      return {
        success: true,
        output: {
          text: ocrData.text,
          confidence: ocrData.confidence,
          words: ocrData.words?.map((w: any) => ({
            text: w.text,
            confidence: w.confidence,
            bbox: w.bbox,
          })),
          lines: ocrData.lines?.map((l: any) => l.text),
        },
        executionTime: 0,
        logs,
      };
    }

    // Fallback to API
    logs.push("Tesseract.js not available, using OCR API");
    const apiKey = credentials?.apiKey;
    
    const result = await ocrWithAPI(base64Image, language, apiKey);
    logs.push(`OCR completed via API`);

    return {
      success: true,
      output: {
        text: result.text,
        confidence: result.confidence,
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "OCR failed";
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
registerExecutor("image_ocr", executeImageOCR);

export { executeImageOCR };
