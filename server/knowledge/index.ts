/**
 * Knowledge Base System
 * Exports for document management and RAG retrieval
 */

export {
  // Types
  type DocumentType,
  type Document,
  type DocumentChunk,
  type KnowledgeBase,
  type KnowledgeBaseSettings,
  type RetrievalResult,
  type RAGContext,
  type KnowledgeBaseAnalytics,
  
  // Knowledge base CRUD
  createKnowledgeBase,
  getKnowledgeBase,
  listKnowledgeBases,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  
  // Document management
  addDocument,
  getDocument,
  listDocuments,
  updateDocument,
  deleteDocument,
  
  // RAG retrieval
  searchKnowledgeBase,
  buildRAGContext,
  getRAGPrompt,
  
  // Analytics
  trackQuery,
  getKnowledgeBaseAnalytics,
} from "./knowledge-base";
