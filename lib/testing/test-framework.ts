/**
 * Comprehensive Testing Framework
 * Provides utilities for unit, integration, and E2E testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../supabase';
import { logger } from '../monitoring';

export interface TestConfig {
  timeout: number;
  retries: number;
  parallel: boolean;
  verbose: boolean;
  coverage: boolean;
  environment: 'test' | 'staging' | 'production';
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: string;
  coverage?: number;
  assertions: AssertionResult[];
}

export interface AssertionResult {
  description: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

export interface TestCase {
  name: string;
  test: () => Promise<void>;
  timeout?: number;
  skip?: boolean;
  only?: boolean;
}

export interface CoverageReport {
  statements: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  lines: { total: number; covered: number; percentage: number };
  files: { [file: string]: any };
}

export class TestFramework {
  private static readonly DEFAULT_CONFIG: TestConfig = {
    timeout: 5000,
    retries: 0,
    parallel: false,
    verbose: false,
    coverage: false,
    environment: 'test',
  };

  private static testResults: TestResult[] = [];
  private static currentTest: TestCase | null = null;
  private static assertions: AssertionResult[] = [];

  /**
   * Run a test suite
   */
  static async runTestSuite(suite: TestSuite, config: Partial<TestConfig> = {}): Promise<TestResult[]> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    this.testResults = [];
    
    logger.info('Starting test suite', { 
      suite: suite.name, 
      timeout: fullConfig.timeout,
      retries: fullConfig.retries,
      parallel: fullConfig.parallel,
      verbose: fullConfig.verbose,
      coverage: fullConfig.coverage,
      environment: fullConfig.environment
    });

    try {
      // Setup
      if (suite.beforeAll) {
        await this.runWithTimeout(suite.beforeAll(), fullConfig.timeout, 'beforeAll');
      }

      // Run tests
      if (fullConfig.parallel) {
        await this.runTestsInParallel(suite.tests, suite, fullConfig);
      } else {
        await this.runTestsSequentially(suite.tests, suite, fullConfig);
      }

      // Cleanup
      if (suite.afterAll) {
        await this.runWithTimeout(suite.afterAll(), fullConfig.timeout, 'afterAll');
      }

      logger.info('Test suite completed', { 
        suite: suite.name, 
        passed: this.testResults.filter(r => r.status === 'passed').length,
        failed: this.testResults.filter(r => r.status === 'failed').length,
        total: this.testResults.length
      });

      return this.testResults;
    } catch (error) {
      logger.error('Test suite error', { suite: suite.name, error });
      throw error;
    }
  }

  /**
   * Run tests in parallel
   */
  private static async runTestsInParallel(tests: TestCase[], suite: TestSuite, config: TestConfig): Promise<void> {
    const testPromises = tests.map(test => this.runSingleTest(test, suite, config));
    await Promise.all(testPromises);
  }

  /**
   * Run tests sequentially
   */
  private static async runTestsSequentially(tests: TestCase[], suite: TestSuite, config: TestConfig): Promise<void> {
    for (const test of tests) {
      await this.runSingleTest(test, suite, config);
    }
  }

  /**
   * Run a single test
   */
  private static async runSingleTest(test: TestCase, suite: TestSuite, config: TestConfig): Promise<void> {
    if (test.skip) {
      this.testResults.push({
        name: test.name,
        status: 'skipped',
        duration: 0,
        assertions: [],
      });
      return;
    }

    const startTime = Date.now();
    this.currentTest = test;
    this.assertions = [];

    try {
      // Setup
      if (suite.beforeEach) {
        await this.runWithTimeout(suite.beforeEach(), config.timeout, 'beforeEach');
      }

      // Run test
      const testTimeout = test.timeout || config.timeout;
      await this.runWithTimeout(test.test(), testTimeout, test.name);

      // Success
      this.testResults.push({
        name: test.name,
        status: 'passed',
        duration: Date.now() - startTime,
        assertions: [...this.assertions],
      });

      logger.debug('Test passed', { test: test.name, duration: Date.now() - startTime });
    } catch (error) {
      // Failure
      this.testResults.push({
        name: test.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        assertions: [...this.assertions],
      });

      logger.error('Test failed', { test: test.name, error, duration: Date.now() - startTime });
    } finally {
      // Cleanup
      if (suite.afterEach) {
        try {
          await this.runWithTimeout(suite.afterEach(), config.timeout, 'afterEach');
        } catch (error) {
          logger.warn('afterEach failed', { test: test.name, error });
        }
      }

      this.currentTest = null;
      this.assertions = [];
    }
  }

  /**
   * Run function with timeout
   */
  private static async runWithTimeout<T>(
    fn: Promise<T>,
    timeout: number,
    context: string
  ): Promise<T> {
    return Promise.race([
      fn,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timeout after ${timeout}ms in ${context}`));
        }, timeout);
      }),
    ]);
  }

  /**
   * Assertion utilities
   */
  static expect(actual: any) {
    return {
      toBe: (expected: any) => this.addAssertion('toBe', actual, expected, actual === expected),
      toEqual: (expected: any) => this.addAssertion('toEqual', actual, expected, JSON.stringify(actual) === JSON.stringify(expected)),
      toBeTruthy: () => this.addAssertion('toBeTruthy', actual, true, !!actual),
      toBeFalsy: () => this.addAssertion('toBeFalsy', actual, false, !actual),
      toBeNull: () => this.addAssertion('toBeNull', actual, null, actual === null),
      toBeUndefined: () => this.addAssertion('toBeUndefined', actual, undefined, actual === undefined),
      toContain: (expected: any) => this.addAssertion('toContain', actual, expected, 
        Array.isArray(actual) ? actual.includes(expected) : 
        typeof actual === 'string' ? actual.includes(expected) : false),
      toMatch: (regex: RegExp) => this.addAssertion('toMatch', actual, regex, regex.test(actual)),
      toThrow: (expectedError?: string) => {
        try {
          if (typeof actual === 'function') {
            actual();
            this.addAssertion('toThrow', actual, expectedError, false, 'Expected function to throw');
          } else {
            this.addAssertion('toThrow', actual, expectedError, false, 'Expected function but got ' + typeof actual);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const passed = !expectedError || errorMessage.includes(expectedError);
          this.addAssertion('toThrow', actual, expectedError, passed, passed ? undefined : `Expected error to contain "${expectedError}" but got "${errorMessage}"`);
        }
      },
      toBeGreaterThan: (expected: number) => this.addAssertion('toBeGreaterThan', actual, expected, actual > expected),
      toBeLessThan: (expected: number) => this.addAssertion('toBeLessThan', actual, expected, actual < expected),
      toBeCloseTo: (expected: number, precision: number = 2) => {
        const diff = Math.abs(actual - expected);
        const passed = diff < Math.pow(10, -precision) / 2;
        this.addAssertion('toBeCloseTo', actual, expected, passed);
      },
    };
  }

  /**
   * Add assertion result
   */
  private static addAssertion(
    type: string,
    actual: any,
    expected: any,
    passed: boolean,
    error?: string
  ): void {
    const assertion: AssertionResult = {
      description: `expect(${this.stringify(actual)}).${type}(${this.stringify(expected)})`,
      passed,
      expected,
      actual,
      error,
    };

    this.assertions.push(assertion);

    if (!passed) {
      const errorMessage = error || `Expected ${this.stringify(actual)} to ${type} ${this.stringify(expected)}`;
      throw new Error(errorMessage);
    }
  }

  /**
   * Stringify value for display
   */
  private static stringify(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'function') return '[Function]';
    if (Array.isArray(value)) return `[${value.map(v => this.stringify(v)).join(', ')}]`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Mock utilities
   */
  static createMock<T extends Record<string, any>>(overrides: Partial<T> = {}): T {
    return new Proxy({} as T, {
      get(target, prop) {
        if (prop in overrides) {
          return overrides[prop as keyof T];
        }
        if (typeof prop === 'string') {
          return jest.fn();
        }
        return undefined;
      },
    });
  }

  /**
   * Mock API request
   */
  static createMockRequest(overrides: Partial<NextRequest> = {}): NextRequest {
    return {
      method: 'GET',
      url: 'http://localhost:3000/api/test',
      headers: new Headers(),
      json: async () => ({}),
      text: async () => '',
      formData: async () => new FormData(),
      ...overrides,
    } as NextRequest;
  }

  /**
   * Mock API response
   */
  static createMockResponse(overrides: Partial<NextResponse> = {}): NextResponse {
    return {
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: async () => ({}),
      text: async () => '',
      ...overrides,
    } as NextResponse;
  }

  /**
   * Database test utilities
   */
  static async createTestData(table: string, data: any): Promise<any> {
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test data: ${error.message}`);
    }

    return result;
  }

  static async cleanupTestData(table: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      logger.warn('Failed to cleanup test data', { 
        table, 
        id, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  static async clearTestData(table: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .like('id', 'test_%');

    if (error) {
      logger.warn('Failed to clear test data', { 
        table, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * API test utilities
   */
  static async testApiEndpoint(
    method: string,
    url: string,
    options: {
      body?: any;
      headers?: Record<string, string>;
      expectedStatus?: number;
      expectedResponse?: any;
    } = {}
  ): Promise<{ status: number; data: any; headers: Headers }> {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json().catch(() => null);

    if (options.expectedStatus && response.status !== options.expectedStatus) {
      throw new Error(`Expected status ${options.expectedStatus}, got ${response.status}`);
    }

    if (options.expectedResponse) {
      this.expect(data).toEqual(options.expectedResponse);
    }

    return {
      status: response.status,
      data,
      headers: response.headers,
    };
  }

  /**
   * Performance testing
   */
  static async measurePerformance<T>(
    fn: () => Promise<T>,
    iterations: number = 1
  ): Promise<{ result: T; averageTime: number; minTime: number; maxTime: number }> {
    const times: number[] = [];
    let result: T;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      result = await fn();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      result: result!,
      averageTime,
      minTime,
      maxTime,
    };
  }

  /**
   * Generate test report
   */
  static generateReport(): {
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      duration: number;
    };
    coverage?: CoverageReport;
    details: TestResult[];
  } {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const skipped = this.testResults.filter(r => r.status === 'skipped').length;
    const duration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    return {
      summary: {
        total,
        passed,
        failed,
        skipped,
        duration,
      },
      details: this.testResults,
    };
  }

  /**
   * Reset test framework
   */
  static reset(): void {
    this.testResults = [];
    this.currentTest = null;
    this.assertions = [];
  }
}

// Jest compatibility
export const describe = (name: string, fn: () => void) => {
  // Jest describe compatibility
  fn();
};

export const it = (name: string, fn: () => Promise<void> | void) => {
  // Jest it compatibility
  return { name, test: fn };
};

export const beforeAll = (fn: () => Promise<void> | void) => fn;
export const afterAll = (fn: () => Promise<void> | void) => fn;
export const beforeEach = (fn: () => Promise<void> | void) => fn;
export const afterEach = (fn: () => Promise<void> | void) => fn;
export const expect = TestFramework.expect;







