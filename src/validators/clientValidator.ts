import { z } from 'zod';

const clientSchema = z.object({
  phone: z.string({ invalid_type_error: 'Telefone é obrigatório' })
    .min(10, { message: 'Telefone deve ter pelo menos 10 dígitos' })
    .max(15, { message: 'Telefone deve ter no máximo 15 dígitos' }),
  cpf: z.string({ invalid_type_error: 'CPF é obrigatório' })
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, { 
      message: 'CPF deve estar no formato XXX.XXX.XXX-XX' 
    })
});

type ValidationResult<T> = {
  value: T | null;
  error: { details: [{ message: string }] } | null;
};

export default {
  validate(data: unknown): ValidationResult<z.infer<typeof clientSchema>> {
    try {
      const validatedData = clientSchema.parse(data);
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