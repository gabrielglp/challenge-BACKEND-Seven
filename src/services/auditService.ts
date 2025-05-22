import { PrismaClient } from '@prisma/client';
import { ActionType } from '../types/audit';

const prisma = new PrismaClient();

export default {
  async logAction(
    userId: string, 
    actionType: string, 
    entity: string, 
    entityId: string, 
    message: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          user_id: userId,
          action_type: actionType as ActionType,
          entity,
          entity_id: entityId,
          message,
        },
      });
    } catch (error) {
      console.error('Erro ao criar log de auditoria:', error);
    }
  },
};