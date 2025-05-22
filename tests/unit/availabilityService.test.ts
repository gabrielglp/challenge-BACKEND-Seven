import availabilityService from '../../src/services/availabilityService';
import { prismaMock } from '../mocks/prisma.mock';
import { AppointmentStatus } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

describe('AvailabilityService', () => {
  describe('validateAvailability', () => {
    it('deve validar formato de disponibilidade correto', () => {
      const availability = {
        monday: ['08:00', '09:00', '10:00'],
        tuesday: ['13:00', '14:00', '15:00']
      };

      const result = availabilityService.validateAvailability(availability);
      expect(result.valid).toBe(true);
    });

    it('deve rejeitar horários inválidos', () => {
      const availability = {
        monday: ['8:0', '25:00', 'invalid']
      };

      const result = availabilityService.validateAvailability(availability);
      expect(result.valid).toBe(false);
    });
  });

  describe('isTimeSlotAvailable', () => {
    it('deve confirmar disponibilidade de horário livre', async () => {
      const specialist = {
        id: 'specialist-id',
        created_at: new Date(),
        updated_at: new Date(),
        user_id: 'user-id',
        specialty: 'Specialty',
        daily_limit: 10,
        min_interval_minutes: 30,
        availability: {
          monday: ['09:00', '10:00', '11:00'],
          sunday: ['09:00', '10:00', '11:00']
        } as JsonValue
      };

      const date = '2025-05-19';
      const time = '09:00';

      prismaMock.specialist.findUnique.mockResolvedValue(specialist);
      prismaMock.appointment.findMany.mockResolvedValue([]);

      const result = await availabilityService.isTimeSlotAvailable('specialist-id', date, time);
      expect(result).toBe(true);
    });

    it('deve rejeitar horário já ocupado', async () => {
      const specialist = {
        id: 'specialist-id',
        created_at: new Date(),
        updated_at: new Date(),
        user_id: 'user-id',
        specialty: 'Specialty',
        daily_limit: 10,
        min_interval_minutes: 30,
        availability: {
          monday: ['09:00', '10:00', '11:00'],
          sunday: ['09:00', '10:00', '11:00']
        } as JsonValue
      };

      const date = '2025-05-19';
      const time = '09:00';

      prismaMock.specialist.findUnique.mockResolvedValue(specialist);
      prismaMock.appointment.findMany.mockResolvedValue([{
        id: 'appointment-id',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        scheduled_by_id: 'user-id',
        date: new Date('2025-05-19'),
        time: '09:00',
        status: AppointmentStatus.confirmed,
        rescheduled_from_id: null,
        created_at: new Date(),
        updated_at: new Date()
      }]);

      const result = await availabilityService.isTimeSlotAvailable('specialist-id', date, time);
      expect(result).toBe(false);
    });

    it('deve rejeitar horário fora da disponibilidade', async () => {
      const specialist = {
        id: 'specialist-id',
        created_at: new Date(),
        updated_at: new Date(),
        user_id: 'user-id',
        specialty: 'Specialty',
        daily_limit: 10,
        min_interval_minutes: 30,
        availability: {
          monday: ['14:00', '15:00']
        } as JsonValue
      };

      const date = '2025-05-19';
      const time = '09:00';

      prismaMock.specialist.findUnique.mockResolvedValue(specialist);
      prismaMock.appointment.findMany.mockResolvedValue([]);

      const result = await availabilityService.isTimeSlotAvailable('specialist-id', date, time);
      expect(result).toBe(false);
    });

    it('deve rejeitar quando especialista não existe', async () => {
      const date = '2025-05-19';
      const time = '09:00';

      prismaMock.specialist.findUnique.mockResolvedValue(null);

      await expect(
        availabilityService.isTimeSlotAvailable('nonexistent-id', date, time)
      ).rejects.toThrow('Especialista não encontrado');
    });

    it('deve rejeitar quando especialista atingiu limite diário', async () => {
      const specialist = {
        id: 'specialist-id',
        created_at: new Date(),
        updated_at: new Date(),
        user_id: 'user-id',
        specialty: 'Specialty',
        daily_limit: 2,
        min_interval_minutes: 30,
        availability: {
          monday: ['09:00', '10:00', '11:00'],
          sunday: ['09:00', '10:00', '11:00']
        } as JsonValue
      };

      const date = '2025-05-19';
      const time = '09:00';

      prismaMock.specialist.findUnique.mockResolvedValue(specialist);
      prismaMock.appointment.findMany.mockResolvedValue([
        {
          id: 'appointment-1',
          client_id: 'client-id',
          specialist_id: 'specialist-id',
          scheduled_by_id: 'user-id',
          date: new Date('2025-05-19'),
          time: '10:00',
          status: AppointmentStatus.confirmed,
          rescheduled_from_id: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'appointment-2',
          client_id: 'client-id',
          specialist_id: 'specialist-id',
          scheduled_by_id: 'user-id',
          date: new Date('2025-05-19'),
          time: '11:00',
          status: AppointmentStatus.confirmed,
          rescheduled_from_id: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const result = await availabilityService.isTimeSlotAvailable('specialist-id', date, time);
      expect(result).toBe(false);
    });
  });

  describe('getAvailableSlots', () => {
    it('deve retornar slots disponíveis', async () => {
      const specialist = {
        id: 'specialist-id',
        created_at: new Date(),
        updated_at: new Date(),
        user_id: 'user-id',
        specialty: 'Specialty',
        daily_limit: 10,
        min_interval_minutes: 30,
        availability: {
          monday: ['09:00', '10:00', '11:00'],
          sunday: ['09:00', '10:00', '11:00']
        } as JsonValue
      };

      prismaMock.specialist.findUnique.mockResolvedValue(specialist);
      prismaMock.appointment.findMany.mockResolvedValue([
        {
          id: 'appointment-1',
          client_id: 'client-id',
          specialist_id: 'specialist-id',
          scheduled_by_id: 'user-id',
          date: new Date('2025-05-19'),
          time: '10:00',
          status: AppointmentStatus.confirmed,
          rescheduled_from_id: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const slots = await availabilityService.getAvailableSlots('specialist-id', '2025-05-19');
      expect(slots).toEqual(['09:00', '11:00']);
    });

    it('deve lançar erro quando especialista não existe', async () => {
      prismaMock.specialist.findUnique.mockResolvedValue(null);

      await expect(
        availabilityService.getAvailableSlots('nonexistent-id', '2025-05-19')
      ).rejects.toThrow('Especialista não encontrado');
    });
  });
});