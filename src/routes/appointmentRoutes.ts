import express from 'express';
import appointmentController from '../controllers/appointmentController';
import authMiddleware from '../middlewares/auth';
import roleValidator from '../middlewares/roleValidator';
import { UserRole } from '../types/user';

const router = express.Router();

router.use(authMiddleware);

router.post('/', 
  roleValidator(UserRole.CLIENT, UserRole.SCHEDULER, UserRole.ADMIN),
  appointmentController.create
);

router.get('/:id', appointmentController.getById);

router.get('/client/:clientId', appointmentController.getByClient);

router.get('/specialist/:specialistId', appointmentController.getBySpecialist);

router.put('/:id/status', roleValidator(UserRole.SPECIALIST, UserRole.ADMIN), appointmentController.updateStatus);

router.post('/:id/reschedule', roleValidator(UserRole.CLIENT, UserRole.SCHEDULER, UserRole.ADMIN), appointmentController.reschedule);

export default router;