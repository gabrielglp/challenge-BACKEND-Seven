import { Appointment, AppointmentStatus } from '../types/appointment';
import { prisma } from './prismaClient';
import { notificationQueue, expirationQueue, scheduleAppointmentReminders } from '../queues';

export default {
  async sendAppointmentReminder(appointment: Appointment): Promise<boolean> {
    try {
      const fullAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id },
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

      if (!fullAppointment) {
        console.error(`Agendamento não encontrado: ${appointment.id}`);
        return false;
      }

      console.log('======= NOTIFICAÇÃO DE AGENDAMENTO (TESTE) =======');
      console.log(`Data: ${appointment.date.toISOString().split('T')[0]} às ${appointment.time}`);
      console.log(`Cliente: ${fullAppointment.client.user.name} (${fullAppointment.client.user.email})`);
      console.log(`Especialista: ${fullAppointment.specialist.user.name} (${fullAppointment.specialist.user.email})`);
      console.log(`Status: ${appointment.status}`);
      console.log(`Lembrete: Você tem um compromisso amanhã!`);
      console.log('==================================================');
      
      return true;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  },

  async scheduleReminder(appointment: any): Promise<void> {
    const typedAppointment: Appointment = {
      id: appointment.id,
      client_id: appointment.client_id,
      specialist_id: appointment.specialist_id,
      scheduled_by_id: appointment.scheduled_by_id,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status as unknown as AppointmentStatus,
      rescheduled_from_id: appointment.rescheduled_from_id,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
      client: appointment.client,
      specialist: appointment.specialist,
      scheduledBy: appointment.scheduledBy
    };
    
    await scheduleAppointmentReminders(typedAppointment);
  },

  async cancelReminders(appointmentId: string): Promise<void> {
    try {
      const reminderJob = await notificationQueue.getJob(`reminder-${appointmentId}`);
      if (reminderJob) {
        await reminderJob.remove();
      }
      
      const expirationJob = await expirationQueue.getJob(`expiration-${appointmentId}`);
      if (expirationJob) {
        await expirationJob.remove();
      }
      
      console.log(`Lembretes e verificações cancelados para o agendamento ${appointmentId}`);
    } catch (error) {
      console.error('Erro ao cancelar lembretes:', error);
    }
  },

  async rescheduleReminders(appointment: Appointment): Promise<void> {
    try {
      await this.cancelReminders(appointment.id);
      
      await scheduleAppointmentReminders(appointment);
    } catch (error) {
      console.error('Erro ao reprogramar lembretes:', error);
    }
  },
  
  async sendConfirmationNotification(appointmentId: string): Promise<void> {
    await notificationQueue.add(
      'appointment-confirmation',
      {
        appointmentId,
        notificationType: 'confirmation',
      },
      {
        jobId: `confirmation-${appointmentId}-${Date.now()}`,
      }
    );
  },
  
  async sendCancellationNotification(appointmentId: string): Promise<void> {
    await notificationQueue.add(
      'appointment-cancellation',
      {
        appointmentId,
        notificationType: 'cancellation',
      },
      {
        jobId: `cancellation-${appointmentId}-${Date.now()}`,
      }
    );
  }
};