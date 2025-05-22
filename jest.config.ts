import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  globalTeardown: './tests/helpers/global-teardown.ts',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts', 
    '!src/prisma/**', 
    '!src/server.ts', 
    '!src/types/**'
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  resetModules: true,
  
  setupFiles: [
    './tests/mocks/fetch.mock.ts',
    './tests/mocks/redis-mock.ts',
    './tests/mocks/prisma.mock.ts',
    './tests/mocks/webhook-service.mock.ts'
  ],
  
  setupFilesAfterEnv: [
    './tests/setup/setupTests.ts',
    './tests/helpers/teardown.ts'
  ],
  
  testTimeout: 30000,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  maxWorkers: 1,
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  cache: false,
  
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};

export default config;