import { Request, Response } from 'express';
import { prisma } from '../services/prismaClient';
import webhookValidator from '../validators/webhookValidator';
import { WebhookEventType } from '../types/webhook';

export default {
  async register(req: Request, res: Response): Promise<Response> {
    try {
      console.log('[Controller] req.userId no início:', (req as any).userId);
      console.log('[Controller] req.userRole no início:', (req as any).userRole);
      console.log('[Controller] req.user no início:', (req as any).user);
      console.log('[Controller] Todas as propriedades de req:', Object.keys(req));

      const validatedData = webhookValidator.validate(req.body);
      if (validatedData.error) {
        return res.status(400).json({ error: validatedData.error.details[0].message });
      }

      const { name, url, secret, events } = req.body;

      const existingWebhook = await (prisma as any).webhook.findFirst({
        where: { url }
      });

      if (existingWebhook) {
        return res.status(400).json({ 
          error: 'URL já registrada. Use PUT para atualizar um webhook existente.' 
        });
      }

      const userId = (req as any).userId || req.userId || req.user?.id;
      console.log('[Controller] userId encontrado:', userId);

      if (!userId) {
        console.log('[Controller] Nenhum userId encontrado');
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      console.log('[Controller] Chamando prisma.webhook.create com:', {
        name,
        url,
        secret,
        events,
        created_by: userId
      });
      
      const webhook = await (prisma as any).webhook.create({
        data: {
          name,
          url,
          secret,
          events: events,
          created_by: userId
        }
      });

      console.log('[Controller] Resultado do webhook.create:', webhook);
      console.log('[Controller] webhook.id:', webhook?.id);

      if (!webhook) {
        throw new Error('Webhook criado mas resultado é undefined');
      }

      return res.status(201).json({
        message: 'Webhook registrado com sucesso',
        webhook: {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          is_active: webhook.is_active
        }
      });
    } catch (error) {
      console.error('Erro ao registrar webhook:', error);
      return res.status(500).json({ 
        error: `Erro ao registrar webhook: ${error.message || 'Erro interno do servidor'}` 
      });
    }
  },

  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).userId || req.userId;
      const webhooks = await (prisma as any).webhook.findMany({
        where: {
          created_by: userId
        },
        select: {
          id: true,
          name: true,
          url: true,
          events: true,
          is_active: true,
          created_at: true,
          updated_at: true
        }
      });

      return res.json(webhooks);
    } catch (error) {
      console.error('Erro ao listar webhooks:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId || req.userId;
      const userRole = (req as any).userRole || req.userRole;

      const webhook = await (prisma as any).webhook.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          url: true,
          events: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          created_by: true
        }
      });

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook não encontrado' });
      }

      if (webhook.created_by !== userId && userRole !== 'admin') {
        return res.status(403).json({ error: 'Permissão negada' });
      }

      return res.json(webhook);
    } catch (error) {
      console.error('Erro ao buscar webhook:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { name, url, secret, events, is_active } = req.body;
      const userId = (req as any).userId || req.userId;
      const userRole = (req as any).userRole || req.userRole;

      const validatedData = webhookValidator.validate({ name, url, secret, events });
      if (validatedData.error) {
        return res.status(400).json({ error: validatedData.error.details[0].message });
      }

      const webhook = await (prisma as any).webhook.findUnique({
        where: { id }
      });

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook não encontrado' });
      }

      if (webhook.created_by !== userId && userRole !== 'admin') {
        return res.status(403).json({ error: 'Permissão negada' });
      }

      const updatedWebhook = await (prisma as any).webhook.update({
        where: { id },
        data: {
          name,
          url,
          secret,
          events,
          is_active: is_active !== undefined ? is_active : webhook.is_active,
          updated_at: new Date()
        },
        select: {
          id: true,
          name: true,
          url: true,
          events: true,
          is_active: true,
          created_at: true,
          updated_at: true
        }
      });

      return res.json({
        message: 'Webhook atualizado com sucesso',
        webhook: updatedWebhook
      });
    } catch (error) {
      console.error('Erro ao atualizar webhook:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId || req.userId;
      const userRole = (req as any).userRole || req.userRole;

      const webhook = await (prisma as any).webhook.findUnique({
        where: { id }
      });

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook não encontrado' });
      }

      if (webhook.created_by !== userId && userRole !== 'admin') {
        return res.status(403).json({ error: 'Permissão negada' });
      }

      await (prisma as any).webhook.delete({
        where: { id }
      });

      return res.json({ 
        message: 'Webhook excluído com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao excluir webhook:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
  
  async test(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId || req.userId;
      const userRole = (req as any).userRole || req.userRole;

      const webhook = await (prisma as any).webhook.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          url: true,
          events: true,
          is_active: true,
          created_by: true
        }
      });

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook não encontrado' });
      }

      if (webhook.created_by !== userId && userRole !== 'admin') {
        return res.status(403).json({ error: 'Permissão negada' });
      }

      if (!webhook.is_active) {
        return res.status(400).json({ error: 'Webhook está inativo. Ative-o primeiro para testá-lo.' });
      }

      const webhookService = require('../services/webhookService').default;

      const testData = {
        id: "test-" + Date.now(),
        message: "Este é um webhook de teste enviado em " + new Date().toISOString(),
        webhook_id: webhook.id
      };

      const eventType = webhook.events.length > 0 ? 
        webhook.events[0] : 
        WebhookEventType.APPOINTMENT_CREATED;

      await webhookService.dispatchEvent(eventType, testData);

      return res.json({
        message: 'Webhook de teste enviado com sucesso',
        event: eventType,
        data: testData
      });
      
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};