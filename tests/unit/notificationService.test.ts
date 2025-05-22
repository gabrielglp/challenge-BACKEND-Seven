import notificationService from '../../src/services/notificationService';
import { prisma } from '../../src/services/prismaClient';
import { AppointmentStatus } from '../../src/types/appointment';
import { notificationQueue, expirationQueue, scheduleAppointmentReminders } from '../../src/queues';

jest.mock('../../src/services/prismaClient', () => ({
  prisma: {
    appointment: {
      findUnique: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
    },
    specialist: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../src/queues', () => ({
  notificationQueue: {
    add: jest.fn().mockResolvedValue(undefined),
    getJob: jest.fn().mockResolvedValue(null),
  },
  expirationQueue: {
    add: jest.fn().mockResolvedValue(undefined),
    getJob: jest.fn().mockResolvedValue(null),
  },
  scheduleAppointmentReminders: jest.fn().mockResolvedValue(undefined),
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendAppointmentReminder', () => {
    it('deve enviar um lembrete para um agendamento válido', async () => {
      const mockAppointment = {
        id: 'appointment-id',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        scheduled_by_id: 'scheduler-id',
        date: new Date('2025-05-20'),
        time: '14:00',
        status: AppointmentStatus.CONFIRMED,
        rescheduled_from_id: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockFullAppointment = {
        ...mockAppointment,
        client: {
          user: {
            name: 'Cliente Teste',
            email: 'cliente@teste.com'
          }
        },
        specialist: {
          user: {
            name: 'Especialista Teste',
            email: 'especialista@teste.com'
          }
        }
      };

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockFullAppointment);

      const result = await notificationService.sendAppointmentReminder(mockAppointment);
      expect(result).toBe(true);
    });

    it('deve retornar false quando o agendamento não for encontrado', async () => {
      const mockAppointment = {
        id: 'nonexistent-id',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        scheduled_by_id: 'scheduler-id',
        date: new Date('2025-05-20'),
        time: '14:00',
        status: AppointmentStatus.CONFIRMED,
        rescheduled_from_id: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await notificationService.sendAppointmentReminder(mockAppointment);
      expect(result).toBe(false);
    });
  });

  describe('scheduleReminder', () => {
    it('deve agendar um lembrete para um agendamento', async () => {
      const mockDate = new Date('2025-05-22T00:38:37.051Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);

      const mockAppointment = {
        id: 'appointment-id',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        scheduled_by_id: 'scheduler-id',
        date: new Date('2025-05-20'),
        time: '14:00',
        status: AppointmentStatus.CONFIRMED,
        rescheduled_from_id: null,
        created_at: mockDate,
        updated_at: mockDate
      };

      await notificationService.scheduleReminder(mockAppointment);

      expect(scheduleAppointmentReminders).toHaveBeenCalledWith(expect.objectContaining({
        id: mockAppointment.id,
        client_id: mockAppointment.client_id,
        specialist_id: mockAppointment.specialist_id,
        scheduled_by_id: mockAppointment.scheduled_by_id,
        time: mockAppointment.time,
        status: mockAppointment.status
      }));

      jest.useRealTimers();
    });
  });

  describe('cancelReminders', () => {
    it('deve cancelar os lembretes existentes', async () => {
      const appointmentId = 'appointment-id';
      const mockReminderJob = { remove: jest.fn() };
      const mockExpirationJob = { remove: jest.fn() };

      (notificationQueue.getJob as jest.Mock).mockResolvedValueOnce(mockReminderJob);
      (expirationQueue.getJob as jest.Mock).mockResolvedValueOnce(mockExpirationJob);

      await notificationService.cancelReminders(appointmentId);

      expect(notificationQueue.getJob).toHaveBeenCalledWith(`reminder-${appointmentId}`);
      expect(expirationQueue.getJob).toHaveBeenCalledWith(`expiration-${appointmentId}`);
      expect(mockReminderJob.remove).toHaveBeenCalled();
      expect(mockExpirationJob.remove).toHaveBeenCalled();
    });

    it('deve lidar com a ausência de jobs para cancelar', async () => {
      const appointmentId = 'appointment-id';

      (notificationQueue.getJob as jest.Mock).mockResolvedValueOnce(null);
      (expirationQueue.getJob as jest.Mock).mockResolvedValueOnce(null);

      await expect(notificationService.cancelReminders(appointmentId)).resolves.not.toThrow();
    });
  });
});