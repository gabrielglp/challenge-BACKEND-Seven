import { prisma } from './prismaClient';

interface UpdateClientData {
  phone: string;
  cpf: string;
}

interface PermissionCheck {
  userId: string;
  userRole: string;
  targetUserId: string;
}

export default {
  async getAllClients() {
    const clients = await prisma.client.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
            priority: true
          }
        }
      }
    });

    return clients;
  },

  async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
            priority: true
          }
        }
      }
    });

    if (!client) {
      throw new Error('Cliente não encontrado');
    }

    return client;
  },

  async validateClientExists(id: string) {
    const clientExists = await prisma.client.findUnique({
      where: { id }
    });

    if (!clientExists) {
      throw new Error('Cliente não encontrado. Verifique o ID informado.');
    }

    return clientExists;
  },

  validateUpdatePermission(data: PermissionCheck) {
    const { userId, userRole, targetUserId } = data;
    
    if (userId !== targetUserId && userRole !== 'admin') {
      throw new Error('Você não tem permissão para atualizar este perfil');
    }
  },

  validateHistoryAccessPermission(data: PermissionCheck) {
    const { userId, userRole, targetUserId } = data;
    
    if (userId !== targetUserId && 
        !['admin', 'scheduler'].includes(userRole)) {
      throw new Error('Você não tem permissão para acessar este histórico');
    }
  },

  validateAdminPermission(userRole: string) {
    if (userRole !== 'admin') {
      throw new Error('Apenas administradores podem alterar a prioridade de clientes');
    }
  },

  validatePriorityValue(priority: any) {
    if (typeof priority !== 'boolean') {
      throw new Error('O campo priority deve ser um booleano');
    }
  },

  async updateClientProfile(id: string, data: UpdateClientData, userId: string, userRole: string) {
    const clientExists = await this.validateClientExists(id);

    this.validateUpdatePermission({
      userId,
      userRole,
      targetUserId: clientExists.user_id
    });

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        phone: data.phone,
        cpf: data.cpf
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true
          }
        }
      }
    });

    return updatedClient;
  },

  async getClientAppointmentsHistory(id: string, userId: string, userRole: string) {
    const clientExists = await this.validateClientExists(id);

    this.validateHistoryAccessPermission({
      userId,
      userRole,
      targetUserId: clientExists.user_id
    });
    const appointments = await prisma.appointment.findMany({
      where: {
        client_id: id
      },
      include: {
        specialist: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return appointments;
  },

  async getClientWithUser(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!client) {
      throw new Error('Cliente não encontrado');
    }

    return client;
  },

  async setClientPriority(id: string, priority: boolean, userRole: string) {
    this.validatePriorityValue(priority);
    this.validateAdminPermission(userRole);

    const client = await this.getClientWithUser(id);

    await prisma.user.update({
      where: { id: client.user_id },
      data: { priority }
    });

    return {
      message: `Prioridade do cliente ${client.user.name} alterada para ${priority ? 'prioritário' : 'normal'}`,
      clientName: client.user.name,
      newPriority: priority
    };
  }
};