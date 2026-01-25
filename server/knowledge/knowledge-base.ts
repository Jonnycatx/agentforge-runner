/**
 * Knowledge Base System
 * Document storage, embedding, and RAG retrieval for agents
 */

import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType = "text" | "pdf" | "url" | "markdown" | "code" | "csv";

export interface Document {
  id: string;
  knowledgeBaseId: string;
  name: string;
  type: DocumentType;
  content: string;
  metadata: {
    source?: string;
    author?: string;
    createdAt: string;
    updatedAt: string;
    size: number;
    mimeType?: string;
    language?: string;
    tags: string[];
  };
  chunks: DocumentChunk[];
  status: "pending" | "processing" | "indexed" | "failed";
  error?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  startChar: number;
  endChar: number;
  embedding?: number[];
  metadata: {
    section?: string;
    pageNumber?: number;
    lineNumber?: number;
  };
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  ownerId: string;  // User or agent ID
  ownerType: "user" | "agent" | "team";
  documentIds: string[];
  settings: KnowledgeBaseSettings;
  stats: {
    documentCount: number;
    chunkCount: number;
    totalSize: number;
    lastUpdated: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseSettings {
  chunkSize: number;        // Characters per chunk
  chunkOverlap: number;     // Overlap between chunks
  embeddingModel: string;   // Model to use for embeddings
  retrievalTopK: number;    // Number of chunks to retrieve
  similarityThreshold: number;  // Minimum similarity score
  autoRefresh: boolean;     // Auto-refresh URLs
  refreshInterval?: number; // Hours between refreshes
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  document: Document;
  score: number;
  highlight?: string;
}

export interface RAGContext {
  query: string;
  results: RetrievalResult[];
  formattedContext: string;
  totalTokens: number;
}

// Storage
const knowledgeBases: Map<string, KnowledgeBase> = new Map();
const documents: Map<string, Document> = new Map();

// ============================================================================
// KNOWLEDGE BASE CRUD
// ============================================================================

/**
 * Create a new knowledge base
 */
export function createKnowledgeBase(
  name: string,
  description: string,
  ownerId: string,
  ownerType: "user" | "agent" | "team" = "user",
  settings?: Partial<KnowledgeBaseSettings>
): KnowledgeBase {
  const kb: KnowledgeBase = {
    id: uuidv4(),
    name,
    description,
    ownerId,
    ownerType,
    documentIds: [],
    settings: {
      chunkSize: 1000,
      chunkOverlap: 200,
      embeddingModel: "text-embedding-3-small",
      retrievalTopK: 5,
      similarityThreshold: 0.7,
      autoRefresh: false,
      ...settings,
    },
    stats: {
      documentCount: 0,
      chunkCount: 0,
      totalSize: 0,
      lastUpdated: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  knowledgeBases.set(kb.id, kb);
  return kb;
}

/**
 * Get knowledge base
 */
export function getKnowledgeBase(kbId: string): KnowledgeBase | null {
  return knowledgeBases.get(kbId) || null;
}

/**
 * List knowledge bases
 */
export function listKnowledgeBases(options?: {
  ownerId?: string;
  ownerType?: "user" | "agent" | "team";
}): KnowledgeBase[] {
  let result = Array.from(knowledgeBases.values());
  
  if (options?.ownerId) {
    result = result.filter(kb => kb.ownerId === options.ownerId);
  }
  if (options?.ownerType) {
    result = result.filter(kb => kb.ownerType === options.ownerType);
  }
  
  return result;
}

/**
 * Update knowledge base settings
 */
export function updateKnowledgeBase(
  kbId: string,
  updates: {
    name?: string;
    description?: string;
    settings?: Partial<KnowledgeBaseSettings>;
  }
): KnowledgeBase {
  const kb = knowledgeBases.get(kbId);
  if (!kb) throw new Error("Knowledge base not found");
  
  if (updates.name) kb.name = updates.name;
  if (updates.description) kb.description = updates.description;
  if (updates.settings) {
    kb.settings = { ...kb.settings, ...updates.settings };
  }
  kb.updatedAt = new Date().toISOString();
  
  return kb;
}

/**
 * Delete knowledge base
 */
export function deleteKnowledgeBase(kbId: string): void {
  const kb = knowledgeBases.get(kbId);
  if (!kb) return;
  
  // Delete all documents
  for (const docId of kb.documentIds) {
    documents.delete(docId);
  }
  
  knowledgeBases.delete(kbId);
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * Add document to knowledge base
 */
export async function addDocument(
  kbId: string,
  name: string,
  content: string,
  type: DocumentType,
  metadata?: Partial<Document["metadata"]>
): Promise<Document> {
  const kb = knowledgeBases.get(kbId);
  if (!kb) throw new Error("Knowledge base not found");
  
  const doc: Document = {
    id: uuidv4(),
    knowledgeBaseId: kbId,
    name,
    type,
    content,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      size: content.length,
      tags: [],
      ...metadata,
    },
    chunks: [],
    status: "pending",
  };
  
  documents.set(doc.id, doc);
  kb.documentIds.push(doc.id);
  
  // Process document (chunk and embed)
  await processDocument(doc.id, kb.settings);
  
  // Update stats
  updateKnowledgeBaseStats(kbId);
  
  return doc;
}

/**
 * Process document: chunk and create embeddings
 */
async function processDocument(
  docId: string,
  settings: KnowledgeBaseSettings
): Promise<void> {
  const doc = documents.get(docId);
  if (!doc) return;
  
  doc.status = "processing";
  
  try {
    // Chunk the document
    const chunks = chunkDocument(doc.content, settings.chunkSize, settings.chunkOverlap);
    
    // Create chunk objects
    doc.chunks = chunks.map((chunk, index) => ({
      id: uuidv4(),
      documentId: docId,
      content: chunk.content,
      index,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      metadata: {},
    }));
    
    // Generate embeddings (simplified - would use actual embedding API)
    for (const chunk of doc.chunks) {
      chunk.embedding = generateSimpleEmbedding(chunk.content);
    }
    
    doc.status = "indexed";
  } catch (error) {
    doc.status = "failed";
    doc.error = error instanceof Error ? error.message : String(error);
  }
}

/**
 * Chunk document into smaller pieces
 */
function chunkDocument(
  content: string,
  chunkSize: number,
  overlap: number
): { content: string; startChar: number; endChar: number }[] {
  const chunks: { content: string; startChar: number; endChar: number }[] = [];
  
  // Try to split on sentence boundaries
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
  
  let currentChunk = "";
  let startChar = 0;
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        startChar,
        endChar: startChar + currentChunk.length,
      });
      
      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlap);
      startChar = startChar + currentChunk.length - overlap;
      currentChunk = overlapText;
    }
    
