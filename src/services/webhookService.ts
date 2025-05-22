import { WebhookEventType, WebhookPayload } from '../types/webhook';
import { prisma } from './prismaClient';
import crypto from 'crypto';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const fetch = require('node-fetch');

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
});

export const webhookQueue = new Queue('webhooks', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const webhookWorker = new Worker(
  'webhooks',
  async (job) => {
    const { webhookId, payload } = job.data;
    console.log(`Processando webhook ${webhookId} para evento ${payload.event}`);
    
    try {
      const webhook = await (prisma as any).webhook.findUnique({
        where: { id: webhookId }
      });

      if (!webhook || !webhook.is_active) {
        return { success: false, error: 'Webhook não encontrado ou inativo' };
      }

      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (webhook.secret) {
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Resposta HTTP não-ok: ${response.status} ${response.statusText}`);
      }

      return { 
        success: true, 
        message: `Webhook entregue com sucesso para ${webhook.url}`,
        status: response.status
      };
    } catch (error) {
      console.error(`Erro ao enviar webhook ${webhookId}:`, error);
      
      if (job.attemptsMade >= 4) {
        await (prisma as any).webhook.update({
          where: { id: webhookId },
          data: { is_active: false }
        });
        return { 
          success: false, 
          error: `Webhook desativado após ${job.attemptsMade + 1} falhas. Erro: ${error.message}` 
        };
      }
      
      throw error;
    }
  },
  { connection }
);

export const initializeWebhookWorker = (): void => {
  webhookWorker.on('completed', (job) => {
    console.log(`Webhook processado com sucesso: ${job.id}`);
  });
  
  webhookWorker.on('failed', (job, error) => {
    console.error(`Falha ao processar webhook ${job?.id}:`, error);
  });
};

export default {
  async dispatchEvent(eventType: WebhookEventType, data: any): Promise<void> {
    try {
      const webhooks = await (prisma as any).webhook.findMany({
        where: {
          is_active: true,
          events: {
            array_contains: [eventType]
          }
        }
      });

      if (webhooks.length === 0) {
        return;
      }

      const payload: WebhookPayload = {
        id: crypto.randomUUID(),
        event: eventType,
        timestamp: new Date().toISOString(),
        data
      };

      for (const webhook of webhooks) {
        await webhookQueue.add(
          `event-${eventType}`,
          {
            webhookId: webhook.id,
            payload
          },
          {
            jobId: `webhook-${webhook.id}-${payload.id}`
          }
        );
        
        console.log(`Evento ${eventType} enviado para a fila do webhook ${webhook.id}`);
      }
    } catch (error) {
      console.error(`Erro ao despachar evento ${eventType}:`, error);
    }
  },

  async notifyAppointmentCreated(appointment: any): Promise<void> {
    await this.dispatchEvent(WebhookEventType.APPOINTMENT_CREATED, appointment);
  },

  async notifyAppointmentUpdated(appointment: any): Promise<void> {
    await this.dispatchEvent(WebhookEventType.APPOINTMENT_UPDATED, appointment);
  },

  async notifyAppointmentCancelled(appointment: any): Promise<void> {
    await this.dispatchEvent(WebhookEventType.APPOINTMENT_CANCELLED, appointment);
  },

  async notifyAppointmentCompleted(appointment: any): Promise<void> {
    await this.dispatchEvent(WebhookEventType.APPOINTMENT_COMPLETED, appointment);
  },

  async notifyAppointmentRescheduled(appointment: any): Promise<void> {
    await this.dispatchEvent(WebhookEventType.APPOINTMENT_RESCHEDULED, appointment);
  }
};