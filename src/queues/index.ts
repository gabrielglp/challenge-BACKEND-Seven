import { Queue, Worker } from 'bullmq';
import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../services/prismaClient';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const expirationQueue = new Queue('expirations', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const webhookQueue = new Queue('webhooks', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { appointmentId, notificationType } = job.data;
    console.log(`Processando notificação: ${notificationType} para agendamento ${appointmentId}`);

    try {
      if (notificationType === 'daily-check') {
        return await processDailyCheck(job);
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: {
            include: {
              user: true,
            },
          },
          specialist: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!appointment) {
        return { success: false, error: 'Agendamento não encontrado' };
      }

      if (notificationType === 'reminder') {
        console.log('======= NOTIFICAÇÃO DE AGENDAMENTO =======');
        console.log(`Data: ${appointment.date.toISOString().split('T')[0]} às ${appointment.time}`);
        console.log(`Cliente: ${appointment.client.user.name} (${appointment.client.user.email})`);
        console.log(`Especialista: ${appointment.specialist.user.name} (${appointment.specialist.user.email})`);
        console.log(`Status: ${appointment.status}`);
        console.log(`Lembrete: Você tem um compromisso amanhã!`);
        console.log('============================================');
        return { success: true, message: 'Lembrete enviado' };
      }

      if (notificationType === 'confirmation') {
        console.log('======= NOTIFICAÇÃO DE CONFIRMAÇÃO =======');
        console.log(`Agendamento ${appointmentId} confirmado`);
        console.log(`Cliente: ${appointment.client.user.name}`);
        console.log(`Data: ${appointment.date.toISOString().split('T')[0]} às ${appointment.time}`);
        console.log('============================================');
        return { success: true, message: 'Confirmação enviada' };
      }

      if (notificationType === 'cancellation') {
        console.log('======= NOTIFICAÇÃO DE CANCELAMENTO =======');
        console.log(`Agendamento ${appointmentId} cancelado`);
        console.log(`Cliente: ${appointment.client.user.name}`);
        console.log(`Data: ${appointment.date.toISOString().split('T')[0]} às ${appointment.time}`);
        console.log('============================================');
        return { success: true, message: 'Cancelamento notificado' };
      }

      return { success: false, error: 'Tipo de notificação desconhecido' };
    } catch (error) {
      console.error('Erro ao processar notificação:', error);
      throw error;
    }
  },
  { connection }
);

export const expirationWorker = new Worker(
  'expirations',
  async (job) => {
    const { appointmentId } = job.data;
    console.log(`Verificando expiração do agendamento ${appointmentId}`);

    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        return { success: false, error: 'Agendamento não encontrado' };
      }

      if (appointment.status === AppointmentStatus.pending) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: AppointmentStatus.expired },
        });

        console.log(`Agendamento ${appointmentId} marcado como expirado`);
        return { success: true, message: 'Agendamento marcado como expirado' };
      }

      return { success: true, message: 'Nenhuma ação necessária' };
    } catch (error) {
      console.error('Erro ao processar expiração:', error);
      throw error;
    }
  },
  { connection }
);

