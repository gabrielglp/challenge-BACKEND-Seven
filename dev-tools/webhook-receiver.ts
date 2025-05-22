import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bodyParser from 'body-parser';

const WEBHOOK_SECRET = 'dev-secret-123';

interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: any;
}

const app = express();

app.use(bodyParser.json());

function validateSignature(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = JSON.stringify(req.body);
  
  if (!signature) {
    console.warn('⚠️ Webhook recebido sem assinatura!');
    return next();
  }

  const computedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== computedSignature) {
    console.error('❌ Assinatura inválida');
    res.status(401).json({ error: 'Assinatura inválida' });
    return;
  }
  
  console.log('✅ Assinatura válida');
  next();
}

app.post('/webhook', validateSignature, (req: Request, res: Response) => {
  const { id, event, timestamp, data } = req.body as WebhookPayload;
  
  console.log('\n=== WEBHOOK RECEBIDO ===');
  console.log(`ID: ${id}`);
  console.log(`Evento: ${event}`);
  console.log(`Data/Hora: ${timestamp}`);
  console.log('Dados:');
  console.log(JSON.stringify(data, null, 2));
  console.log('========================\n');
  
  switch (event) {
    case 'appointment.created':
      console.log('🎉 Novo agendamento! Agora poderíamos:', 
                 '\n - Adicionar ao calendário', 
                 '\n - Enviar notificação push', 
                 '\n - Atualizar dashboard');
      break;
      
    case 'appointment.cancelled':
      console.log('🔴 Agendamento cancelado! Agora poderíamos:', 
                 '\n - Remover do calendário', 
                 '\n - Notificar a equipe',
                 '\n - Abrir o horário na agenda');
      break;
      
    case 'appointment.rescheduled':
      console.log('🔄 Agendamento remarcado! Agora poderíamos:', 
                 '\n - Atualizar o calendário', 
                 '\n - Notificar a equipe');
      break;
      
    default:
      console.log(`Processando evento genérico: ${event}`);
  }
  
  return res.status(200).json({ 
    success: true, 
    message: `Evento ${event} processado com sucesso` 
  });
});

const PORT = 3030;
app.listen(PORT, () => {
  console.log(`Receptor de Webhook rodando em http://localhost:${PORT}/webhook`);
  console.log('Aguardando eventos...');
});