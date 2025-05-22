import { jest } from '@jest/globals';

const mockRedisInstance = {
  on: jest.fn(),
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  quit: jest.fn(() => Promise.resolve()),
};

export const redisMockInstance = mockRedisInstance;

export const mockQueue = {
  add: jest.fn(() => Promise.resolve({})),
  getJob: jest.fn(() => Promise.resolve(null)),
  close: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
};

export const mockWorker = {
  on: jest.fn(),
  close: jest.fn(() => Promise.resolve()),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockImplementation(() => Promise.resolve()),
    disconnect: jest.fn().mockImplementation(() => Promise.resolve()),
    quit: jest.fn().mockImplementation(() => Promise.resolve()),
    duplicate: jest.fn().mockImplementation(function() { return this; }),
  }));
});

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockImplementation(() => Promise.resolve({})),
      getJob: jest.fn().mockImplementation(() => Promise.resolve(null)),
      close: jest.fn().mockImplementation(() => Promise.resolve()),
      on: jest.fn(),
      name: 'mock-queue'
    })),
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn().mockImplementation(() => Promise.resolve()),
      name: 'mock-worker'
    })),
  };
});