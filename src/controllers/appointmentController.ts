import { Request, Response } from 'express';
import appointmentValidator from '../validators/appointmentValidator';
import appointmentService from '../services/appointmentService';

export default {
  async create(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = appointmentValidator.validateCreate(req.body);
      if (validatedData.error) {
        return res.status(400).json({ error: validatedData.error.details[0].message });
      }

      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado. Faça login para continuar.' });
      }

      const { client_id, specialist_id, date, time } = req.body;

      const appointment = await appointmentService.createAppointment({
        client_id,
        specialist_id,
        date,
        time,
        scheduled_by_id: req.userId
      });

      return res.status(201).json({
        message: 'Agendamento criado com sucesso',
        appointment
      });
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);

      try {
        appointmentService.handlePrismaErrors(error);
      } catch (handledError: any) {
        return res.status(404).json({ error: handledError.message });
      }

      return res.status(400).json({ 
        error: error.message || 'Erro interno do servidor'
      });
    }
  },

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const appointment = await appointmentService.getAppointmentById(id);
      return res.json(appointment);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Agendamento não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getByClient(req: Request, res: Response): Promise<Response> {
    try {
      const { clientId } = req.params;
      const appointments = await appointmentService.getAppointmentsByClient(clientId);
      return res.json(appointments);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getBySpecialist(req: Request, res: Response): Promise<Response> {
    try {
      const { specialistId } = req.params;
      const appointments = await appointmentService.getAppointmentsBySpecialist(specialistId);
      return res.json(appointments);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const updatedAppointment = await appointmentService.updateAppointmentStatus({
        appointmentId: id,
        status,
        userId: req.userId
      });

      return res.json(updatedAppointment);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Status inválido' || 
          error.message === 'Agendamento não encontrado' ||
          error.message === 'Cancelamentos devem ser feitos com no mínimo 6 horas de antecedência') {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async reschedule(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { date, time } = req.body;

      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const newAppointment = await appointmentService.rescheduleAppointment({
        appointmentId: id,
        date,
        time,
        userId: req.userId
      });

      return res.status(201).json(newAppointment);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Agendamento não encontrado' ||
          error.message === 'Novo horário não disponível para este especialista' ||
          error.message.includes('Horário não disponível')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
};