import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json';
import { initializeQueues, notificationQueue, expirationQueue, webhookQueue } from './queues';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import webhookRoutes from './routes/webhookRoutes';

const app: Express = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use('/api/webhooks', webhookRoutes);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

if (process.env.NODE_ENV !== 'test') {
  createBullBoard({
    queues: [
      new BullMQAdapter(notificationQueue),
      new BullMQAdapter(expirationQueue),
      new BullMQAdapter(webhookQueue)
    ],
    serverAdapter
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  if (process.env.NODE_ENV === 'production') {
    app.use('/admin/queues', (req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).send('Autenticação necessária');
      }
      
      const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
      const user = auth[0];
      const pass = auth[1];
      
      if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASSWORD) {
        return next();
      }
      
      res.setHeader('WWW-Authenticate', 'Basic');
      return res.status(401).send('Credenciais inválidas');
    });
  }
}

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api', routes);

(async () => {
  try {
    console.log("Iniciando sistema de filas...");
    await initializeQueues();
    console.log("Sistema de filas inicializado com sucesso");
    
    await notificationQueue.add(
      'daily-check-immediate',
      { notificationType: 'daily-check' },
      { jobId: 'manual-check-' + Date.now() }
    );
    console.log("Verificação manual de agendamentos adicionada à fila");
  } catch (err) {
    console.error('Falha ao inicializar sistema de filas:', err);
  }
})();

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;