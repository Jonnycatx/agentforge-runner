/**
 * PDF Generator Tool Implementation
 * Convert HTML content or URLs to PDF
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

interface PDFOptions {
  source: string;
  isUrl?: boolean;
  pageSize?: "A4" | "Letter" | "Legal" | "A3";
  landscape?: boolean;
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
}

// Try to use Puppeteer for PDF generation
async function generateWithPuppeteer(options: PDFOptions): Promise<string | null> {
  try {
    const puppeteer = await import("puppeteer").catch(() => null);
    if (!puppeteer) return null;
    
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    try {
      const page = await browser.newPage();
      
      if (options.isUrl) {
        await page.goto(options.source, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
      } else {
        await page.setContent(options.source, {
          waitUntil: "networkidle0",
        });
      }

      // Page size dimensions in inches
      const pageSizes: Record<string, { width: string; height: string }> = {
        A4: { width: "8.27in", height: "11.69in" },
        Letter: { width: "8.5in", height: "11in" },
        Legal: { width: "8.5in", height: "14in" },
        A3: { width: "11.69in", height: "16.54in" },
      };

      const size = pageSizes[options.pageSize || "A4"];
      
      const pdf = await page.pdf({
        format: options.pageSize || "A4",
        landscape: options.landscape || false,
        printBackground: options.printBackground !== false,
        margin: {
          top: options.margins?.top || "0.5in",
          right: options.margins?.right || "0.5in",
          bottom: options.margins?.bottom || "0.5in",
          left: options.margins?.left || "0.5in",
        },
        displayHeaderFooter: !!(options.headerTemplate || options.footerTemplate),
        headerTemplate: options.headerTemplate || "",
        footerTemplate: options.footerTemplate || "",
      });
      
      return Buffer.from(pdf).toString("base64");
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Puppeteer PDF generation failed:", error);
    return null;
  }
}

// Fallback: Use an API service
async function generateWithAPI(options: PDFOptions): Promise<string> {
  // Using a hypothetical PDF API - in production, use services like:
  // - PDFShift (pdfshift.io)
  // - API2PDF (api2pdf.com)
  // - DocRaptor (docraptor.com)
  
  if (options.isUrl) {
    // For URLs, we can try to fetch and convert
    const response = await fetch(options.source);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    const html = await response.text();
    
    // Create a simple PDF-like structure (this is a placeholder)
    // In production, use a proper PDF library or API
    throw new Error("PDF generation requires Puppeteer. Install with: npm install puppeteer");
  }
  
  throw new Error("PDF generation requires Puppeteer. Install with: npm install puppeteer");
}

async function executePDFGenerator(
  input: Record<string, any>
): Promise<ToolExecutionResult> {
  const {
    source,
    isUrl = true,
    pageSize = "A4",
    landscape = false,
    margins,
    headerTemplate,
    footerTemplate,
    printBackground = true,
  } = input;
  const logs: string[] = [];

  if (!source) {
    return {
      success: false,
      error: "Source (URL or HTML) is required",
      executionTime: 0,
      logs: ["Error: No source provided"],
    };
  }

  // Validate URL if isUrl is true
  if (isUrl) {
    try {
      new URL(source);
    } catch {
      return {
        success: false,
        error: "Invalid URL provided",
        executionTime: 0,
        logs: ["Error: Invalid URL format"],
      };
    }
  }

  try {
    logs.push(`Generating PDF from ${isUrl ? "URL" : "HTML content"}`);
    logs.push(`Page size: ${pageSize}, Landscape: ${landscape}`);

    const options: PDFOptions = {
      source,
      isUrl,
      pageSize: pageSize as PDFOptions["pageSize"],
      landscape,
      margins,
      headerTemplate,
      footerTemplate,
      printBackground,
    };

    // Try Puppeteer first
    let base64Pdf = await generateWithPuppeteer(options);
    
    if (base64Pdf) {
      logs.push("PDF generated using Puppeteer");
    } else {
      // Fallback to API
      logs.push("Puppeteer not available, trying API fallback");
      base64Pdf = await generateWithAPI(options);
      logs.push("PDF generated using API");
    }

    return {
      success: true,
      output: {
        pdf: base64Pdf,
        pageSize,
        landscape,
        mimeType: "application/pdf",
        source: isUrl ? source : "(HTML content)",
      },
      executionTime: 0,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "PDF generation failed";
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
registerExecutor("pdf_generator", executePDFGenerator);

export { executePDFGenerator };
