import express from 'express';
import usersController from '../controllers/userController';
import authMiddleware from '../middlewares/auth';
import { UserRole } from '../types/user';
import roleValidator from '../middlewares/roleValidator';

const router = express.Router();

router.use(authMiddleware);

router.get('/', usersController.getAll);

router.get('/:id', usersController.getById);

router.put('/:id', usersController.update);

router.delete('/:id', usersController.delete);

router.post('/sync-profiles', roleValidator(UserRole.ADMIN), usersController.syncProfiles);

export default router;