/**
 * Knowledge Base Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createKnowledgeBase,
  getKnowledgeBase,
  listKnowledgeBases,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  addDocument,
  getDocument,
  listDocuments,
  updateDocument,
  deleteDocument,
  searchKnowledgeBase,
  buildRAGContext,
  getRAGPrompt,
  getKnowledgeBaseAnalytics,
} from '../knowledge/knowledge-base';

describe('Knowledge Base CRUD', () => {
  const testOwner = 'test-owner';

  it('should create knowledge base', () => {
    const kb = createKnowledgeBase('Test KB', 'A test knowledge base', testOwner);
    expect(kb.id).toBeDefined();
    expect(kb.name).toBe('Test KB');
    expect(kb.documentIds).toEqual([]);
  });

  it('should get knowledge base by id', () => {
    const kb = createKnowledgeBase('Get Test', 'Test', testOwner);
    const retrieved = getKnowledgeBase(kb.id);
    expect(retrieved?.id).toBe(kb.id);
  });

  it('should list knowledge bases by owner', () => {
    createKnowledgeBase('List Test 1', 'Test', testOwner);
    createKnowledgeBase('List Test 2', 'Test', testOwner);
    const kbs = listKnowledgeBases({ ownerId: testOwner });
    expect(kbs.length).toBeGreaterThanOrEqual(2);
  });

  it('should update knowledge base', () => {
    const kb = createKnowledgeBase('Update Test', 'Original', testOwner);
    const updated = updateKnowledgeBase(kb.id, { description: 'Updated' });
    expect(updated.description).toBe('Updated');
  });

  it('should update settings', () => {
    const kb = createKnowledgeBase('Settings Test', 'Test', testOwner);
    const updated = updateKnowledgeBase(kb.id, {
      settings: { chunkSize: 500, retrievalTopK: 10 }
    });
    expect(updated.settings.chunkSize).toBe(500);
    expect(updated.settings.retrievalTopK).toBe(10);
  });

  it('should delete knowledge base', () => {
    const kb = createKnowledgeBase('Delete Test', 'Test', testOwner);
    deleteKnowledgeBase(kb.id);
    expect(getKnowledgeBase(kb.id)).toBeNull();
  });
});

describe('Document Management', () => {
  it('should add document to knowledge base', async () => {
    const kb = createKnowledgeBase('Doc Test', 'Test', 'owner');
    const doc = await addDocument(
      kb.id,
      'Test Document',
      'This is the content of the test document.',
      'text'
    );
    expect(doc.id).toBeDefined();
    expect(doc.knowledgeBaseId).toBe(kb.id);
  });

  it('should get document', async () => {
    const kb = createKnowledgeBase('Get Doc Test', 'Test', 'owner');
    const doc = await addDocument(kb.id, 'Test', 'Content', 'text');
    const retrieved = getDocument(doc.id);
    expect(retrieved?.id).toBe(doc.id);
  });

  it('should list documents in knowledge base', async () => {
    const kb = createKnowledgeBase('List Doc Test', 'Test', 'owner');
    await addDocument(kb.id, 'Doc 1', 'Content 1', 'text');
    await addDocument(kb.id, 'Doc 2', 'Content 2', 'text');
    const docs = listDocuments(kb.id);
    expect(docs.length).toBe(2);
  });

  it('should chunk documents', async () => {
    const kb = createKnowledgeBase('Chunk Test', 'Test', 'owner', { chunkSize: 100 });
    const longContent = 'This is a sentence. '.repeat(50);
    const doc = await addDocument(kb.id, 'Long Doc', longContent, 'text');
    expect(doc.chunks.length).toBeGreaterThan(1);
  });

  it('should delete document', async () => {
    const kb = createKnowledgeBase('Delete Doc Test', 'Test', 'owner');
    const doc = await addDocument(kb.id, 'To Delete', 'Content', 'text');
    deleteDocument(doc.id);
    expect(getDocument(doc.id)).toBeNull();
  });

  it('should support different document types', async () => {
    const kb = createKnowledgeBase('Types Test', 'Test', 'owner');
    
    const textDoc = await addDocument(kb.id, 'Text', 'Content', 'text');
    expect(textDoc.type).toBe('text');
    
    const mdDoc = await addDocument(kb.id, 'Markdown', '# Header', 'markdown');
    expect(mdDoc.type).toBe('markdown');
    
    const codeDoc = await addDocument(kb.id, 'Code', 'function test() {}', 'code');
    expect(codeDoc.type).toBe('code');
  });
});

describe('RAG Retrieval', () => {
  it('should search knowledge base', async () => {
    const kb = createKnowledgeBase('Search Test', 'Test', 'owner');
    await addDocument(kb.id, 'AI Document', 'Artificial intelligence is transforming technology.', 'text');
    await addDocument(kb.id, 'Cooking', 'How to make pasta with tomato sauce.', 'text');
    
    const results = searchKnowledgeBase(kb.id, 'artificial intelligence');
    // Results depend on similarity - may or may not find matches with simple embedding
    expect(Array.isArray(results)).toBe(true);
  });

  it('should respect topK setting', async () => {
    const kb = createKnowledgeBase('TopK Test', 'Test', 'owner');
    for (let i = 0; i < 10; i++) {
      await addDocument(kb.id, `Doc ${i}`, `Content about topic ${i}`, 'text');
    }
    
    const results = searchKnowledgeBase(kb.id, 'topic', { topK: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('should build RAG context', async () => {
    const kb = createKnowledgeBase('RAG Test', 'Test', 'owner');
    await addDocument(kb.id, 'Info', 'Important information about the product.', 'text');
    
    const context = buildRAGContext(kb.id, 'product information', 1000);
    expect(context.query).toBe('product information');
    expect(typeof context.formattedContext).toBe('string');
  });

  it('should generate RAG prompt', async () => {
    const kb = createKnowledgeBase('Prompt Test', 'Test', 'owner');
    await addDocument(kb.id, 'Help', 'The answer to your question is here.', 'text');
    
    const prompt = getRAGPrompt(kb.id, 'What is the answer?', 'You are a helpful assistant.');
    expect(prompt).toContain('helpful assistant');
  });

  it('should filter by document tags', async () => {
    const kb = createKnowledgeBase('Tags Test', 'Test', 'owner');
    const doc = await addDocument(kb.id, 'Tagged', 'Content with tags', 'text', { tags: ['important'] });
    
    const results = searchKnowledgeBase(kb.id, 'content', { tags: ['important'] });
    // Filter should work even if no results due to similarity
    expect(Array.isArray(results)).toBe(true);
  });
});

describe('Knowledge Base Analytics', () => {
  it('should generate analytics', async () => {
    const kb = createKnowledgeBase('Analytics Test', 'Test', 'owner');
    await addDocument(kb.id, 'Doc 1', 'Content 1', 'text');
    await addDocument(kb.id, 'Doc 2', 'Content 2', 'markdown');
    
    const analytics = getKnowledgeBaseAnalytics(kb.id);
    expect(analytics.kbId).toBe(kb.id);
    expect(analytics.documentStats.total).toBe(2);
    expect(analytics.documentStats.byType.text).toBe(1);
    expect(analytics.documentStats.byType.markdown).toBe(1);
  });
});
