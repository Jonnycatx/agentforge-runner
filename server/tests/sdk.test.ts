/**
 * Custom Tool SDK Tests
 */
import { describe, it, expect } from 'vitest';
import {
  ToolBuilder,
  ToolTester,
  publishTool,
  searchMarketplace,
  installTool,
  addReview,
  generateScaffold,
} from '../sdk/tool-sdk';

describe('Tool Builder', () => {
  it('should build tool definition', () => {
    const tool = new ToolBuilder('test-tool')
      .name('Test Tool')
      .description('A test tool')
      .category('testing')
      .author({ name: 'Test Author', email: 'test@example.com' })
      .input({
        name: 'input1',
        type: 'string',
        description: 'Test input',
        required: true,
      })
      .output({
        name: 'output1',
        type: 'string',
        description: 'Test output',
        required: true,
      })
      .handler('executeTest')
      .build();

    expect(tool.id).toBe('test-tool');
    expect(tool.name).toBe('Test Tool');
    expect(tool.inputs.length).toBe(1);
    expect(tool.outputs.length).toBe(1);
  });

  it('should set default values', () => {
    const tool = new ToolBuilder()
      .name('Defaults Test')
      .description('Test defaults')
      .category('test')
      .author({ name: 'Author' })
      .handler('handler')
      .build();

    expect(tool.version).toBe('1.0.0');
    expect(tool.timeout).toBe(30000);
    expect(tool.isPublic).toBe(false);
    expect(tool.runtime).toBe('javascript');
  });

  it('should throw on missing required fields', () => {
    expect(() => {
      new ToolBuilder().build();
    }).toThrow('Tool name is required');

    expect(() => {
      new ToolBuilder().name('Test').build();
    }).toThrow('Tool description is required');
  });

  it('should support chaining', () => {
    const builder = new ToolBuilder()
      .name('Chain Test')
      .description('Test')
      .category('test')
      .author({ name: 'Author' })
      .handler('handler')
      .tag('tag1', 'tag2')
      .timeout(5000)
      .public(true);

    const tool = builder.build();
    expect(tool.tags).toContain('tag1');
    expect(tool.tags).toContain('tag2');
    expect(tool.timeout).toBe(5000);
    expect(tool.isPublic).toBe(true);
  });

  it('should add examples', () => {
    const tool = new ToolBuilder()
      .name('Example Test')
      .description('Test')
      .category('test')
      .author({ name: 'Author' })
      .handler('handler')
      .example({
        name: 'Basic usage',
        description: 'Shows basic usage',
        input: { value: 1 },
        expectedOutput: { result: 2 },
      })
      .build();

    expect(tool.examples?.length).toBe(1);
    expect(tool.examples?.[0].name).toBe('Basic usage');
  });
});

describe('Tool Tester', () => {
  const testTool = new ToolBuilder('tester-tool')
    .name('Tester Tool')
    .description('Tool for testing')
    .category('test')
    .author({ name: 'Author' })
    .input({ name: 'value', type: 'number', description: 'Input value', required: true })
    .output({ name: 'result', type: 'number', description: 'Result', required: true })
    .handler('execute')
    .build();

  const executor = async (input: Record<string, any>) => {
    return { result: input.value * 2 };
  };

  it('should run test case', async () => {
    const tester = new ToolTester(testTool, executor);
    const result = await tester.runTest({
      name: 'double test',
      input: { value: 5 },
      expectedOutput: { result: 10 },
    });

    expect(result.passed).toBe(true);
  });

  it('should fail on wrong output', async () => {
    const tester = new ToolTester(testTool, executor);
    const result = await tester.runTest({
      name: 'wrong output test',
      input: { value: 5 },
      expectedOutput: { result: 100 },
    });

    expect(result.passed).toBe(false);
  });

  it('should validate required inputs', async () => {
    const tester = new ToolTester(testTool, executor);
    const result = await tester.runTest({
      name: 'missing input test',
      input: {},
      expectedError: 'Missing required input',
    });

    expect(result.passed).toBe(true);
  });

  it('should run all tests', async () => {
    const tester = new ToolTester(testTool, executor);
    const results = await tester.runAllTests([
      { name: 'test1', input: { value: 1 }, expectedOutput: { result: 2 } },
      { name: 'test2', input: { value: 2 }, expectedOutput: { result: 4 } },
      { name: 'test3', input: { value: 3 }, expectedOutput: { result: 6 } },
    ]);

    expect(results.passed).toBe(3);
    expect(results.failed).toBe(0);
  });

  it('should handle execution errors', async () => {
    const errorExecutor = async () => {
      throw new Error('Execution failed');
    };
    const tester = new ToolTester(testTool, errorExecutor);
    const result = await tester.runTest({
      name: 'error test',
      input: { value: 1 },
      expectedError: 'Execution failed',
    });

    expect(result.passed).toBe(true);
  });
});

