import { closeQueues } from './close-queues';

afterAll(async () => {
  await closeQueues();
  await new Promise((resolve) => setTimeout(resolve, 500));
}, 60000);