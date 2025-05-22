import { Request, Response } from 'express';
import { prisma } from '../services/prismaClient';
import clientValidator from '../validators/clientValidator';

export default {
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
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

      return res.json(clients);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

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
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      return res.json(client);
    } catch (error) {
      console.error(error);
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

      const clientExists = await prisma.client.findUnique({
        where: { id }
      });

      if (!clientExists) {
        return res.status(404).json({ 
          error: 'Cliente não encontrado. Verifique o ID informado.' 
        });
      }

      if (req.userId !== clientExists.user_id && req.userRole !== 'admin') {
        return res.status(403).json({ 
          error: 'Você não tem permissão para atualizar este perfil' 
        });
      }

      const updatedClient = await prisma.client.update({
        where: { id },
        data: {
          phone,
          cpf
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

      return res.json(updatedClient);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getAppointmentsHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const clientExists = await prisma.client.findUnique({
        where: { id }
      });

      if (!clientExists) {
        return res.status(404).json({ 
          error: 'Cliente não encontrado. Verifique o ID informado.' 
        });
      }

      if (req.userId !== clientExists.user_id && 
         !['admin', 'scheduler'].includes(req.userRole || '')) {
        return res.status(403).json({ 
          error: 'Você não tem permissão para acessar este histórico' 
        });
      }

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

      return res.json(appointments);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async setPriority(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      if (typeof priority !== 'boolean') {
        return res.status(400).json({ error: 'O campo priority deve ser um booleano' });
      }

      const client = await prisma.client.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      if (req.userRole !== 'admin') {
        return res.status(403).json({ 
          error: 'Apenas administradores podem alterar a prioridade de clientes' 
        });
      }

      await prisma.user.update({
        where: { id: client.user_id },
        data: { priority }
      });

      return res.json({ 
        message: `Prioridade do cliente ${client.user.name} alterada para ${priority ? 'prioritário' : 'normal'}` 
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};