describe('Tool Marketplace', () => {
  it('should publish tool', () => {
    const tool = new ToolBuilder('marketplace-tool')
      .name('Marketplace Tool')
      .description('A tool for marketplace')
      .category('test')
      .author({ name: 'Publisher' })
      .handler('execute')
      .build();

    const published = publishTool(tool, 'publisher-1');
    expect(published.isPublic).toBe(true);
    expect(published.downloads).toBe(0);
    expect(published.verified).toBe(false);
  });

  it('should search marketplace', () => {
    const tool = new ToolBuilder('search-test-tool')
      .name('Searchable Tool')
      .description('A tool you can search for')
      .category('utilities')
      .author({ name: 'Author' })
      .handler('execute')
      .tag('search', 'test')
      .build();

    publishTool(tool, 'publisher');
    
    const { tools } = searchMarketplace({ query: 'searchable' });
    expect(tools.some(t => t.name === 'Searchable Tool')).toBe(true);
  });

  it('should filter by category', () => {
    const { tools } = searchMarketplace({ category: 'utilities' });
    expect(tools.every(t => t.category === 'utilities')).toBe(true);
  });

  it('should install tool', () => {
    const tool = new ToolBuilder('install-test')
      .name('Install Test')
      .description('Test')
      .category('test')
      .author({ name: 'Author' })
      .handler('execute')
      .build();

    const published = publishTool(tool, 'publisher');
    installTool(published.id, 'user-1');
    
    const { tools } = searchMarketplace({ query: 'Install Test' });
    const installedTool = tools.find(t => t.id === published.id);
    expect(installedTool?.downloads).toBe(1);
  });

  it('should add review', () => {
    const tool = new ToolBuilder('review-test')
      .name('Review Test')
      .description('Test')
      .category('test')
      .author({ name: 'Author' })
      .handler('execute')
      .build();

    const published = publishTool(tool, 'publisher');
    addReview(published.id, 'user-1', 5, 'Great tool!');
    addReview(published.id, 'user-2', 4, 'Good tool');
    
    const { tools } = searchMarketplace({ query: 'Review Test' });
    const reviewedTool = tools.find(t => t.id === published.id);
    expect(reviewedTool?.rating).toBe(4.5);
    expect(reviewedTool?.reviews.length).toBe(2);
  });
});

describe('Tool Scaffolding', () => {
  it('should generate scaffold', () => {
    const scaffold = generateScaffold(
      'My Custom Tool',
      'A custom tool for testing',
      'utilities',
      [
        { name: 'input1', type: 'string', description: 'First input', required: true },
        { name: 'input2', type: 'number', description: 'Second input', required: false },
      ],
      [
        { name: 'result', type: 'object', description: 'The result', required: true },
      ]
    );

    expect(scaffold.definition).toContain('my_custom_tool');
    expect(scaffold.definition).toContain('My Custom Tool');
    expect(scaffold.implementation).toContain('export async function execute');
    expect(scaffold.tests).toContain('describe');
    expect(scaffold.readme).toContain('# My Custom Tool');
  });

  it('should include input/output in readme', () => {
    const scaffold = generateScaffold(
      'Doc Test Tool',
      'Test',
      'test',
      [{ name: 'query', type: 'string', description: 'Search query', required: true }],
      [{ name: 'results', type: 'array', description: 'Search results', required: true }]
    );

    expect(scaffold.readme).toContain('| query |');
    expect(scaffold.readme).toContain('| results |');
  });

  it('should generate valid TypeScript', () => {
    const scaffold = generateScaffold(
      'TS Test',
      'Test',
      'test',
      [{ name: 'value', type: 'number', description: 'Value', required: true }],
      [{ name: 'doubled', type: 'number', description: 'Doubled', required: true }]
    );

    // Check for valid interface syntax
    expect(scaffold.implementation).toContain('interface');
    expect(scaffold.implementation).toContain('value: number');
  });
});
