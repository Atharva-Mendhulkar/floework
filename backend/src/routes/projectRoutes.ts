import { Router } from 'express';
import { getProjects, createProject, getProjectById } from '../controllers/projectController';
import { authorize } from '../middleware/rbacMiddleware';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
    .get(getProjects)
    .post(authorize('admin'), createProject);

router.route('/:id')
    .get(getProjectById);

export default router;
