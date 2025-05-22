const mockAdapter = {
  setBasePath: jest.fn(),
  getRouter: jest.fn()
};

jest.mock('@bull-board/api', () => ({
  createBullBoard: jest.fn().mockImplementation(({ queues, serverAdapter }) => ({
    setBasePath: serverAdapter.setBasePath,
    router: serverAdapter.getRouter
  })),
  BullMQAdapter: jest.fn().mockImplementation((queue) => ({
    queue,
    init: jest.fn(),
    close: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    clean: jest.fn(),
    isPaused: jest.fn().mockResolvedValue(false),
    getName: jest.fn().mockReturnValue(queue.name),
    getJobCounts: jest.fn().mockResolvedValue({}),
    getJobs: jest.fn().mockResolvedValue([]),
    toKey: jest.fn().mockReturnValue(`bull:${queue.name}`)
  }))
}));

jest.mock('@bull-board/express', () => ({
  ExpressAdapter: jest.fn().mockImplementation(() => mockAdapter)
}));

export { mockAdapter };