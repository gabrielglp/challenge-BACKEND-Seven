import { Request, Response } from 'express';
import userValidator from '../validators/userValidator';
import authService from '../services/authService';
import { UserRole } from '../types/user';

export default {
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = userValidator.validate(req.body);
      if (validatedData.error) {
        return res.status(400).json({ error: validatedData.error.details[0].message });
      }

      const { 
        name, 
        email, 
        password, 
        role = UserRole.CLIENT,
        phone,
        cpf,
        specialty,
        daily_limit,
        min_interval_minutes,
        availability 
      } = req.body;

      const result = await authService.registerUser({
        name,
        email,
        password,
        role,
        phone,
        cpf,
        specialty,
        daily_limit,
        min_interval_minutes,
        availability
      });
      
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro ao registrar usuário:', error);
      
      if (error.message === 'Usuário já existe com este e-mail' ||
          error.message === 'Telefone e CPF são obrigatórios para cadastro de clientes' ||
          error.message === 'Especialidade é obrigatória para cadastro de especialistas') {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ 
        error: `Erro ao cadastrar usuário: ${error.message || 'Erro interno do servidor'}` 
      });
    }
  },

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      const userAuth = await authService.loginUser({ email, password });

      return res.json(userAuth);
    } catch (error: any) {
      console.error(error);
      
      if (error.message === 'Usuário não encontrado' ||
          error.message === 'Usuário desativado' ||
          error.message === 'Senha incorreta') {
        return res.status(401).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
};