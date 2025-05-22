import express from 'express';
import clientController from '../controllers/clientController';
import authMiddleware from '../middlewares/auth';
import roleValidator from '../middlewares/roleValidator';
import { UserRole } from '../types/user';

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleValidator(UserRole.ADMIN, UserRole.SCHEDULER), clientController.getAll);

router.get('/:id', clientController.getById);

router.put('/:id', clientController.update);

router.put('/:id/priority', roleValidator(UserRole.ADMIN), clientController.setPriority);

router.get('/:id/appointments', clientController.getAppointmentsHistory);

export default router;