export const webhookWorker = new Worker(
  'webhooks',
  async (job) => {
    const { webhookId, url, event, data } = job.data;
    console.log(`Processando webhook ${webhookId} para evento ${event}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WEBHOOK_API_KEY || ''}`,
        },
        body: JSON.stringify({
          event,
          data,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Falha no webhook: ${response.statusText}`);
      }

      console.log(`Webhook ${webhookId} enviado com sucesso`);
      return { success: true };
    } catch (error) {
      console.error(`Erro ao enviar webhook ${webhookId}:`, error);
      throw error;
    }
  },
  { connection }
);

export const scheduleAppointmentReminders = async (appointment: any): Promise<void> => {
  try {
    const appointmentDate = new Date(`${appointment.date.toISOString().split('T')[0]}T${appointment.time}:00`);
    const reminderDate = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);

    const now = new Date();
    const delayMs = Math.max(0, reminderDate.getTime() - now.getTime());

    await notificationQueue.add(
      'appointment-reminder',
      {
        appointmentId: appointment.id,
        notificationType: 'reminder',
      },
      {
        delay: delayMs,
        jobId: `reminder-${appointment.id}`,
      }
    );

    console.log(`Lembrete agendado para ${reminderDate.toISOString()} (em ${delayMs}ms)`);

    const expirationDelay = Math.max(0, appointmentDate.getTime() + 30 * 60 * 1000 - now.getTime());

    await expirationQueue.add(
      'appointment-expiration',
      {
        appointmentId: appointment.id,
      },
      {
        delay: expirationDelay,
        jobId: `expiration-${appointment.id}`,
      }
    );

    console.log(`Verificação de expiração agendada para ${new Date(now.getTime() + expirationDelay).toISOString()}`);
  } catch (error) {
    console.error('Erro ao agendar lembretes:', error);
    throw error;
  }
};

const processDailyCheck = async (job: any) => {
  console.log('Executando verificação diária de agendamentos...');

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateString = tomorrow.toISOString().split('T')[0];

    const pendingAppointments = await prisma.appointment.findMany({
      where: {
        date: {
          equals: new Date(tomorrowDateString),
        },
        status: AppointmentStatus.pending,
      },
    });

    console.log(`Encontrados ${pendingAppointments.length} agendamentos pendentes para amanhã`);

    let newRemindersCount = 0;

    for (const appointment of pendingAppointments) {
      const existingJob = await notificationQueue.getJob(`reminder-${appointment.id}`);

      if (!existingJob) {
        console.log(`Agendando lembrete para agendamento ${appointment.id}`);
        await scheduleAppointmentReminders(appointment);
        newRemindersCount++;
      }
    }

    return {
      success: true,
      message: `Verificados ${pendingAppointments.length} agendamentos para amanhã, ${newRemindersCount} novos lembretes agendados`,
    };
  } catch (error) {
    console.error('Erro ao processar verificação diária:', error);
    throw error;
  }
};

export const scheduleDailyTasks = async (): Promise<void> => {
  try {
    const existingJob = await notificationQueue.getJob('daily-reminders-check');
    if (existingJob) {
      await existingJob.remove();
    }

    await notificationQueue.add(
      'daily-check',
      {
        notificationType: 'daily-check',
      },
      {
        repeat: {
          pattern: '0 0 * * *',
        },
        jobId: 'daily-reminders-check',
      }
    );

    console.log(`Tarefa diária agendada para executar à meia-noite`);

    await notificationQueue.add(
      'daily-check-immediate',
      {
        notificationType: 'daily-check',
      },
      {
        jobId: 'daily-check-immediate-' + Date.now(),
      }
    );
  } catch (error) {
    console.error('Erro ao agendar tarefa diária:', error);
    throw error;
  }
};

export const initializeQueues = async (): Promise<void> => {
  try {
    notificationWorker.on('completed', (job) => {
      console.log(`Notificação processada com sucesso: ${job.id}`);
    });

    notificationWorker.on('failed', (job, error) => {
      console.error(`Falha ao processar notificação ${job?.id}:`, error);
    });

    expirationWorker.on('completed', (job) => {
      console.log(`Verificação de expiração concluída: ${job.id}`);
    });

    expirationWorker.on('failed', (job, error) => {
      console.error(`Falha na verificação de expiração ${job?.id}:`, error);
    });

    webhookWorker.on('completed', (job) => {
      console.log(`Webhook processado com sucesso: ${job.id}`);
    });

    webhookWorker.on('failed', (job, error) => {
      console.error(`Falha ao processar webhook ${job?.id}:`, error);
    });

    await scheduleDailyTasks();

    console.log('Sistema de filas inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar sistema de filas:', error);
    throw error;
  }
};