    currentChunk += sentence;
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      startChar,
      endChar: startChar + currentChunk.length,
    });
  }
  
  return chunks;
}

/**
 * Generate simple embedding (hash-based for demo)
 * In production, use OpenAI, Cohere, or local embedding model
 */
function generateSimpleEmbedding(text: string): number[] {
  const hash = crypto.createHash("sha256").update(text.toLowerCase()).digest();
  const embedding: number[] = [];
  
  // Create a 256-dimensional embedding from hash
  for (let i = 0; i < 256; i++) {
    embedding.push((hash[i % hash.length] / 255) * 2 - 1);
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map(v => v / magnitude);
}

/**
 * Get document
 */
export function getDocument(docId: string): Document | null {
  return documents.get(docId) || null;
}

/**
 * List documents in knowledge base
 */
export function listDocuments(kbId: string): Document[] {
  const kb = knowledgeBases.get(kbId);
  if (!kb) return [];
  
  return kb.documentIds
    .map(id => documents.get(id))
    .filter((d): d is Document => d !== undefined);
}

/**
 * Update document
 */
export async function updateDocument(
  docId: string,
  updates: {
    name?: string;
    content?: string;
    metadata?: Partial<Document["metadata"]>;
  }
): Promise<Document> {
  const doc = documents.get(docId);
  if (!doc) throw new Error("Document not found");
  
  if (updates.name) doc.name = updates.name;
  if (updates.metadata) {
    doc.metadata = { ...doc.metadata, ...updates.metadata };
  }
  
  // If content changed, reprocess
  if (updates.content && updates.content !== doc.content) {
    doc.content = updates.content;
    doc.metadata.size = updates.content.length;
    doc.metadata.updatedAt = new Date().toISOString();
    
    const kb = knowledgeBases.get(doc.knowledgeBaseId);
    if (kb) {
      await processDocument(docId, kb.settings);
    }
  }
  
  return doc;
}

/**
 * Delete document
 */
export function deleteDocument(docId: string): void {
  const doc = documents.get(docId);
  if (!doc) return;
  
  const kb = knowledgeBases.get(doc.knowledgeBaseId);
  if (kb) {
    kb.documentIds = kb.documentIds.filter(id => id !== docId);
    updateKnowledgeBaseStats(kb.id);
  }
  
  documents.delete(docId);
}

/**
 * Update knowledge base statistics
 */
function updateKnowledgeBaseStats(kbId: string): void {
  const kb = knowledgeBases.get(kbId);
  if (!kb) return;
  
  const docs = listDocuments(kbId);
  
  kb.stats = {
    documentCount: docs.length,
    chunkCount: docs.reduce((sum, d) => sum + d.chunks.length, 0),
    totalSize: docs.reduce((sum, d) => sum + d.metadata.size, 0),
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// RAG RETRIEVAL
// ============================================================================

/**
 * Search knowledge base
 */
export function searchKnowledgeBase(
  kbId: string,
  query: string,
  options?: {
    topK?: number;
    threshold?: number;
    documentIds?: string[];
    tags?: string[];
  }
): RetrievalResult[] {
  const kb = knowledgeBases.get(kbId);
  if (!kb) return [];
  
  const topK = options?.topK || kb.settings.retrievalTopK;
  const threshold = options?.threshold || kb.settings.similarityThreshold;
  
  // Generate query embedding
  const queryEmbedding = generateSimpleEmbedding(query);
  
  // Get all chunks from relevant documents
  let docs = listDocuments(kbId);
  
  if (options?.documentIds?.length) {
    docs = docs.filter(d => options.documentIds!.includes(d.id));
  }
  if (options?.tags?.length) {
    docs = docs.filter(d => 
      options.tags!.some(tag => d.metadata.tags.includes(tag))
    );
  }
  
  // Score all chunks
  const results: RetrievalResult[] = [];
  
  for (const doc of docs) {
    if (doc.status !== "indexed") continue;
    
    for (const chunk of doc.chunks) {
      if (!chunk.embedding) continue;
      
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      
      if (score >= threshold) {
        results.push({
          chunk,
          document: doc,
          score,
          highlight: highlightMatch(chunk.content, query),
        });
      }
    }
  }
  
  // Sort by score and take top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

/**
 * Highlight matching text
 */
function highlightMatch(content: string, query: string): string {
  const words = query.toLowerCase().split(/\s+/);
  let highlighted = content;
  
  for (const word of words) {
    if (word.length < 3) continue;
    const regex = new RegExp(`(${word})`, "gi");
    highlighted = highlighted.replace(regex, "**$1**");
  }
  
  return highlighted;
}

/**
 * Build RAG context for agent
 */
export function buildRAGContext(
  kbId: string,
  query: string,
  maxTokens: number = 2000,
  options?: {
    topK?: number;
    includeMetadata?: boolean;
  }
): RAGContext {
  const results = searchKnowledgeBase(kbId, query, { topK: options?.topK || 5 });
  
  let formattedContext = "";
  let totalTokens = 0;
  const includedResults: RetrievalResult[] = [];
  
  for (const result of results) {
    // Rough token estimate (4 chars per token)
    const chunkTokens = Math.ceil(result.chunk.content.length / 4);
    
    if (totalTokens + chunkTokens > maxTokens) break;
    
    if (options?.includeMetadata) {
      formattedContext += `[Source: ${result.document.name}]\n`;
    }
    formattedContext += result.chunk.content + "\n\n";
    
    totalTokens += chunkTokens;
    includedResults.push(result);
  }
  
  return {
    query,
    results: includedResults,
    formattedContext: formattedContext.trim(),
    totalTokens,
  };
}

/**
 * Get RAG-enhanced prompt for agent
 */
export function getRAGPrompt(
  kbId: string,
  userQuery: string,
  systemPrompt: string = ""
): string {
  const context = buildRAGContext(kbId, userQuery, 2000, { includeMetadata: true });
  
  if (context.results.length === 0) {
    return systemPrompt;
  }
  
  return `${systemPrompt}

You have access to the following relevant information from your knowledge base:

${context.formattedContext}

Use this information to help answer the user's question. If the information doesn't fully answer the question, acknowledge what you know and what you don't know.`;
}

// ============================================================================
// KNOWLEDGE BASE ANALYTICS
// ============================================================================

export interface KnowledgeBaseAnalytics {
  kbId: string;
  documentStats: {
    total: number;
    byType: Record<DocumentType, number>;
    byStatus: Record<string, number>;
  };
  queryStats: {
    totalQueries: number;
    avgResultsPerQuery: number;
    avgScore: number;
  };
  topDocuments: { documentId: string; name: string; queryCount: number }[];
  recentQueries: { query: string; timestamp: string; resultCount: number }[];
}

// Query history for analytics
const queryHistory: {
  kbId: string;
  query: string;
  timestamp: string;
  resultCount: number;
  documentIds: string[];
}[] = [];

/**
 * Track a query for analytics
 */
export function trackQuery(
  kbId: string,
  query: string,
  results: RetrievalResult[]
): void {
  queryHistory.push({
    kbId,
    query,
    timestamp: new Date().toISOString(),
    resultCount: results.length,
    documentIds: [...new Set(results.map(r => r.document.id))],
  });
  
  // Keep last 1000 queries
  if (queryHistory.length > 1000) {
    queryHistory.shift();
  }
}

/**
 * Get knowledge base analytics
 */
export function getKnowledgeBaseAnalytics(kbId: string): KnowledgeBaseAnalytics {
  const kb = knowledgeBases.get(kbId);
  if (!kb) throw new Error("Knowledge base not found");
  
  const docs = listDocuments(kbId);
  const kbQueries = queryHistory.filter(q => q.kbId === kbId);
  
  // Document stats by type
  const byType: Record<DocumentType, number> = {
    text: 0, pdf: 0, url: 0, markdown: 0, code: 0, csv: 0
  };
  const byStatus: Record<string, number> = {};
  
  for (const doc of docs) {
    byType[doc.type] = (byType[doc.type] || 0) + 1;
    byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
  }
  
  // Query stats
  const avgResults = kbQueries.length > 0
    ? kbQueries.reduce((sum, q) => sum + q.resultCount, 0) / kbQueries.length
    : 0;
  
  // Top documents
  const docQueryCounts: Record<string, number> = {};
  for (const query of kbQueries) {
    for (const docId of query.documentIds) {
      docQueryCounts[docId] = (docQueryCounts[docId] || 0) + 1;
    }
  }
  
  const topDocuments = Object.entries(docQueryCounts)
    .map(([docId, count]) => ({
      documentId: docId,
      name: documents.get(docId)?.name || "Unknown",
      queryCount: count,
    }))
    .sort((a, b) => b.queryCount - a.queryCount)
    .slice(0, 10);
  
  return {
    kbId,
    documentStats: {
      total: docs.length,
      byType,
      byStatus,
    },
    queryStats: {
      totalQueries: kbQueries.length,
      avgResultsPerQuery: avgResults,
      avgScore: 0,  // Would calculate from actual scores
    },
    topDocuments,
    recentQueries: kbQueries.slice(-10).reverse().map(q => ({
      query: q.query,
      timestamp: q.timestamp,
      resultCount: q.resultCount,
    })),
  };
}
