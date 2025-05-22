import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ActionType } from '../types/audit';

const prisma = new PrismaClient();

export default async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const originalSend = res.send;
  
  res.send = function(data): Response {
    const statusCode = res.statusCode;
    const path = req.originalUrl;
    const method = req.method;
    
    if (['POST', 'PUT', 'DELETE'].includes(method) || 
        statusCode >= 400) {
      
      if (req.userId) {
        const actionType = statusCode >= 400 ? ActionType.VALIDATION_ERROR : 
                          (method === 'POST' ? ActionType.CREATE : 
                           method === 'PUT' ? ActionType.RESCHEDULE : ActionType.CANCEL);
                           
        prisma.auditLog.create({
          data: {
            user_id: req.userId,
            action_type: actionType,
            entity: path.split('/')[2] || 'unknown',
            entity_id: req.params.id || 'n/a',
            message: `${method} ${path} - Status: ${statusCode}`
          }
        }).catch((err: Error) => console.error('Erro ao criar log de auditoria:', err));
      }
    }
    
    originalSend.call(this, data);
    return this;
  };
  
  next();
};