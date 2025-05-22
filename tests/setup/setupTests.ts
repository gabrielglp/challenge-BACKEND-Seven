import { jest } from '@jest/globals';

beforeEach(() => {
  jest.clearAllMocks();
});

jest.setTimeout(30000);

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      !args[0]?.toString().includes('Warning:') &&
      !args[0]?.toString().includes('MockFunction')
    ) {
      originalConsoleError(...args);
    }
  };
  
  console.warn = (...args: any[]) => {
    if (!args[0]?.toString().includes('Warning:')) {
      originalConsoleWarn(...args);
    }
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

export {};