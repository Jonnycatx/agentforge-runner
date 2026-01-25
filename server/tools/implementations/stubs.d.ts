/**
 * Type stubs for optional dependencies
 * These tools require external packages that are not installed by default
 */

declare module 'puppeteer' {
  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }
  
  export interface Keyboard {
    press(key: string): Promise<void>;
  }
  
  export interface Page {
    goto(url: string, options?: any): Promise<any>;
    screenshot(options?: any): Promise<Buffer | string>;
    pdf(options?: any): Promise<Buffer>;
    setContent(html: string, options?: any): Promise<void>;
    setViewport(viewport: { width: number; height: number }): Promise<void>;
    evaluate<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T>;
    click(selector: string, options?: any): Promise<void>;
    type(selector: string, text: string, options?: any): Promise<void>;
    waitForSelector(selector: string, options?: any): Promise<any>;
    $eval<T>(selector: string, fn: (el: any) => T): Promise<T>;
    $$eval<T>(selector: string, fn: (els: any[]) => T): Promise<T>;
    select(selector: string, ...values: string[]): Promise<string[]>;
    hover(selector: string): Promise<void>;
    keyboard: Keyboard;
    close(): Promise<void>;
  }
  
  export function launch(options?: any): Promise<Browser>;
}

declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [name: string]: WorkSheet };
  }
  
  export interface WorkSheet {
    [cell: string]: any;
  }
  
  export const utils: {
    sheet_to_json<T = any>(sheet: WorkSheet, options?: any): T[];
    json_to_sheet(data: any[]): WorkSheet;
    book_new(): WorkBook;
    book_append_sheet(workbook: WorkBook, sheet: WorkSheet, name: string): void;
    decode_range(range: string): { s: { r: number; c: number }; e: { r: number; c: number } };
  };
  
  export function read(data: any, options?: any): WorkBook;
  export function readFile(path: string, options?: any): WorkBook;
  export function write(workbook: WorkBook, options: any): any;
  export function writeFile(workbook: WorkBook, path: string): void;
}

declare module 'tesseract.js' {
  export interface Word {
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }
  
  export interface Line {
    text: string;
    words: Word[];
    confidence: number;
  }
  
  export interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
      words?: Word[];
      lines?: Line[];
    };
  }
  
  export interface Worker {
    loadLanguage(lang: string): Promise<void>;
    initialize(lang: string): Promise<void>;
    recognize(image: string | Buffer): Promise<RecognizeResult>;
    terminate(): Promise<void>;
  }
  
  export function createWorker(): Promise<Worker>;
  
  const Tesseract: {
    createWorker(): Promise<Worker>;
  };
  
  export default Tesseract;
}

declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    Title?: string;
    Author?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  }
  
  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: any;
    text: string;
    version: string;
  }
  
  function pdfParse(dataBuffer: Buffer, options?: any): Promise<PDFData>;
  export = pdfParse;
}
