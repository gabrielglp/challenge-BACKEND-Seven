import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Role } from '@prisma/client';
import { UserRole } from '../types/user';

const prisma = new PrismaClient();

console.log('Inicializando UserController');
export default {
  async getAll(req: Request, res: Response) {
    console.log('[UserController] Executando getAll');
    try {
      const users = await prisma.user.findMany({
        where: {
          active: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          priority: true,
          active: true,
          created_at: true,
          updated_at: true
        }
      });

      console.log(`[UserController] ${users.length} usuários encontrados`);
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

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          priority: true,
          active: true,
          created_at: true,
          updated_at: true
        }
      });

      if (!user) {
        console.log('[UserController] Usuário não encontrado');
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      console.log('[UserController] Usuário encontrado:', user.id);
      return res.json(user);
    } catch (error) {
      console.error('[UserController] Erro em getById:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async update(req: Request, res: Response) {
    console.log('[UserController] Executando update');
    try {
      const { id } = req.params;
      const { name, email, role, priority, active } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        console.log('[UserController] Usuário não encontrado para atualização');
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          name,
          email,
          role: role as Role,
          priority,
          active,
          updated_at: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          priority: true,
          active: true,
          created_at: true,
          updated_at: true
        }
      });

      console.log('[UserController] Usuário atualizado:', updatedUser.id);
      return res.json(updatedUser);
    } catch (error) {
      console.error('[UserController] Erro em update:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async delete(req: Request, res: Response) {
    console.log('[UserController] Executando delete');
    try {
      const { id } = req.params;

      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        console.log('[UserController] Usuário não encontrado para exclusão');
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      await prisma.user.update({
        where: { id },
        data: {
          active: false,
          updated_at: new Date()
        }
      });

      console.log('[UserController] Usuário desativado:', id);
      return res.json({ message: 'Usuário desativado com sucesso' });
    } catch (error) {
      console.error('[UserController] Erro em delete:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
  
  async syncProfiles(req: Request, res: Response): Promise<Response> {
  try {
    console.log('[UserController] Sincronizando perfis de usuários...');
    
    const clientUsers = await prisma.user.findMany({
      where: {
        role: UserRole.CLIENT,
        client: null
      }
    });
    
    console.log(`[UserController] Encontrados ${clientUsers.length} clientes sem perfil`);
    
    for (const user of clientUsers) {
      await prisma.client.create({
        data: {
          user_id: user.id,
          phone: '00000000000',
          cpf: '000.000.000-00'
        }
      });
      console.log(`[UserController] Criado perfil de cliente para o usuário ${user.id}`);
    }
    
    const specialistUsers = await prisma.user.findMany({
      where: {
        role: UserRole.SPECIALIST,
        specialist: null
      }
    });
    
    console.log(`[UserController] Encontrados ${specialistUsers.length} especialistas sem perfil`);
    
    for (const user of specialistUsers) {
      await prisma.specialist.create({
        data: {
          user_id: user.id,
          specialty: 'Não especificada',
          daily_limit: 8,
          min_interval_minutes: 30,
          availability: {}
        }
      });
      console.log(`[UserController] Criado perfil de especialista para o usuário ${user.id}`);
    }
    
    return res.json({
      message: 'Perfis de usuários sincronizados com sucesso',
      clientProfilesCreated: clientUsers.length,
      specialistProfilesCreated: specialistUsers.length
    });
  } catch (error) {
    console.error('[UserController] Erro ao sincronizar perfis:', error);
    return res.status(500).json({ 
      error: `Erro ao sincronizar perfis: ${error.message || 'Erro interno do servidor'}` 
    });
  }
}
};