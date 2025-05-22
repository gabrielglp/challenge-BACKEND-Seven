import express from 'express';
import authMiddleware from '../middlewares/auth';
import roleValidator from '../middlewares/roleValidator';
import { UserRole } from '../types/user';
import auditLogController from '../controllers/auditLogController';

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleValidator(UserRole.ADMIN, UserRole.SCHEDULER), auditLogController.getAll);

router.get('/:id', roleValidator(UserRole.ADMIN, UserRole.SCHEDULER), auditLogController.getById);

export default router;