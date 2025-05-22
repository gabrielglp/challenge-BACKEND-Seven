import { Request, Response } from 'express';
import appointmentController from '../../src/controllers/appointmentController';
import { prisma } from '../../src/services/prismaClient';
import { AppointmentStatus } from '../../src/types/appointment';
import { UserRole } from '../../src/types/user';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

jest.mock('../../src/services/prismaClient', () => ({
  prisma: {
    appointment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock('../../src/validators/appointmentValidator', () => ({
  __esModule: true,
  default: {
    validateCreate: jest.fn(),
    validateReschedule: jest.fn(),
  },
}));

jest.mock('../../src/services/availabilityService', () => ({
  __esModule: true,
  default: {
    isTimeSlotAvailable: jest.fn(),
    getAvailableSlots: jest.fn(),
  },
}));

jest.mock('../../src/services/notificationService', () => ({
  __esModule: true,
  default: {
    scheduleReminder: jest.fn(),
    cancelReminders: jest.fn(),
    rescheduleReminders: jest.fn(),
    sendConfirmationNotification: jest.fn(),
    sendCancellationNotification: jest.fn(),
  },
}));

jest.mock('../../src/services/auditService', () => ({
  __esModule: true,
  default: {
    logAction: jest.fn(),
  },
}));

jest.mock('../../src/services/webhookService', () => ({
  __esModule: true,
  default: {
    notifyAppointmentCreated: jest.fn(),
    notifyAppointmentCancelled: jest.fn(),
    notifyAppointmentCompleted: jest.fn(),
    notifyAppointmentUpdated: jest.fn(),
    notifyAppointmentRescheduled: jest.fn(),
  },
}));

describe('AppointmentController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any = {};

  const mockValidator = require('../../src/validators/appointmentValidator').default;
  const mockAvailabilityService = require('../../src/services/availabilityService').default;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      body: {},
      params: {},
      userId: 'user-id',
      userRole: UserRole.CLIENT
    } as Partial<Request>;
    
    responseObject = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation(val => {
        responseObject = val;
        return mockResponse as Response;
      }),
    };
  });

  describe('create', () => {
    it('deve criar um agendamento com sucesso', async () => {
      mockRequest.body = {
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        date: '2025-05-20',
        time: '14:00'
      };

      mockValidator.validateCreate.mockReturnValue({ error: null });

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({ 
        id: 'client-id',
        user: { name: 'Cliente Teste', email: 'cliente@teste.com' }
      });
      
      (prisma.specialist.findUnique as jest.Mock).mockResolvedValue({ 
        id: 'specialist-id',
        user: { name: 'Especialista Teste', email: 'especialista@teste.com' }
      });

      mockAvailabilityService.isTimeSlotAvailable.mockResolvedValue(true);

      const createdAppointment = {
        id: 'appointment-id',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        scheduled_by_id: 'user-id',
        date: new Date('2025-05-20'),
        time: '14:00',
        status: AppointmentStatus.PENDING,
        rescheduled_from_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        client: {
          user: { name: 'Cliente Teste', email: 'cliente@teste.com' }
        },
        specialist: {
          user: { name: 'Especialista Teste', email: 'especialista@teste.com' }
        }
      };
      
      (prisma.appointment.create as jest.Mock).mockResolvedValue(createdAppointment);

      await appointmentController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject).toHaveProperty('appointment');
      expect(responseObject.appointment.id).toBe('appointment-id');
    });

    it('deve retornar erro se dados obrigatórios estiverem faltando', async () => {
      mockRequest.body = {
        client_id: 'client-id'
      };

      mockValidator.validateCreate.mockReturnValue({ 
        error: { 
          details: [{ message: 'specialist_id é obrigatório' }] 
        } 
      });

      await appointmentController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject.error).toContain('obrigatório');
    });

    it('deve retornar erro se o cliente não existir', async () => {
      mockRequest.body = {
        client_id: 'nonexistent-client',
        specialist_id: 'specialist-id',
        date: '2025-05-20',
        time: '14:00'
      };

      mockValidator.validateCreate.mockReturnValue({ error: null });
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await appointmentController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject.error).toContain('Cliente com ID');
    });

    it('deve retornar erro se o especialista não existir', async () => {
      mockRequest.body = {
        client_id: 'client-id',
        specialist_id: 'nonexistent-specialist',
        date: '2025-05-20',
        time: '14:00'
      };

      mockValidator.validateCreate.mockReturnValue({ error: null });
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({ id: 'client-id' });
      (prisma.specialist.findUnique as jest.Mock).mockResolvedValue(null);

      await appointmentController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject.error).toContain('Especialista com ID');
    });

    it('deve retornar erro se o horário não estiver disponível', async () => {
      mockRequest.body = {
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        date: '2025-05-20',
        time: '14:00'
      };

      mockValidator.validateCreate.mockReturnValue({ error: null });
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({ id: 'client-id' });
      (prisma.specialist.findUnique as jest.Mock).mockResolvedValue({ id: 'specialist-id' });
      mockAvailabilityService.isTimeSlotAvailable.mockResolvedValue(false);

      await appointmentController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject.error).toContain('não disponível');
    });
  });

  describe('getById', () => {
    it('deve retornar um agendamento quando encontrado', async () => {
      mockRequest.params = { id: 'appointment-id' };

      const appointment = {
        id: 'appointment-id',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        date: new Date('2025-05-20'),
        time: '14:00',
        status: AppointmentStatus.CONFIRMED,
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

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(appointment);

      await appointmentController.getById(mockRequest as Request, mockResponse as Response);

      expect(responseObject).toEqual(appointment);
    });

    it('deve retornar 404 quando agendamento não for encontrado', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

      await appointmentController.getById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject.error).toContain('não encontrado');
    });
  });

  describe('getByClient', () => {
    it('deve retornar os agendamentos de um cliente', async () => {
      mockRequest.params = { clientId: 'client-id' };

      const appointments = [{
        id: 'appointment-1',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        date: new Date('2025-05-20'),
        time: '14:00',
        status: AppointmentStatus.CONFIRMED,
        specialist: {
          user: {
            name: 'Especialista Teste',
            email: 'especialista@teste.com'
          }
        }
      }];

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue(appointments);

      await appointmentController.getByClient(mockRequest as Request, mockResponse as Response);

      expect(responseObject).toHaveLength(1);
      expect(responseObject[0].id).toBe('appointment-1');
    });

    it('deve retornar lista vazia quando cliente não tiver agendamentos', async () => {
      mockRequest.params = { clientId: 'client-id' };

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

      await appointmentController.getByClient(mockRequest as Request, mockResponse as Response);

      expect(responseObject).toHaveLength(0);
    });

    it('deve lidar com erro ao buscar agendamentos do cliente', async () => {
      mockRequest.params = { clientId: 'client-id' };
      
      (prisma.appointment.findMany as jest.Mock).mockRejectedValue(new Error('Erro no banco de dados'));

      await appointmentController.getByClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseObject.error).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar o status do agendamento', async () => {
      mockRequest.params = { id: 'appointment-id' };
      mockRequest.body = { status: AppointmentStatus.CONFIRMED };

      const foundAppointment = {
        id: 'appointment-id',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        status: AppointmentStatus.PENDING,
        date: new Date('2025-05-20'),
        time: '14:00'
      };

      const updatedAppointment = {
        ...foundAppointment,
        status: AppointmentStatus.CONFIRMED,
        client: {
          user: { name: 'Cliente Teste', email: 'cliente@teste.com' }
        },
        specialist: {
          user: { name: 'Especialista Teste', email: 'especialista@teste.com' }
        }
      };

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(foundAppointment);
      (prisma.appointment.update as jest.Mock).mockResolvedValue(updatedAppointment);

      await appointmentController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(responseObject.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('deve retornar erro para status inválido', async () => {
      mockRequest.params = { id: 'appointment-id' };
      mockRequest.body = { status: 'INVALID_STATUS' };

      await appointmentController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject.error).toContain('Status inválido');
    });

    it('deve impedir cancelamento com menos de 6h de antecedência', async () => {
        mockRequest.params = { id: 'appointment-id' };
        mockRequest.body = { status: AppointmentStatus.CANCELLED };

        const now = new Date();
        const appointmentDateTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));

        const appointment = {
            id: 'appointment-id',
            client_id: 'client-id',
            specialist_id: 'specialist-id',
            date: appointmentDateTime, 
            time: appointmentDateTime.toTimeString().slice(0, 5),
            status: AppointmentStatus.CONFIRMED,
            client: {
                user: { name: 'Cliente Teste', email: 'cliente@teste.com' }
            },
            specialist: {
                user: { name: 'Especialista Teste', email: 'especialista@teste.com' }
            }
        };

        jest.spyOn(Date, 'now').mockImplementation(() => now.getTime());

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(appointment);

        await appointmentController.updateStatus(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.error).toContain('6 horas de antecedência');
        
        expect(prisma.appointment.update).not.toHaveBeenCalled();
        
        jest.spyOn(Date, 'now').mockRestore();
    });

    it('deve retornar erro se agendamento não existir', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockRequest.body = { status: AppointmentStatus.CONFIRMED };

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

      await appointmentController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject.error).toContain('não encontrado');
    });
  });

  describe('reschedule', () => {
    it('deve reagendar um agendamento com sucesso', async () => {
      mockRequest.params = { id: 'appointment-id' };
      mockRequest.body = { 
        date: '2025-06-20',
        time: '15:00'
      };

      const currentAppointment = {
        id: 'appointment-id',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        status: AppointmentStatus.PENDING,
        specialist: {
          id: 'specialist-id'
        },
        client: {
          id: 'client-id'
        }
      };

      const newAppointment = {
        id: 'new-appointment-id',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        date: new Date('2025-06-20'),
        time: '15:00',
        status: AppointmentStatus.PENDING,
        rescheduled_from_id: 'appointment-id',
        client: {
          user: { name: 'Cliente Teste', email: 'cliente@teste.com' }
        },
        specialist: {
          user: { name: 'Especialista Teste', email: 'especialista@teste.com' }
        }
      };

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(currentAppointment);
      (prisma.appointment.update as jest.Mock).mockResolvedValue({ ...currentAppointment, status: AppointmentStatus.RESCHEDULED });
      (prisma.appointment.create as jest.Mock).mockResolvedValue(newAppointment);
      
      mockAvailabilityService.isTimeSlotAvailable.mockResolvedValue(true);
      mockValidator.validateReschedule.mockReturnValue({ error: null });

      await appointmentController.reschedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject.id).toBe('new-appointment-id');
      expect(responseObject.rescheduled_from_id).toBe('appointment-id');
    });

    it('deve retornar erro se o novo horário não estiver disponível', async () => {
      mockRequest.params = { id: 'appointment-id' };
      mockRequest.body = {
        date: '2025-06-20',
        time: '15:00'
      };

      const currentAppointment = {
        id: 'appointment-id',
        client_id: 'client-id',
        specialist_id: 'specialist-id',
        specialist: { id: 'specialist-id' },
        client: { id: 'client-id' }
      };

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(currentAppointment);
      mockAvailabilityService.isTimeSlotAvailable.mockResolvedValue(false);
      mockValidator.validateReschedule.mockReturnValue({ error: null });

      await appointmentController.reschedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject.error).toContain('não disponível');
    });

    it('deve retornar erro se agendamento não existir', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockRequest.body = {
        date: '2025-06-20',
        time: '15:00'
      };

      mockValidator.validateReschedule.mockReturnValue({ error: null });
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

      await appointmentController.reschedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject.error).toContain('não encontrado');
    });

    it('deve retornar erro se dados do reagendamento forem inválidos', async () => {
        mockRequest.params = { id: 'appointment-id' };
        mockRequest.body = {};

        const currentAppointment = {
            id: 'appointment-id',
            client_id: 'client-id',
            specialist_id: 'specialist-id',
            specialist: { id: 'specialist-id' },
            client: { id: 'client-id' }
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(currentAppointment);
        
        mockValidator.validateReschedule.mockReturnValue({ 
            error: { details: [{ message: 'Data e hora são obrigatórios' }] } 
        });

        await appointmentController.reschedule(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.error).toBeDefined();
    });
  });
});