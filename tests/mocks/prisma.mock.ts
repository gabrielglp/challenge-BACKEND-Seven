import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

export const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

prismaMock.$transaction.mockImplementation(<T>(arg: T): any => {
  if (Array.isArray(arg)) {
    return Promise.resolve(arg.map(() => ({ count: 0 })));
  } else if (typeof arg === 'function') {
    return Promise.resolve(arg(prismaMock));
  }
  
  return Promise.reject(new Error('Tipo de argumento não suportado para $transaction'));
});

prismaMock.$disconnect.mockResolvedValue(undefined);

jest.mock('../../src/services/prismaClient', () => ({
  prisma: prismaMock,
}));

export default prismaMock;