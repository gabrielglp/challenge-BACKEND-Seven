import { AvailabilityValidation } from '../types/availability';
import { prisma } from './prismaClient';

export default {
  validateAvailability(availability: any): AvailabilityValidation {
    if (typeof availability !== 'object' || availability === null) {
      return { valid: false, message: 'Formato de disponibilidade inválido' };
    }

    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    for (const day in availability) {
      if (!validDays.includes(day)) {
        return { valid: false, message: `Dia inválido: ${day}` };
      }

      if (!Array.isArray(availability[day])) {
        return { valid: false, message: `Horários para ${day} devem ser um array` };
      }

      for (const time of availability[day]) {
        if (!timeRegex.test(time)) {
          return { valid: false, message: `Formato de hora inválido: ${time}` };
        }
      }
    }

    return { valid: true };
  },

  async getAvailableSlots(specialistId: string, date: string): Promise<string[]> {
    try {
      const specialist = await prisma.specialist.findUnique({
        where: { id: specialistId },
      });

      if (!specialist) {
        throw new Error('Especialista não encontrado');
      }

      const requestedDate = new Date(date);
      
      const dayOfWeek = requestedDate.getDay();
      
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = days[dayOfWeek];
      
      console.log('Day of week:', dayOfWeek, 'Day name:', dayName);
      console.log('Availability:', JSON.stringify(specialist.availability));
      
      const availability = specialist.availability as any;
      const availableTimesForDay = availability[dayName] || [];
      
      console.log('Available times for day:', availableTimesForDay);
      
      if (availableTimesForDay.length === 0) {
        return [];
      }
      
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          specialist_id: specialistId,
          date: {
            equals: requestedDate,
          },
          status: {
            notIn: ['cancelled', 'rescheduled'],
          },
        },
        select: {
          time: true,
        },
      });
      
      console.log('Existing appointments:', existingAppointments);
      
      const bookedTimes = existingAppointments.map((app: { time: string }) => app.time);
      
      const availableSlots = availableTimesForDay.filter(time => !bookedTimes.includes(time));
      
      console.log('Available slots after filtering:', availableSlots);
      
      if (existingAppointments.length >= specialist.daily_limit) {
        console.log('Daily limit reached:', existingAppointments.length, '>=', specialist.daily_limit);
        return [];
      }
      
      return availableSlots;
    } catch (error) {
      console.error('Erro ao buscar horários disponíveis:', error);
      throw error;
    }
  },

  async isTimeSlotAvailable(specialistId: string, date: string, time: string): Promise<boolean> {
    try {
      const availableSlots = await this.getAvailableSlots(specialistId, date);
      
      return availableSlots.includes(time);
    } catch (error) {
      console.error('Erro ao verificar disponibilidade de horário:', error);
      throw error;
    }
  },
};