import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import availabilityService from '../services/availabilityService';
import specialistValidator from '../validators/specialistValidator';
import { UserRole } from '../types/user';

const prisma = new PrismaClient();

export default {
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      console.log('[SpecialistController] Buscando todos os especialistas...');
      
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
      
      console.log(`[SpecialistController] Encontrados ${specialists.length} especialistas`);
      
      if (specialists.length === 0) {
        const specialistUsers = await prisma.user.findMany({
          where: { role: 'specialist' }
        });
        
        console.log(`[SpecialistController] Existem ${specialistUsers.length} usuários com role 'specialist'`);
        
        if (specialistUsers.length > 0) {
          console.log('[SpecialistController] ALERTA: Existem usuários especialistas sem perfil de especialista!');
          
          for (const user of specialistUsers) {
            console.log(`[SpecialistController] Criando perfil de especialista para o usuário ${user.id}`);
            
            const existingSpecialist = await prisma.specialist.findUnique({
              where: { user_id: user.id }
            });
            
            if (!existingSpecialist) {
              await prisma.specialist.create({
                data: {
                  user_id: user.id,
                  specialty: "Não especificada",
                  daily_limit: 8,
                  min_interval_minutes: 30,
                  availability: {}
                }
              });
              console.log(`[SpecialistController] Perfil de especialista criado para ${user.id}`);
            }
          }
          
          const updatedSpecialists = await prisma.specialist.findMany({
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
          
          return res.json(updatedSpecialists);
        }
      }

      return res.json(specialists);
    } catch (error) {
      console.error('[SpecialistController] Erro ao buscar especialistas:', error);
      return res.status(500).json({ 
        error: `Erro interno do servidor: ${(error as Error).message}` 
      });
    }
  },

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = specialistValidator.validate(req.body);
      if (validatedData.error) {
        return res.status(400).json({ 
          error: `Dados inválidos: ${validatedData.error.message}` 
        });
      }

      const { user_id, specialty, daily_limit = 8, min_interval_minutes = 30, availability = {} } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: user_id }
      });

      if (!user) {
        return res.status(404).json({ 
          error: 'Usuário não encontrado. Verifique o ID informado.' 
        });
      }

      if (user.role !== 'specialist') {
        return res.status(400).json({ 
          error: 'Operação inválida: o usuário deve ter papel de especialista.' 
        });
      }

      const existingSpecialist = await prisma.specialist.findUnique({
        where: { user_id }
      });

      if (existingSpecialist) {
        const updatedSpecialist = await prisma.specialist.update({
          where: { user_id },
          data: {
            specialty,
            daily_limit,
            min_interval_minutes,
            availability
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
        
        return res.json({
          message: 'Horários do especialista atualizados com sucesso',
          specialist: updatedSpecialist
        });
      }

      const specialist = await prisma.specialist.create({
        data: {
          user_id,
          specialty,
          daily_limit,
          min_interval_minutes,
          availability
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

      return res.status(201).json({
        message: 'Horários do especialista definidos com sucesso',
        specialist
      });
    } catch (error) {
      console.error('Erro ao definir horários do especialista:', error);
      return res.status(500).json({ 
        error: `Erro ao definir horários do especialista: ${(error as Error).message}` 
      });
    }
  },

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

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
        return res.status(404).json({ error: 'Especialista não encontrado' });
      }

      return res.json(specialist);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async updateAvailability(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { availability } = req.body;

      const validAvailability = availabilityService.validateAvailability(availability);
      if (!validAvailability.valid) {
        return res.status(400).json({ error: validAvailability.message });
      }

      const specialist = await prisma.specialist.findUnique({
        where: { id },
      });

      if (!specialist) {
        return res.status(404).json({ error: 'Especialista não encontrado' });
      }

      const updatedSpecialist = await prisma.specialist.update({
        where: { id },
        data: { availability },
      });

      return res.json(updatedSpecialist);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getAvailableSlots(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { date } = req.query;

      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Data é obrigatória' });
      }

      const availableSlots = await availabilityService.getAvailableSlots(id, date);
      
      return res.json(availableSlots);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
  async createOrUpdateAvailability(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { availability } = req.body;

      const validAvailability = availabilityService.validateAvailability(availability);
      if (!validAvailability.valid) {
        return res.status(400).json({ 
          error: `Formato de disponibilidade inválido: ${validAvailability.message}` 
        });
      }

      const specialist = await prisma.specialist.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!specialist) {
        return res.status(404).json({ error: 'Especialista não encontrado' });
      }

      if (req.userRole !== UserRole.ADMIN && specialist.user_id !== req.userId) {
        return res.status(403).json({ 
          error: 'Você não tem permissão para gerenciar a disponibilidade deste especialista' 
        });
      }

      const updatedSpecialist = await prisma.specialist.update({
        where: { id },
        data: { availability },
        include: { user: true }
      });

      return res.json({
        message: 'Horários do especialista atualizados com sucesso',
        specialist: updatedSpecialist
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ 
        error: `Erro ao atualizar disponibilidade: ${(error as Error).message}` 
      });
    }
  }
};