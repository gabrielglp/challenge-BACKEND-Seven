import { prisma } from './prismaClient';
import availabilityService from './availabilityService';
import auditService from './auditService';
import webhookService from './webhookService';
import notificationService from './notificationService';
import { AppointmentStatus } from '../types/appointment';

interface CreateAppointmentData {
  client_id: string;
  specialist_id: string;
  date: string;
  time: string;
  scheduled_by_id: string;
}

interface UpdateStatusData {
  appointmentId: string;
  status: AppointmentStatus;
  userId: string;
}

interface RescheduleData {
  appointmentId: string;
  date: string;
  time: string;
  userId: string;
}

export default {
  async validateClientExists(clientId: string) {
    const clientExists = await prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true }
    });

    if (!clientExists) {
      throw new Error(`Cliente com ID ${clientId} não encontrado. Verifique se o ID do cliente está correto.`);
    }

    return clientExists;
  },

  async validateSpecialistExists(specialistId: string) {
    const specialistExists = await prisma.specialist.findUnique({
      where: { id: specialistId },
      include: { user: true }
    });

    if (!specialistExists) {
      throw new Error(`Especialista com ID ${specialistId} não encontrado. Verifique se o ID do especialista está correto.`);
    }

    return specialistExists;
  },

  async validateTimeSlotAvailability(specialistId: string, date: string, time: string) {
    const isAvailable = await availabilityService.isTimeSlotAvailable(
      specialistId,
      date,
      time
    );

    if (!isAvailable) {
      throw new Error('Horário não disponível para este especialista. Verifique a agenda ou escolha outro horário.');
    }
  },

  async createAppointment(data: CreateAppointmentData) {
    const { client_id, specialist_id, date, time, scheduled_by_id } = data;

    // Validações
    const clientExists = await this.validateClientExists(client_id);
    const specialistExists = await this.validateSpecialistExists(specialist_id);
    await this.validateTimeSlotAvailability(specialist_id, date, time);

    // Criação do appointment
    const appointment = await prisma.appointment.create({
      data: {
        client_id,
        specialist_id,
        scheduled_by_id,
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

    // Serviços adicionais
    await notificationService.scheduleReminder(appointment);

    await auditService.logAction(
      scheduled_by_id,
      'create',
      'appointment',
      appointment.id,
      `Agendamento criado para ${date} às ${time} com ${specialistExists.user.name}`
    );

    await webhookService.notifyAppointmentCreated(appointment);

    console.log(`Agendamento criado com sucesso: ${appointment.id}`);

    return appointment;
  },

  async getAppointmentById(id: string) {
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
      throw new Error('Agendamento não encontrado');
    }

    return appointment;
  },

  async getAppointmentsByClient(clientId: string) {
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

    return appointments;
  },

  async getAppointmentsBySpecialist(specialistId: string) {
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

    return appointments;
  },

  async validateStatusUpdate(appointmentId: string, status: AppointmentStatus) {
    const validStatuses = Object.values(AppointmentStatus);
    if (!validStatuses.includes(status)) {
      throw new Error('Status inválido');
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new Error('Agendamento não encontrado');
    }

    // Validação específica para cancelamento
    if (status === AppointmentStatus.CANCELLED) {
      const appointmentDateTime = new Date(`${appointment.date.toISOString().split('T')[0]}T${appointment.time}:00`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 6) {
        throw new Error('Cancelamentos devem ser feitos com no mínimo 6 horas de antecedência');
      }
    }

    return appointment;
  },

  async updateAppointmentStatus(data: UpdateStatusData) {
    const { appointmentId, status, userId } = data;

    // Validações
    await this.validateStatusUpdate(appointmentId, status);

    // Notificações específicas para status
    if (status === AppointmentStatus.CANCELLED) {
      await notificationService.cancelReminders(appointmentId);
      await notificationService.sendCancellationNotification(appointmentId);
    }

    if (status === AppointmentStatus.CONFIRMED) {
      await notificationService.sendConfirmationNotification(appointmentId);
    }

    // Atualização do appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
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

    // Audit log
    await auditService.logAction(
      userId,
      status === AppointmentStatus.RESCHEDULED ? 'reschedule' : 'cancel',
      'appointment',
      appointmentId,
      `Status do agendamento alterado para ${status}`
    );

    // Webhooks
    if (status === AppointmentStatus.CANCELLED) {
      await webhookService.notifyAppointmentCancelled(updatedAppointment);
    } else if (status === AppointmentStatus.COMPLETED) {
      await webhookService.notifyAppointmentCompleted(updatedAppointment);
    } else {
      await webhookService.notifyAppointmentUpdated(updatedAppointment);
    }

    return updatedAppointment;
  },

  async rescheduleAppointment(data: RescheduleData) {
    const { appointmentId, date, time, userId } = data;

    // Buscar appointment atual
    const currentAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        specialist: true,
        client: true
      },
    });

    if (!currentAppointment) {
      throw new Error('Agendamento não encontrado');
    }

    // Verificar disponibilidade do novo horário
    await this.validateTimeSlotAvailability(
      currentAppointment.specialist_id,
      date,
      time
    );

    // Marcar appointment atual como reagendado
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.RESCHEDULED },
    });

    // Cancelar lembretes do appointment atual
    await notificationService.cancelReminders(appointmentId);

    // Criar novo appointment
    const newAppointment = await prisma.appointment.create({
      data: {
        client_id: currentAppointment.client_id,
        specialist_id: currentAppointment.specialist_id,
        scheduled_by_id: userId,
        date: new Date(date),
        time,
        status: AppointmentStatus.PENDING,
        rescheduled_from_id: appointmentId,
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

    // Agendar lembretes para o novo appointment
    await notificationService.scheduleReminder(newAppointment);

    // Audit log
    await auditService.logAction(
      userId,
      'reschedule',
      'appointment',
      appointmentId,
      `Agendamento remarcado para ${date} às ${time}`
    );

    // Webhook
    await webhookService.notifyAppointmentRescheduled(newAppointment);

    return newAppointment;
  },

  handlePrismaErrors(error: any) {
    if (error.code === 'P2003') {
      if (error.meta?.field_name === 'client_id') {
        throw new Error('Cliente não encontrado. Verifique se o cliente está registrado no sistema.');
      } else if (error.meta?.field_name === 'specialist_id') {
        throw new Error('Especialista não encontrado. Verifique se o especialista está registrado no sistema.');
      } else if (error.meta?.field_name === 'scheduled_by_id') {
        throw new Error('Usuário agendador não encontrado.');
      }
    } else if (error.code === 'P2025') {
      throw new Error('Registro não encontrado. Verifique os IDs fornecidos.');
    }
    
    throw error;
  }
};