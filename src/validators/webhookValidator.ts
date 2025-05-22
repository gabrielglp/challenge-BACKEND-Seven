import { z } from 'zod';
import { WebhookEventType } from '../types/webhook';

const webhookSchema = z.object({
  name: z.string({ invalid_type_error: 'Nome é obrigatório' })
    .min(3, { message: 'Nome deve ter pelo menos 3 caracteres' }),
  url: z.string({ invalid_type_error: 'URL é obrigatória' })
    .url({ message: 'URL inválida' }),
  secret: z.string().optional(),
  events: z.array(
    z.nativeEnum(WebhookEventType, { errorMap: () => ({ message: 'Tipo de evento inválido' }) })
  ).min(1, { message: 'Pelo menos um evento deve ser especificado' })
});

type ValidationResult<T> = {
  value: T | null;
  error: { details: [{ message: string }] } | null;
};

export default {
  validate(data: unknown): ValidationResult<z.infer<typeof webhookSchema>> {
    try {
      const validatedData = webhookSchema.parse(data);
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
  }
};