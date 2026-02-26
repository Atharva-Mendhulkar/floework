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
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', protect, userRoutes);
router.use('/teams', protect, teamRoutes);
router.use('/projects', protect, projectRoutes);
router.use('/projects/:projectId/messages', protect, messageRoutes);
router.use('/tasks', protect, taskRoutes);
router.use('/focus', focusRoutes);
router.use('/productivity', productivityRoutes);
router.use('/alerts', protect, alertRoutes);

export default router;
