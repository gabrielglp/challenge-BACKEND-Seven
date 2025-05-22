import { Queue, Worker, Processor } from 'bullmq';
import { getRedisConnection } from '../services/redisService';

export function createQueue(name: string): Queue {
  if (process.env.NODE_ENV === 'test') {
    return {
      add: async () => ({}),
      close: async () => {},
    } as unknown as Queue;
  }
  
  return new Queue(name, {
    connection: getRedisConnection(),
  });
}

export function createWorker<T = any, R = any, N extends string = string>(
  name: N, 
  processor: Processor<T, R, N>
): Worker<T, R, N> {
  if (process.env.NODE_ENV === 'test') {
    return {
      on: () => {},
      close: async () => {},
    } as unknown as Worker<T, R, N>;
  }
  
  return new Worker<T, R, N>(name, processor, {
    connection: getRedisConnection(),
  });
}