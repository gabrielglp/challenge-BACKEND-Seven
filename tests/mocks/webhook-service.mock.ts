const mockWebhookService = {
  dispatchEvent: jest.fn().mockResolvedValue({ success: true }),
  notifyAppointmentCreated: jest.fn().mockResolvedValue(undefined),
  notifyAppointmentCancelled: jest.fn().mockResolvedValue(undefined),
  notifyAppointmentCompleted: jest.fn().mockResolvedValue(undefined),
  notifyAppointmentUpdated: jest.fn().mockResolvedValue(undefined),
  notifyAppointmentRescheduled: jest.fn().mockResolvedValue(undefined)
};

jest.mock('../../src/services/webhookService', () => ({
  __esModule: true,
  default: mockWebhookService,
  webhookQueue: {
    add: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn()
  },
  webhookWorker: {
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined)
  },
  initializeWebhookWorker: jest.fn()
}));

export { mockWebhookService };