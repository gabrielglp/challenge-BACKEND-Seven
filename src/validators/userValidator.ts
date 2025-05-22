import { z } from 'zod';
import { UserRole } from '../types/user';

const userSchema = z.object({
  name: z.string({ invalid_type_error: 'Nome é obrigatório' })
    .min(3, { message: 'Nome deve ter pelo menos 3 caracteres' }),
  email: z.string({ invalid_type_error: 'Email é obrigatório' })
    .email({ message: 'Email inválido' }),
  password: z.string({ invalid_type_error: 'Senha é obrigatória' })
    .min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Perfil inválido' }) })
    .optional(),
  priority: z.boolean().optional(),
  active: z.boolean().optional(),
});

const userUpdateSchema = z.object({
  name: z.string({ invalid_type_error: 'Nome é obrigatório' })
    .min(3, { message: 'Nome deve ter pelo menos 3 caracteres' })
    .optional(),
  email: z.string({ invalid_type_error: 'Email é obrigatório' })
    .email({ message: 'Email inválido' })
    .optional(),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Perfil inválido' }) })
    .optional(),
  priority: z.boolean().optional(),
  active: z.boolean().optional(),
});

type ValidationResult<T> = {
  value: T | null;
  error: { details: [{ message: string }] } | null;
};

export default {
  validate(data: unknown): ValidationResult<z.infer<typeof userSchema>> {
    try {
      const validatedData = userSchema.parse(data);
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

  validateUpdate(data: unknown): ValidationResult<z.infer<typeof userUpdateSchema>> {
    try {
      const validatedData = userUpdateSchema.parse(data);
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