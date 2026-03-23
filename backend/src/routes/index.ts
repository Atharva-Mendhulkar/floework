import express from 'express';
import { Router } from 'express';
import userRoutes from './userRoutes';
import projectRoutes from './projectRoutes';
import taskRoutes from './taskRoutes';
import authRoutes from './authRoutes';
import focusRoutes from './focusRoutes';
import productivityRoutes from './productivityRoutes';
import messageRoutes from './messageRoutes';
import alertRoutes from './alertRoutes';
import teamRoutes from './teamRoutes';
import analyticsRoutes from './analyticsRoutes';
import billingRoutes from './billingRoutes';
import sprintRoutes from './sprintRoutes';
import narrativeRoutes from './narrativeRoutes';
import { protect } from '../middleware/authMiddleware';
import { enforceDataOwnership } from '../middleware/enforceDataOwnership';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', protect, userRoutes);
router.use('/teams', protect, teamRoutes);
router.use('/projects', protect, projectRoutes);
router.use('/projects/:projectId/messages', protect, messageRoutes);
router.use('/projects/:projectId/sprints', protect, sprintRoutes);
router.use('/tasks', protect, taskRoutes);
router.use('/focus', focusRoutes); // protect applied internally inside focusRoutes
router.use('/productivity', protect, productivityRoutes); // defence-in-depth: protect both here & inside
router.use('/alerts', protect, alertRoutes);
router.use('/analytics', protect, enforceDataOwnership, analyticsRoutes);
// NOTE: billing webhook (/billing/webhook) MUST stay unauthenticated (raw body needed for Stripe sig verification);
// protect is applied inside billingRoutes AFTER the webhook route.
router.use('/billing', billingRoutes);
router.use('/narrative', narrativeRoutes);

export default router;
