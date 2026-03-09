import { Router } from 'express';
import { getProjectSprints, createSprint, updateSprint } from '../controllers/sprintController';
import { protect } from '../middleware/authMiddleware';

// Note: Mounted via /api/v1/projects/:projectId/sprints from core routes
const router = Router({ mergeParams: true });

router.use(protect);

router.route('/')
    .get(getProjectSprints)
    .post(createSprint);

router.route('/:sprintId')
    .patch(updateSprint);

export default router;
