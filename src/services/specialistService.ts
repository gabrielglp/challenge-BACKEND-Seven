import { prisma } from './prismaClient';
import availabilityService from './availabilityService';
import { UserRole } from '../types/user';

interface CreateSpecialistData {
  user_id: string;
  specialty: string;
  daily_limit?: number;
  min_interval_minutes?: number;
  availability?: any;
}

interface UpdateAvailabilityData {
  specialistId: string;
  availability: any;
  userId?: string;
  userRole?: string;
}

export default {
  async getAllSpecialists() {
    console.log('[SpecialistService] Buscando todos os especialistas...');
    
    const specialists = await prisma.specialist.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
          },
        },
      },
    });
    
    console.log(`[SpecialistService] Encontrados ${specialists.length} especialistas`);
    
    return specialists;
  },

  async findSpecialistUsersWithoutProfile() {
    const specialistUsers = await prisma.user.findMany({
      where: { role: 'specialist' }
    });
    
    console.log(`[SpecialistService] Existem ${specialistUsers.length} usuários com role 'specialist'`);
    
    return specialistUsers;
  },

  async createMissingSpecialistProfile(userId: string) {
    console.log(`[SpecialistService] Criando perfil de especialista para o usuário ${userId}`);
    
    const existingSpecialist = await prisma.specialist.findUnique({
      where: { user_id: userId }
    });
    
    if (!existingSpecialist) {
      await prisma.specialist.create({
        data: {
          user_id: userId,
          specialty: "Não especificada",
          daily_limit: 8,
          min_interval_minutes: 30,
          availability: {}
        }
      });
      console.log(`[SpecialistService] Perfil de especialista criado para ${userId}`);
    }
  },

  async createMissingSpecialistProfiles() {
    const specialistUsers = await this.findSpecialistUsersWithoutProfile();
    
    if (specialistUsers.length > 0) {
      console.log('[SpecialistService] ALERTA: Existem usuários especialistas sem perfil de especialista!');
      
      for (const user of specialistUsers) {
        await this.createMissingSpecialistProfile(user.id);
      }
      
      // Retornar especialistas atualizados
      return await this.getAllSpecialists();
    }
    
    return null;
  },

  async getSpecialistsWithAutoCreation() {
    const specialists = await this.getAllSpecialists();
    
    if (specialists.length === 0) {
      const updatedSpecialists = await this.createMissingSpecialistProfiles();
      return updatedSpecialists || specialists;
    }
    
    return specialists;
  },

  async validateUserForSpecialist(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado. Verifique o ID informado.');
    }

    if (user.role !== 'specialist') {
      throw new Error('Operação inválida: o usuário deve ter papel de especialista.');
    }

    return user;
  },

  async findExistingSpecialist(userId: string) {
    return await prisma.specialist.findUnique({
      where: { user_id: userId }
    });
  },

  async updateExistingSpecialist(userId: string, data: Omit<CreateSpecialistData, 'user_id'>) {
    const updatedSpecialist = await prisma.specialist.update({
      where: { user_id: userId },
      data: {
        specialty: data.specialty,
        daily_limit: data.daily_limit,
        min_interval_minutes: data.min_interval_minutes,
        availability: data.availability
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    return {
      message: 'Horários do especialista atualizados com sucesso',
      specialist: updatedSpecialist
    };
  },

  async createNewSpecialist(data: CreateSpecialistData) {
    const specialist = await prisma.specialist.create({
      data: {
        user_id: data.user_id,
        specialty: data.specialty,
        daily_limit: data.daily_limit || 8,
        min_interval_minutes: data.min_interval_minutes || 30,
        availability: data.availability || {}
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return {
      message: 'Horários do especialista definidos com sucesso',
      specialist
    };
  },

  async createOrUpdateSpecialist(data: CreateSpecialistData) {
    // Validar usuário
    await this.validateUserForSpecialist(data.user_id);

    // Verificar se já existe
    const existingSpecialist = await this.findExistingSpecialist(data.user_id);

    if (existingSpecialist) {
      return await this.updateExistingSpecialist(data.user_id, data);
    } else {
      return await this.createNewSpecialist(data);
    }
  },

  async getSpecialistById(id: string) {
    const specialist = await prisma.specialist.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
          },
        },
      },
    });

    if (!specialist) {
      throw new Error('Especialista não encontrado');
    }

    return specialist;
  },

  async validateSpecialistExists(id: string) {
    const specialist = await prisma.specialist.findUnique({
      where: { id },
    });

    if (!specialist) {
      throw new Error('Especialista não encontrado');
    }

    return specialist;
  },

  async updateSpecialistAvailability(id: string, availability: any) {
    // Validar disponibilidade
    const validAvailability = availabilityService.validateAvailability(availability);
    if (!validAvailability.valid) {
      throw new Error(validAvailability.message);
    }

    // Validar se especialista existe
    await this.validateSpecialistExists(id);

    // Atualizar
    const updatedSpecialist = await prisma.specialist.update({
      where: { id },
      data: { availability },
    });

    return updatedSpecialist;
  },

  async getSpecialistAvailableSlots(id: string, date: string) {
    if (!date) {
      throw new Error('Data é obrigatória');
    }

    const availableSlots = await availabilityService.getAvailableSlots(id, date);
    return availableSlots;
  },

  async validateManagePermission(specialistId: string, userId?: string, userRole?: string) {
    const specialist = await prisma.specialist.findUnique({
      where: { id: specialistId },
      include: { user: true }
    });

    if (!specialist) {
      throw new Error('Especialista não encontrado');
    }

    if (userRole !== UserRole.ADMIN && specialist.user_id !== userId) {
      throw new Error('Você não tem permissão para gerenciar a disponibilidade deste especialista');
    }

    return specialist;
  },

  async createOrUpdateAvailability(data: UpdateAvailabilityData) {
    const { specialistId, availability, userId, userRole } = data;

    // Validar disponibilidade
    const validAvailability = availabilityService.validateAvailability(availability);
    if (!validAvailability.valid) {
      throw new Error(`Formato de disponibilidade inválido: ${validAvailability.message}`);
    }

    // Validar permissões
    await this.validateManagePermission(specialistId, userId, userRole);

    // Atualizar
    const updatedSpecialist = await prisma.specialist.update({
      where: { id: specialistId },
      data: { availability },
      include: { user: true }
    });

    return {
      message: 'Horários do especialista atualizados com sucesso',
      specialist: updatedSpecialist
    };
  }
};