import appointmentValidator from '../../src/validators/appointmentValidator';
import { AppointmentStatus } from '../../src/types/appointment';

describe('AppointmentValidator', () => {
  describe('validateCreate', () => {
    it('deve validar dados de agendamento válidos', () => {
      const validData = {
        client_id: '123e4567-e89b-12d3-a456-426614174000',
        specialist_id: '123e4567-e89b-12d3-a456-426614174001',
        date: '2025-05-20',
        time: '14:00'
      };
      
      const result = appointmentValidator.validateCreate(validData);
      expect(result.error).toBeNull();
      expect(result.value).toEqual(validData);
    });
    
    it('deve rejeitar dados com formato inválido', () => {
      const invalidData = {
        client_id: '123',
        specialist_id: '123e4567-e89b-12d3-a456-426614174001',
        date: '20/05/2025',
        time: '14:00'
      };
      
      const result = appointmentValidator.validateCreate(invalidData);
      expect(result.error).not.toBeNull();
    });
  });
  
  describe('validateUpdateStatus', () => {
    it('deve validar atualização de status válida', () => {
      const validData = {
        status: AppointmentStatus.CONFIRMED
      };
      
      const result = appointmentValidator.validateUpdateStatus(validData);
      expect(result.error).toBeNull();
    });
    
    it('deve rejeitar status inválido', () => {
      const invalidData = {
        status: 'invalid_status'
      };
      
      const result = appointmentValidator.validateUpdateStatus(invalidData);
      expect(result.error).not.toBeNull();
    });
  });
});