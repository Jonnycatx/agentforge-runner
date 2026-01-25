/**
 * Tool System Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { toolRegistry, getToolsByCategory, getToolById, ToolAuthManager } from '../tools';
import { executeCalculator } from '../tools/implementations/calculator';
import { executeDataTransform } from '../tools/implementations/data-transform';

describe('Tool Registry', () => {
  it('should have tools registered', () => {
    expect(toolRegistry.length).toBeGreaterThan(0);
  });

  it('should get tools by category', () => {
    const webTools = getToolsByCategory('web');
    expect(webTools.length).toBeGreaterThan(0);
    expect(webTools.every(t => t.category === 'web')).toBe(true);
  });

  it('should get tool by ID', () => {
    const tool = getToolById('calculator');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Calculator');
  });

  it('should return undefined for non-existent tool', () => {
    const tool = getToolById('non_existent_tool');
    expect(tool).toBeUndefined();
  });

  it('should have all required tool properties', () => {
    for (const tool of toolRegistry) {
      expect(tool.id).toBeDefined();
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.category).toBeDefined();
      expect(tool.inputs).toBeInstanceOf(Array);
      expect(tool.outputs).toBeInstanceOf(Array);
    }
  });
});

describe('Calculator Tool', () => {
  it('should perform basic addition', async () => {
    const result = await executeCalculator({ expression: '2 + 3' });
    expect(result.success).toBe(true);
    expect(result.result?.value).toBe(5);
  });

  it('should perform complex calculations', async () => {
    const result = await executeCalculator({ expression: 'sqrt(16) + 2^3' });
    expect(result.success).toBe(true);
    expect(result.result?.value).toBe(12);
  });

  it('should handle mathematical functions', async () => {
    const result = await executeCalculator({ expression: 'sin(0)' });
    expect(result.success).toBe(true);
    expect(result.result?.value).toBe(0);
  });

  it('should handle invalid expressions gracefully', async () => {
    const result = await executeCalculator({ expression: 'invalid expression @#$' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Data Transform Tool', () => {
  const testData = [
    { name: 'Alice', age: 30, city: 'NYC' },
    { name: 'Bob', age: 25, city: 'LA' },
    { name: 'Charlie', age: 35, city: 'NYC' },
  ];

  it('should filter data', async () => {
    const result = await executeDataTransform({
      data: testData,
      operations: [{ type: 'filter', field: 'city', operator: 'eq', value: 'NYC' }],
    });
    expect(result.success).toBe(true);
    expect(result.result?.data.length).toBe(2);
  });

  it('should sort data ascending', async () => {
    const result = await executeDataTransform({
      data: testData,
      operations: [{ type: 'sort', field: 'age', direction: 'asc' }],
    });
    expect(result.success).toBe(true);
    expect(result.result?.data[0].name).toBe('Bob');
  });

  it('should sort data descending', async () => {
    const result = await executeDataTransform({
      data: testData,
      operations: [{ type: 'sort', field: 'age', direction: 'desc' }],
    });
    expect(result.success).toBe(true);
    expect(result.result?.data[0].name).toBe('Charlie');
  });

  it('should select specific fields', async () => {
    const result = await executeDataTransform({
      data: testData,
      operations: [{ type: 'select', fields: ['name', 'age'] }],
    });
    expect(result.success).toBe(true);
    expect(Object.keys(result.result?.data[0] || {})).toEqual(['name', 'age']);
  });

  it('should chain multiple operations', async () => {
    const result = await executeDataTransform({
      data: testData,
      operations: [
        { type: 'filter', field: 'age', operator: 'gte', value: 30 },
        { type: 'sort', field: 'age', direction: 'desc' },
        { type: 'select', fields: ['name'] },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.result?.data.length).toBe(2);
    expect(result.result?.data[0].name).toBe('Charlie');
  });
});

describe('Tool Auth Manager', () => {
  const authManager = new ToolAuthManager('test-encryption-key-32ch!');

  beforeEach(() => {
    // Clear credentials between tests
  });

  it('should encrypt and decrypt credentials', async () => {
    const originalCredentials = {
      api_key: 'test-api-key-12345',
      secret: 'test-secret',
    };

    await authManager.storeCredentials('user-1', 'test-tool', originalCredentials);
    const retrieved = await authManager.getCredentials('user-1', 'test-tool');

    expect(retrieved).toEqual(originalCredentials);
  });

  it('should return null for non-existent credentials', async () => {
    const result = await authManager.getCredentials('user-999', 'non-existent');
    expect(result).toBeNull();
  });

  it('should delete credentials', async () => {
    await authManager.storeCredentials('user-2', 'tool-to-delete', { key: 'value' });
    await authManager.deleteCredentials('user-2', 'tool-to-delete');
    const result = await authManager.getCredentials('user-2', 'tool-to-delete');
    expect(result).toBeNull();
  });
});
