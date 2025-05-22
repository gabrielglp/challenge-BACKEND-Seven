import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import notificationService from '../services/notificationService';

const prisma = new PrismaClient();

export default (): void => {
  cron.schedule('0 10 * * *', async () => {
    console.log('Executando verificação de agendamentos para lembretes...');
    
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDateString = tomorrow.toISOString().split('T')[0];
      
      const pendingAppointments = await prisma.appointment.findMany({
        where: {
          date: {
            equals: new Date(tomorrowDateString),
          },
          status: 'pending',
        },
      });
      
      console.log(`Encontrados ${pendingAppointments.length} agendamentos pendentes para amanhã`);
      
      for (const appointment of pendingAppointments) {
        await notificationService.sendAppointmentReminder(appointment as any);
      }
      
      console.log('Processamento de lembretes concluído');
    } catch (error) {
      console.error('Erro ao processar lembretes de agendamento:', error);
    }
  });
  
  console.log('Agendador de tarefas iniciado');
};