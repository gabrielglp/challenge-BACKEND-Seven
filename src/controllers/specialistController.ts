import { Request, Response } from 'express';
import specialistValidator from '../validators/specialistValidator';
import specialistService from '../services/specialistService';

export default {
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const specialists = await specialistService.getSpecialistsWithAutoCreation();
      return res.json(specialists);
    } catch (error) {
      console.error('[SpecialistController] Erro ao buscar especialistas:', error);
      return res.status(500).json({ 
        error: `Erro interno do servidor: ${(error as Error).message}` 
      });
    }
  },

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = specialistValidator.validate(req.body);
      if (validatedData.error) {
        return res.status(400).json({ 
          error: `Dados inválidos: ${validatedData.error.message}` 
        });
      }

      const { user_id, specialty, daily_limit = 8, min_interval_minutes = 30, availability = {} } = req.body;

      const result = await specialistService.createOrUpdateSpecialist({
        user_id,
        specialty,
        daily_limit,
        min_interval_minutes,
        availability
      });

      const statusCode = result.message.includes('atualizados') ? 200 : 201;
      return res.status(statusCode).json(result);
    } catch (error: any) {
      console.error('Erro ao definir horários do especialista:', error);
      
      if (error.message === 'Usuário não encontrado. Verifique o ID informado.') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message === 'Operação inválida: o usuário deve ter papel de especialista.') {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ 
        error: `Erro ao definir horários do especialista: ${error.message}` 
      });
    }
  },

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const specialist = await specialistService.getSpecialistById(id);
      return res.json(specialist);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Especialista não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async updateAvailability(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { availability } = req.body;

      const updatedSpecialist = await specialistService.updateSpecialistAvailability(id, availability);
      return res.json(updatedSpecialist);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Especialista não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('disponibilidade')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getAvailableSlots(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { date } = req.query;

      const availableSlots = await specialistService.getSpecialistAvailableSlots(
        id, 
        date as string
      );
      
      return res.json(availableSlots);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Data é obrigatória') {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async createOrUpdateAvailability(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { availability } = req.body;

      const result = await specialistService.createOrUpdateAvailability({
        specialistId: id,
        availability,
        userId: req.userId,
        userRole: req.userRole
      });

      return res.json(result);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Especialista não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('Formato de disponibilidade inválido')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('não tem permissão')) {
        return res.status(403).json({ error: error.message });
      }
      
      return res.status(500).json({ 
        error: `Erro ao atualizar disponibilidade: ${error.message}` 
      });
    }
  }
};