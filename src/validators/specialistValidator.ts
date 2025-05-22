import { z } from 'zod';

const specialistSchema = z.object({
  specialty: z.string({ invalid_type_error: 'Especialidade é obrigatória' })
    .min(3, { message: 'Especialidade deve ter pelo menos 3 caracteres' }),
  daily_limit: z.number({ invalid_type_error: 'Limite diário deve ser um número' })
    .int({ message: 'Limite diário deve ser um número inteiro' })
    .min(1, { message: 'Limite diário deve ser pelo menos 1' })
    .max(24, { message: 'Limite diário não pode exceder 24' })
    .optional(),
  min_interval_minutes: z.number({ invalid_type_error: 'Intervalo mínimo deve ser um número' })
    .int({ message: 'Intervalo mínimo deve ser um número inteiro' })
    .min(0, { message: 'Intervalo mínimo não pode ser negativo' })
    .max(240, { message: 'Intervalo mínimo não pode exceder 4 horas (240 minutos)' })
    .optional(),
  availability: z.record(z.string(), z.array(z.string())).optional()
});

const availabilitySchema = z.object({
  availability: z.record(z.string(), z.array(z.string()))
});

type ValidationResult<T> = {
  value: T | null;
  error: z.ZodError | null;
};

export default {
  validate(data: unknown): ValidationResult<z.infer<typeof specialistSchema>> {
    try {
      const validatedData = specialistSchema.parse(data);
      return { value: validatedData, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { value: null, error };
      }
      const genericError = new z.ZodError([
        {
          code: 'custom',
          path: ['_'],
          message: 'Erro de validação desconhecido',
        },
      ]);
      return { value: null, error: genericError };
    }
  },

  validateAvailability(data: unknown): ValidationResult<z.infer<typeof availabilitySchema>> {
    try {
      const validatedData = availabilitySchema.parse(data);
      return { value: validatedData, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { value: null, error };
      }
      const genericError = new z.ZodError([
        {
          code: 'custom',
          path: ['_'],
          message: 'Erro de validação desconhecido',
        },
      ]);
      return { value: null, error: genericError };
    }
  }
};