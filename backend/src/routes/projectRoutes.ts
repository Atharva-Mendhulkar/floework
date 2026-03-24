import { Router } from 'express';
import { getProjects, createProject, getProjectById, getProjectPredictiveDelivery, updateProject, deleteProject } from '../controllers/projectController';
import { authorize } from '../middleware/rbacMiddleware';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
    .get(getProjects)
    .post(authorize('admin'), createProject);

router.route('/:id')
    .get(getProjectById)
    .patch(updateProject)
    .delete(deleteProject);

router.route('/:id/prediction')
    .get(getProjectPredictiveDelivery);

export default router;
