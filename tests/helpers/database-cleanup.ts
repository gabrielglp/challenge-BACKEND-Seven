import { prismaMock } from '../mocks/prisma.mock';

export async function cleanupDatabase(): Promise<void> {
  try {
    console.log('Iniciando limpeza do banco de dados...');
    
    prismaMock.appointment.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.auditLog.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.webhook.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.client.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.specialist.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.user.deleteMany.mockResolvedValue({ count: 0 });
    
    await prismaMock.$transaction([
      prismaMock.appointment.deleteMany({}),
      
      prismaMock.auditLog.deleteMany({}),
      prismaMock.webhook.deleteMany({}),
      prismaMock.client.deleteMany({}),
      prismaMock.specialist.deleteMany({}),
    
      prismaMock.user.deleteMany({})
    ]);
    
    console.log('Limpeza do banco de dados concluída com sucesso');
  } catch (error) {
    console.error('Erro durante a limpeza do banco de dados:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prismaMock.$disconnect();
    console.log('Desconexão do banco de dados realizada');
  } catch (error) {
    console.error('Erro ao desconectar do banco de dados:', error);
    throw error;
  }
}

export async function fullCleanup(): Promise<void> {
  await cleanupDatabase();
  await disconnectDatabase();
}