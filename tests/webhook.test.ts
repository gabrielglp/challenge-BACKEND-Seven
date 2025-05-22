import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './mocks/prisma.mock';
import { mockWebhookService } from './mocks/webhook-service.mock';
import { mockFetch } from './mocks/fetch.mock';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Secret } from 'jsonwebtoken';
import authConfig from '../src/config/auth';
import { UserRole } from '../src/types/user';
import { WebhookEventType } from '../src/types/webhook';

describe('Webhooks', () => {
  let adminToken: string;
  let userId: string;
  let webhookId: string;

  beforeAll(async () => {
    const mockUser = {
      id: 'user-123',
      name: 'Admin Teste',
      email: 'admin_webhook@test.com',
      password: await bcrypt.hash('senha123', 10),
      role: UserRole.ADMIN,
      priority: false,
      active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    userId = mockUser.id;

    adminToken = jwt.sign({ id: mockUser.id }, authConfig.secret as Secret, {
      expiresIn: authConfig.expiresIn,
    });

    prismaMock.user.findUnique.mockResolvedValue({
      id: mockUser.id,
      role: mockUser.role,
      active: mockUser.active
    } as any);

    prismaMock.user.create.mockResolvedValue(mockUser as any);
    prismaMock.webhook.findFirst.mockResolvedValue(null);
    
    prismaMock.webhook.findMany.mockResolvedValue([{
      id: 'webhook-123',
      name: 'Webhook Teste',
      url: 'https://example.com/webhook',
      secret: 'secreto123',
      events: [WebhookEventType.APPOINTMENT_CREATED],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: userId
    }] as any);

    prismaMock.webhook.findUnique.mockResolvedValue({
      id: 'webhook-123',
      name: 'Webhook Teste',
      url: 'https://example.com/webhook',
      secret: 'secreto123',
      events: [WebhookEventType.APPOINTMENT_CREATED],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: userId
    } as any);
  });

  beforeEach(() => {
    
    prismaMock.user.findUnique.mockResolvedValue({
      id: userId,
      role: UserRole.ADMIN,
      active: true
    } as any);
    
    prismaMock.webhook.findFirst.mockResolvedValue(null);
    
    prismaMock.webhook.findUnique.mockResolvedValue({
      id: 'webhook-123',
      name: 'Webhook Teste',
      url: 'https://example.com/webhook',
      secret: 'secreto123',
      events: [WebhookEventType.APPOINTMENT_CREATED],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: userId
    } as any);
    
    prismaMock.webhook.findMany.mockResolvedValue([{
      id: 'webhook-123',
      name: 'Webhook Teste',
      url: 'https://example.com/webhook',
      secret: 'secreto123',
      events: [WebhookEventType.APPOINTMENT_CREATED],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: userId
    }] as any);
    
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({ success: true })
    });
  });

  afterAll(async () => {
    await prismaMock.$disconnect();
  });

  it('Deve registrar um novo webhook', async () => {
    const webhookData = {
      name: 'Webhook Teste',
      url: 'https://example.com/webhook',
      secret: 'secreto123',
      events: [WebhookEventType.APPOINTMENT_CREATED]
    };

    prismaMock.webhook.create.mockResolvedValue({
      id: 'webhook-123',
      name: webhookData.name,
      url: webhookData.url,
      secret: webhookData.secret,
      events: webhookData.events,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: userId
    } as any);

    console.log('Token usado:', adminToken);
    console.log('User ID:', userId);
    console.log('Mock findFirst configurado:', prismaMock.webhook.findFirst.getMockName());
    console.log('Mock create configurado:', prismaMock.webhook.create.getMockName());

    const response = await request(app)
      .post('/api/webhooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(webhookData);

    console.log('Response status:', response.status);
    console.log('Response body:', response.body);

    expect(response.status).toBe(201);
    expect(response.body.webhook).toHaveProperty('id');
    expect(response.body.webhook.name).toBe(webhookData.name);
    expect(prismaMock.webhook.create).toHaveBeenCalled();

    webhookId = response.body.webhook.id;
  });

  it('Deve listar os webhooks', async () => {
    const response = await request(app)
      .get('/api/webhooks')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(prismaMock.webhook.findMany).toHaveBeenCalled();
  });

  it('Deve obter um webhook por ID', async () => {
    const testWebhookId = 'webhook-123';
    
    const response = await request(app)
      .get(`/api/webhooks/${testWebhookId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(testWebhookId);
    expect(prismaMock.webhook.findUnique).toHaveBeenCalledWith({
      where: { id: testWebhookId },
      select: expect.any(Object)
    });
  });

  it('Deve atualizar um webhook', async () => {
    const testWebhookId = 'webhook-123';
    const updateData = {
      name: 'Webhook Atualizado',
      url: 'https://example.com/webhook',
      secret: 'secreto123',
      events: [WebhookEventType.APPOINTMENT_CREATED, WebhookEventType.APPOINTMENT_CANCELLED]
    };

    prismaMock.webhook.update.mockResolvedValue({
      id: testWebhookId,
      name: updateData.name,
      url: updateData.url,
      secret: updateData.secret,
      events: updateData.events,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: userId
    } as any);

    const response = await request(app)
      .put(`/api/webhooks/${testWebhookId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.webhook.name).toBe(updateData.name);
    expect(prismaMock.webhook.update).toHaveBeenCalled();
  });

  it('Deve testar um webhook', async () => {
    const testWebhookId = 'webhook-123';
    
    const response = await request(app)
      .post(`/api/webhooks/${testWebhookId}/test`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('event');
    expect(mockWebhookService.dispatchEvent).toHaveBeenCalled();
  });

  it('Deve excluir um webhook', async () => {
    const testWebhookId = 'webhook-123';
    
    prismaMock.webhook.delete.mockResolvedValue({
      id: testWebhookId,
      name: 'Webhook Teste',
      url: 'https://example.com/webhook',
      secret: 'secreto123',
      events: [WebhookEventType.APPOINTMENT_CREATED],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: userId
    } as any);

    const response = await request(app)
      .delete(`/api/webhooks/${testWebhookId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(prismaMock.webhook.delete).toHaveBeenCalledWith({
      where: { id: testWebhookId }
    });
  });

  it('Deve retornar erro 401 sem token de autenticação', async () => {
    const response = await request(app)
      .get('/api/webhooks');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('Deve retornar erro 404 para webhook inexistente', async () => {
    const inexistentId = 'webhook-inexistente';
    
    prismaMock.webhook.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .get(`/api/webhooks/${inexistentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});