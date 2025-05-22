import { prisma } from './prismaClient';
import { Role } from '@prisma/client';
import { UserRole } from '../types/user';

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: Role;
  priority?: boolean;
  active?: boolean;
}

interface SyncProfilesResult {
  message: string;
  clientProfilesCreated: number;
  specialistProfilesCreated: number;
}

export default {
  async getAllActiveUsers() {
    console.log('[UserService] Buscando todos os usuários ativos');
    
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

    console.log(`[UserService] ${users.length} usuários encontrados`);
    return users;
  },

  async getUserById(id: string) {
    console.log('[UserService] Buscando usuário por ID:', id);
    
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
      console.log('[UserService] Usuário não encontrado');
      throw new Error('Usuário não encontrado');
    }

    console.log('[UserService] Usuário encontrado:', user.id);
    return user;
  },

  async validateUserExists(id: string) {
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new Error('Usuário não encontrado');
    }

    return existingUser;
  },

  async updateUser(id: string, data: UpdateUserData) {
    console.log('[UserService] Atualizando usuário:', id);
    
    // Validar se usuário existe
    await this.validateUserExists(id);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        role: data.role as Role,
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

    console.log('[UserService] Usuário atualizado:', updatedUser.id);
    return updatedUser;
  },

  async deactivateUser(id: string) {
    console.log('[UserService] Desativando usuário:', id);
    
    // Validar se usuário existe
    await this.validateUserExists(id);

    await prisma.user.update({
      where: { id },
      data: {
        active: false,
        updated_at: new Date()
      }
    });

    console.log('[UserService] Usuário desativado:', id);
    return { message: 'Usuário desativado com sucesso' };
  },

  async findClientUsersWithoutProfile() {
    console.log('[UserService] Buscando clientes sem perfil...');
    
    const clientUsers = await prisma.user.findMany({
      where: {
        role: UserRole.CLIENT,
        client: null
      }
    });
    
    console.log(`[UserService] Encontrados ${clientUsers.length} clientes sem perfil`);
    return clientUsers;
  },

  async createClientProfile(userId: string) {
    await prisma.client.create({
      data: {
        user_id: userId,
        phone: '00000000000',
        cpf: '000.000.000-00'
      }
    });
    console.log(`[UserService] Criado perfil de cliente para o usuário ${userId}`);
  },

  async createClientProfiles() {
    const clientUsers = await this.findClientUsersWithoutProfile();
    
    for (const user of clientUsers) {
      await this.createClientProfile(user.id);
    }
    
    return clientUsers.length;
  },

  async findSpecialistUsersWithoutProfile() {
    console.log('[UserService] Buscando especialistas sem perfil...');
    
    const specialistUsers = await prisma.user.findMany({
      where: {
        role: UserRole.SPECIALIST,
        specialist: null
      }
    });
    
    console.log(`[UserService] Encontrados ${specialistUsers.length} especialistas sem perfil`);
    return specialistUsers;
  },

  async createSpecialistProfile(userId: string) {
    await prisma.specialist.create({
      data: {
        user_id: userId,
        specialty: 'Não especificada',
        daily_limit: 8,
        min_interval_minutes: 30,
        availability: {}
      }
    });
    console.log(`[UserService] Criado perfil de especialista para o usuário ${userId}`);
  },

  async createSpecialistProfiles() {
    const specialistUsers = await this.findSpecialistUsersWithoutProfile();
    
    for (const user of specialistUsers) {
      await this.createSpecialistProfile(user.id);
    }
    
    return specialistUsers.length;
  },

  async syncUserProfiles(): Promise<SyncProfilesResult> {
    console.log('[UserService] Sincronizando perfis de usuários...');
    
    try {
      // Criar perfis de cliente
      const clientProfilesCreated = await this.createClientProfiles();
      
      // Criar perfis de especialista
      const specialistProfilesCreated = await this.createSpecialistProfiles();
      
      const result = {
        message: 'Perfis de usuários sincronizados com sucesso',
        clientProfilesCreated,
        specialistProfilesCreated
      };
      
      console.log('[UserService] Sincronização concluída:', result);
      return result;
    } catch (error) {
      console.error('[UserService] Erro na sincronização:', error);
      throw new Error(`Erro ao sincronizar perfis: ${error.message || 'Erro interno do servidor'}`);
    }
  }
};