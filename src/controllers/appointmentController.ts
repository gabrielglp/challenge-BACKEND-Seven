import { Request, Response } from 'express';
import { prisma } from '../services/prismaClient';
import appointmentValidator from '../validators/appointmentValidator';
import availabilityService from '../services/availabilityService';
import auditService from '../services/auditService';
import webhookService from '../services/webhookService';
import notificationService from '../services/notificationService';
import { AppointmentStatus } from '../types/appointment';

export default {
  async create(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = appointmentValidator.validateCreate(req.body);
      if (validatedData.error) {
        return res.status(400).json({ error: validatedData.error.details[0].message });
      }

      const { client_id, specialist_id, date, time } = req.body;
      
      const clientExists = await prisma.client.findUnique({
        where: { id: client_id },
        include: { user: true }
      });

      if (!clientExists) {
        return res.status(404).json({ 
          error: `Cliente com ID ${client_id} não encontrado. Verifique se o ID do cliente está correto.` 
        });
      }
      
      const specialistExists = await prisma.specialist.findUnique({
        where: { id: specialist_id },
        include: { user: true }
      });

      if (!specialistExists) {
        return res.status(404).json({ 
          error: `Especialista com ID ${specialist_id} não encontrado. Verifique se o ID do especialista está correto.` 
        });
      }
      
      const isAvailable = await availabilityService.isTimeSlotAvailable(
        specialist_id, 
        date, 
        time
      );

      if (!isAvailable) {
        return res.status(400).json({ 
          error: 'Horário não disponível para este especialista. Verifique a agenda ou escolha outro horário.' 
        });
      }

      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado. Faça login para continuar.' });
      }

      const appointment = await prisma.appointment.create({
        data: {
          client_id,
          specialist_id,
          scheduled_by_id: req.userId,
          date: new Date(date),
          time,
          status: AppointmentStatus.PENDING,
        },
        include: {
          client: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                }
              }
            }
          },
          specialist: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                }
              }
            }
          }
        }
      });

      await notificationService.scheduleReminder(appointment);

      await auditService.logAction(
        req.userId,
        'create',
        'appointment',
        appointment.id,
        `Agendamento criado para ${date} às ${time} com ${specialistExists.user.name}`
      );

      await webhookService.notifyAppointmentCreated(appointment);

      console.log(`Agendamento criado com sucesso: ${appointment.id}`);
      
      return res.status(201).json({
        message: 'Agendamento criado com sucesso',
        appointment
      });
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      
      if (error.code === 'P2003') {
        if (error.meta?.field_name === 'client_id') {
          return res.status(404).json({ 
            error: 'Cliente não encontrado. Verifique se o cliente está registrado no sistema.' 
          });
        } else if (error.meta?.field_name === 'specialist_id') {
          return res.status(404).json({ 
            error: 'Especialista não encontrado. Verifique se o especialista está registrado no sistema.' 
          });
        } else if (error.meta?.field_name === 'scheduled_by_id') {
          return res.status(404).json({ 
            error: 'Usuário agendador não encontrado.' 
          });
        }
      } else if (error.code === 'P2025') {
        return res.status(404).json({ 
          error: 'Registro não encontrado. Verifique os IDs fornecidos.' 
        });
      }
      
      return res.status(500).json({ 
        error: `Erro ao criar agendamento: ${error.message || 'Erro interno do servidor'}` 
      });
    }
  },

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          client: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                }
              }
            }
          },
          specialist: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                }
              }
            }
          },
          scheduledBy: {
            select: {
              name: true,
              email: true,
            }
          }
        }
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      return res.json(appointment);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getByClient(req: Request, res: Response): Promise<Response> {
    try {
      const { clientId } = req.params;

      const appointments = await prisma.appointment.findMany({
        where: { client_id: clientId },
        include: {
          specialist: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                }
              }
            }
          }
        },
        orderBy: {
          date: 'asc',
        },
      });

      return res.json(appointments);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getBySpecialist(req: Request, res: Response): Promise<Response> {
    try {
      const { specialistId } = req.params;

      const appointments = await prisma.appointment.findMany({
        where: { specialist_id: specialistId },
        include: {
          client: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                }
              }
            }
          }
        },
        orderBy: {
          date: 'asc',
        },
      });

      return res.json(appointments);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = Object.values(AppointmentStatus);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      if (status === AppointmentStatus.CANCELLED) {
        const appointmentDateTime = new Date(`${appointment.date.toISOString().split('T')[0]}T${appointment.time}:00`);
        const now = new Date();
        const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilAppointment < 6) {
          return res.status(400).json({ 
            error: 'Cancelamentos devem ser feitos com no mínimo 6 horas de antecedência' 
          });
        }
        
        await notificationService.cancelReminders(id);
        
        await notificationService.sendCancellationNotification(id);
      }
      
      if (status === AppointmentStatus.CONFIRMED) {
        await notificationService.sendConfirmationNotification(id);
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: { status },
        include: {
          client: {
            include: {
              user: true
            }
          },
          specialist: {
            include: {
              user: true
            }
          }
        }
      });

      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      await auditService.logAction(
        req.userId,
        status === AppointmentStatus.RESCHEDULED ? 'reschedule' : 'cancel',
        'appointment',
        id,
        `Status do agendamento alterado para ${status}`
      );

      if (status === AppointmentStatus.CANCELLED) {
        await webhookService.notifyAppointmentCancelled(updatedAppointment);
      } else if (status === AppointmentStatus.COMPLETED) {
        await webhookService.notifyAppointmentCompleted(updatedAppointment);
      } else {
        await webhookService.notifyAppointmentUpdated(updatedAppointment);
      }

      return res.json(updatedAppointment);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async reschedule(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { date, time } = req.body;

      const currentAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          specialist: true,
          client: true
        },
      });

      if (!currentAppointment) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      const isAvailable = await availabilityService.isTimeSlotAvailable(
        currentAppointment.specialist_id,
        date,
        time
      );

      if (!isAvailable) {
        return res.status(400).json({ 
          error: 'Novo horário não disponível para este especialista' 
        });
      }

      await prisma.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.RESCHEDULED },
      });
      
      await notificationService.cancelReminders(id);

      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const newAppointment = await prisma.appointment.create({
        data: {
          client_id: currentAppointment.client_id,
          specialist_id: currentAppointment.specialist_id,
          scheduled_by_id: req.userId,
          date: new Date(date),
          time,
          status: AppointmentStatus.PENDING,
          rescheduled_from_id: id,
        },
        include: {
          client: {
            include: {
              user: true
            }
          },
          specialist: {
            include: {
              user: true
            }
          }
        }
      });
      
      await notificationService.scheduleReminder(newAppointment);

      await auditService.logAction(
        req.userId,
        'reschedule',
        'appointment',
        id,
        `Agendamento remarcado para ${date} às ${time}`
      );

      await webhookService.notifyAppointmentRescheduled(newAppointment);

      return res.status(201).json(newAppointment);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
};