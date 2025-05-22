import express from 'express';
import authRoutes from './authRoutes'
import appointmentRoutes from './appointmentRoutes';
import specialistRoutes from './specialistRoutes';
import clientRoutes from './clientRoutes';
import userRoutes from './userRoutes';
import auditLogRoutes from './auditLogRoutes';
import webhookRoutes from './webhookRoutes';

const router = express.Router();

router.use('/auth', authRoutes);

router.use('/users', userRoutes);

router.use('/appointments', appointmentRoutes);

router.use('/specialists', specialistRoutes);

router.use('/clients', clientRoutes);

router.use('/audit-logs', auditLogRoutes);

router.use('/webhooks', webhookRoutes);

export default router;