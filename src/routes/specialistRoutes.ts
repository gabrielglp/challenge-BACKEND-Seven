import express from 'express';
import specialistController from '../controllers/specialistController';
import authMiddleware from '../middlewares/auth';
import roleValidator from '../middlewares/roleValidator';
import { UserRole } from '../types/user';

const router = express.Router();

router.use(authMiddleware);

router.get('/', specialistController.getAll);

router.get('/:id', specialistController.getById);

router.post('/', roleValidator(UserRole.ADMIN), specialistController.create);

router.put('/:id/availability',
  roleValidator(UserRole.SPECIALIST, UserRole.ADMIN),
  specialistController.updateAvailability
);

router.get('/:id/available-slots', specialistController.getAvailableSlots);

export default router;