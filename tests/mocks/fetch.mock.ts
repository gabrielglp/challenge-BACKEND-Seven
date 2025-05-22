const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: jest.fn().mockResolvedValue({ success: true }),
  text: jest.fn().mockResolvedValue('OK')
});

jest.mock('node-fetch', () => mockFetch);

Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true
});

export { mockFetch };