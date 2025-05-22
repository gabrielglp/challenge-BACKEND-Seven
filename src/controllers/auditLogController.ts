import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default {
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const logs = await prisma.auditLog.findMany({
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return res.json(logs);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const log = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!log) {
        return res.status(404).json({ error: 'Log não encontrado' });
      }

      return res.json(log);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};