import express from 'express';
import webhookController from '../controllers/webhookController';
import authMiddleware from '../middlewares/auth';

const router = express.Router();

router.use(authMiddleware);

router.post('/', webhookController.register);

router.get('/', webhookController.getAll);

router.get('/:id', webhookController.getById);

router.put('/:id', webhookController.update);

router.delete('/:id', webhookController.delete);

router.post('/:id/test', webhookController.test);

export default router;