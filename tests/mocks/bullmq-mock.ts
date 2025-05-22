const createMockQueue = (name: string) => ({
  add: jest.fn().mockResolvedValue({}),
  getJob: jest.fn().mockResolvedValue(null),
  close: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  removeJobs: jest.fn().mockResolvedValue(undefined),
  obliterate: jest.fn().mockResolvedValue(undefined),
  getJobCounts: jest.fn().mockResolvedValue({}),
  name,
  opts: {
    prefix: 'bull',
    connection: {
      host: 'localhost',
      port: 6379
    }
  },
  client: {
    options: {
      host: 'localhost',
      port: 6379
    }
  },
  isRunning: true,
  toKey: jest.fn().mockReturnValue(`bull:${name}`),
  disconnect: jest.fn().mockResolvedValue(undefined)
});

const notificationQueue = createMockQueue('notifications');
const expirationQueue = createMockQueue('expirations');
const webhookQueue = createMockQueue('webhooks');

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation((name) => createMockQueue(name)),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../../src/queues', () => ({
  notificationQueue,
  expirationQueue,
  webhookQueue,
  initializeQueues: jest.fn().mockResolvedValue(undefined)
}));

export { notificationQueue, expirationQueue, webhookQueue };