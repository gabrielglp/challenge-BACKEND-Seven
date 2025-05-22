import * as queues from '../../src/queues';
import { prisma } from '../../src/services/prismaClient';

export async function closeQueues() {
  console.log('Fechando filas e workers do BullMQ...');
  
  try {
    const workers = [
      queues.notificationWorker, 
      queues.expirationWorker, 
      queues.webhookWorker
    ].filter(Boolean);
    
    for (const worker of workers) {
      try {
        await worker.close();
        console.log(`Worker ${worker.name} fechado`);
      } catch (err) {
        console.error(`Erro ao fechar worker ${worker.name}:`, err);
      }
    }
    
    const queuesList = [
      queues.notificationQueue, 
      queues.expirationQueue, 
      queues.webhookQueue
    ].filter(Boolean);
    
    for (const queue of queuesList) {
      try {
        await queue.close();
        console.log(`Fila ${queue.name} fechada`);
      } catch (err) {
        console.error(`Erro ao fechar fila ${queue.name}:`, err);
      }
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
  }
}