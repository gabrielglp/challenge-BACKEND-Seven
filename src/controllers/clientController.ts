import { Request, Response } from 'express';
import clientValidator from '../validators/clientValidator';
import clientService from '../services/clientService';

export default {
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const clients = await clientService.getAllClients();
      return res.json(clients);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const client = await clientService.getClientById(id);
      return res.json(client);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Cliente não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { phone, cpf } = req.body;

      const validatedData = clientValidator.validate({ phone, cpf });
      if (validatedData.error) {
        return res.status(400).json({ error: validatedData.error.details[0].message });
      }

      if (!req.userId || !req.userRole) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const updatedClient = await clientService.updateClientProfile(
        id,
        { phone, cpf },
        req.userId,
        req.userRole
      );

      return res.json(updatedClient);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Cliente não encontrado. Verifique o ID informado.' ||
          error.message === 'Você não tem permissão para atualizar este perfil') {
        return res.status(error.message.includes('permissão') ? 403 : 404).json({ 
          error: error.message 
        });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getAppointmentsHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!req.userId || !req.userRole) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const appointments = await clientService.getClientAppointmentsHistory(
        id,
        req.userId,
        req.userRole
      );

      return res.json(appointments);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Cliente não encontrado. Verifique o ID informado.') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message === 'Você não tem permissão para acessar este histórico') {
        return res.status(403).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async setPriority(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      if (!req.userRole) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const result = await clientService.setClientPriority(id, priority, req.userRole);

      return res.json(result);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'O campo priority deve ser um booleano') {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message === 'Cliente não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message === 'Apenas administradores podem alterar a prioridade de clientes') {
        return res.status(403).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};