import { Request, Response } from 'express';
import userService from '../services/userService';

console.log('Inicializando UserController');

export default {
  async getAll(req: Request, res: Response) {
    console.log('[UserController] Executando getAll');
    try {
      const users = await userService.getAllActiveUsers();
      return res.json(users);
    } catch (error) {
      console.error('[UserController] Erro em getAll:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getById(req: Request, res: Response) {
    console.log('[UserController] Executando getById');
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      return res.json(user);
    } catch (error: any) {
      console.error('[UserController] Erro em getById:', error);
      
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async update(req: Request, res: Response) {
    console.log('[UserController] Executando update');
    try {
      const { id } = req.params;
      const { name, email, role, priority, active } = req.body;

      const updatedUser = await userService.updateUser(id, {
        name,
        email,
        role,
        priority,
        active
      });

      return res.json(updatedUser);
    } catch (error: any) {
      console.error('[UserController] Erro em update:', error);
      
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async delete(req: Request, res: Response) {
    console.log('[UserController] Executando delete');
    try {
      const { id } = req.params;
      const result = await userService.deactivateUser(id);
      return res.json(result);
    } catch (error: any) {
      console.error('[UserController] Erro em delete:', error);
      
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
  
  async syncProfiles(req: Request, res: Response): Promise<Response> {
    try {
      const result = await userService.syncUserProfiles();
      return res.json(result);
    } catch (error: any) {
      console.error('[UserController] Erro ao sincronizar perfis:', error);
      return res.status(500).json({ error: error.message });
    }
  }
};