import { z } from 'zod';
import { AppointmentStatus } from '../types/appointment';

const createAppointmentSchema = z.object({
  client_id: z.string({ invalid_type_error: 'ID do cliente é obrigatório' })
    .uuid({ message: 'ID do cliente inválido' }),
  specialist_id: z.string({ invalid_type_error: 'ID do especialista é obrigatório' })
    .uuid({ message: 'ID do especialista inválido' }),
  date: z.string({ invalid_type_error: 'Data é obrigatória' }).refine(value => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(value);
  }, { message: 'Data deve estar no formato YYYY-MM-DD' }),
  time: z.string({ invalid_type_error: 'Hora é obrigatória' }).refine(value => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(value);
  }, { message: 'Hora deve estar no formato HH:MM (00:00-23:59)' }),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus, {
    errorMap: () => ({ message: 'Status inválido' }),
  }),
});

const rescheduleSchema = z.object({
  date: z.string({ invalid_type_error: 'Data é obrigatória' }).refine(value => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(value);
  }, { message: 'Data deve estar no formato YYYY-MM-DD' }),
  time: z.string({ invalid_type_error: 'Hora é obrigatória' }).refine(value => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(value);
  }, { message: 'Hora deve estar no formato HH:MM (00:00-23:59)' }),
});

type ValidationResult<T> = {
  value: T | null;
  error: { details: [{ message: string }] } | null;
};

export default {
  validateCreate(data: unknown): ValidationResult<z.infer<typeof createAppointmentSchema>> {
    try {
      const validatedData = createAppointmentSchema.parse(data);
      return { value: validatedData, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          value: null, 
          error: { 
            details: [{ message: error.errors[0].message }] 
          }
        };
      }
      return { 
        value: null, 
        error: { 
          details: [{ message: 'Erro de validação desconhecido' }] 
        }
      };
    }
  },
  
  validateUpdateStatus(data: unknown): ValidationResult<z.infer<typeof updateStatusSchema>> {
    try {
      const validatedData = updateStatusSchema.parse(data);
      return { value: validatedData, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          value: null, 
          error: { 
            details: [{ message: error.errors[0].message }] 
          }
        };
      }
      return { 
        value: null, 
        error: { 
          details: [{ message: 'Erro de validação desconhecido' }] 
        }
      };
    }
  },
  
  validateReschedule(data: unknown): ValidationResult<z.infer<typeof rescheduleSchema>> {
    try {
      const validatedData = rescheduleSchema.parse(data);
      return { value: validatedData, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          value: null, 
          error: { 
            details: [{ message: error.errors[0].message }] 
          }
        };
      }
      return { 
        value: null, 
        error: { 
          details: [{ message: 'Erro de validação desconhecido' }] 
        }
      };
    }
  },
};